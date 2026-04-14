/**
 * Shared auth helpers to reduce repeated user/department/municipality lookups.
 */
const User = require("../models/User");
const Department = require("../models/Department");

/**
 * Get the department ID for a DEPARTMENT_MANAGER user.
 * Checks user.department first, falls back to Department.responsable lookup.
 * @param {string} userId
 * @returns {Promise<string|null>} departmentId or null
 */
async function getUserDepartmentId(userId) {
  const user = await User.findById(userId).select("department").lean();
  if (user?.department) return user.department.toString();

  const dept = await Department.findOne({ responsable: userId })
    .select("_id")
    .lean();
  return dept ? dept._id.toString() : null;
}

/**
 * Get the municipality ID for a MUNICIPAL_AGENT user.
 * @param {string} userId
 * @returns {Promise<string|null>} municipalityId or null
 */
async function getUserMunicipalityId(userId) {
  const user = await User.findById(userId)
    .select("municipality")
    .populate("municipality", "_id")
    .lean();
  return user?.municipality?._id?.toString() || null;
}

module.exports = { getUserDepartmentId, getUserMunicipalityId };
