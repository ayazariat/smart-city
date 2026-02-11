/**
 * Placeholder SMS utility.
 * In production, plug in a provider such as Twilio, Nexmo, etc.
 * For now, we simply log the code in the server console.
 */

// Example interface; replace with concrete implementation if you integrate a real SMS provider.
const sendVerificationSms = async (phone, code) => {
  console.log(
    `[sms] Would send verification SMS to ${phone} with code: ${code}`
  );
};

module.exports = {
  sendVerificationSms,
};

