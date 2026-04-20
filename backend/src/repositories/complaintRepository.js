const Complaint = require('../models/Complaint');

class ComplaintRepository {
  async create(complaintData) {
    const complaint = new Complaint(complaintData);
    return await complaint.save();
  }

  async findById(id) {
    return await Complaint.findById(id);
  }

  async findByCitizen(citizenId, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 } } = options;
    const skip = (page - 1) * limit;

    const complaints = await Complaint.find({ citizen: citizenId })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments({ citizen: citizenId });

    return { complaints, total, page, limit };
  }

  async findAll(query = {}, options = {}) {
    const { page = 1, limit = 10, sort = { createdAt: -1 }, populate = '' } = options;
    const skip = (page - 1) * limit;

    let queryBuilder = Complaint.find(query).sort(sort).skip(skip).limit(limit);
    
    if (populate) {
      queryBuilder = queryBuilder.populate(populate);
    }

    const complaints = await queryBuilder;
    const total = await Complaint.countDocuments(query);

    return { complaints, total, page, limit };
  }

  async update(id, updateData) {
    return await Complaint.findByIdAndUpdate(id, updateData, { new: true, runValidators: true, context: 'query' });
  }

  async delete(id) {
    return await Complaint.findByIdAndDelete(id);
  }

  async count(query = {}) {
    return await Complaint.countDocuments(query);
  }

  async aggregate(pipeline) {
    return await Complaint.aggregate(pipeline);
  }
}

module.exports = new ComplaintRepository();
