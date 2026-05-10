const express = require('express');
const router = express.Router();
const SLARule = require('../models/SLARule');
const { authenticate, authorize } = require('../middleware/auth');

// Get all SLA rules
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const rules = await SLARule.find({ isActive: true }).sort({ category: 1, urgency: 1 });
    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('Error fetching SLA rules:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update SLA rules (bulk update)
router.put('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { rules } = req.body;
    
    if (!Array.isArray(rules)) {
      return res.status(400).json({ success: false, message: 'Rules must be an array' });
    }

    // Delete all existing rules
    await SLARule.deleteMany({});

    // Insert new rules
    const createdRules = await SLARule.insertMany(rules);

    res.json({ success: true, data: createdRules, message: 'SLA rules updated successfully' });
  } catch (error) {
    console.error('Error updating SLA rules:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get SLA hours for a specific category and urgency
router.get('/sla-hours', authenticate, async (req, res) => {
  try {
    const { category, urgency } = req.query;
    
    if (!category || !urgency) {
      return res.status(400).json({ success: false, message: 'Category and urgency are required' });
    }

    const rule = await SLARule.findOne({ 
      category: category.toUpperCase(), 
      urgency: urgency.toUpperCase(),
      isActive: true 
    });

    if (!rule) {
      // Return default if no rule found
      return res.json({ success: true, deadlineHours: 72 });
    }

    res.json({ success: true, deadlineHours: rule.deadlineHours });
  } catch (error) {
    console.error('Error fetching SLA hours:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
