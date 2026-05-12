const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify SMTP connection on startup
transporter.verify((error) => {
  if (error) {
    // SMTP connection error
  }
});

const from = process.env.MAIL_FROM || process.env.SMTP_USER;

// Department name translation mapping (French to English)
const departmentTranslations = {
  "Déchets et Propreté": "Waste and Cleanliness",
  "Déchets": "Waste",
  "Propreté": "Cleanliness",
  "Routes et Circulation": "Roads and Traffic",
  "Routes": "Roads",
  "Circulation": "Traffic",
  "Éclairage Public": "Public Lighting",
  "Éclairage": "Lighting",
  "Eau et Drainage": "Water and Drainage",
  "Eau": "Water",
  "Drainage": "Drainage",
  "Sécurité et Bruit": "Safety and Noise",
  "Sécurité": "Safety",
  "Propriété Publique": "Public Property",
  "Parcs et Espaces Verts": "Parks and Green Spaces",
  "Parcs": "Parks",
  "Urbanisme": "Urban Planning",
  "Équipement Public": "Public Equipment",
  "Autre": "Other",
  "Technical Department": "Technical Department"
};

const translateDepartmentName = (departmentName, language = 'en') => {
  if (!departmentName) return 'Technical Department';
  
  // If language is not English, return as-is
  if (language !== 'en') {
    return departmentName;
  }
  
  // If already in English, return as-is
  if (Object.values(departmentTranslations).includes(departmentName)) {
    return departmentName;
  }
  
  // Translate French to English
  return departmentTranslations[departmentName] || departmentName;
};

// Send account verification email
const sendMagicLinkEmail = async (to, userId, token, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const magicLink = `${frontendUrl}/verify-account?token=${token}&id=${userId}`;
  const userName = fullName || to.split('@')[0] || "User";

  console.log(`[mailer] sendMagicLinkEmail called with:`, {
    to,
    userId,
    token: token ? `${token.substring(0, 8)}...` : 'MISSING',
    fullName,
    frontendUrl,
    magicLink: magicLink.substring(0, 100) + '...',
    from,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 3)}...` : 'NOT_SET',
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Smart City Tunisia - Verify your account",
      text: `Hi ${userName}, click here to verify your account: ${magicLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
          </div>
          <p>Hi <strong>${userName}</strong>,</p>
          <p>Please click the button below to verify your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background: #2E7D32; color: white; padding: 15px 30px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Verify Account
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">
            If you didn't create this account, you can ignore this email.
          </p>
        </div>
      `,
    });
    console.log(`[mailer] Magic link email sent successfully to ${to}`);
  } catch (error) {
    console.error(`[mailer] Failed to send magic link email to ${to}:`, error.message);
    console.error(`[mailer] Error details:`, {
      name: error.name,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (to, userId, token, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password?token=${token}&id=${userId}`;
  const userName = fullName || to.split('@')[0] || "User";

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Smart City Tunisia - Reset your password",
      text: `Hi ${userName}, click to reset your password: ${resetLink} (expires in 1 hour)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
          </div>
          <p>Hi <strong>${userName}</strong>,</p>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #2E7D32; color: white; padding: 15px 30px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Reset My Password
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">
            This link expires in <strong>1 hour</strong>.<br/>
            If you didn't request this, you can ignore this email and your password will remain unchanged.
          </p>
        </div>
      `,
    });
    console.log(`[mailer] Password reset email sent to ${to}`);
  } catch (error) {
    console.error(`[mailer] Failed to send password reset email to ${to}:`, error.message);
    throw error;
  }
};

// Send login email reminder
const sendLoginEmailReminder = async (to, fullName, email) => {
  const userName = fullName || to.split('@')[0] || "User";
  
  await transporter.sendMail({
    from,
    to,
    subject: "Smart City Tunisia - Your login email",
    text: `Hi ${userName}, your login email is: ${email}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hi <strong>${userName}</strong>,</p>
        <p>Your login email for Smart City Tunisia is:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <strong style="font-size: 18px;">${email}</strong>
        </div>
        <p>Use this email address to log in to your account.</p>
        <p style="color: #666; font-size: 12px;">
          If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  });
};

// Send account invitation email (admin created user)
const sendInvitationEmail = async (to, userId, token, fullName, role) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const invitationLink = `${frontendUrl}/set-password?token=${token}&email=${encodeURIComponent(to)}`;
  const userName = fullName || to.split('@')[0] || "User";

  console.log(`[mailer] sendInvitationEmail called with:`, {
    to,
    userId,
    token: token ? `${token.substring(0, 8)}...` : 'MISSING',
    fullName,
    role,
    frontendUrl,
    invitationLink: invitationLink.substring(0, 100) + '...',
    from,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 3)}...` : 'NOT_SET',
  });

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Smart City Tunisia - Account Invitation",
      text: `Hi ${userName}, you've been invited to join Smart City Tunisia as ${role}. Click to set your password and activate your account: ${invitationLink} (expires in 24 hours)`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
          </div>
          <p>Hi <strong>${userName}</strong>,</p>
          <p>You've been invited to join Smart City Tunisia as <strong>${role}</strong>.</p>
          <p>Click the button below to set your password and activate your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" style="background: #2E7D32; color: white; padding: 15px 30px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
              Set Password & Activate Account
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">
            This link expires in <strong>24 hours</strong>.<br/>
            If you didn't expect this invitation, you can ignore this email.
          </p>
        </div>
      `,
    });
    console.log(`[mailer] Invitation email sent successfully to ${to}`);
  } catch (error) {
    console.error(`[mailer] Failed to send invitation email to ${to}:`, error.message);
    console.error(`[mailer] Error details:`, {
      name: error.name,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
    });
    throw error;
  }
};

// Send complaint status update email
const sendComplaintStatusEmail = async (to, fullName, complaintTitle, status, complaintId) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const userName = fullName || to.split('@')[0] || "User";
  
  const statusLabels = {
    'VALIDATED': { label: 'Validated', color: '#2196F3', description: 'Your complaint has been reviewed and validated. It will be processed shortly.' },
    'REJECTED': { label: 'Rejected', color: '#F44336', description: 'Your complaint has been reviewed and rejected.' },
    'ASSIGNED': { label: 'Assigned', color: '#FF9800', description: 'Your complaint has been assigned to a department for processing.' },
    'IN_PROGRESS': { label: 'In Progress', color: '#FF9800', description: 'Your complaint is currently being worked on.' },
    'RESOLVED': { label: 'Resolved', color: '#4CAF50', description: 'Your complaint has been resolved.' },
    'CLOSED': { label: 'Closed', color: '#9E9E9E', description: 'Your complaint has been closed.' },
  };

  const statusInfo = statusLabels[status] || { label: status, color: '#607D8B', description: `Your complaint status has been updated to ${status}.` };

  try {
    await transporter.sendMail({
      from,
      to,
      subject: `Smart City Tunisia - Complaint ${statusInfo.label}: ${complaintTitle}`,
      text: `Hi ${userName}, ${statusInfo.description} Complaint: "${complaintTitle}"`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
          </div>
          <p>Hi <strong>${userName}</strong>,</p>
          <div style="background: ${statusInfo.color}15; border-left: 4px solid ${statusInfo.color}; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #333;">
              <strong style="color: ${statusInfo.color};">${statusInfo.label}</strong>
            </p>
            <p style="margin: 8px 0 0; font-size: 13px; color: #555;">${statusInfo.description}</p>
          </div>
          <p><strong>Complaint:</strong> ${complaintTitle}</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/complaints/${complaintId}" style="background: #2E7D32; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
              View Complaint
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">
            You received this email because you submitted a complaint on Smart City Tunisia.
          </p>
        </div>
      `,
    });
    console.log(`[mailer] Status email sent to ${to} for complaint ${complaintId}`);
  } catch (error) {
    console.error(`[mailer] Failed to send status email to ${to}:`, error.message);
    // Don't throw - email failure should not block the main flow
  }
};

const emailTemplates = require('./emailTemplates.js');

/**
 * Send assignment emails to all parties (REQ #4)
 * @param {Object} complaint - Full complaint object
 * @param {string} departmentName - Assigned department name
 * @param {Array} technicianEmails - Tech emails
 * @param {Object} managerUser - Manager who assigned
 */
const sendAssignmentEmails = async (complaint, departmentName, technicianEmails = [], managerUser = {}) => {
  const { FRONTEND_URL = 'http://localhost:3000' } = process.env;
  const municipalityZone = complaint.municipalityName || complaint.location?.municipality || 'your area';
  const submitDate = complaint.createdAt;

  try {
    // 1. Citizen email
    if (complaint.createdBy) {
      const User = require('../models/User');
      const citizen = await User.findById(complaint.createdBy).select('fullName email firstName').lean();
      if (citizen?.email && citizen.firstName) {
        const template = emailTemplates.assignmentCitizenEmail(citizen.firstName, complaint.title, submitDate, departmentName);
        await transporter.sendMail({
          from,
          to: citizen.email,
          subject: template.subject,
          html: template.html.replace(/\${FRONTEND_URL}/g, FRONTEND_URL)
        });
        console.log(`[mailer] Assignment citizen email → ${citizen.email}`);
      }
    }

    // 2. Technician emails
    for (const techEmail of technicianEmails) {
      const template = emailTemplates.assignmentTechnicianEmail('Technician', complaint.title, municipalityZone, departmentName);
      await transporter.sendMail({
        from,
        to: techEmail,
        subject: template.subject,
        html: template.html.replace(/\${FRONTEND_URL}/g, FRONTEND_URL)
      });
      console.log(`[mailer] Assignment tech email → ${techEmail}`);
    }

    // 3. Manager confirmation
    if (managerUser.email) {
      const template = emailTemplates.assignmentManagerEmail(complaint.title, departmentName, new Date());
      await transporter.sendMail({
        from,
        to: managerUser.email,
        subject: template.subject,
        html: template.html.replace(/\${FRONTEND_URL}/g, FRONTEND_URL)
      });
      console.log(`[mailer] Assignment manager confirmation → ${managerUser.email}`);
    }
  } catch (error) {
    console.error('[mailer] Assignment emails failed:', error.message);
    // Don't block - log only
  }
};

/**
 * Centralized notification email dispatcher (REQ #4)
 * @param {string} type - Event type (e.g. 'complaint_submitted', 'validated', 'priority_changed')
 * @param {Object} recipientUser - User object with role, firstName, email, municipalityName, department.name
 * @param {Object} complaintData - Complaint with title, municipalityName, zone/location, assignedDepartment {name}
 * @param {Object} extras - {reason, newPriority, managerName, departmentName, etc.}
 */
const sendNotificationEmail = async (type, recipientUser, complaintData = {}, extras = {}) => {
  const emailTemplates = require('./emailTemplates.js');
  const { FRONTEND_URL = 'http://localhost:3000' } = process.env;
  const { role, fullName, email, municipalityName, department, language } = recipientUser;
  const { title = 'Complaint', municipalityName: complaintMunicipality, location } = complaintData;
  
  // Fallback for fullName to prevent "undefined" in emails
  const displayName = fullName || recipientUser?.name || recipientUser?.firstName || recipientUser?.username || email?.split('@')[0] || 'User';
  const zone = location?.zone || location?.municipality || complaintMunicipality || 'your area';
  const rawDepartmentName = extras.departmentName || department?.name || 'Technical Department';
  const departmentName = translateDepartmentName(rawDepartmentName, language || 'en');

  try {
    let template;

    switch (type) {
      case 'complaint_submitted':
        if (role === 'AGENT') {
          template = emailTemplates.newComplaintAgent(displayName, title, zone, municipalityName);
        }
        break;
      case 'validated':
        if (role === 'CITIZEN') {
          template = emailTemplates.complaintValidatedCitizen(displayName, title);
        }
        break;
      case 'rejected':
        if (role === 'CITIZEN') {
          template = emailTemplates.complaintRejectedCitizen(displayName, title, extras.reason || 'Not specified');
        }
        break;
      case 'assigned':
        if (role === 'CITIZEN') {
          template = emailTemplates.complaintAssignedCitizen(displayName, title, departmentName);
        } else if (role === 'TECHNICIAN') {
          template = emailTemplates.complaintAssignedTechnician(displayName, title, departmentName, zone);
        }
        break;
      case 'assigned_department':
        if (role === 'CITIZEN') {
          template = emailTemplates.complaintAssignedCitizen(displayName, title, departmentName);
        } else if (role === 'TECHNICIAN') {
          template = emailTemplates.complaintAssignedTechnician(displayName, title, departmentName, zone);
        }
        break;
      case 'priority_changed':
        if (role === 'AGENT') {
          template = emailTemplates.priorityChangedAgent(displayName, title, extras.newPriority, extras.managerName || 'Manager');
        }
        break;
      case 'status_in_progress':
        if (role === 'CITIZEN') {
          template = emailTemplates.statusInProgressCitizen(displayName, title);
        }
        break;
      case 'resolved':
        if (role === 'CITIZEN') {
          template = emailTemplates.complaintResolvedCitizen(displayName, title);
        }
        break;
      case 'closed':
        if (role === 'CITIZEN') {
          template = emailTemplates.complaintClosedCitizen(displayName, title);
        }
        break;
      case 'upvoted':
        if (role === 'AGENT') {
          template = emailTemplates.complaintUpvotedAgent(displayName, title);
        }
        break;
      default:
        console.log(`[mailer] No email template for type: ${type}, role: ${role}`);
        return;
    }

    if (template) {
      const htmlContent = template.html.replace(/\${FRONTEND_URL}/g, FRONTEND_URL);
      await transporter.sendMail({
        from,
        to: email,
        subject: template.subject,
        html: htmlContent,
      });
      console.log(`[mailer] Notification email (${type}) sent to ${email} for "${title}"`);
    }
  } catch (error) {
    console.error(`[mailer] Failed to send notification email (${type}) to ${email}:`, error.message);
    // Non-blocking
  }
};

module.exports = {
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendLoginEmailReminder,
  sendInvitationEmail,
  sendComplaintStatusEmail,
  sendAssignmentEmails,
  sendNotificationEmail,  // NEW CENTRALIZED
};

