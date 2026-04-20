const Complaint = require("../models/Complaint");
const Department = require("../models/Department");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const notificationService = require("../services/notification.service");
const { calculatePriorityAndSLA } = require("../utils/priorityCalculator");
const { normalizeMunicipality } = require("../utils/normalize");

// Category to department mapping
const categoryToDepartment = {
  ROAD: "Roads & Infrastructure",

  LIGHTING: "Public Lighting",
  WASTE: "Waste Management",
  WATER: "Water & Sanitation",
  SAFETY: "Public Safety",
  PUBLIC_PROPERTY: "Public Property",
  GREEN_SPACE: "Parks & Green Spaces",
  OTHER: "General Services",
};

// Municipality to governorate mapping
const municipalityToGovernorate = {
  "Ariana": "Ariana", "Raoued": "Ariana", "Sidi Thabet": "Ariana", "La Soukra": "Ariana", "Ettadhamen": "Ariana", "Mnihla": "Ariana",
  "Béja": "Béja", "Medjez El Bab": "Béja", "Nefza": "Béja", "Teboursouk": "Béja", "Testour": "Béja", "Mateur": "Béja", "Joumine": "Béja",
  "Ben Arous": "Ben Arous", "Radès": "Ben Arous", "Mornag": "Ben Arous", "Hammam Lif": "Ben Arous", "Hammam Chott": "Ben Arous", "Ezzahra": "Ben Arous", "Mourouj": "Ben Arous",
  "Bizerte": "Bizerte", "Ras Jebel": "Bizerte", "Sejnane": "Bizerte", "Menzel Bourguiba": "Bizerte", "Tinja": "Bizerte", "El Alia": "Bizerte",
  "Gabès": "Gabès", "Mareth": "Gabès", "El Hamma": "Gabès", "Métouia": "Gabès", "Oudhref": "Gabès", "Ghannouch": "Gabès",
  "Gafsa": "Gafsa", "Métlaoui": "Gafsa", "El Ksar": "Gafsa", "Sidi Aïch": "Gafsa", "Moularès": "Gafsa",
  "Jendouba": "Jendouba", "Tabarka": "Jendouba", "Aïn Draham": "Jendouba", "Balta": "Jendouba", "Bou Salem": "Jendouba", "Fernana": "Jendouba",
  "Kairouan": "Kairouan", "Kairouan Nord": "Kairouan", "Kairouan Sud": "Kairouan", "Oueslatia": "Kairouan",
  "Kasserine": "Kasserine", "Sbeitla": "Kasserine", "Thala": "Kasserine", "Feriana": "Kasserine",
  "Kébili": "Kébili", "Douz": "Kébili", "Kébili Nord": "Kébili", "Kébili Sud": "Kébili",
  "Le Kef": "Le Kef", "Sakiet Sidi Youssef": "Le Kef", "Tajerouine": "Le Kef", "Dahmani": "Le Kef",
  "Mahdia": "Mahdia", "Mahdia Ville": "Mahdia", "Ksour Essef": "Mahdia", "Melloulèche": "Mahdia",
  "Manouba": "Manouba", "Mornaguia": "Manouba", "Borj El Amri": "Manouba", "Jedaida": "Manouba",
  "Médenine": "Médenine", "Djerba": "Médenine", "Midoun": "Médenine", "Houmt Souk": "Médenine", "Zarzis": "Médenine", "Ben Gardane": "Médenine",
  "Monastir": "Monastir", "Monastir Ville": "Monastir", "Skanès": "Monastir", "Ksar Hellal": "Monastir", "Moknine": "Monastir",
  "Nabeul": "Nabeul", "Hammamet": "Nabeul", "Kelibia": "Nabeul", "Menzel Temime": "Nabeul", "Dar Chaâbane": "Nabeul", "Beni Khiar": "Nabeul",
  "Sfax": "Sfax", "Sfax Ville": "Sfax", "Sfax Sud": "Sfax", "Sfax Nord": "Sfax", "Thyna": "Sfax",
  "Sidi Bouzid": "Sidi Bouzid", "Menzel Bouzaiane": "Sidi Bouzid", "Sidi Ali Ben Aoun": "Sidi Bouzid",
  "Siliana": "Siliana", "Bousalem": "Siliana", "Kesra": "Siliana", "Makthar": "Siliana",
  "Sousse": "Sousse", "Sousse Ville": "Sousse", "Msaken": "Sousse", "Sidi Bou Ali": "Sousse", "Hammam Sousse": "Sousse",
  "Tataouine": "Tataouine", "Tataouine Nord": "Tataouine", "Tataouine Sud": "Tataouine",
  "Tozeur": "Tozeur", "Nefta": "Tozeur", "Degache": "Tozeur",
  "Tunis": "Tunis", "Tunis Ville": "Tunis", "Cité El Khadra": "Tunis", "El Ouardia": "Tunis", "El Menzah": "Tunis", "Le Bardo": "Tunis",
  "Zaghouan": "Zaghouan", "Zaghouan Ville": "Zaghouan", "Nadhour": "Zaghouan"
};

const extractKeywords = (text) => {
  if (!text) return [];
  const raw = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");
  const tokens = raw.split(/\s+/).filter((t) => t.length >= 3);
  const stopwords = new Set(["les","des","dans","avec","pour","sur","une","est","and","the","this","that","qui","que"]);
  const counts = {};
  for (const t of tokens) {
    if (stopwords.has(t)) continue;
    counts[t] = (counts[t] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word]) => word);
};

class CitizenController {
  // GET /profile
  getProfile(req, res) {
    res.json({ message: "Citizen profile access granted", user: req.user });
  }

  // POST /complaints
  async createComplaint(req, res) {
    try {
      const { title, description, category, urgency, location, media, isAnonymous, ownerName, phone } = req.body;

      if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });
      if (!description || !description.trim()) return res.status(400).json({ message: "Description is required" });
      if (title.trim().length < 5) return res.status(400).json({ message: "Title must be at least 5 characters" });
      if (description.trim().length < 20) return res.status(400).json({ message: "Description must be at least 20 characters" });

      const validCategories = ["WASTE", "ROAD", "LIGHTING", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "OTHER"];
      if (category && !validCategories.includes(category)) return res.status(400).json({ message: "Invalid category" });

      const validUrgencies = ["LOW", "MEDIUM", "HIGH", "URGENT"];
      if (urgency && !validUrgencies.includes(urgency)) return res.status(400).json({ message: "Invalid urgency level" });

      // Validate and build GeoJSON location
      let geoLocation = {};
      if (location) {
        if (location.latitude !== undefined && (typeof location.latitude !== "number" || location.latitude < -90 || location.latitude > 90))
          return res.status(400).json({ message: "Invalid latitude" });
        if (location.longitude !== undefined && (typeof location.longitude !== "number" || location.longitude < -180 || location.longitude > 180))
          return res.status(400).json({ message: "Invalid longitude" });
        if (location.latitude !== undefined && location.longitude !== undefined) {
          geoLocation = { type: 'Point', coordinates: [location.longitude, location.latitude], address: location.address, commune: location.commune, governorate: location.governorate, municipality: location.municipality };
        } else {
          geoLocation = location;
        }
      }

      // Validate media
      if (media && Array.isArray(media)) {
        for (const item of media) {
          if (!item.type || !["photo", "video"].includes(item.type)) return res.status(400).json({ message: "Invalid media type" });
          if (!item.url || typeof item.url !== "string") return res.status(400).json({ message: "Invalid media URL" });
        }
      }

      // Find department
      let assignedDepartment = null;
      const departmentName = categoryToDepartment[category] || "General";
      const department = await Department.findOne({ name: departmentName });
      if (department) assignedDepartment = department._id;

      // Calculate priority
      const priorityResult = calculatePriorityAndSLA({ category, aiUrgencyPrediction: 'MEDIUM', userUrgency: urgency, confirms: 0, upvotes: 0, locationType: 'NORMAL', createdAt: new Date() });
      const { priorityScore, urgencyLevel, slaFinal } = priorityResult;

      const keywords = extractKeywords(description);
      const user = await User.findById(req.user.userId).select('municipalityName municipality').lean();
      const userMunicipalityName = user?.municipalityName || location?.municipality || location?.commune || "";
      const governorate = municipalityToGovernorate[userMunicipalityName] || municipalityToGovernorate[location?.municipality] || municipalityToGovernorate[location?.commune] || null;

      const complaint = new Complaint({
        title: title.trim(), description: description.trim(), category: category || "OTHER", urgency: urgencyLevel, priorityScore,
        location: Object.keys(geoLocation).length ? geoLocation : {}, municipalityName: userMunicipalityName,
        municipalityNormalized: normalizeMunicipality(userMunicipalityName), governorate, media: media || [],
        isAnonymous: !!isAnonymous, ownerName: !isAnonymous ? ownerName : undefined, phone: phone || undefined,
        keywords, createdBy: req.user.userId, assignedDepartment, status: "SUBMITTED",
        slaDeadline: new Date(Date.now() + slaFinal * 60 * 60 * 1000),
      });
      await complaint.save();

      // AI Urgency Prediction (non-blocking)
      try {
        const axios = require('axios');
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
        const urgencyResult = await axios.post(`${aiServiceUrl}/ai/urgency/predict`, {
          title: complaint.title, description: complaint.description, category: complaint.category,
          citizenUrgency: complaint.urgency, municipality: complaint.municipalityName,
          latitude: complaint.location?.coordinates?.[1], longitude: complaint.location?.coordinates?.[0],
          confirmationCount: 0, submittedAt: complaint.createdAt
        }, { timeout: 5000 });
        if (urgencyResult.data?.success && urgencyResult.data.data) {
          complaint.aiUrgencyPrediction = urgencyResult.data.data;
          complaint.aiPredictedUrgency = urgencyResult.data.data.predictedUrgency;
          await complaint.save();
        }
      } catch (urgencyError) {
        console.error('AI Urgency prediction failed:', urgencyError.message);
      }

      // AI Duplicate Detection (non-blocking)
      setImmediate(async () => {
        try {
          const axios = require('axios');
          const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
          const dupResult = await axios.post(`${aiServiceUrl}/ai/duplicate/check`, {
            complaintId: complaint._id.toString(), title: complaint.title, description: complaint.description,
            category: complaint.category, latitude: complaint.location?.coordinates?.[1],
            longitude: complaint.location?.coordinates?.[0], municipality: complaint.municipalityName, submittedAt: complaint.createdAt
          }, { timeout: 10000 });
          if (dupResult.data?.success && dupResult.data.data) {
            const dupData = dupResult.data.data;
            await Complaint.findByIdAndUpdate(complaint._id, { aiDuplicateCheck: dupData, duplicateStatus: dupData.duplicateLevel });

            // Notify agents about possible duplicate so they can decide to merge or not
            if (dupData.duplicateLevel === 'PROBABLE_DUPLICATE' || dupData.duplicateLevel === 'POSSIBLE_DUPLICATE') {
              try {
                const normalizedMun = normalizeMunicipality(complaint.municipalityName);
                const io = req.app?.get?.('io');
                if (normalizedMun) {
                  const agents = await User.find({
                    role: "MUNICIPAL_AGENT",
                    municipalityName: { $regex: new RegExp(`^${normalizedMun}$`, 'i') }
                  }).select('_id');
                  const agentIds = agents.map(a => a._id.toString());
                  if (agentIds.length > 0) {
                    const similarity = Math.round((dupData.similarityScore || 0) * 100);
                    const dpLabel = dupData.duplicateLevel === 'PROBABLE_DUPLICATE' ? 'Probable Duplicate' : 'Possible Duplicate';
                    await notificationService.sendNotificationToMultiple(io, agentIds, {
                      type: 'duplicate_detected',
                      title: `🔁 ${dpLabel} Detected`,
                      message: `"${complaint.title}" (${complaint.category}) may be a duplicate — ${similarity}% similarity. Review to merge or keep separate.`,
                      complaintId: complaint._id,
                    });
                  }
                }
              } catch (dupNotifError) {
                console.error('Failed to send duplicate notification:', dupNotifError.message);
              }
            }
          }
        } catch (dupError) {
          console.error('AI Duplicate check failed:', dupError.message);
        }
      });

      // Notify agents
      try {
        const normalizedMun = normalizeMunicipality(userMunicipalityName);
        const io = req.app?.get?.('io');
        if (normalizedMun) {
          const agents = await User.find({ role: "MUNICIPAL_AGENT", municipalityName: { $regex: new RegExp(`^${normalizedMun}$`, 'i') } }).select('_id');
          const agentIds = agents.map(a => a._id.toString());
          if (agentIds.length > 0) {
            await notificationService.sendNotificationToMultiple(io, agentIds, {
              type: "new_complaint", title: "New Complaint",
              message: `New complaint in ${userMunicipalityName}: ${title.trim()}`, complaintId: complaint._id,
            });
          }
        }
      } catch (notifError) { console.error("Failed to notify agents:", notifError); }

      await AuditLog.create({ userId: req.user.userId, action: "COMPLAINT_CREATED", details: { complaintId: complaint._id, category: complaint.category }, ip: req.ip, userAgent: req.headers["user-agent"] });

      res.status(201).json({
        message: "Complaint submitted successfully",
        complaint: { id: complaint._id, title: complaint.title, description: complaint.description, category: complaint.category, urgency: complaint.urgency, status: complaint.status, location: complaint.location, media: complaint.media, createdAt: complaint.createdAt },
      });
    } catch (error) {
      console.error("Complaint submission error:", error);
      res.status(500).json({ message: "Failed to submit complaint" });
    }
  }

  // GET /complaints
  async getComplaints(req, res) {
    try {
      const { status, category, sort = "-createdAt", limit = 20, page = 1 } = req.query;
      const query = { createdBy: req.user.userId };
      if (status) query.status = status;
      if (category) query.category = category;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const complaints = await Complaint.find(query).populate("assignedDepartment", "name email").populate("assignedTeam", "name").sort(sort).skip(skip).limit(parseInt(limit));
      const total = await Complaint.countDocuments(query);

      res.json({ message: "Complaints retrieved successfully", complaints, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
    } catch (error) {
      console.error("Get complaints error:", error);
      res.status(500).json({ message: "Failed to retrieve complaints" });
    }
  }

  // GET /complaints/:id
  async getComplaintById(req, res) {
    try {
      const complaint = await Complaint.findOne({ _id: req.params.id, createdBy: req.user.userId })
        .populate("assignedDepartment", "name email phone").populate("assignedTeam", "name members")
        .populate("createdBy", "fullName email phone").populate("municipality", "name governorate")
        .populate("assignedTo", "fullName email").populate("statusHistory.updatedBy", "fullName");

      if (!complaint) return res.status(404).json({ message: "Complaint not found" });

      const response = complaint.toObject();
      if (complaint.municipality) {
        response.location = response.location || {};
        response.location.municipality = complaint.municipality.name;
        response.location.governorate = complaint.municipality.governorate;
      }
      res.json({ message: "Complaint retrieved successfully", complaint: response });
    } catch (error) {
      console.error("Get complaint error:", error);
      res.status(500).json({ message: "Failed to retrieve complaint" });
    }
  }

  // PUT /complaints/:id
  async updateComplaint(req, res) {
    try {
      const { title, description, category, urgency, location, media, phone } = req.body;
      const complaint = await Complaint.findOne({ _id: req.params.id, createdBy: req.user.userId });
      if (!complaint) return res.status(404).json({ message: "Complaint not found" });
      if (complaint.status !== "SUBMITTED") return res.status(403).json({ message: "Cannot edit complaint. It has already been processed." });

      if (title) complaint.title = title;
      if (description) complaint.description = description;
      if (category) complaint.category = category;
      if (urgency) complaint.urgency = urgency;
      if (phone !== undefined) complaint.phone = phone;
      if (location) {
        if (location.latitude) complaint.location.latitude = location.latitude;
        if (location.longitude) complaint.location.longitude = location.longitude;
        if (location.address) complaint.location.address = location.address;
        if (location.commune) complaint.location.commune = location.commune;
        if (location.governorate) complaint.location.governorate = location.governorate;
      }
      if (media) complaint.media = media;

      if (!complaint.statusHistory) complaint.statusHistory = [];
      complaint.statusHistory.push({ status: complaint.status, updatedBy: req.user.userId, updatedAt: new Date(), notes: "Edited by citizen" });
      await complaint.save();

      res.json({ message: "Complaint updated successfully", complaint });
    } catch (error) {
      console.error("Update complaint error:", error);
      res.status(500).json({ message: "Failed to update complaint" });
    }
  }

  // DELETE /complaints/:id
  async deleteComplaint(req, res) {
    try {
      const complaint = await Complaint.findOne({ _id: req.params.id, createdBy: req.user.userId });
      if (!complaint) return res.status(404).json({ message: "Complaint not found" });
      if (complaint.status !== "SUBMITTED") return res.status(403).json({ message: "Cannot delete complaint. It has already been processed." });

      await Complaint.findByIdAndDelete(req.params.id);
      res.json({ message: "Complaint deleted successfully" });
    } catch (error) {
      console.error("Delete complaint error:", error);
      res.status(500).json({ message: "Failed to delete complaint" });
    }
  }

  // GET /stats
  async getStats(req, res) {
    try {
      const userId = req.user.userId;
      const baseQuery = { createdBy: userId, isArchived: false };

      const [total, submitted, inProgress, resolved, closed, rejected] = await Promise.all([
        Complaint.countDocuments(baseQuery),
        Complaint.countDocuments({ ...baseQuery, status: "SUBMITTED" }),
        Complaint.countDocuments({ ...baseQuery, status: "IN_PROGRESS" }),
        Complaint.countDocuments({ ...baseQuery, status: "RESOLVED" }),
        Complaint.countDocuments({ ...baseQuery, status: "CLOSED" }),
        Complaint.countDocuments({ ...baseQuery, status: "REJECTED" }),
      ]);

      const resolvedCount = resolved + closed;
      const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

      const avgTimeResult = await Complaint.aggregate([
        { $match: { ...baseQuery, status: { $in: ["RESOLVED", "CLOSED"] }, resolvedAt: { $exists: true } } },
        { $group: { _id: null, avgTime: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } } } }
      ]);
      const averageResolutionTime = avgTimeResult[0] ? Math.round(avgTimeResult[0].avgTime / (1000 * 60 * 60)) : 0;

      res.json({ success: true, data: { total, submitted, inProgress, resolved, closed, rejected, resolutionRate, averageResolutionTime } });
    } catch (error) {
      console.error("Citizen stats error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve statistics" });
    }
  }
}

module.exports = new CitizenController();
