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

// Send account verification email
const sendMagicLinkEmail = async (to, userId, token, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const magicLink = `${frontendUrl}/verify-account?token=${token}&id=${userId}`;
  const userName = fullName || to.split('@')[0] || "User";

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Smart City Tunisia - Reset your password",
      text: `Hi ${userName}, click to reset your password: ${resetLink} (expires in 1 hour)`,
      html,
    });
  } catch (error) {
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
    console.log(`[mailer] Invitation email sent to ${to}`);
  } catch (error) {
    console.error(`[mailer] Failed to send invitation email to ${to}:`, error.message);
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

module.exports = {
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendLoginEmailReminder,
  sendInvitationEmail,
  sendComplaintStatusEmail,
};
