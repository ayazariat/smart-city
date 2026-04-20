const complaintRepository = require('../repositories/complaintRepository');
const Complaint = require('../models/Complaint');

class ComplaintService {
  // Create new complaint
  async create(complaintData, userId) {
    const { title, description, category, governorate, municipality, latitude, longitude } = complaintData;

    return await complaintRepository.create({
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
  }

  // Get complaints by citizen
  async getByCitizen(citizenId, page = 1, limit = 10) {
    const { complaints, total } = await complaintRepository.findAll(
      { citizen: citizenId },
      { page, limit, sort: { createdAt: -1 } }
    );

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
    const complaint = await complaintRepository.findById(complaintId);
    if (complaint) {
      await complaint.populate('citizen', 'fullName email phone');
    }
    return complaint;
  }

  // Get all complaints (for admin/agent)
  async getAll(filters = {}, page = 1, limit = 10) {
    // sanitize filters: only allow known keys
    const query = {};
    const allowed = ['status','category','governorate','municipality'];
    for (const key of allowed) {
      if (filters[key] !== undefined) query[key] = filters[key];
    }
    if (filters.search) {
      const safe = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
      ];
    }

    const { complaints, total } = await complaintRepository.findAll(
      query,
      { page, limit, sort: { createdAt: -1 }, populate: 'citizen' }
    );

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

    return await complaintRepository.update(complaintId, updateData);
  }

  // Assign complaint to technician/agent
  async assign(complaintId, assignedTo) {
    return await complaintRepository.update(complaintId, {
      assignedTo,
      status: 'IN_PROGRESS',
    });
  }

  // Add comment to complaint
  async addComment(complaintId, comment, userId) {
    const complaint = await complaintRepository.findById(complaintId);
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
    const query = {};
    const allowed = ['status','category','governorate','municipality'];
    for (const key of allowed) {
      if (filters[key] !== undefined) query[key] = filters[key];
    }
    if (filters.search) {
      const safe = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
      ];
    }
    
    const [total, pending, inProgress, resolved, rejected] = await Promise.all([
      complaintRepository.count(query),
      complaintRepository.count({ ...query, status: 'PENDING' }),
      complaintRepository.count({ ...query, status: 'IN_PROGRESS' }),
      complaintRepository.count({ ...query, status: 'RESOLVED' }),
      complaintRepository.count({ ...query, status: 'REJECTED' }),
    ]);

    const [byCategory, byGovernorate] = await Promise.all([
      complaintRepository.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      complaintRepository.aggregate([
        { $match: query },
        { $group: { _id: '$governorate', count: { $sum: 1 } } },
      ]),
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
