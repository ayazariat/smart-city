const User = require('../models/User');

class UserRepository {
  async findByEmail(email) {
    return await User.findOne({ email: email.toLowerCase().trim() });
  }

  async findById(id) {
    return await User.findById(id);
  }

  async create(userData) {
    const user = new User(userData);
    return await user.save();
  }

  async findAll(query = {}, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
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
    return await User.findByIdAndUpdate(id, updateData, { new: true });
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
