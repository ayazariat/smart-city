const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Department = require("../models/Department");
const { getStatus: getSlaStatus } = require("../utils/slaCalculator");
const { normalizeMunicipality, normalizeGovernorate, getMunicipalityGovernorate, getCanonicalMunicipalityName } = require("../utils/normalize");
const notificationService = require("../services/notification.service");
const { logAction } = require("../services/audit.service");


const ACTIVE_STATUSES = [
  "SUBMITTED",
  "VALIDATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
];
const ARCHIVE_STATUSES = ["REJECTED", "CLOSED"];
const ALL_STATUSES = [...ACTIVE_STATUSES, ...ARCHIVE_STATUSES];

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const addOrScope = (query, conditions) => {
  const scopedConditions = conditions.filter(Boolean);
  if (scopedConditions.length === 0) {
    query._id = null;
    return;
  }

  if (query.$or) {
    query.$and = [...(query.$and || []), { $or: query.$or }, { $or: scopedConditions }];
    delete query.$or;
  } else {
    query.$or = scopedConditions;
  }
};

const municipalityScopeConditions = (user = {}) => {
  const municipalityName = user.municipalityName || user.municipality?.name || "";
  const normalizedMun = normalizeMunicipality(municipalityName);
  const conditions = [];

  if (user.municipality?._id) {
    conditions.push({ municipality: user.municipality._id });
  }

  if (municipalityName) {
    const munRegex = new RegExp(`^${escapeRegex(municipalityName)}$`, "i");
    conditions.push(
      { municipalityName: munRegex },
      { "location.municipality": munRegex },
    );
  }

  if (normalizedMun) {
    conditions.push({ municipalityNormalized: normalizedMun });
  }

  return conditions;
};

const departmentScopeConditions = (departmentId) => {
  if (!departmentId) return [];
  return [
    { "assignedDepartment.id": departmentId },
    { assignedDepartment: departmentId },
  ];
};

class ComplaintController {
  // Create new complaint (citizen)
  async create(req, res) {
    try {
      const { title, description, category, governorate, municipality, latitude, longitude, images, media } = req.body;
      const userId = req.user.userId;

      if (!title || !description || !category) {
        return res.status(400).json({ success: false, message: "Title, description, and category are required" });
      }

      const validCategories = [
        "waste", "roads", "lighting", "water", "safety", "property", "parks", "other",
        "WASTE", "ROAD", "LIGHTING", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "OTHER"
      ];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ success: false, message: "Invalid category" });
      }

      const mediaData = media || images || [];
      const normalizedMunicipality = normalizeMunicipality(municipality || "");
      const canonicalMunicipality = getCanonicalMunicipalityName(municipality || "");

      const resolvedGovernorate = governorate || getMunicipalityGovernorate(municipality) || "";
      const normalizedGovernorate = normalizeGovernorate(resolvedGovernorate);

      const complaint = new Complaint({
        title,
        description,
        category,
        governorate: resolvedGovernorate,
        governorateNormalized: normalizedGovernorate,
        municipality: canonicalMunicipality,
        municipalityName: canonicalMunicipality,
        municipalityNormalized: normalizedMunicipality,
        latitude: latitude || null,
        longitude: longitude || null,
        media: mediaData,
        status: "SUBMITTED",
        createdBy: userId,
      });

      await complaint.save();

      logAction(req, "COMPLAINT_CREATED", "Complaint", complaint._id, null, { title, category, municipality });

      // Notify municipal agents in the same municipality
      try {
        const normalizedMun = normalizeMunicipality(municipality || '');
        const agents = await User.find({
          role: 'MUNICIPAL_AGENT',
          $or: [
            { municipalityName: { $regex: new RegExp(`^${normalizedMun}$`, 'i') } },
            { 'municipality.name': { $regex: new RegExp(`^${normalizedMun}$`, 'i') } }
          ]
        }).select('_id');

        const agentIds = agents.map(a => a._id.toString());
        const io = req.app?.get?.("io");

        await notificationService.sendNotificationToMultiple(io, agentIds, {
          type: 'complaint_submitted',
          title: 'New Complaint',
          message: `New complaint in ${municipality || 'your municipality'}: ${title}`,
          complaintId: complaint._id,
          metadata: { category, municipality: normalizedMun },
        });

      } catch (notifError) {
        console.error("Failed to create notifications for agents:", notifError);
      }

      res.status(201).json({
        success: true,
        message: "Complaint submitted successfully",
        data: complaint,
      });
    } catch (error) {
      console.error("Error creating complaint:", error);
      res.status(500).json({ success: false, message: "Failed to create complaint" });
    }
  }

  // Get citizen's complaints
  async getMyComplaints(req, res) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const status = req.query.status;
      const category = req.query.category;

      const query = { createdBy: userId };

      if (status) {
        query.status = status;
      }
      if (category) {
        query.category = category;
      }

      const skip = (page - 1) * limit;

      const [complaints, total] = await Promise.all([
        Complaint.find(query)
          .populate("assignedDepartment", "name categoryKey")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Complaint.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          complaints,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(500).json({ success: false, message: "Failed to fetch complaints" });
    }
  }

  // Get single complaint by ID (detail view)
  async getComplaintById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;
      const userRole = req.user.role;

      const complaint = await Complaint.findById(id)
        .populate("createdBy", "fullName email phone")
        .populate("assignedTeam", "name members")
        .populate("assignedDepartment", "name categoryKey")
        .populate("assignedTo", "fullName email")
        .populate("beforePhotos.takenBy", "fullName")
        .populate("afterPhotos.takenBy", "fullName")
        .populate("municipality", "name governorate")
        .populate("statusHistory.updatedBy", "fullName")
        .populate("comments.author", "fullName")
        .populate("duplicateOf", "referenceId title")
        .populate({
          path: "mergedComplaints.complaintId",
          select: "referenceId title createdBy municipality municipalityName location",
          populate: [
            { path: "createdBy", select: "fullName" },
            { path: "municipality", select: "name" },
          ],
        })
        .lean();

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // Check if user is owner - also check direct comparison
      const citizenId = complaint.createdBy?._id?.toString() || complaint.createdBy?.toString();
      const currentUserId = req.user.userId?.toString();
      const isOwner = citizenId === currentUserId;
      const isAdminOrAgent = ["ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"].includes(userRole);



      // For CITIZEN role - can see own complaints OR any complaint with status beyond SUBMITTED
      if (userRole === "CITIZEN" && !isOwner) {
        const publicStatuses = ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED"];
        if (!publicStatuses.includes(complaint.status)) {
          return res.status(403).json({ success: false, message: "Access denied - You can only view your own complaints" });
        }
      }

      // For MUNICIPAL_AGENT - check municipality access
      if (userRole === "MUNICIPAL_AGENT") {
        const user = await User.findById(userId)
          .populate('municipality')
          .select('municipality municipalityName')
          .lean();

        const userMunicipalityName = normalizeMunicipality(user?.municipalityName || user?.municipality?.name || "");
        const complaintMunicipalityName = normalizeMunicipality(
          complaint.municipalityNormalized || complaint.municipalityName || complaint.municipality?.name || complaint.location?.municipality || ""
        );

        // If complaint has no municipality set, allow agent to view it
        if (!complaintMunicipalityName) {
          // Allow - complaint has no municipality
        } else if (userMunicipalityName && complaintMunicipalityName) {
          if (userMunicipalityName !== complaintMunicipalityName) {
            return res.status(403).json({ success: false, message: "Access denied - This complaint is not in your municipality" });
          }
        }
      }

      // For DEPARTMENT_MANAGER - check department access OR municipality access
      if (userRole === "DEPARTMENT_MANAGER") {
        // First check if user has department assigned in user profile
        const user = await User.findById(userId)
          .select('department municipality municipalityName')
          .populate('municipality')
          .lean();
        let myDepartmentId = null;

        if (user?.department) {
          myDepartmentId = user.department?.toString();
        } else {
          // Fallback: try to find department where user is responsible
          const myDepartment = await Department.findOne({
            responsable: userId
          }).select('_id').lean();

          if (myDepartment) {
            myDepartmentId = myDepartment._id?.toString();
          }
        }

        // Check department access
        const complaintDeptId = complaint.assignedDepartment?._id?.toString() || complaint.assignedDepartment?.toString();

        // Check municipality access as fallback
        const userMunicipalityName = normalizeMunicipality(user?.municipalityName || user?.municipality?.name || "");
        const complaintMunicipalityName = normalizeMunicipality(
          complaint.municipalityNormalized || complaint.municipalityName || complaint.municipality?.name || complaint.location?.municipality || ""
        );

        // Allow access if:
        // 1. Complaint is in manager's department, OR
        // 2. Complaint is in manager's municipality (for RESOLVED complaints that need review), OR
        // 3. No department assigned to either
        const departmentMatch = myDepartmentId && complaintDeptId && complaintDeptId === myDepartmentId;
        const municipalityMatch = userMunicipalityName && complaintMunicipalityName && userMunicipalityName === complaintMunicipalityName;
        const resolvedNeedsReview = complaint.status === "RESOLVED" && municipalityMatch;

        if (!departmentMatch && !resolvedNeedsReview && (myDepartmentId || complaintDeptId)) {
          if (complaintDeptId && myDepartmentId && complaintDeptId !== myDepartmentId) {
            return res.status(403).json({ success: false, message: "Access denied - This complaint is not in your department" });
          }
        }
      }

      // For non-admin/agent/technician roles - check ownership or assignment
      const isTechAssigned = userRole === "TECHNICIAN" && (
        complaint.assignedTo?._id?.toString() === currentUserId ||
        complaint.assignedTo?.toString() === currentUserId ||
        (complaint.assignedTeam?.members || []).some(m =>
          (m?._id?.toString() || m?.toString()) === currentUserId
        )
      );
      if (!isOwner && !isAdminOrAgent && !isTechAssigned) {
        return res.status(403).json({ success: false, message: "Access denied - You are not assigned to this complaint" });
      }

      // Format citizen info - hide email/phone if anonymous
      let citizenInfo = null;
      if (!complaint.isAnonymous && complaint.createdBy) {
        const citizen = complaint.createdBy;
        // Include contact info for: agents/managers/admin, OR the owner viewing their own complaint
        const showContactInfo = isAdminOrAgent || isOwner;
        citizenInfo = {
          _id: citizen._id,
          fullName: citizen.fullName,
          ...(showContactInfo && { email: citizen.email, phone: citizen.phone })
        };
      }

      // Compute SLA status from deadline (if present)
      const slaStatus = getSlaStatus(complaint.slaDeadline);

      // Map statusHistory to a simpler history array
      const createdById = complaint.createdBy?._id?.toString() || complaint.createdBy?.toString();
      const history = (complaint.statusHistory || []).map((entry) => {
        const entryUserId = entry.updatedBy?._id?.toString() || entry.updatedBy?.toString();
        const isCitizenEntry = entryUserId && entryUserId === createdById;
        return {
          status: entry.status,
          changedBy: entry.updatedBy
            ? { fullName: (complaint.isAnonymous && isCitizenEntry) ? "Anonymous" : entry.updatedBy.fullName }
            : null,
          date: entry.updatedAt,
          comment: entry.notes || null,
        };
      });

      // Separate internal notes (from comments marked isInternal)
      const allComments = complaint.comments || [];
      const publicComments = allComments
        .filter((c) => !c.isInternal && (c.type === "PUBLIC" || !c.type))
        .map((n) => ({
          content: n.text,
          text: n.text,
          author: n.author
            ? {
              _id: n.author._id,
              fullName: n.author.fullName,
            }
            : null,
          authorName: n.authorName || n.author?.fullName || "Citizen",
          authorRole: n.authorRole || "CITIZEN",
          date: n.createdAt,
          createdAt: n.createdAt,
        }));
      const internalNotes =
        userRole === "CITIZEN"
          ? []
          : allComments
            .filter((c) => c.isInternal)
            .map((n) => ({
              content: n.text,
              author: n.author
                ? {
                  _id: n.author._id,
                  fullName: n.author.fullName,
                }
                : null,
              date: n.createdAt,
              type: "NOTE",
            }));

      const canSeeMergedSubmitterName = ["ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"].includes(userRole);
      const duplicateOfId = complaint.duplicateOf?._id?.toString() || complaint.duplicateOf?.toString?.() || null;
      const duplicateOfReferenceId =
        complaint.duplicateOf?.referenceId || duplicateOfId;
      const duplicateOfTitle = complaint.duplicateOf?.title || null;
      const mergedComplaints = (complaint.mergedComplaints || [])
        .filter((merged) => merged.complaintId)
        .map((merged) => {
          const mergedComplaint = merged.complaintId;
          const mergedId = mergedComplaint?._id?.toString() || mergedComplaint?.toString?.() || "";
          return {
            complaintId: mergedId,
            _id: mergedId,
            referenceId: mergedComplaint.referenceId || mergedId,
            title: mergedComplaint.title || "",
            submittedBy: canSeeMergedSubmitterName
              ? mergedComplaint.createdBy?.fullName || "Citizen"
              : "Submitted by a citizen",
            municipality:
              mergedComplaint.municipalityName ||
              mergedComplaint.municipality?.name ||
              mergedComplaint.location?.municipality ||
              "",
            mergedAt: merged.mergedAt,
            similarityScore: merged.similarityScore,
          };
        });

      const response = {
        _id: complaint._id,
        complaintId: complaint._id.toString(),
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        urgencyLevel: complaint.urgency,
        status: complaint.status,
        scorePriorite: complaint.priorityScore || 0,
        slaDeadline: complaint.slaDeadline || null,
        slaStatus,
        location: complaint.location,
        createdBy: citizenInfo,
        departmentId: complaint.assignedDepartment || null,
        assignedDepartment: complaint.assignedDepartment || null,
        repairTeamId: complaint.assignedTeam || null,
        assignedTeam: complaint.assignedTeam || null,
        assignedTechnicians:
          complaint.assignedTeam && complaint.assignedTeam.members
            ? complaint.assignedTeam.members.map((m) => ({
              _id: m._id,
              fullName: m.fullName,
            }))
            : complaint.assignedTo
              ? [{ _id: complaint.assignedTo._id, fullName: complaint.assignedTo.fullName }]
              : [],
        media: complaint.media || [],
        photos: (complaint.media || []).map((m) => m.url).filter(Boolean),
        beforePhotos: complaint.beforePhotos || [],
        afterPhotos: complaint.afterPhotos || [],
        proofPhotos: (complaint.afterPhotos || []).map((m) => m.url).filter(Boolean),
        confirmations: complaint.confirmations || [],
        confirmationCount:
          complaint.confirmationCount ?? complaint.confirmations?.length ?? 0,
        upvotes: complaint.upvotes || [],
        upvoteCount: complaint.upvoteCount ?? complaint.upvotes?.length ?? 0,
        history,
        publicComments,
        internalNotes, // empty array for CITIZEN
        rejectionReason: complaint.rejectionReason || null,
        rejectionReasonText: complaint.rejectionReasonText || null,
        isDuplicate: Boolean(complaint.isDuplicate),
        duplicateStatus: complaint.duplicateStatus || null,
        duplicateOf: duplicateOfId,
        duplicateOfReferenceId,
        duplicateOfTitle,
        mergedAt: complaint.mergedAt || null,
        mergedBy: complaint.mergedBy || null,
        mergedComplaints,
        aiUrgencyPrediction: complaint.aiUrgencyPrediction || null,
        aiPredictedUrgency:
          complaint.aiPredictedUrgency ||
          complaint.aiUrgencyPrediction?.predictedUrgency ||
          null,
        aiDuplicateCheck: complaint.aiDuplicateCheck || null,
        resolutionNote: complaint.resolutionNotes || null,
        resolvedAt: complaint.resolvedAt || null,
        closedAt: complaint.closedAt || null,
        createdAt: complaint.createdAt,
        updatedAt: complaint.updatedAt,
      };

      res.json({ success: true, data: response });
    } catch (error) {
      console.error("Error fetching complaint:", error);
      // Provide more specific error messages
      if (error.name === "CastError") {
        return res.status(400).json({ success: false, message: "Invalid complaint ID" });
      }
      res.status(500).json({ success: false, message: "Error loading complaint" });
    }
  }

  async applyComplaintScope(query, req) {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role === "ADMIN") return;

    const user = await User.findById(userId)
      .populate("municipality")
      .select("department municipality municipalityName governorate")
      .lean();

    if (role === "MUNICIPAL_AGENT" || role === "CITIZEN") {
      const municipalityConditions = municipalityScopeConditions(user);
      if (municipalityConditions.length > 0) {
        addOrScope(query, municipalityConditions);
      } else if (user?.governorate) {
        query.governorate = user.governorate;
      } else if (role === "CITIZEN") {
        query.createdBy = userId;
      } else {
        query._id = null;
      }
      return;
    }

    if (role === "DEPARTMENT_MANAGER") {
      const municipalityConditions = municipalityScopeConditions(user);
      if (municipalityConditions.length > 0) {
        addOrScope(query, municipalityConditions);
      } else if (user?.governorate) {
        query.governorate = user.governorate;
      } else {
        let departmentId = user?.department;
        if (!departmentId) {
          const myDepartment = await Department.findOne({ responsable: userId }).select("_id").lean();
          departmentId = myDepartment?._id;
        }
        addOrScope(query, departmentScopeConditions(departmentId));
      }
      return;
    }

    if (role === "TECHNICIAN") {
      const departmentConditions = departmentScopeConditions(user?.department);
      if (departmentConditions.length > 0) {
        addOrScope(query, departmentConditions);
      } else {
        const RepairTeam = require("../models/RepairTeam");
        const teams = await RepairTeam.find({ members: userId }).select("_id").lean();
        addOrScope(query, [
          { assignedTo: userId },
          { assignedTeam: { $in: teams.map((team) => team._id) } },
        ]);
      }
    }
  }

  async getRecentResolutions(req, res) {
    try {
      const query = {
        status: { $in: ["RESOLVED", "CLOSED"] },
        resolvedAt: { $exists: true, $ne: null },
        isArchived: { $ne: true },
      };

      await this.applyComplaintScope(query, req);

      const complaints = await Complaint.find(query)
        .select("_id title category status urgency priorityScore resolvedAt createdAt updatedAt createdBy municipality municipalityName assignedDepartment location media afterPhotos proofPhotos confirmations upvotes confirmationCount upvoteCount")
        .populate("municipality", "name governorate")
        .sort({ resolvedAt: -1 })
        .limit(6)
        .lean();

      res.json({
        success: true,
        data: complaints.map((complaint) => ({
          _id: complaint._id,
          title: complaint.title,
          category: complaint.category,
          status: complaint.status,
          priority: complaint.urgency || complaint.priorityScore || null,
          resolvedAt: complaint.resolvedAt,
          municipalityName: complaint.municipalityName || complaint.location?.municipality || null,
          municipality: complaint.municipality || complaint.municipalityName || complaint.location?.municipality || null,
          createdBy: complaint.createdBy,
          assignedDepartment: complaint.assignedDepartment || null,
          media: complaint.media || null,
          afterPhotos: complaint.afterPhotos || null,
          proofPhotos: complaint.proofPhotos || null,
          confirmations: complaint.confirmations || [],
          upvotes: complaint.upvotes || [],
          confirmationCount: complaint.confirmationCount ?? complaint.confirmations?.length ?? 0,
          upvoteCount: complaint.upvoteCount ?? complaint.upvotes?.length ?? 0,
          createdAt: complaint.createdAt,
          updatedAt: complaint.updatedAt,
        })),
      });
    } catch (error) {
      console.error("Error fetching recent resolutions:", error);
      res.status(500).json({ success: false, message: "Failed to fetch recent resolutions" });
    }
  }

  // Get all complaints (admin/agent/manager/technician)
  async getAllComplaints(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status;
      const category = req.query.category;
      const governorate = req.query.governorate;
      const municipality = req.query.municipality;
      const search = req.query.search;
      const includeArchived = req.query.includeArchived === "true";
      const requestedStatuses =
        typeof status === "string"
          ? status
            .split(",")
            .map((value) => value.trim().toUpperCase())
            .filter((value) => value && value !== "ALL")
          : [];
      const allowedStatuses = ALL_STATUSES;

      const query = {};

      // Keep archived records out by default, but do not exclude any status.
      if (!includeArchived) {
        query.isArchived = { $ne: true };
      }

      if (requestedStatuses.length > 0) {
        const filteredStatuses = requestedStatuses.filter((value) =>
          allowedStatuses.includes(value),
        );

        if (filteredStatuses.length === 0) {
          query._id = null;
        } else if (filteredStatuses.length === 1) {
          query.status = filteredStatuses[0];
        } else {
          query.status = { $in: filteredStatuses };
        }
      }

      await this.applyComplaintScope(query, req);

      if (category) query.category = category;
      if (governorate && req.user.role === "ADMIN") query.governorate = governorate; // Admin can filter by governorate
      if (municipality && req.user.role === "ADMIN") {
        const normalizedMun = normalizeMunicipality(municipality);
        const muniConditions = [
          { municipalityName: { $regex: new RegExp(`^${escapeRegex(municipality)}$`, "i") } },
          { "location.municipality": { $regex: new RegExp(`^${escapeRegex(municipality)}$`, "i") } },
          { municipalityNormalized: normalizedMun }
        ];
        // Preserve any existing $or (role-based) using $and
        if (query.$or) {
          query.$and = [...(query.$and || []), { $or: query.$or }, { $or: muniConditions }];
          delete query.$or;
        } else {
          query.$or = muniConditions;
        }
      }

      if (search) {
        const safe = escapeRegex(search);
        const searchConditions = [
          { title: { $regex: safe, $options: "i" } },
          { description: { $regex: safe, $options: "i" } },
        ];
        // Preserve any existing $or (role-based) using $and
        if (query.$or) {
          query.$and = [...(query.$and || []), { $or: query.$or }, { $or: searchConditions }];
          delete query.$or;
        } else {
          query.$or = searchConditions;
        }
      }

      const skip = (page - 1) * limit;

      const [complaints, total] = await Promise.all([
        Complaint.find(query)
          .populate("createdBy", "fullName email phone governorate municipality")
          .populate("assignedTo", "fullName email")
          .populate("assignedTeam", "name members")
          .populate("assignedDepartment", "name categoryKey")
          .populate("municipality", "name governorate")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Complaint.countDocuments(query),
      ]);

      // Calculate SLA status for each complaint on the fly
      const complaintsResponse = complaints.map(c => {
        const complaint = c.toObject();
        if (complaint.slaDeadline && !['RESOLVED', 'CLOSED'].includes(complaint.status)) {
          const now = new Date();
          const deadline = new Date(complaint.slaDeadline);
          const created = new Date(complaint.createdAt);
          const totalMs = deadline - created;
          const elapsedMs = now - created;

          if (totalMs > 0) {
            const progress = (elapsedMs / totalMs) * 100;
            if (progress >= 100) complaint.slaStatus = 'OVERDUE';
            else if (progress >= 80) complaint.slaStatus = 'AT_RISK';
            else complaint.slaStatus = 'ON_TRACK';
          } else {
            complaint.slaStatus = 'OVERDUE';
          }
        }
        return complaint;
      });

      res.json({
        success: true,
        data: {
          complaints: complaintsResponse,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            totalCount: total,
            totalPages: Math.ceil(total / limit),
          },
        },
        totalCount: total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error("Error fetching complaints:", error);
      res.status(500).json({ success: false, message: "Failed to fetch complaints" });
    }
  }

  // Update complaint status (with role-based permissions - BL-21)
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;


      // Validate status using the new lifecycle
      const validStatuses = ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED", "REJECTED"];
      if (!validStatuses.includes(status)) {
        console.error(`[updateStatus] Invalid status: ${status}`);
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        console.error(`[updateStatus] Complaint not found: ${id}`);
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // authorization: only ADMIN or scoped MUNICIPAL_AGENT/DEPARTMENT_MANAGER
      if (userRole === "ADMIN") {
        // allowed
      } else if (userRole === "MUNICIPAL_AGENT") {
        const user = await User.findById(userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        const userMunicipalityId = user?.municipality?._id?.toString();
        const complaintMunicipalityId = complaint.municipality?._id?.toString();
        if (userMunicipalityId) {
          if (complaintMunicipalityId && userMunicipalityId !== complaintMunicipalityId) {
            console.error(`[updateStatus] Municipality mismatch for agent: user=${userMunicipalityId}, complaint=${complaintMunicipalityId}`);
            return res.status(403).json({ success: false, message: "Forbidden" });
          }
        }
      } else if (userRole === "DEPARTMENT_MANAGER") {
        // First check if user has department assigned in user profile
        const user = await User.findById(userId).select('department').lean();
        let myDepartmentId = null;

        if (user?.department) {
          myDepartmentId = user.department.toString();
        } else {
          // Fallback: try to find department where user is responsible
          const myDepartment = await Department.findOne({ responsable: userId }).select('_id').lean();
          if (myDepartment) {
            myDepartmentId = myDepartment._id.toString();
          }
        }

        if (!myDepartmentId) {
          console.error(`[updateStatus] No department assigned for manager: ${userId}`);
          return res.status(403).json({ success: false, message: "No department assigned" });
        }

        if (complaint.assignedDepartment?.toString() !== myDepartmentId) {
          console.error(`[updateStatus] Department mismatch: user=${myDepartmentId}, complaint=${complaint.assignedDepartment?.toString()}`);
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else {
        console.error(`[updateStatus] Unauthorized role: ${userRole}`);
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      // Update status
      const oldStatus = complaint.status;
      complaint.status = status;

      // Add to status history with actor info - validate userId is valid ObjectId
      if (!complaint.statusHistory) complaint.statusHistory = [];
      try {
        const mongoose = require('mongoose');
        if (mongoose.Types.ObjectId.isValid(userId)) {
          complaint.statusHistory.push({
            status: status,
            updatedBy: userId,
            updatedAt: new Date(),
            notes: rejectionReason || null
          });
        } else {
          console.error(`[updateStatus] Invalid userId for statusHistory: ${userId}`);
          complaint.statusHistory.push({
            status: status,
            updatedBy: null,
            updatedAt: new Date(),
            notes: rejectionReason || null
          });
        }
      } catch (historyError) {
        console.error(`[updateStatus] Error adding to statusHistory:`, historyError);
        // Continue without statusHistory if it fails
      }

      if (status === "REJECTED" && rejectionReason) {
        complaint.rejectionReason = rejectionReason;
      }

      if (status === "RESOLVED") {
        complaint.resolvedAt = new Date();
      }

      if (status === "CLOSED") {
        complaint.closedAt = new Date();
      }

      await complaint.save();

      // Notify citizen via Socket.IO
      try {
        const io = req.app?.get?.("io");
        if (complaint.createdBy) {
          await notificationService.notifyCitizenStatusChange(
            io,
            complaint.createdBy.toString(),
            complaint._id,
            status,
            { reason: rejectionReason }
          );
        }
        // Notify municipal agents when complaint is validated or assigned
        if (['VALIDATED', 'ASSIGNED'].includes(status) && complaint.municipality) {
          const agentsInMunicipality = await User.find({
            role: 'MUNICIPAL_AGENT',
            municipality: complaint.municipality
          }).select('_id').lean();
          if (agentsInMunicipality.length > 0) {
            await notificationService.sendNotificationToMultiple(io, agentsInMunicipality.map(a => a._id.toString()), {
              type: status.toLowerCase(),
              title: status === 'VALIDATED' ? 'Complaint Validated' : 'Complaint Assigned',
              message: `Complaint '${complaint.title}' has been ${status.toLowerCase()}.`,
              complaintId: complaint._id,
            });
          }
        }
      } catch (notifError) {
        console.error("[updateStatus] Failed to create notification:", notifError);
      }

      try {
        await logAction(req, "STATUS_CHANGED", "Complaint", complaint._id, { status: oldStatus }, { status });
      } catch (logError) {
        console.error("[updateStatus] Failed to log action:", logError);
      }

      res.json({
        success: true,
        message: "Complaint status updated",
        data: complaint,
      });
    } catch (error) {
      console.error("[updateStatus] Error updating complaint status:", error);
      console.error("[updateStatus] Error stack:", error.stack);
      console.error("[updateStatus] Error name:", error.name);
      console.error("[updateStatus] Error message:", error.message);
      
      // Provide specific error messages based on error type
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          success: false, 
          message: "Validation error: " + error.message,
          details: error.errors 
        });
      }
      if (error.name === 'CastError') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid data format: " + error.message 
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: "Failed to update complaint status: " + error.message 
      });
    }
  }

  // Assign complaint to technician (admin/agent)
  async assignComplaint(req, res) {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;
      const userRole = req.user.role;
      const userId = req.user.userId;

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // authorization same as updateStatus
      if (userRole === "ADMIN") {
        // ok
      } else if (userRole === "MUNICIPAL_AGENT") {
        const user = await User.findById(userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        const userMunicipalityId = user?.municipality?._id?.toString();
        const complaintMunicipalityId = complaint.municipality?._id?.toString();
        if (userMunicipalityId && complaintMunicipalityId && userMunicipalityId !== complaintMunicipalityId) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else if (userRole === "DEPARTMENT_MANAGER") {
        const myDepartment = await Department.findOne({ responsable: userId }).select('_id').lean();
        if (!myDepartment || complaint.assignedDepartment?.toString() !== myDepartment._id.toString()) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      // Verify technician exists
      const technician = await User.findById(assignedToId);
      if (!technician || technician.role !== "TECHNICIAN") {
        return res.status(400).json({ success: false, message: "Invalid technician" });
      }

      complaint.assignedTo = assignedToId;
      // Auto-transition to IN_PROGRESS when technician is assigned
      if (complaint.status === "ASSIGNED" || complaint.status === "VALIDATED") {
        complaint.status = "IN_PROGRESS";
      }
      await complaint.save();

      // Notify technician via Socket.IO
      try {
        const io = req.app?.get?.("io");
        await notificationService.sendNotification(io, assignedToId.toString(), {
          type: 'assigned',
          title: 'New Assignment',
          message: `You have been assigned to complaint: ${complaint.title}`,
          complaintId: complaint._id,
          metadata: { assignedBy: userId, role: userRole },
        });
      } catch (notifError) {
        console.error("Failed to create notification:", notifError);
      }

      logAction(req, "COMPLAINT_ASSIGNED", "Complaint", complaint._id, null, { assignedTo: assignedToId });

      res.json({
        success: true,
        message: "Complaint assigned successfully",
        data: complaint,
      });
    } catch (error) {
      console.error("Error assigning complaint:", error);
      res.status(500).json({ success: false, message: "Failed to assign complaint" });
    }
  }

  // Assign complaint to department
  async assignDepartment(req, res) {
    try {
      const { id } = req.params;
      const { departmentId } = req.body;
      const userRole = req.user.role;
      const userId = req.user.userId;

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // Authorization same as updateStatus
      if (userRole === "ADMIN") {
        // ok
      } else if (userRole === "MUNICIPAL_AGENT") {
        const user = await User.findById(userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        const userMunicipalityId = user?.municipality?._id?.toString();
        const complaintMunicipalityId = complaint.municipality?._id?.toString();
        if (userMunicipalityId && complaintMunicipalityId && userMunicipalityId !== complaintMunicipalityId) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else if (userRole === "DEPARTMENT_MANAGER") {
        const myDepartment = await Department.findOne({ responsable: userId }).select('_id').lean();
        if (!myDepartment || departmentId !== myDepartment._id.toString()) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      // Verify department exists
      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(400).json({ success: false, message: "Invalid department" });
      }

      complaint.assignedDepartment = {
        id: department._id,
        name: department.name
      };
      // Auto-validate and assign if not already validated
      if (complaint.status === "SUBMITTED") {
        complaint.status = "VALIDATED";
      }
      // If already validated, set to ASSIGNED when department is assigned
      if (complaint.status === "VALIDATED") {
        complaint.status = "ASSIGNED";
      }
      await complaint.save();

      // Send notifications
      const io = req.app?.get?.("io");
      if (io) {
        try {
          const notificationService = require("../services/notification.service");
          // Notify citizen with real message including department name
          if (complaint.createdBy) {
            await notificationService.notifyCitizenStatusChange(
              io,
              complaint.createdBy.toString(),
              complaint._id,
              'ASSIGNED',
              { departmentName: department.name }
            );
          }
          // Notify department managers
          await notificationService.notifyManagersByDepartment(io, departmentId, {
            type: "department_assigned",
            title: "New Complaint Assigned",
            message: `Complaint '${complaint.title}' has been assigned to your department (${department.name}).`,
            complaintId: complaint._id,
          });
          // Notify all technicians in that department
          const techsInDept = await User.find({ role: 'TECHNICIAN', department: departmentId }).select('_id').lean();
          if (techsInDept.length > 0) {
            await notificationService.sendNotificationToMultiple(io, techsInDept.map(t => t._id.toString()), {
              type: 'assigned',
              title: 'New Complaint Assignment',
              message: `Complaint '${complaint.title}' has been assigned to your team.`,
              complaintId: complaint._id,
            });
          }
          // Notify municipal agents in the same municipality
          if (complaint.municipality) {
            const agentsInMunicipality = await User.find({
              role: 'MUNICIPAL_AGENT',
              municipality: complaint.municipality
            }).select('_id').lean();
            if (agentsInMunicipality.length > 0) {
              await notificationService.sendNotificationToMultiple(io, agentsInMunicipality.map(a => a._id.toString()), {
                type: 'assigned',
                title: 'New Complaint in Your Area',
                message: `Complaint '${complaint.title}' has been assigned to ${department.name}.`,
                complaintId: complaint._id,
              });
            }
          }
        } catch (err) {
          console.error("Notification failed:", err);
        }
      }

      res.json({
        success: true,
        message: "Department assigned successfully",
        data: complaint,
      });
    } catch (error) {
      console.error("Error assigning department:", error);
      res.status(500).json({ success: false, message: "Failed to assign department" });
    }
  }

  // Update complaint priority/urgency
  async updatePriority(req, res) {
    try {
      const { id } = req.params;
      const { urgency, priorityScore } = req.body;
      const userRole = req.user.role;
      const userId = req.user.userId;

      // Validate urgency
      const validUrgencies = ["LOW", "MEDIUM", "HIGH", "URGENT"];
      if (urgency && !validUrgencies.includes(urgency)) {
        return res.status(400).json({ success: false, message: "Invalid urgency level" });
      }

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // Authorization same as updateStatus
      if (userRole === "ADMIN") {
        // ok
      } else if (userRole === "MUNICIPAL_AGENT") {
        const user = await User.findById(userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        const userMunicipalityId = user?.municipality?._id?.toString();
        const complaintMunicipalityId = complaint.municipality?._id?.toString();
        if (userMunicipalityId && complaintMunicipalityId && userMunicipalityId !== complaintMunicipalityId) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else if (userRole === "DEPARTMENT_MANAGER") {
        // First check if user has department assigned in user profile
        const user = await User.findById(userId).select('department').lean();
        let myDepartmentId = null;

        if (user?.department) {
          myDepartmentId = user.department.toString();
        } else {
          // Fallback: try to find department where user is responsible
          const myDepartment = await Department.findOne({ responsable: userId }).select('_id').lean();
          if (myDepartment) {
            myDepartmentId = myDepartment._id.toString();
          }
        }

        if (!myDepartmentId) {
          return res.status(403).json({ success: false, message: "No department assigned" });
        }

        if (complaint.assignedDepartment?.toString() !== myDepartmentId) {
          return res.status(403).json({ success: false, message: "Forbidden" });
        }
      } else {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      if (urgency) {
        complaint.urgency = urgency;
      }
      if (priorityScore !== undefined) {
        complaint.priorityScore = priorityScore;
      } else if (urgency) {
        // Calculate priority score based on urgency
        const priorityMap = { LOW: 1, MEDIUM: 5, HIGH: 8, URGENT: 10 };
        complaint.priorityScore = priorityMap[urgency] || 5;
      }
      await complaint.save();

      res.json({
        success: true,
        message: "Priority updated successfully",
        data: complaint,
      });
    } catch (error) {
      console.error("Error updating priority:", error);
      res.status(500).json({ success: false, message: "Failed to update priority" });
    }
  }

  // Archive complaint (admin only)
  async archiveComplaint(req, res) {
    try {
      const { id } = req.params;

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      complaint.isArchived = true;
      complaint.archivedAt = new Date();
      await complaint.save();

      logAction(req, "COMPLAINT_ARCHIVED", "Complaint", complaint._id, { isArchived: false }, { isArchived: true });

      res.json({
        success: true,
        message: "Complaint archived successfully",
        data: complaint,
      });
    } catch (error) {
      console.error("Error archiving complaint:", error);
      res.status(500).json({ success: false, message: "Failed to archive complaint" });
    }
  }

  // Unarchive complaint (admin only)
  async unarchiveComplaint(req, res) {
    try {
      const { id } = req.params;

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      complaint.isArchived = false;
      complaint.archivedAt = null;
      await complaint.save();

      logAction(req, "COMPLAINT_UNARCHIVED", "Complaint", complaint._id, { isArchived: true }, { isArchived: false });

      res.json({
        success: true,
        message: "Complaint unarchived successfully",
        data: complaint,
      });
    } catch (error) {
      console.error("Error unarchiving complaint:", error);
      res.status(500).json({ success: false, message: "Failed to unarchive complaint" });
    }
  }

  // Add comment to complaint
  async addComment(req, res) {
    try {
      const { id } = req.params;
      const { text, type, isInternal } = req.body;
      const userId = req.user.userId;
      const userRole = req.user.role;
      const commentType = type || (isInternal ? "NOTE" : "NOTE");

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ success: false, message: "Comment text is required" });
      }

      const complaint = await Complaint.findById(id);

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // authorization: only owner or admin/agents or assigned technician
      const isOwner = complaint.createdBy?.toString() === userId;
      const isAdminOrAgent = ["ADMIN", "MUNICIPAL_AGENT", "DEPARTMENT_MANAGER"].includes(userRole);
      const assignedToArray = Array.isArray(complaint.assignedTo) ? complaint.assignedTo : [complaint.assignedTo];
      const isTechnician = userRole === "TECHNICIAN" && assignedToArray.some(a => a?.toString() === userId);

      // Only staff can create NOTE, BLOCAGE, PUBLIC types
      const isStaff = isAdminOrAgent || isTechnician;

      if (!isOwner && !isStaff) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      // Only staff can set type, citizens can only add public comments
      const finalType = isStaff ? commentType : "PUBLIC";

      // Get author name for notification
      const authorUser = await User.findById(userId).select("fullName").lean();
      const authorName = authorUser?.fullName || "Staff";

      complaint.comments.push({
        text: text.trim(),
        author: userId,
        authorName: authorName,
        authorRole: userRole,
        type: finalType,
        isInternal: finalType === "NOTE",
        createdAt: new Date(),
      });

      await complaint.save();

      // Populate the new comment
      const updatedComplaint = await Complaint.findById(id)
        .populate("comments.author", "fullName");

      const newComment = updatedComplaint.comments[updatedComplaint.comments.length - 1];

      // If PUBLIC note → notify citizen
      if (finalType === "PUBLIC" && complaint.createdBy) {
        const io = req.app?.get?.("io");
        if (io) {
          try {
            await notificationService.sendNotification(io, complaint.createdBy.toString(), {
              type: "public_note",
              title: "New Update on Your Complaint",
              message: `New update on your complaint ${complaint.referenceId || complaint._id}: "${text.trim().slice(0, 50)}${text.length > 50 ? '...' : ''}"`,
              complaintId: complaint._id,
              metadata: { commentId: newComment._id, commentAuthor: authorName },
            });
          } catch (notifError) {
            console.error("Failed to send notification:", notifError);
          }
        }
      }

      res.json({
        success: true,
        message: "Comment added",
        data: newComment,
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ success: false, message: "Failed to add comment" });
    }
  }

  // Submit rating for a resolved complaint
  async submitRating(req, res) {
    try {
      const { id } = req.params;
      const { score, resolvedCorrectly, comment } = req.body;
      const userId = req.user.userId;

      const complaint = await Complaint.findById(id);
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      // Only the citizen who created the complaint can rate it
      const createdById = complaint.createdBy?.toString();
      if (createdById !== userId) {
        return res.status(403).json({ success: false, message: "Only the complaint owner can submit a rating" });
      }

      // Complaint must be resolved or closed
      if (!["RESOLVED", "CLOSED"].includes(complaint.status)) {
        return res.status(400).json({ success: false, message: "Cannot rate a complaint that is not resolved" });
      }

      // Validate score (1-5)
      const scoreNum = parseInt(score);
      if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5) {
        return res.status(400).json({ success: false, message: "Rating score must be between 1 and 5" });
      }

      // Update rating
      complaint.rating = {
        score: scoreNum,
        comment: comment || "",
        createdAt: new Date(),
      };

      // Optional: store resolvedCorrectly as a separate field or in comment metadata
      if (resolvedCorrectly !== undefined) {
        complaint.rating.resolvedCorrectly = resolvedCorrectly;
      }

      await complaint.save();

      // Send notification to assigned agent/technician
      try {
        const io = req.app?.get?.("io");
        if (io) {
          // Notify the agent who closed the complaint (closedBy) or assigned agent
          let notifieeId = complaint.closedBy || complaint.assignedBy;
          if (notifieeId) {
            await notificationService.sendNotification(io, notifieeId.toString(), {
              type: "complaint_rated",
              title: "New Feedback Received",
              message: `Citizen rated complaint "${complaint.title}" with ${scoreNum}/5 stars`,
              complaintId: complaint._id,
              metadata: { score: scoreNum, comment: comment || '' },
            });
          }
        }
      } catch (notifErr) {
        console.error("Failed to send rating notification:", notifErr.message);
      }

      res.json({
        success: true,
        message: "Rating submitted successfully",
        data: complaint.rating,
      });
    } catch (error) {
      console.error("Error submitting rating:", error);
      res.status(500).json({ success: false, message: "Failed to submit rating" });
    }
  }

  // Get complaint statistics
  async getStats(req, res) {
    try {
      const query = {};

      // Role-based filtering
      if (req.user.role === "DEPARTMENT_MANAGER") {
        const myDepartment = await Department.findOne({
          responsable: req.user.userId
        }).select('_id').lean();

        if (myDepartment) {
          query.assignedDepartment = myDepartment._id;
        } else {
          query._id = null;
        }
      } else if (req.user.role === "MUNICIPAL_AGENT") {
        const user = await User.findById(req.user.userId)
          .populate('municipality', 'name governorate')
          .select('municipality municipalityName governorate')
          .lean();

        // Get municipality name from either populated municipality or municipalityName field
        let municipalityName = user?.municipalityName || "";
        if (user?.municipality && typeof user.municipality === 'object') {
          municipalityName = user.municipality.name || municipalityName;
        }

        if (municipalityName) {
          // Normalize municipality name for matching
          const normalizedMun = normalizeMunicipality(municipalityName);
          const munRegex = new RegExp("^" + normalizedMun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i");

          // Match complaints by municipality (same pattern as agent routes)
          query.$or = [
            { municipalityNormalized: normalizedMun },
            { municipalityName: munRegex },
            { "location.municipality": munRegex }
          ];
        } else if (user?.governorate) {
          query.governorate = user.governorate;
        }
      }

      const activeQuery = {
        ...query,
        status: { $in: ACTIVE_STATUSES },
        isArchived: { $ne: true },
      };
      const historicalQuery = { ...query };

      // For validated today: complaints validated today
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const [historicalTotal, activeTotal, submitted, validated, assigned, inProgress, resolved, closed, rejected, byCategory, byMonth, overdue, atRisk, resolvedWithRatingCount, csatCount, validatedToday] = await Promise.all([
        Complaint.countDocuments(historicalQuery),
        Complaint.countDocuments(activeQuery),
        Complaint.countDocuments({ ...activeQuery, status: "SUBMITTED" }),
        Complaint.countDocuments({ ...activeQuery, status: "VALIDATED" }),
        Complaint.countDocuments({ ...activeQuery, status: "ASSIGNED" }),
        Complaint.countDocuments({ ...activeQuery, status: "IN_PROGRESS" }),
        Complaint.countDocuments({ ...activeQuery, status: "RESOLVED" }),
        Complaint.countDocuments({ ...historicalQuery, status: "CLOSED" }),
        Complaint.countDocuments({ ...historicalQuery, status: "REJECTED" }),
        Complaint.aggregate([
          { $match: activeQuery },
          { $group: { _id: "$category", count: { $sum: 1 } } }
        ]),
        Complaint.aggregate([
          { $match: { ...activeQuery, createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
          { $group: { _id: { $substr: [{ $dateToString: { format: "%Y-%m", date: "$createdAt" } }, 0, 7] }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
          { $limit: 6 }
        ]),
        // Overdue calculation: different for manager vs agent
        req.user.role === "DEPARTMENT_MANAGER"
          ? Complaint.countDocuments({
            ...query, // Use historicalQuery base but apply role filter
            updatedAt: { $lt: new Date(Date.now() - 72 * 60 * 60 * 1000) },
            status: { $nin: ["RESOLVED", "CLOSED"] },
            isArchived: { $ne: true }
          })
          : Complaint.countDocuments({ ...activeQuery, slaStatus: "OVERDUE", status: { $in: ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS"] } }),
        Complaint.countDocuments({ ...activeQuery, slaStatus: "AT_RISK", status: { $in: ["SUBMITTED", "VALIDATED", "ASSIGNED", "IN_PROGRESS"] } }),
        // Count resolved/closed complaints that have a rating
        Complaint.countDocuments({ ...historicalQuery, status: { $in: ["RESOLVED", "CLOSED"] }, "rating.score": { $exists: true, $ne: null } }),
        // Count complaints with rating score >= 4 (CSAT)
        Complaint.countDocuments({ ...historicalQuery, status: { $in: ["RESOLVED", "CLOSED"] }, "rating.score": { $gte: 4 } }),
        // Validated today: complaints where statusHistory has VALIDATED entry today
        Complaint.countDocuments({
          ...query, // Apply role-based filter
          "statusHistory": {
            $elemMatch: {
              status: "VALIDATED",
              updatedAt: { $gte: startOfDay, $lt: endOfDay }
            }
          }
        }),
      ]);

      const total = historicalTotal; // all statuses
      const resolutionRate = activeTotal > 0 ? Math.round((resolved + closed) / activeTotal * 100) : 0;

      const avgTimeResult = await Complaint.aggregate([
        { $match: { ...historicalQuery, status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $exists: true } } },
        { $group: { _id: null, avgTime: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } } } }
      ]);
      const averageResolutionTime = avgTimeResult[0] ? Math.round(avgTimeResult[0].avgTime / (1000 * 60 * 60)) : 0;

      // Calculate SLA compliance rate: (resolved/closed with slaStatus COMPLETED) / (resolved+closed)
      const resolvedCount = resolved + closed;
      const onTimeCountResult = await Complaint.countDocuments({ ...historicalQuery, status: { $in: ["RESOLVED", "CLOSED"] }, slaStatus: "COMPLETED" });
      const slaComplianceRate = resolvedCount > 0 ? Math.round((onTimeCountResult / resolvedCount) * 100) : 0;

      // Calculate CSAT: (ratings >= 4) / total ratings * 100
      const totalRatings = resolvedWithRatingCount;
      const csat = totalRatings > 0 ? Math.round((csatCount / totalRatings) * 100) : 0;

      res.json({
        success: true,
        data: {
          total,
          historicalTotal,
          submitted,
          pending: submitted,
          validated,
          assigned,
          inProgress,
          resolved,
          closed,
          rejected,
          totalOverdue: overdue,
          totalAtRisk: atRisk,
          resolutionRate,
          averageResolutionTime,
          slaComplianceRate,
          csat,
          totalRatings,
          validatedToday,
          byCategory: byCategory.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          byMonth: byMonth.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
        },
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch statistics" });
    }
  }

  // Get available technicians (for assignment)
  async getTechnicians(req, res) {
    try {
      const { governorate, department } = req.query;

      const query = { role: "TECHNICIAN", isActive: true };

      // Filter by department if provided (without using inheritance)
      if (department) {
        query.department = department;
      }

      // Role-based filtering
      if (req.user.role === "DEPARTMENT_MANAGER") {
        // Get technicians in the manager's department
        const myDepartment = await Department.findOne({
          responsable: req.user.userId
        }).select('_id').lean();

        if (myDepartment) {
          // Managers can only see technicians in their department
          query.department = myDepartment._id;
        }
      } else if (req.user.role === "MUNICIPAL_AGENT") {
        const user = await User.findById(req.user.userId)
          .populate('municipality')
          .select('municipality governorate')
          .lean();
        if (user?.municipality?._id) {
          query.municipality = user.municipality._id;
        } else if (user?.governorate) {
          query.governorate = user.governorate;
        }
      } else if (governorate) {
        query.governorate = governorate;
      }

      const technicians = await User.find(query)
        .populate('department', 'name')
        .populate('municipality', 'name governorate')
        .select("fullName email governorate municipality department");

      res.json({
        success: true,
        data: technicians,
      });
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ success: false, message: "Failed to fetch technicians" });
    }
  }
}

module.exports = new ComplaintController();
module.exports = new ComplaintController();
