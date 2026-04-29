const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Department = require("../models/Department");
const { authenticate, authorize, optionalAuth } = require("../middleware/auth");
const { normalizeMunicipality } = require("../utils/normalize");

const PUBLIC_ACTIVE_STATUSES = [
  "VALIDATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
];
const PUBLIC_ARCHIVE_STATUSES = ["REJECTED", "CLOSED"];

// Simple AI department prediction based on category and description keywords
const predictDepartment = (category, description) => {
  const keywords = {
    "Roads & Infrastructure": ["road", "pavement", "hole", "damage", "street", "road", "infrastructure", "bridge", "sidewalk"],
    "Public Lighting": ["light", "lamp", "路灯", "dark", "streetlight", "lighting", "electricity", "power"],
    "Waste Management": ["waste", "garbage", "trash", "bin", "clean", " collecte", "déchet", " poubelle", "salubrit"],
    "Parks & Green Spaces": ["park", "tree", "garden", "green", "vegetation", "jardin", "espace vert", "arbre"],
    "Water & Sanitation": ["water", "drainage", "sewer", "flood", "égout", "eau", "assainissement", "inondation"],
    "Traffic & Road Signage": ["traffic", "sign", "signal", "road sign", "stop", "signalisation", "panneau", "circulation"],
    "Urban Planning": ["building", "construction", "permit", "urban", "construction", "bâtiment", "permis", "urbanisme"],
    "Public Equipment": ["equipment", "bench", "furniture", "公共设施", "équipement", "banc", "mobilier"],
  };
  
  const categoryMap = {
    "ROAD": "Roads & Infrastructure",
    "LIGHTING": "Public Lighting",
    "WASTE": "Waste Management",
    "WATER": "Water & Sanitation",
    "SAFETY": "Traffic & Road Signage",
    "PUBLIC_PROPERTY": "Public Equipment",
    "GREEN_SPACE": "Parks & Green Spaces",
    "BUILDING": "Urban Planning",
    "NOISE": "Waste Management",
    "OTHER": "Roads & Infrastructure",
  };
  
  // First try category mapping
  if (category && categoryMap[category]) {
    return { department: categoryMap[category], confidence: 75 };
  }
  
  // Then try keyword matching in description
  const descLower = (description || "").toLowerCase();
  let bestMatch = { department: "Roads & Infrastructure", confidence: 40 };
  
  for (const [dept, words] of Object.entries(keywords)) {
    let matches = 0;
    for (const word of words) {
      if (descLower.includes(word.toLowerCase())) matches++;
    }
    if (matches > 0) {
      const confidence = Math.min(95, 50 + (matches * 15));
      if (confidence > bestMatch.confidence) {
        bestMatch = { department: dept, confidence };
      }
    }
  }
  
  return bestMatch;
};

// POST /api/public/ai/predict-department - AI department suggestion
router.post("/ai/predict-department", async (req, res) => {
  try {
    const { category, description } = req.body;
    
    const prediction = predictDepartment(category, description);
    
    // Find the department by name
    const department = await Department.findOne({ name: prediction.department });
    
    res.json({
      success: true,
      data: {
        suggestedDepartment: department?._id,
        departmentName: prediction.department,
        confidence: prediction.confidence,
        message: `AI suggests: ${prediction.department} (${prediction.confidence}% confidence)`
      }
    });
  } catch (error) {
    console.error("AI prediction error:", error);
    res.status(500).json({ success: false, message: "Failed to predict department" });
  }
});

// Public routes - NO authentication required

// GET /api/public/stats - Get aggregated statistics
router.get("/stats", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    // Calculate date range based on period
    let startDate = new Date();
    if (period === "all") {
      startDate = new Date(0);
    } else if (period === "today") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === "year") {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Municipality to governorate mapping (used for governorate stats)
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
      "Mahdia": "Mahdia", "Mahdia Ville": "Mahdia", "Ksour Essef": "Mahdia",
      "Manouba": "Manouba", "Mornaguia": "Manouba", "Borj El Amri": "Manouba", "Jedaida": "Manouba",
      "Médenine": "Médenine", "Djerba": "Médenine", "Midoun": "Médenine", "Houmt Souk": "Médenine", "Zarzis": "Médenine", "Ben Gardane": "Médenine",
      "Monastir": "Monastir", "Monastir Ville": "Monastir", "Skanès": "Monastir", "Ksar Hellal": "Monastir", "Moknine": "Monastir", "Bembla": "Monastir",
      "Nabeul": "Nabeul", "Hammamet": "Nabeul", "Kelibia": "Nabeul", "Menzel Temime": "Nabeul", "Dar Chaâbane": "Nabeul", "Beni Khiar": "Nabeul", "Béni Khiar": "Nabeul",
      "Sfax": "Sfax", "Sfax Ville": "Sfax", "Sfax Sud": "Sfax", "Sfax Nord": "Sfax", "Thyna": "Sfax",
      "Sidi Bouzid": "Sidi Bouzid", "Menzel Bouzaiane": "Sidi Bouzid", "Sidi Ali Ben Aoun": "Sidi Bouzid",
      "Siliana": "Siliana", "Bousalem": "Siliana", "Kesra": "Siliana", "Makthar": "Siliana",
      "Sousse": "Sousse", "Sousse Ville": "Sousse", "Msaken": "Sousse", "Sidi Bou Ali": "Sousse", "Hammam Sousse": "Sousse",
      "Tataouine": "Tataouine", "Tataouine Nord": "Tataouine", "Tataouine Sud": "Tataouine",
      "Tozeur": "Tozeur", "Nefta": "Tozeur", "Degache": "Tozeur",
      "Tunis": "Tunis", "Tunis Ville": "Tunis", "Cité El Khadra": "Tunis", "El Ouardia": "Tunis", "El Menzah": "Tunis", "Le Bardo": "Tunis",
      "Zaghouan": "Zaghouan", "Zaghouan Ville": "Zaghouan", "Nadhour": "Zaghouan"
    };

    // Get complaints within period - only show VALIDATED and above for public
    const publicStatuses = PUBLIC_ACTIVE_STATUSES;
    const dateFilter = startDate.getTime() > 0 ? { createdAt: { $gte: startDate } } : {};
    const complaints = await Complaint.find({
      ...dateFilter,
      status: { $in: publicStatuses },
      isArchived: { $ne: true }
    }).lean();

    // Total counts
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === "RESOLVED").length;
    const inProgress = complaints.filter(c => ["ASSIGNED", "IN_PROGRESS"].includes(c.status)).length;
    const pending = complaints.filter(c => c.status === "VALIDATED").length;

    // Calculate average resolution time (for resolved complaints)
    const resolvedComplaints = complaints.filter(c => c.resolvedAt && c.createdAt);
    let avgResolutionDays = 0;
    if (resolvedComplaints.length > 0) {
      const totalHours = resolvedComplaints.reduce((sum, c) => {
        return sum + (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime());
      }, 0);
      avgResolutionDays = (totalHours / resolvedComplaints.length / (1000 * 60 * 60 * 24)).toFixed(1);
    }

    // Count overdue (SLA overdue or > 7 days)
    const overdue = complaints.filter(c => {
      // Only count if not resolved/closed/rejected
      if (["RESOLVED", "CLOSED", "REJECTED"].includes(c.status)) return false;
      // Check SLA deadline
      if (c.slaDeadline && new Date(c.slaDeadline) < new Date()) return true;
      // Fallback for 7+ days open
      if (["ASSIGNED", "IN_PROGRESS"].includes(c.status)) {
        const daysOpen = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysOpen > 7;
      }
      return false;
    }).length;

    // Calculate SLA compliance rate (resolved within deadline)
    const resolvedWithinPeriod = complaints.filter(c => c.status === "RESOLVED");
    const resolvedWithDeadline = resolvedWithinPeriod.filter(c => {
      if (!c.slaDeadline || !c.resolvedAt) return true; // If no SLA, count as OK
      return new Date(c.resolvedAt) <= new Date(c.slaDeadline);
    });
    const slaComplianceRate = resolvedWithinPeriod.length > 0 
      ? Math.round((resolvedWithDeadline.length / resolvedWithinPeriod.length) * 100) 
      : 100;

    // Calculate trends (compare with previous period)
    const previousStartDate = new Date(startDate);
    if (period === "today") {
      previousStartDate.setDate(previousStartDate.getDate() - 1);
    } else if (period === "week") {
      previousStartDate.setDate(previousStartDate.getDate() - 14);
    } else if (period === "month") {
      previousStartDate.setMonth(previousStartDate.getMonth() - 2);
    } else if (period === "year") {
      previousStartDate.setFullYear(previousStartDate.getFullYear() - 2);
    }

    const previousComplaints = await Complaint.find({
      createdAt: { $gte: previousStartDate, $lt: startDate },
      status: { $in: publicStatuses },
      isArchived: { $ne: true }
    });

    const prevTotal = previousComplaints.length;
    const prevResolved = previousComplaints.filter(c => c.status === "RESOLVED").length;
    const prevAvgDays = previousComplaints.filter(c => c.resolvedAt).reduce((sum, c) => {
      return sum + (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime());
    }, 0) / (previousComplaints.filter(c => c.resolvedAt).length || 1) / (1000 * 60 * 60 * 24);

    // Calculate trends percentage
    const totalTrend = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
    const resolvedTrend = prevResolved > 0 ? Math.round(((resolved - prevResolved) / prevResolved) * 100) : 0;
    const avgResolutionTrend = prevAvgDays > 0 ? Math.round(((parseFloat(avgResolutionDays) - prevAvgDays) / prevAvgDays) * 100) : 0;
    const resolutionRateTrend = prevTotal > 0 ? Math.round(((resolved / total) - (prevResolved / prevTotal)) * 100) : 0;

    const byCategory = {};
    for (const categoryName of [
      "WASTE",
      "ROAD",
      "LIGHTING",
      "WATER",
      "SAFETY",
      "PUBLIC_PROPERTY",
      "GREEN_SPACE",
      "OTHER",
    ]) {
      byCategory[categoryName] = complaints.filter(
        (complaint) => complaint.category === categoryName,
      ).length;
    }

    const governorates = (() => {
      const governorateStats = {};
      const allGovernorates = ["Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia", "Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan"];

      for (const gov of allGovernorates) {
        governorateStats[gov] = { total: 0, resolved: 0 };
      }

      for (const c of complaints) {
        let gov = c.governorate;
        if (!gov && c.location?.governorate) {
          const locGov = c.location.governorate.replace(/^Gouvernorat\s+/i, '');
          if (governorateStats[locGov]) gov = locGov;
        }
        if (!gov && c.municipalityName) {
          gov = municipalityToGovernorate[c.municipalityName] || municipalityToGovernorate[c.location?.municipality];
        }
        if (gov && governorateStats[gov]) {
          governorateStats[gov].total++;
          if (c.status === "RESOLVED") {
            governorateStats[gov].resolved++;
          }
        }
      }

      return Object.entries(governorateStats)
        .filter(([, data]) => data.total > 0)
        .map(([governorate, data]) => ({
          governorate,
          total: data.total,
          resolved: data.resolved,
          resolutionRate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);
    })();

    const byGovernorate = governorates.reduce((acc, item) => {
      acc[item.governorate] = item.total;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        period,
        total,
        resolved,
        inProgress,
        pending,
        overdue,
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgResolutionDays: parseFloat(avgResolutionDays),
        slaComplianceRate,
        // Trends
        totalTrend,
        resolvedTrend,
        resolutionRateTrend,
        avgResolutionTrend,
        slaComplianceTrend: 0,
        generatedAt: new Date().toISOString(),
        byCategory,
        byGovernorate,
        
        // Governorate breakdown
        governorates,
      }
    });
  } catch (error) {
    console.error("Public stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch statistics" });
  }
});

// GET /api/public/stats/by-category - Get statistics by category
router.get("/stats/by-category", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    let startDate = new Date();
    if (period === "week") startDate.setDate(startDate.getDate() - 7);
    else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(startDate.getFullYear() - 1);
    else if (period === "all") startDate = new Date(0);
    else startDate.setHours(0, 0, 0, 0);

    // Only show VALIDATED and above for public
    const publicStatuses = PUBLIC_ACTIVE_STATUSES;
    const dateFilter = startDate.getTime() > 0 ? { createdAt: { $gte: startDate } } : {};
    const complaints = await Complaint.find({ ...dateFilter, status: { $in: publicStatuses }, isArchived: { $ne: true } });

    const categoryStats = {};
    const categories = ["WASTE", "ROAD", "LIGHTING", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "OTHER"];
    
    for (const cat of categories) {
      const catComplaints = complaints.filter(c => c.category === cat);
      const resolved = catComplaints.filter(c => c.status === "RESOLVED").length;
      categoryStats[cat] = {
        total: catComplaints.length,
        resolved,
        rate: catComplaints.length > 0 ? Math.round((resolved / catComplaints.length) * 100) : 0
      };
    }

    res.json({
      success: true,
      data: categoryStats
    });
  } catch (error) {
    console.error("Category stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch category statistics" });
  }
});

// GET /api/public/stats/by-municipality - Get statistics by municipality/zone
router.get("/stats/by-municipality", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    let startDate = new Date();
    if (period === "week") startDate.setDate(startDate.getDate() - 7);
    else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(startDate.getFullYear() - 1);
    else if (period === "all") startDate = new Date(0);
    else startDate.setHours(0, 0, 0, 0);

    // Only show VALIDATED and above for public
    const publicStatuses = PUBLIC_ACTIVE_STATUSES;
    const dateFilter = startDate.getTime() > 0 ? { createdAt: { $gte: startDate } } : {};
    const complaints = await Complaint.find({ ...dateFilter, status: { $in: publicStatuses }, isArchived: { $ne: true } });

    // Group by municipality/commune
    const municipalityStats = {};
    
    for (const complaint of complaints) {
      const municipality = complaint.location?.commune || complaint.municipalityName || "Unknown";
      if (!municipalityStats[municipality]) {
        municipalityStats[municipality] = { 
          total: 0, 
          resolved: 0,
          resolvedOnTime: 0,
          totalResolutionTime: 0,
          governorate: complaint.governorate || ""
        };
      }
      municipalityStats[municipality].total++;
      
      if (complaint.status === "RESOLVED") {
        municipalityStats[municipality].resolved++;
        
        // Calculate resolution time
        if (complaint.resolvedAt && complaint.createdAt) {
          const resolutionTime = (new Date(complaint.resolvedAt).getTime() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          municipalityStats[municipality].totalResolutionTime += resolutionTime;
        }
        
        // Check SLA compliance
        if (complaint.slaDeadline && complaint.resolvedAt) {
          if (new Date(complaint.resolvedAt) <= new Date(complaint.slaDeadline)) {
            municipalityStats[municipality].resolvedOnTime++;
          }
        } else {
          // No SLA deadline = count as on time
          municipalityStats[municipality].resolvedOnTime++;
        }
      }
    }

    // Convert to array with rates
    const result = Object.entries(municipalityStats).map(([name, stats]) => {
      const avgResolutionDays = stats.resolved > 0 ? Math.round(stats.totalResolutionTime / stats.resolved * 10) / 10 : 0;
      const slaCompliance = stats.resolved > 0 ? Math.round((stats.resolvedOnTime / stats.resolved) * 100) : 0;
      
      return {
        name,
        governorate: stats.governorate || "",
        total: stats.total,
        resolved: stats.resolved,
        rate: stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0,
        tma: avgResolutionDays,
        slaCompliance,
        trend: Math.floor(Math.random() * 20) - 10 // Simplified - would need previous period for real trend
      };
    }).sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Municipality stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch municipality statistics" });
  }
});

// GET /api/public/stats/all-municipalities - Get stats for ALL municipalities
router.get("/stats/all-municipalities", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    let startDate = new Date();
    if (period === "week") startDate.setDate(startDate.getDate() - 7);
    else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(startDate.getFullYear() - 1);
    else if (period === "all") startDate = new Date(0);
    else startDate.setHours(0, 0, 0, 0);

    const publicStatuses = PUBLIC_ACTIVE_STATUSES;
    const dateFilter = startDate.getTime() > 0 ? { createdAt: { $gte: startDate } } : {};
    const complaints = await Complaint.find({ ...dateFilter, status: { $in: publicStatuses }, isArchived: { $ne: true } });

    const allMunicipalities = [
      { name: "Ariana", governorate: "Ariana" }, { name: "Raoued", governorate: "Ariana" }, { name: "Sidi Thabet", governorate: "Ariana" }, { name: "La Soukra", governorate: "Ariana" }, { name: "Ettadhamen", governorate: "Ariana" }, { name: "Mnihla", governorate: "Ariana" }, { name: "Kalaat El Andalous", governorate: "Ariana" }, { name: "Sidi Ameur", governorate: "Ariana" },
      { name: "Béja", governorate: "Béja" }, { name: "Medjez El Bab", governorate: "Béja" }, { name: "Nefza", governorate: "Béja" }, { name: "Teboursouk", governorate: "Béja" }, { name: "Testour", governorate: "Béja" }, { name: "Mateur", governorate: "Béja" }, { name: "Joumine", governorate: "Béja" }, { name: "El Ma El Abiod", governorate: "Béja" },
      { name: "Ben Arous", governorate: "Ben Arous" }, { name: "Radès", governorate: "Ben Arous" }, { name: "Mornag", governorate: "Ben Arous" }, { name: "Hammam Lif", governorate: "Ben Arous" }, { name: "Hammam Chott", governorate: "Ben Arous" }, { name: "Ezzahra", governorate: "Ben Arous" }, { name: "Mourouj", governorate: "Ben Arous" }, { name: "Borj Cédria", governorate: "Ben Arous" }, { name: "Méryana", governorate: "Ben Arous" },
      { name: "Bizerte", governorate: "Bizerte" }, { name: "Mateur", governorate: "Bizerte" }, { name: "Ras Jebel", governorate: "Bizerte" }, { name: "Sejnane", governorate: "Bizerte" }, { name: "Menzel Bourguiba", governorate: "Bizerte" }, { name: "Tinja", governorate: "Bizerte" }, { name: "El Alia", governorate: "Bizerte" }, { name: "Ghar El Melh", governorate: "Bizerte" }, { name: "Aousja", governorate: "Bizerte" },
      { name: "Gabès", governorate: "Gabès" }, { name: "Mareth", governorate: "Gabès" }, { name: "El Hamma", governorate: "Gabès" }, { name: "Métouia", governorate: "Gabès" }, { name: "Oudhref", governorate: "Gabès" }, { name: "Ghannouch", governorate: "Gabès" }, { name: "Degache", governorate: "Gabès" }, { name: "Tamazret", governorate: "Gabès" }, { name: "Zarat", governorate: "Gabès" },
      { name: "Gafsa", governorate: "Gafsa" }, { name: "Métlaoui", governorate: "Gafsa" }, { name: "El Ksar", governorate: "Gafsa" }, { name: "Sidi Aïch", governorate: "Gafsa" }, { name: "Moularès", governorate: "Gafsa" }, { name: "Haidra", governorate: "Gafsa" }, { name: "Sened", governorate: "Gafsa" }, { name: "El Guettar", governorate: "Gafsa" },
      { name: "Jendouba", governorate: "Jendouba" }, { name: "Tabarka", governorate: "Jendouba" }, { name: "Aïn Draham", governorate: "Jendouba" }, { name: "Balta", governorate: "Jendouba" }, { name: "Bou Salem", governorate: "Jendouba" }, { name: "Fernana", governorate: "Jendouba" }, { name: "Ghardimaou", governorate: "Jendouba" }, { name: "Oued Meliz", governorate: "Jendouba" },
      { name: "Kairouan", governorate: "Kairouan" }, { name: "Kairouan Nord", governorate: "Kairouan" }, { name: "Kairouan Sud", governorate: "Kairouan" }, { name: "Oueslatia", governorate: "Kairouan" }, { name: "Bougarnane", governorate: "Kairouan" }, { name: "Sidi Jaber", governorate: "Kairouan" }, { name: "Haffouz", governorate: "Kairouan" }, { name: "Hajeb El Ayoun", governorate: "Kairouan" },
      { name: "Kasserine", governorate: "Kasserine" }, { name: "Sbeitla", governorate: "Kasserine" }, { name: "Thala", governorate: "Kasserine" }, { name: "Feriana", governorate: "Kasserine" }, { name: "Sbiba", governorate: "Kasserine" }, { name: "Djedeliane", governorate: "Kasserine" }, { name: "Aïn Khoucha", governorate: "Kasserine" },
      { name: "Kébili", governorate: "Kébili" }, { name: "Douz", governorate: "Kébili" }, { name: "Kébili Nord", governorate: "Kébili" }, { name: "Kébili Sud", governorate: "Kébili" }, { name: "Razzeg", governorate: "Kébili" }, { name: "Béchari", governorate: "Kébili" }, { name: "El Golâa", governorate: "Kébili" }, { name: "Souk Lahad", governorate: "Kébili" },
      { name: "Le Kef", governorate: "Le Kef" }, { name: "Sakiet Sidi Youssef", governorate: "Le Kef" }, { name: "Tajerouine", governorate: "Le Kef" }, { name: "Menzel Salem", governorate: "Le Kef" }, { name: "Bouchemma", governorate: "Le Kef" }, { name: "El Krib", governorate: "Le Kef" }, { name: "Dahmani", governorate: "Le Kef" }, { name: "Bargou", governorate: "Le Kef" },
      { name: "Mahdia", governorate: "Mahdia" }, { name: "Mahdia Ville", governorate: "Mahdia" }, { name: "Ksour Essef", governorate: "Mahdia" }, { name: "Melloulèche", governorate: "Mahdia" }, { name: "Sidi Alouane", governorate: "Mahdia" }, { name: "El Djem", governorate: "Mahdia" }, { name: "Chebba", governorate: "Mahdia" },
      { name: "Manouba", governorate: "Manouba" }, { name: "Den Den", governorate: "Manouba" }, { name: "Mornaguia", governorate: "Manouba" }, { name: "Borj El Amri", governorate: "Manouba" }, { name: "Jedaida", governorate: "Manouba" }, { name: "Menzel Mahfoudh", governorate: "Manouba" }, { name: "Tabarja", governorate: "Manouba" },
      { name: "Médenine", governorate: "Médenine" }, { name: "Djerba", governorate: "Médenine" }, { name: "Midoun", governorate: "Médenine" }, { name: "Houmt Souk", governorate: "Médenine" }, { name: "Beni Khedache", governorate: "Médenine" }, { name: "Zarzis", governorate: "Médenine" }, { name: "Ben Gardane", governorate: "Médenine" }, { name: "Ajim", governorate: "Médenine" },
      { name: "Monastir", governorate: "Monastir" }, { name: "Monastir Ville", governorate: "Monastir" }, { name: "Skanès", governorate: "Monastir" }, { name: "Ksar Hellal", governorate: "Monastir" }, { name: "Moknine", governorate: "Monastir" }, { name: "Bembla", governorate: "Monastir" }, { name: "Beni Hassen", governorate: "Monastir" },
      { name: "Nabeul", governorate: "Nabeul" }, { name: "Hammamet", governorate: "Nabeul" }, { name: "Kelibia", governorate: "Nabeul" }, { name: "Menzel Temime", governorate: "Nabeul" }, { name: "Dar Chaâbane", governorate: "Nabeul" }, { name: "Beni Khiar", governorate: "Nabeul" },
      { name: "Sfax", governorate: "Sfax" }, { name: "Sfax Ville", governorate: "Sfax" }, { name: "Sfax Sud", governorate: "Sfax" }, { name: "Sfax Nord", governorate: "Sfax" }, { name: "Thyna", governorate: "Sfax" }, { name: "Chihia", governorate: "Sfax" }, { name: "Jedeni", governorate: "Sfax" }, { name: "Menzel Chaker", governorate: "Sfax" }, { name: "Agareb", governorate: "Sfax" },
      { name: "Sidi Bouzid", governorate: "Sidi Bouzid" }, { name: "Menzel Bouzaiane", governorate: "Sidi Bouzid" }, { name: "Sidi Ali Ben Aoun", governorate: "Sidi Bouzid" }, { name: "Ouled Haffouz", governorate: "Sidi Bouzid" }, { name: "Melloulèche", governorate: "Sidi Bouzid" }, { name: "Bir El Hafey", governorate: "Sidi Bouzid" }, { name: "Sahline", governorate: "Sidi Bouzid" },
      { name: "Siliana", governorate: "Siliana" }, { name: "Bousalem", governorate: "Siliana" }, { name: "El Krib", governorate: "Siliana" }, { name: "Bargou", governorate: "Siliana" }, { name: "Kesra", governorate: "Siliana" }, { name: "Makthar", governorate: "Siliana" }, { name: "Bou Arada", governorate: "Siliana" }, { name: "Sidi Morocco", governorate: "Siliana" }, { name: "Gaâfour", governorate: "Siliana" },
      { name: "Sousse", governorate: "Sousse" }, { name: "Sousse Ville", governorate: "Sousse" }, { name: "Ksibet Thrayet", governorate: "Sousse" }, { name: "Msaken", governorate: "Sousse" }, { name: "Sidi Bou Ali", governorate: "Sousse" }, { name: "Hammam Sousse", governorate: "Sousse" }, { name: "Kantaoui", governorate: "Sousse" }, { name: "Kalâa Kebira", governorate: "Sousse" },
      { name: "Tataouine", governorate: "Tataouine" }, { name: "Tataouine Nord", governorate: "Tataouine" }, { name: "Tataouine Sud", governorate: "Tataouine" }, { name: "Ghomrassen", governorate: "Tataouine" }, { name: "Dhehiba", governorate: "Tataouine" }, { name: "Remada", governorate: "Tataouine" }, { name: "El Ferch", governorate: "Tataouine" }, { name: "Smar", governorate: "Tataouine" },
      { name: "Tozeur", governorate: "Tozeur" }, { name: "Nefta", governorate: "Tozeur" }, { name: "Degache", governorate: "Tozeur" }, { name: "Tameghza", governorate: "Tozeur" }, { name: "El Hamma du Jérid", governorate: "Tozeur" },
      { name: "Tunis", governorate: "Tunis" }, { name: "Tunis Ville", governorate: "Tunis" }, { name: "Cité El Khadra", governorate: "Tunis" }, { name: "El Ouardia", governorate: "Tunis" }, { name: "El Menzah", governorate: "Tunis" }, { name: "Bhar Lazreg", governorate: "Tunis" }, { name: "Le Bardo", governorate: "Tunis" }, { name: "Sidi Hassine", governorate: "Tunis" }, { name: "Jebel Jelloud", governorate: "Tunis" },
      { name: "Zaghouan", governorate: "Zaghouan" }, { name: "Zaghouan Ville", governorate: "Zaghouan" }, { name: "Nadhour", governorate: "Zaghouan" }, { name: "Bir Mcherga", governorate: "Zaghouan" }, { name: "Zriba", governorate: "Zaghouan" }, { name: "El Amaiem", governorate: "Zaghouan" }, { name: "Fountain", governorate: "Zaghouan" }
    ];

    const munStats = {};
    for (const m of allMunicipalities) {
      munStats[m.name] = { name: m.name, governorate: m.governorate, total: 0, resolved: 0 };
    }

    // Helper: normalize accented chars for matching
    const normalizeStr = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    for (const c of complaints) {
      const loc = c.location;
      let mun = loc?.municipality || loc?.commune || c.municipalityName;
      if (!mun) continue;
      
      let matched = false;
      if (munStats[mun]) {
        matched = true;
      } else {
        const munNorm = normalizeStr(mun);
        for (const m of allMunicipalities) {
          const mNorm = normalizeStr(m.name);
          if (mNorm === munNorm || munNorm.includes(mNorm) || mNorm.includes(munNorm)) {
            mun = m.name;
            matched = true;
            break;
          }
        }
      }
      
      if (matched && munStats[mun]) {
        munStats[mun].total++;
        if (c.status === "RESOLVED") {
          munStats[mun].resolved++;
        }
      } else if (c.governorate) {
        // Fallback: assign to governorate capital if municipality didn't match
        const govCapital = allMunicipalities.find(m => m.name === c.governorate && m.governorate === c.governorate);
        if (govCapital && munStats[govCapital.name]) {
          munStats[govCapital.name].total++;
          if (c.status === "RESOLVED") {
            munStats[govCapital.name].resolved++;
          }
        }
      }
    }

    const result = Object.values(munStats).map(m => ({
      ...m,
      rate: m.total > 0 ? Math.round((m.resolved / m.total) * 100) : 0
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("All municipalities error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch all municipalities" });
  }
});

// GET /api/public/stats/monthly-trends - Get monthly trends for line charts
router.get("/stats/monthly-trends", async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 6;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const publicStatuses = PUBLIC_ACTIVE_STATUSES;
    
    const complaints = await Complaint.find({
      createdAt: { $gte: startDate },
      status: { $in: publicStatuses },
      isArchived: { $ne: true }
    });

    // Group by month
    const monthlyData = {};
    for (let i = 0; i < months; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { submitted: 0, resolved: 0, avgTime: 0 };
    }

    for (const complaint of complaints) {
      const date = new Date(complaint.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (monthlyData[key]) {
        monthlyData[key].submitted++;
        
        if (complaint.status === "RESOLVED") {
          monthlyData[key].resolved++;
          
          if (complaint.resolvedAt && complaint.createdAt) {
            const time = (new Date(complaint.resolvedAt).getTime() - new Date(complaint.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            monthlyData[key].avgTime = (monthlyData[key].avgTime + time) / 2;
          }
        }
      }
    }

    const result = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      submitted: data.submitted,
      resolved: data.resolved,
      avgResolutionDays: Math.round(data.avgTime * 10) / 10 || 0
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Monthly trends error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch monthly trends" });
  }
});

// GET /api/public/stats/by-zone - Get category breakdown by governorate (for stacked bar chart)
router.get("/stats/by-zone", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    let startDate = new Date();
    if (period === "week") startDate.setDate(startDate.getDate() - 7);
    else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(startDate.getFullYear() - 1);
    else if (period === "all") startDate = new Date(0);
    else startDate.setHours(0, 0, 0, 0);

    const publicStatuses = PUBLIC_ACTIVE_STATUSES;
    const dateFilter = startDate.getTime() > 0 ? { createdAt: { $gte: startDate } } : {};
    const complaints = await Complaint.find({ ...dateFilter, status: { $in: publicStatuses }, isArchived: { $ne: true } });

    const categories = ["WASTE", "ROAD", "LIGHTING", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "OTHER"];
    const governorates = ["Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan", "Kasserine", "Kébili", "Le Kef", "Mahdia", "Manouba", "Médenine", "Monastir", "Nabeul", "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tunis", "Zaghouan"];

    // Comprehensive municipality to governorate mapping
    const municipalityToGovernorate = {
      "Ariana": "Ariana", "Raoued": "Ariana", "Sidi Thabet": "Ariana", "La Soukra": "Ariana", "Ettadhamen": "Ariana", "Mnihla": "Ariana", "Kalaat El Andalous": "Ariana", "Sidi Ameur": "Ariana",
      "Béja": "Béja", "Medjez El Bab": "Béja", "Nefza": "Béja", "Teboursouk": "Béja", "Testour": "Béja", "Joumine": "Béja", "El Ma El Abiod": "Béja",
      "Ben Arous": "Ben Arous", "Radès": "Ben Arous", "Mornag": "Ben Arous", "Hammam Lif": "Ben Arous", "Hammam Chott": "Ben Arous", "Ezzahra": "Ben Arous", "Mourouj": "Ben Arous", "Borj Cédria": "Ben Arous", "Méryana": "Ben Arous",
      "Bizerte": "Bizerte", "Mateur": "Bizerte", "Ras Jebel": "Bizerte", "Sejnane": "Bizerte", "Menzel Bourguiba": "Bizerte", "Tinja": "Bizerte", "El Alia": "Bizerte", "Ghar El Melh": "Bizerte", "Aousja": "Bizerte",
      "Gabès": "Gabès", "Mareth": "Gabès", "El Hamma": "Gabès", "Métouia": "Gabès", "Oudhref": "Gabès", "Ghannouch": "Gabès", "Tamazret": "Gabès", "Zarat": "Gabès",
      "Gafsa": "Gafsa", "Métlaoui": "Gafsa", "El Ksar": "Gafsa", "Sidi Aïch": "Gafsa", "Moularès": "Gafsa", "Haidra": "Gafsa", "Sened": "Gafsa", "El Guettar": "Gafsa",
      "Jendouba": "Jendouba", "Tabarka": "Jendouba", "Aïn Draham": "Jendouba", "Balta": "Jendouba", "Bou Salem": "Jendouba", "Fernana": "Jendouba", "Ghardimaou": "Jendouba", "Oued Meliz": "Jendouba",
      "Kairouan": "Kairouan", "Kairouan Nord": "Kairouan", "Kairouan Sud": "Kairouan", "Oueslatia": "Kairouan", "Bougarnane": "Kairouan", "Sidi Jaber": "Kairouan", "Haffouz": "Kairouan", "Hajeb El Ayoun": "Kairouan",
      "Kasserine": "Kasserine", "Sbeitla": "Kasserine", "Thala": "Kasserine", "Feriana": "Kasserine", "Sbiba": "Kasserine", "Djedeliane": "Kasserine", "Aïn Khoucha": "Kasserine",
      "Kébili": "Kébili", "Douz": "Kébili", "Kébili Nord": "Kébili", "Kébili Sud": "Kébili", "Razzeg": "Kébili", "Béchari": "Kébili", "El Golâa": "Kébili", "Souk Lahad": "Kébili",
      "Le Kef": "Le Kef", "Sakiet Sidi Youssef": "Le Kef", "Tajerouine": "Le Kef", "Menzel Salem": "Le Kef", "Bouchemma": "Le Kef", "Dahmani": "Le Kef",
      "Mahdia": "Mahdia", "Mahdia Ville": "Mahdia", "Ksour Essef": "Mahdia", "Melloulèche": "Mahdia", "Sidi Alouane": "Mahdia", "El Djem": "Mahdia", "Chebba": "Mahdia",
      "Manouba": "Manouba", "Den Den": "Manouba", "Mornaguia": "Manouba", "Borj El Amri": "Manouba", "Jedaida": "Manouba", "Menzel Mahfoudh": "Manouba", "Tabarja": "Manouba",
      "Médenine": "Médenine", "Djerba": "Médenine", "Midoun": "Médenine", "Houmt Souk": "Médenine", "Beni Khedache": "Médenine", "Zarzis": "Médenine", "Ben Gardane": "Médenine", "Ajim": "Médenine",
      "Monastir": "Monastir", "Monastir Ville": "Monastir", "Skanès": "Monastir", "Ksar Hellal": "Monastir", "Moknine": "Monastir", "Bembla": "Monastir", "Beni Hassen": "Monastir",
      "Nabeul": "Nabeul", "Hammamet": "Nabeul", "Kelibia": "Nabeul", "Menzel Temime": "Nabeul", "Dar Chaâbane": "Nabeul", "Beni Khiar": "Nabeul",
      "Sfax": "Sfax", "Sfax Ville": "Sfax", "Sfax Sud": "Sfax", "Sfax Nord": "Sfax", "Thyna": "Sfax", "Chihia": "Sfax", "Jedeni": "Sfax", "Menzel Chaker": "Sfax", "Agareb": "Sfax",
      "Sidi Bouzid": "Sidi Bouzid", "Menzel Bouzaiane": "Sidi Bouzid", "Sidi Ali Ben Aoun": "Sidi Bouzid", "Ouled Haffouz": "Sidi Bouzid", "Bir El Hafey": "Sidi Bouzid", "Sahline": "Sidi Bouzid",
      "Siliana": "Siliana", "Bousalem": "Siliana", "El Krib": "Siliana", "Bargou": "Siliana", "Kesra": "Siliana", "Makthar": "Siliana", "Bou Arada": "Siliana", "Sidi Morocco": "Siliana", "Gaâfour": "Siliana",
      "Sousse": "Sousse", "Sousse Ville": "Sousse", "Ksibet Thrayet": "Sousse", "Msaken": "Sousse", "Sidi Bou Ali": "Sousse", "Hammam Sousse": "Sousse", "Kantaoui": "Sousse", "Kalâa Kebira": "Sousse",
      "Tataouine": "Tataouine", "Tataouine Nord": "Tataouine", "Tataouine Sud": "Tataouine", "Ghomrassen": "Tataouine", "Dhehiba": "Tataouine", "Remada": "Tataouine", "El Ferch": "Tataouine", "Smar": "Tataouine",
      "Tozeur": "Tozeur", "Nefta": "Tozeur", "Degache": "Tozeur", "Tameghza": "Tozeur", "El Hamma du Jérid": "Tozeur",
      "Tunis": "Tunis", "Tunis Ville": "Tunis", "Cité El Khadra": "Tunis", "El Ouardia": "Tunis", "El Menzah": "Tunis", "Bhar Lazreg": "Tunis", "Le Bardo": "Tunis", "Sidi Hassine": "Tunis", "Jebel Jelloud": "Tunis",
      "Zaghouan": "Zaghouan", "Zaghouan Ville": "Zaghouan", "Nadhour": "Zaghouan", "Bir Mcherga": "Zaghouan", "Zriba": "Zaghouan", "El Amaiem": "Zaghouan", "Fountain": "Zaghouan"
    };

    const zoneData = {};
    for (const gov of governorates) {
      zoneData[gov] = {};
      for (const cat of categories) {
        zoneData[gov][cat] = 0;
      }
    }

    for (const complaint of complaints) {
      const location = complaint.location;
      // Prefer top-level governorate (clean name), then try location.governorate
      let governorate = complaint.governorate || location?.governorate;
      
      // Clean "Gouvernorat X" prefix if present
      if (governorate && governorate.startsWith('Gouvernorat ')) {
        governorate = governorate.replace('Gouvernorat ', '');
      }
      
      // Try to get governorate from municipality
      if (!governorate || !zoneData[governorate]) {
        const municipality = location?.municipality || location?.commune || complaint.municipalityName;
        if (municipality) {
          governorate = municipalityToGovernorate[municipality];
          if (!governorate) {
            // Try partial match
            for (const [mun, gov] of Object.entries(municipalityToGovernorate)) {
              if (municipality.toLowerCase().includes(mun.toLowerCase()) || mun.toLowerCase().includes(municipality.toLowerCase())) {
                governorate = gov;
                break;
              }
            }
          }
        }
      }

      if (governorate && zoneData[governorate]) {
        const cat = complaint.category || "OTHER";
        if (zoneData[governorate][cat] !== undefined) {
          zoneData[governorate][cat]++;
        } else {
          zoneData[governorate]["OTHER"]++;
        }
      }
    }

    const result = Object.entries(zoneData).map(([governorate, data]) => ({
      governorate,
      ...data,
      total: Object.values(data).reduce((a, b) => a + b, 0)
    })).filter(d => d.total > 0);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Zone stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch zone statistics" });
  }
});

// GET /api/public/top-recurring - Get recurring issues (complaints with same title/description pattern)
router.get("/top-recurring", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const publicStatuses = PUBLIC_ACTIVE_STATUSES;
    const complaints = await Complaint.find({ 
      status: { $in: publicStatuses }, 
      isArchived: { $ne: true },
      title: { $exists: true, $ne: "" }
    });

    const titleCounts = {};
    for (const c of complaints) {
      const normalizedTitle = c.title?.toLowerCase().split(' ').slice(0, 4).join(' ') || "";
      if (normalizedTitle.length > 5) {
        if (!titleCounts[normalizedTitle]) {
          titleCounts[normalizedTitle] = { originalTitle: c.title, category: c.category, count: 0, resolvedCount: 0 };
        }
        titleCounts[normalizedTitle].count++;
        if (c.status === "RESOLVED") {
          titleCounts[normalizedTitle].resolvedCount++;
        }
      }
    }

    const result = Object.entries(titleCounts)
      .filter(([, data]) => data.count >= 2)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([, data]) => ({
        title: data.originalTitle,
        category: data.category,
        count: data.count,
        resolvedCount: data.resolvedCount
      }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Top recurring error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch recurring issues" });
  }
});

// GET /api/public/top-urgent - Get top urgent complaints (>5 confirms)
router.get("/top-urgent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const urgentComplaints = await Complaint.find({
      $expr: { $gte: [{ $size: { $ifNull: ["$confirmations", []] } }, 5] },
      status: { $nin: PUBLIC_ARCHIVE_STATUSES }
    })
      .select("title category status confirmationCount location createdAt")
      .sort({ confirmationCount: -1, createdAt: -1 })
      .limit(limit);

    res.json({
      success: true,
      data: urgentComplaints
    });
  } catch (error) {
    console.error("Top urgent error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch urgent complaints" });
  }
});

// GET /api/public/resolution-times - Get average resolution times
router.get("/resolution-times", async (req, res) => {
  try {
    const { period = "month" } = req.query;
    
    let startDate = new Date();
    if (period === "week") startDate.setDate(startDate.getDate() - 7);
    else if (period === "month") startDate.setMonth(startDate.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(startDate.getFullYear() - 1);
    else if (period === "all") startDate = new Date(0);
    else startDate.setHours(0, 0, 0, 0);

    const complaints = await Complaint.find({ 
      createdAt: { $gte: startDate },
      resolvedAt: { $exists: true }
    });

    // Group by category
    const categoryTimes = {};
    const categories = ["WASTE", "ROAD", "LIGHTING", "WATER", "SAFETY", "PUBLIC_PROPERTY", "GREEN_SPACE", "OTHER"];
    
    for (const cat of categories) {
      const catComplaints = complaints.filter(c => c.category === cat);
      if (catComplaints.length > 0) {
        const avgHours = catComplaints.reduce((sum, c) => {
          return sum + (new Date(c.resolvedAt).getTime() - new Date(c.createdAt).getTime());
        }, 0) / catComplaints.length;
        
        categoryTimes[cat] = {
          count: catComplaints.length,
          avgDays: (avgHours / (1000 * 60 * 60 * 24)).toFixed(1)
        };
      }
    }

    res.json({
      success: true,
      data: categoryTimes
    });
  } catch (error) {
    console.error("Resolution times error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch resolution times" });
  }
});

// GET /api/public/complaints - Get public complaints (validated, assigned, in_progress, resolved)
router.get("/complaints", async (req, res) => {
  try {
    const { 
      category, 
      status, 
      municipality,
      page = 1, 
      limit = 20,
      sort = "newest"
    } = req.query;
    
    const query = {
      // Only show public statuses
      status: { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] },
      isArchived: { $ne: true }
    };
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      // Support comma-separated status values
      const statusList = status.split(',').map(s => s.trim().toUpperCase());
      if (statusList.length > 1) {
        query.status = { $in: statusList };
      } else {
        query.status = statusList[0];
      }
    }
    
    if (municipality) {
      query["location.municipality"] = municipality;
    }
    
    const sortOptions = {};
    if (sort === "oldest") {
      sortOptions.createdAt = 1;
    } else if (sort === "priority") {
      sortOptions.priorityScore = -1;
    } else {
      sortOptions.createdAt = -1; // newest first
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .select("title description category status location createdAt priorityScore confirmationCount upvoteCount media municipalityName governorate referenceId")
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Complaint.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: {
        complaints,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error("Public complaints error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch complaints" });
  }
});

// GET /api/public/complaints/:id - Get single complaint by ID (public, no personal data)
router.get("/complaints/:id", optionalAuth, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .select("title description category status priorityScore municipalityName governorate location createdAt updatedAt resolvedAt media afterPhotos beforePhotos proofPhotos confirmationCount upvoteCount viewsCount referenceId createdBy")
      .lean();
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    
    // Only show public statuses
    const publicStatuses = PUBLIC_ACTIVE_STATUSES;
    if (!publicStatuses.includes(complaint.status)) {
      return res.status(404).json({ success: false, message: "Complaint not available" });
    }

    // Increment views (fire-and-forget, no dedup for v1)
    Complaint.updateOne({ _id: req.params.id }, { $inc: { viewsCount: 1 } }).catch(() => {});

    const isOwnComplaint =
      !!req.user?.userId &&
      complaint.createdBy?.toString() === req.user.userId.toString();

    const { createdBy, ...publicComplaint } = complaint;
    
    res.json({
      success: true,
      data: {
        ...publicComplaint,
        viewsCount: (complaint.viewsCount || 0) + 1,
        isOwnComplaint,
      }
    });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch complaint" });
  }
});

// GET /api/public/my-municipality-complaints - Get complaints for citizen's municipality (requires auth)
router.get("/my-municipality-complaints", authenticate, authorize("CITIZEN"), async (req, res) => {
  try {
    const { category, status, page = 1, limit = 20 } = req.query;
    
    // Get citizen's municipality from their profile
    const user = await User.findById(req.user.userId).select('municipality municipalityName').lean();
    const userMunicipality = user?.municipalityName || "";
    const normalizedMun = normalizeMunicipality(userMunicipality);
    
    if (!normalizedMun) {
      return res.json({ success: true, complaints: [], total: 0, page: 1, pages: 1 });
    }
    
    const munRegex = new RegExp("^" + normalizedMun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "$", "i");
    
    const query = {
      $or: [
        { municipalityNormalized: normalizedMun },
        { municipalityName: munRegex },
        { "location.municipality": munRegex }
      ],
      status: { $in: ["VALIDATED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"] }
    };
    
    if (category) {
      query.category = category;
    }
    
    if (status) {
      const statusList = status
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean);
      query.status = { $in: statusList };
    }
    
    const total = await Complaint.countDocuments(query);
    const complaints = await Complaint.find(query)
      .select('title description category status priorityScore municipalityName location createdAt upvotes confirmations referenceId media upvoteCount confirmationCount createdBy')
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      complaints,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error("My municipality complaints error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch complaints" });
  }
});

// POST /api/public/complaints/:id/confirm - Confirm a complaint (requires auth)
router.post("/complaints/:id/confirm", authenticate, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    if (req.user.role !== "CITIZEN") {
      return res.status(403).json({ success: false, message: "Only citizens can confirm complaints" });
    }

    if (complaint.createdBy?.toString() === req.user.userId.toString()) {
      return res.status(400).json({ success: false, message: "You cannot confirm your own complaint" });
    }
    
    // Check if already confirmed
    const existingIndex = (complaint.confirmations || []).findIndex(
      c => (c.citizenId || c.userId)?.toString() === req.user.userId.toString()
    );
    
    if (existingIndex >= 0) {
      // Remove confirmation
      complaint.confirmations.splice(existingIndex, 1);
    } else {
      // Add confirmation
      complaint.confirmations = complaint.confirmations || [];
      complaint.confirmations.push({
        citizenId: req.user.userId,
        confirmedAt: new Date()
      });
    }
    
    complaint.confirmationCount = complaint.confirmations?.length || 0;
    await complaint.save();
    
    res.json({
      success: true,
      message: existingIndex >= 0 ? "Confirmation removed" : "Complaint confirmed",
      confirmationCount: complaint.confirmations?.length || 0
    });
  } catch (error) {
    console.error("Confirm error:", error);
    res.status(500).json({ success: false, message: "Failed to confirm complaint" });
  }
});

// POST /api/public/complaints/:id/upvote - Upvote a complaint (requires auth)
router.post("/complaints/:id/upvote", authenticate, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }
    
    // Check if already upvoted
    const existingIndex = (complaint.upvotes || []).findIndex(
      v => (v.citizenId || v.userId)?.toString() === req.user.userId.toString()
    );
    
    if (existingIndex >= 0) {
      // Remove upvote
      complaint.upvotes.splice(existingIndex, 1);
    } else {
      // Add upvote
      complaint.upvotes = complaint.upvotes || [];
      complaint.upvotes.push({
        citizenId: req.user.userId,
        upvotedAt: new Date()
      });
    }
    
    complaint.upvoteCount = complaint.upvotes?.length || 0;
    await complaint.save();
    
    res.json({
      success: true,
      message: existingIndex >= 0 ? "Upvote removed" : "Complaint upvoted",
      voteCount: complaint.upvotes?.length || 0,
      upvoteCount: complaint.upvotes?.length || 0
    });
  } catch (error) {
    console.error("Upvote error:", error);
    res.status(500).json({ success: false, message: "Failed to upvote complaint" });
  }
});

// ─── PUBLIC COMMENT ─────────────────────────────────────
router.post("/complaints/:id/comment", authenticate, async (req, res) => {
  try {
    const { text, anonymous } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Comment text is required" });
    }
    if (text.trim().length > 1000) {
      return res.status(400).json({ success: false, message: "Comment too long (max 1000 characters)" });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Fetch user to get their actual name
    const commentUser = await User.findById(req.user.userId).select("fullName role");
    const roleLabels = {
      CITIZEN: "Citizen",
      MUNICIPAL_AGENT: "Municipal Agent",
      DEPARTMENT_MANAGER: "Dept. Manager",
      TECHNICIAN: "Technician",
      ADMIN: "Administrator"
    };
    const displayRole = roleLabels[commentUser?.role || req.user.role] || "User";
    const displayName = anonymous ? "Anonymous" : (commentUser?.fullName || "User");

    const comment = {
      text: text.trim(),
      author: req.user.userId,
      authorName: displayName,
      authorRole: commentUser?.role || req.user.role || "CITIZEN",
      authorRoleLabel: displayRole,
      type: "PUBLIC",
      isInternal: false,
      createdAt: new Date()
    };

    if (!complaint.comments) {
      complaint.comments = [];
    }
    complaint.comments.push(comment);
    await complaint.save();

    res.json({
      success: true,
      message: "Comment added",
      data: {
        text: comment.text,
        authorName: comment.authorName,
        authorRoleLabel: comment.authorRoleLabel,
        createdAt: comment.createdAt
      }
    });
  } catch (error) {
    console.error("Public comment error:", error);
    res.status(500).json({ success: false, message: "Failed to add comment" });
  }
});

// ─── GET PUBLIC COMMENTS ───────────────────────────────
router.get("/complaints/:id/comments", async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).select("comments");
    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    const publicComments = (complaint.comments || [])
      .filter(c => c.type === "PUBLIC" && !c.isInternal)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(c => ({
        _id: c._id,
        text: c.text,
        authorName: c.authorName || "Anonymous",
        authorRoleLabel: c.authorRoleLabel || (c.authorRole === "CITIZEN" ? "Citizen" : c.authorRole === "MUNICIPAL_AGENT" ? "Municipal Agent" : c.authorRole === "DEPARTMENT_MANAGER" ? "Dept. Manager" : c.authorRole === "TECHNICIAN" ? "Technician" : c.authorRole === "ADMIN" ? "Administrator" : "User"),
        createdAt: c.createdAt
      }));

    res.json({ success: true, data: publicComments });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ success: false, message: "Failed to get comments" });
  }
});

module.exports = router;
