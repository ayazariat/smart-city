const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true" || false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error) => {
  if (error) console.error("[mailer] SMTP Error:", error);
  else console.log("[mailer] SMTP Ready ✅");
});

const from = process.env.MAIL_FROM || process.env.SMTP_USER;

// Send account verification email
const sendMagicLinkEmail = async (to, userId, token, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const magicLink = `${frontendUrl}/verify-account?token=${token}&userId=${userId}`;

  await transporter.sendMail({
    from,
    to,
    subject: "Smart City Tunisia - Verify your account",
    text: `Hi ${fullName}, click to verify your account: ${magicLink} (expires in 15 minutes)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hi <strong>${fullName}</strong>,</p>
        <p>Thank you for signing up for Smart City Tunisia!</p>
        <p>Click the button below to verify your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" style="background: #2E7D32; color: white; padding: 15px 30px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Verify My Account
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          This link expires in <strong>15 minutes</strong>.<br/>
          If you didn't request this, you can ignore this email.
        </p>
      </div>
    `,
  });
};

// Send password reset email
const sendPasswordResetEmail = async (to, userId, token, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password?token=${token}&userId=${userId}`;

  await transporter.sendMail({
    from,
    to,
    subject: "Smart City Tunisia - Reset your password",
    text: `Hi ${fullName}, click to reset your password: ${resetLink} (expires in 1 hour)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hi <strong>${fullName}</strong>,</p>
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
};

module.exports = {
  sendMagicLinkEmail,
  sendPasswordResetEmail,
};
