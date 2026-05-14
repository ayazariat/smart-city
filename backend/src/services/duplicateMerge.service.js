const mongoose = require("mongoose");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const NotificationService = require("./notification.service");
const { sendNotificationEmail } = require("../utils/mailer");
const { normalizeMunicipality } = require("../utils/normalize");
const { calculatePriorityAndSLA } = require("../utils/priorityCalculator");
const { t } = require("../utils/i18n");

const displayRc = (complaint) =>
  complaint?.referenceId || complaint?._id?.toString?.() || complaint?.toString?.() || "";

const getAgentId = (user = {}) => user.userId || user._id || user.id;

const assertAgentCanMerge = async ({ user, duplicateComplaint, originalComplaint }) => {
  if (!["MUNICIPAL_AGENT", "ADMIN"].includes(user?.role)) {
    const error = new Error("Only municipal agents can merge duplicate complaints");
    error.status = 403;
    throw error;
  }

  if (!duplicateComplaint) {
    const error = new Error("Complaint to merge not found");
    error.status = 404;
    throw error;
  }

  if (!originalComplaint) {
    const error = new Error("Original complaint not found");
    error.status = 404;
    throw error;
  }

  if (duplicateComplaint._id.toString() === originalComplaint._id.toString()) {
    const error = new Error("Cannot merge a complaint into itself");
    error.status = 400;
    throw error;
  }

  if (duplicateComplaint.status !== "SUBMITTED") {
    const error = new Error("Only submitted complaints can be merged");
    error.status = 400;
    throw error;
  }

  if (user.role === "ADMIN") return;

  const agent = await User.findById(getAgentId(user))
    .populate("municipality", "name")
    .select("municipality municipalityName")
    .lean();

  const agentMunicipality = normalizeMunicipality(
    agent?.municipalityName || agent?.municipality?.name || ""
  );
  const duplicateMunicipality = normalizeMunicipality(
    duplicateComplaint.municipalityName ||
      duplicateComplaint.location?.municipality ||
      duplicateComplaint.municipality?.name ||
      ""
  );

  if (agentMunicipality && duplicateMunicipality && agentMunicipality !== duplicateMunicipality) {
    const error = new Error("You can only merge complaints in your municipality");
    error.status = 403;
    throw error;
  }
};

const recalculatePriorityFields = (complaint) => {
  const priorityResult = calculatePriorityAndSLA({
    category: complaint.category,
    aiUrgencyPrediction: complaint.aiPredictedUrgency || "MEDIUM",
    userUrgency: complaint.urgency,
    confirms: complaint.confirmationCount || 0,
    upvotes: complaint.upvoteCount || 0,
    locationType: "NORMAL",
    createdAt: complaint.createdAt,
  });

  complaint.priorityScore = priorityResult.priorityScore;
  complaint.urgency = priorityResult.urgencyLevel;
  complaint.slaDeadline = new Date(Date.now() + priorityResult.slaFinal * 60 * 60 * 1000);
};

const mergeDuplicateComplaint = async ({
  duplicateComplaintId,
  originalComplaintId,
  user,
  similarityScore = null,
  io = null,
}) => {
  let result;

  try {
    const [duplicateComplaint, originalComplaint] = await Promise.all([
      Complaint.findById(duplicateComplaintId),
      Complaint.findById(originalComplaintId),
    ]);

    await assertAgentCanMerge({ user, duplicateComplaint, originalComplaint });

    const now = new Date();
    const sourceUpvoteCount = duplicateComplaint.upvoteCount || 0;
    const sourceConfirmationCount = duplicateComplaint.confirmationCount || 0;

    originalComplaint.upvoteCount = (originalComplaint.upvoteCount || 0) + sourceUpvoteCount;
    originalComplaint.confirmationCount =
      (originalComplaint.confirmationCount || 0) + sourceConfirmationCount + 1;

    originalComplaint.upvotes = originalComplaint.upvotes || [];
    for (const upvote of duplicateComplaint.upvotes || []) {
      const exists = originalComplaint.upvotes.some(
        (u) => u.citizenId?.toString() === upvote.citizenId?.toString()
      );
      if (!exists) {
        originalComplaint.upvotes.push({
          citizenId: upvote.citizenId,
          upvotedAt: upvote.upvotedAt || now,
        });
      }
    }

    originalComplaint.confirmations = originalComplaint.confirmations || [];
    for (const confirmation of duplicateComplaint.confirmations || []) {
      const exists = originalComplaint.confirmations.some(
        (c) => c.citizenId?.toString() === confirmation.citizenId?.toString()
      );
      if (!exists) {
        originalComplaint.confirmations.push({
          citizenId: confirmation.citizenId,
          confirmedAt: confirmation.confirmedAt || now,
        });
      }
    }

    if (duplicateComplaint.createdBy) {
      const exists = originalComplaint.confirmations.some(
        (c) => c.citizenId?.toString() === duplicateComplaint.createdBy.toString()
      );
      if (!exists) {
        originalComplaint.confirmations.push({
          citizenId: duplicateComplaint.createdBy,
          confirmedAt: now,
        });
      }
    }

    originalComplaint.mergedComplaints = originalComplaint.mergedComplaints || [];
    const alreadyMerged = originalComplaint.mergedComplaints.some(
      (m) => m.complaintId?.toString() === duplicateComplaint._id.toString()
    );
    if (!alreadyMerged) {
      originalComplaint.mergedComplaints.push({
        complaintId: duplicateComplaint._id,
        mergedAt: now,
        similarityScore,
      });
    }

    recalculatePriorityFields(originalComplaint);

    duplicateComplaint.status = "REJECTED";
    duplicateComplaint.rejectionReason = "duplicate";
    duplicateComplaint.rejectionReasonText = `Merged into similar complaint: ${originalComplaint.title} (${displayRc(originalComplaint)})`;
    duplicateComplaint.isDuplicate = true;
    duplicateComplaint.duplicateOf = originalComplaint._id;
    duplicateComplaint.duplicateStatus = "CONFIRMED_DUPLICATE";
    duplicateComplaint.mergedAt = now;
    duplicateComplaint.mergedBy = getAgentId(user);
    duplicateComplaint.isArchived = true;
    duplicateComplaint.archivedAt = now;
    duplicateComplaint.archivedBy = getAgentId(user);
    duplicateComplaint.statusHistory = duplicateComplaint.statusHistory || [];
    duplicateComplaint.statusHistory.push({
      status: "REJECTED",
      updatedBy: getAgentId(user),
      updatedAt: now,
      notes: `Automatically rejected and archived as duplicate of ${originalComplaint.title} (${displayRc(originalComplaint)})`,
    });

    await originalComplaint.save();
    await duplicateComplaint.save();

    let notification = null;
    if (duplicateComplaint.createdBy) {
      const citizen = await User.findById(duplicateComplaint.createdBy)
        .select("language fullName email firstName")
        .lean();
      const locale = citizen?.language || "en";
      const messageVariables = {
        mergedRc: displayRc(duplicateComplaint),
        mergedTitle: duplicateComplaint.title,
        originalRc: displayRc(originalComplaint),
        originalTitle: originalComplaint.title,
      };
      const messageKey = "notifications.mergedAsDuplicate";
      const message = t(messageKey, locale, messageVariables);

        notification = await NotificationService.createNotification({
          io,
          userId: duplicateComplaint.createdBy,
          type: "complaint_merged_as_duplicate",
          title: "Complaint merged as duplicate",
          message,
          messageKey,
          messageVariables,
          complaintId: originalComplaint._id,
          relatedId: originalComplaint._id,
          mergedComplaintId: duplicateComplaint._id,
          metadata: {
            ...messageVariables,
            originalComplaintId: originalComplaint._id.toString(),
            mergedComplaintId: duplicateComplaint._id.toString(),
          },
          read: false,
          createdAt: now,
        });

        // Send email notification to citizen
        if (citizen?.email) {
          try {
            await sendNotificationEmail(
              'merged_as_duplicate',
              {
                ...citizen,
                role: 'CITIZEN',
                language: locale,
              },
              {
                title: duplicateComplaint.title,
                referenceId: displayRc(duplicateComplaint),
                originalReferenceId: displayRc(originalComplaint),
                originalTitle: originalComplaint.title,
              },
              {
                originalReferenceId: displayRc(originalComplaint),
                originalTitle: originalComplaint.title,
              }
            );
            console.log(`[mergeDuplicate] Email sent to ${citizen.email} for merged complaint ${displayRc(duplicateComplaint)}`);
          } catch (emailError) {
            console.error(`[mergeDuplicate] Failed to send email to ${citizen?.email}:`, emailError.message);
            // Don't fail the merge if email fails
          }
        }
      }

      result = {
        success: true,
        message: "Complaints merged successfully",
        mergedComplaint: {
          id: duplicateComplaint._id,
          _id: duplicateComplaint._id,
          status: duplicateComplaint.status,
          rejectionReason: duplicateComplaint.rejectionReason,
          rejectionReasonText: duplicateComplaint.rejectionReasonText,
          isDuplicate: duplicateComplaint.isDuplicate,
          duplicateOf: originalComplaint._id,
          duplicateOfReferenceId: displayRc(originalComplaint),
          duplicateOfTitle: originalComplaint.title,
          referenceId: duplicateComplaint.referenceId,
          mergedAt: duplicateComplaint.mergedAt,
          mergedBy: duplicateComplaint.mergedBy,
        },
        originalComplaint: {
          id: originalComplaint._id,
          _id: originalComplaint._id,
          title: originalComplaint.title,
          referenceId: originalComplaint.referenceId,
          confirmationCount: originalComplaint.confirmationCount,
          upvoteCount: originalComplaint.upvoteCount,
          priorityScore: originalComplaint.priorityScore,
          urgency: originalComplaint.urgency,
          mergedReportsCount: originalComplaint.mergedComplaints.length,
        },
        notificationId: notification?._id,
      };
    } catch (error) {
      console.error('[mergeDuplicateComplaint] Error:', error);
      throw error;
    }

    return result;
};

module.exports = {
  mergeDuplicateComplaint,
};
