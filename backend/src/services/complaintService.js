const Complaint = require('../models/Complaint');

class ComplaintService {
  // Create new complaint
  async create(complaintData, userId) {
    const { title, description, category, governorate, municipality, latitude, longitude } = complaintData;

    const complaint = new Complaint({
      title,
      description,
      category,
      governorate,
      municipality,
      latitude,
      longitude,
      status: 'PENDING',
      citizen: userId,
    });

    return await complaint.save();
  }

  // Get complaints by citizen
  async getByCitizen(citizenId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const complaints = await Complaint.find({ citizen: citizenId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments({ citizen: citizenId });

    return {
      complaints,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get complaint by ID
  async getById(complaintId) {
    return await Complaint.findById(complaintId)
      .populate('citizen', 'fullName email phone');
  }

  // Get all complaints (for admin/agent)
  async getAll(filters = {}, page = 1, limit = 10) {
    const query = {};
    
    // Apply filters
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.governorate) {
      query.governorate = filters.governorate;
    }
    if (filters.municipality) {
      query.municipality = filters.municipality;
    }
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    
    const complaints = await Complaint.find(query)
      .populate('citizen', 'fullName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments(query);

    return {
      complaints,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Update complaint status
  async updateStatus(complaintId, status, assignedTo = null) {
    const updateData = { status };
    
    if (assignedTo) {
      updateData.assignedTo = assignedTo;
    }

    return await Complaint.findByIdAndUpdate(
      complaintId,
      updateData,
      { new: true }
    );
  }

  // Assign complaint to technician/agent
  async assign(complaintId, assignedTo) {
    return await Complaint.findByIdAndUpdate(
      complaintId,
      {
        assignedTo,
        status: 'IN_PROGRESS',
      },
      { new: true }
    );
  }

  // Add comment to complaint
  async addComment(complaintId, comment, userId) {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    complaint.comments.push({
      text: comment,
      author: userId,
      createdAt: new Date(),
    });

    return await complaint.save();
  }

  // Get statistics
  async getStats(filters = {}) {
    const query = filters;
    
    const total = await Complaint.countDocuments(query);
    const pending = await Complaint.countDocuments({ ...query, status: 'PENDING' });
    const inProgress = await Complaint.countDocuments({ ...query, status: 'IN_PROGRESS' });
    const resolved = await Complaint.countDocuments({ ...query, status: 'RESOLVED' });
    const rejected = await Complaint.countDocuments({ ...query, status: 'REJECTED' });

    const byCategory = await Complaint.aggregate([
      { $match: query },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    const byGovernorate = await Complaint.aggregate([
      { $match: query },
      { $group: { _id: '$governorate', count: { $sum: 1 } } },
    ]);

    return {
      total,
      pending,
      inProgress,
      resolved,
      rejected,
      byCategory: byCategory.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      byGovernorate: byGovernorate.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }

  // Delete complaint
  async delete(complaintId) {
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      throw new Error('Complaint not found');
    }

    await Complaint.findByIdAndDelete(complaintId);
    return true;
  }
}

module.exports = new ComplaintService();
