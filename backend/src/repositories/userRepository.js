const User = require('../models/User');

class UserRepository {
  async findByEmail(email) {
    if (!email || typeof email !== 'string') {
      // invalid input, return null to indicate not found
      return null;
    }
    const normalized = email.toLowerCase().trim();
    return await User.findOne({ email: normalized });
  }

  async findById(id) {
    // exclude secrets by default
    return await User.findById(id, { password: 0, refreshToken: 0 });
  }

  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async findAll(query = {}, options = {}) {
    let { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
    // sanitize pagination
    page = parseInt(page) || 1;
    if (page < 1) page = 1;
    limit = parseInt(limit) || 10;
    const maxLimit = 100;
    if (limit < 1) limit = 1;
    if (limit > maxLimit) limit = maxLimit;
    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    return { users, total, page, limit };
  }

  async update(id, updateData) {
    // sanitize to avoid mass-assignment of sensitive fields
    const allowed = {};
    const fields = [
      'fullName', 'email', 'phone', 'governorate', 'municipality',
      'municipalityName', 'isActive', 'role', 'department'
    ];
    for (const key of fields) {
      if (updateData[key] !== undefined) allowed[key] = updateData[key];
    }
    return await User.findByIdAndUpdate(id, allowed, { new: true, runValidators: true });
  }

  async delete(id) {
    return await User.findByIdAndDelete(id);
  }

  async count(query = {}) {
    return await User.countDocuments(query);
  }

  async aggregate(pipeline) {
    return await User.aggregate(pipeline);
  }
}

module.exports = new UserRepository();
