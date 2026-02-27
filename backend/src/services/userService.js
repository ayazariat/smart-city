const User = require('../models/User');
const PendingUser = require('../models/PendingUser');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

class UserService {
  // Find user by email
  async findByEmail(email) {
    return await User.findOne({ email: email.toLowerCase().trim() });
  }

  // Find user by ID
  async findById(id) {
    return await User.findById(id);
  }

  // Create new user
  async create(userData) {
    const { fullName, email, password, phone, governorate, municipality } = userData;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      fullName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone,
      governorate,
      municipality,
      isVerified: true,
      isActive: true,
    });

    return await user.save();
  }

  // Create pending user
  async createPending(pendingData) {
    const { fullName, email, password, phone, governorate, municipality, verificationToken } = pendingData;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const pendingUser = new PendingUser({
      fullName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone,
      governorate,
      municipality,
      verificationToken,
      verificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    return await pendingUser.save();
  }

  // Find pending user by email
  async findPendingByEmail(email) {
    return await PendingUser.findOne({ email: email.toLowerCase().trim() });
  }

  // Update user profile
  async updateProfile(userId, updateData) {
    const { fullName, phone } = updateData;
    
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (fullName) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;

    return await user.save();
  }

  // Change password
  async changePassword(userId, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordLastChanged = new Date();
    user.refreshToken = null;

    return await user.save();
  }

  // Toggle user active status
  async toggleActiveStatus(userId, isActive) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.isActive = isActive;
    return await user.save();
  }

  // Delete user
  async deleteUser(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await User.findByIdAndDelete(userId);
    return true;
  }

  // Get all users with pagination
  async getAllUsers(page = 1, limit = 10, search = '') {
    const query = {};
    
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { fullName: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get user statistics
  async getStats() {
    const total = await User.countDocuments();
    const active = await User.countDocuments({ isActive: true });
    const inactive = await User.countDocuments({ isActive: false });
    
    const byRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    return {
      total,
      active,
      inactive,
      byRole: byRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  // Create audit log
  async createAuditLog(logData) {
    return await AuditLog.create(logData);
  }
}

module.exports = new UserService();
