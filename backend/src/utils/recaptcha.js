const https = require("https");

/**
 * Verify a reCAPTCHA v3 token with Google using only core Node.js modules.
 *
 * @param {string} secret - reCAPTCHA secret key (server side)
 * @param {string} token - token sent by the client (captchaToken)
 * @returns {Promise<{ success: boolean; score?: number }>}
 */
const verifyRecaptcha = (secret, token) => {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      secret,
      response: token,
    }).toString();

    const options = {
      hostname: "www.google.com",
      path: "/recaptcha/api/siteverify",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
};

module.exports = {
  verifyRecaptcha,
};

