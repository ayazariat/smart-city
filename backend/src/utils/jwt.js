const jwt = require("jsonwebtoken");

// Short-lived access token (used for API calls)
const ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET ||
  process.env.JWT_SECRET || // fallback for legacy env name
  "your-super-secret-access-key-change-in-production";

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";

// Long-lived refresh token (used only to get new access tokens)
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET ||
  "your-super-secret-refresh-key-change-in-production";

const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

/**
 * Generate short-lived access token for a user
 * @param {Object} user - User object with id, email, role
 * @returns {string} JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id || user._id,
      email: user.email,
      role: user.role,
    },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
};

/**
 * Generate refresh token for a user.
 * Payload is intentionally minimal: only user id and role.
 * This token is stored server-side (on the user) to allow rotation/blacklist.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id || user._id,
      role: user.role,
    },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );
};

/**
 * Verify access token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    console.error("Access token verification failed:", error.message);
    return null;
  }
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    console.error("Refresh token verification failed:", error.message);
    return null;
  }
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
const extractToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
};

module.exports = {
  // New explicit helpers
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractToken,
  // Backwards-compatible exports (used in some older parts of the code)
  generateToken: generateAccessToken,
  verifyToken: verifyAccessToken,
};
