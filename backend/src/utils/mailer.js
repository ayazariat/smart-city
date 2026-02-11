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

const sendMagicLinkEmail = async (to, userId, token, fullName) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const magicLink = `${frontendUrl}/verify-account?token=${token}&userId=${userId}`;
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: "Tunisia - Vérifiez votre compte",
    text: `Bonjour ${fullName}, cliquez pour vérifier votre compte: ${magicLink} (expire dans 15 minutes)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Tunisia</h1>
        </div>
        <p>Bonjour <strong>${fullName}</strong>,</p>
        <p>Merci de vous être inscrit sur Tunisia !</p>
        <p>Cliquez sur le bouton ci-dessous pour vérifier votre compte :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${magicLink}" style="background: #2E7D32; color: white; padding: 15px 30px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Vérifier mon compte
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Ce lien expire dans <strong>15 minutes</strong>.<br/>
          Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email.
        </p>
      </div>
    `,
  });
};

module.exports = {
  sendMagicLinkEmail,
};
