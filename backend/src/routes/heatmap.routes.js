const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const { authenticate } = require("../middleware/auth");

// Get heatmap data for complaints
// Query params: category, status, municipality, department
router.get("/", authenticate, async (req, res) => {
  try {
    const { category, status, municipality, department } = req.query;
    
    const query = {};
    
    // Filter by category if provided
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Filter by status if provided (default: exclude closed/rejected)
    if (status) {
      if (status === 'active') {
        query.status = { $nin: ['CLOSED', 'REJECTED', 'ARCHIVED'] };
      } else {
        query.status = status;
      }
    } else {
      query.status = { $nin: ['CLOSED', 'REJECTED', 'ARCHIVED'] };
    }
    
    // Filter by municipality (for agents)
    if (municipality) {
      query.$or = [
        { 'location.municipality': municipality },
        { municipalityName: municipality }
      ];
    }
    
    // Filter by department (for managers)
    if (department) {
      query.assignedDepartment = department;
    }
    
    // Get complaints with location data
    const complaints = await Complaint.find(query)
      .select('location category status municipalityName createdAt')
      .lean();
    
    // Aggregate by location
    const locationMap = new Map();
    
    complaints.forEach(complaint => {
      if (complaint.location && complaint.location.coordinates) {
        const lat = complaint.location.coordinates[1];
        const lng = complaint.location.coordinates[0];
        
        // Round to 4 decimal places for grouping
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        
        if (locationMap.has(key)) {
          const existing = locationMap.get(key);
          existing.count += 1;
          if (!existing.categories.includes(complaint.category)) {
            existing.categories.push(complaint.category);
          }
        } else {
          locationMap.set(key, {
            lat,
            lng,
            count: 1,
            categories: complaint.category ? [complaint.category] : []
          });
        }
      }
    });
    
    const heatmapData = Array.from(locationMap.values());
    
    res.json({
      success: true,
      data: heatmapData,
      total: complaints.length,
      points: heatmapData.length
    });
  } catch (error) {
    console.error('Heatmap error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get categories for filter
router.get("/categories", authenticate, async (req, res) => {
  try {
    const categories = await Complaint.distinct('category');
    res.json({
      success: true,
      categories
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
