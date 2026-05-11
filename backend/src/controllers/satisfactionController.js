const Complaint = require("../models/Complaint");
const SatisfactionSurvey = require("../models/SatisfactionSurvey");

class SatisfactionController {
  async createSurvey(req, res) {
    try {
      const { complaintId, rating, comment } = req.body;
      const userId = req.user.userId;

      // Check if complaint exists and belongs to the citizen
      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      if (complaint.createdBy.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Not authorized to rate this complaint" });
      }

      // Check if complaint is resolved or closed
      if (!["RESOLVED", "CLOSED"].includes(complaint.status)) {
        return res.status(400).json({ success: false, message: "Complaint must be resolved or closed to rate" });
      }

      // Check if survey already exists for this complaint
      const existingSurvey = await SatisfactionSurvey.findOne({ complaint: complaintId, citizen: userId });
      if (existingSurvey) {
        return res.status(400).json({ success: false, message: "Already rated this complaint" });
      }

      // Create survey
      const survey = new SatisfactionSurvey({
        complaint: complaintId,
        citizen: userId,
        rating,
        comment,
        shownAt: new Date(),
        respondedAt: new Date(),
      });

      await survey.save();

      // Update complaint with rating
      complaint.rating = {
        score: rating,
        comment: comment || "",
        ratedAt: new Date(),
      };
      await complaint.save();

      res.json({ success: true, message: "Rating submitted successfully" });
    } catch (error) {
      console.error("Create survey error:", error);
      res.status(500).json({ success: false, message: "Failed to submit rating" });
    }
  }

  async dismissSurvey(req, res) {
    try {
      const { complaintId } = req.body;
      const userId = req.user.userId;

      // Check if survey exists
      let survey = await SatisfactionSurvey.findOne({ complaint: complaintId, citizen: userId });
      
      // If survey doesn't exist, create a dismissed one
      if (!survey) {
        survey = new SatisfactionSurvey({
          complaint: complaintId,
          citizen: userId,
          rating: null,
          comment: null,
          shownAt: new Date(),
          dismissed: true,
          dismissedAt: new Date(),
          nextEligibleDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        });
      } else {
        survey.dismissed = true;
        survey.dismissedAt = new Date();
        survey.nextEligibleDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
      }

      await survey.save();

      res.json({ success: true, message: "Survey dismissed" });
    } catch (error) {
      console.error("Dismiss survey error:", error);
      res.status(500).json({ success: false, message: "Failed to dismiss survey" });
    }
  }

  async getPendingSurvey(req, res) {
    try {
      const userId = req.user.userId;

      // Find pending survey for this citizen
      const pendingSurvey = await SatisfactionSurvey.findOne({
        citizen: userId,
        dismissed: false,
        respondedAt: null,
      }).populate("complaint");

      if (!pendingSurvey) {
        return res.json({ success: true, data: null });
      }

      // Check if survey is still eligible (within 2 days of being shown)
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      if (pendingSurvey.shownAt < twoDaysAgo) {
        // Update next eligible date
        pendingSurvey.dismissed = true;
        pendingSurvey.dismissedAt = new Date();
        pendingSurvey.nextEligibleDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        await pendingSurvey.save();
        
        return res.json({ success: true, data: null });
      }

      res.json({ success: true, data: pendingSurvey });
    } catch (error) {
      console.error("Get pending survey error:", error);
      res.status(500).json({ success: false, message: "Failed to get pending survey" });
    }
  }

  async triggerSurveyForComplaint(req, res) {
    try {
      const { complaintId } = req.params;
      
      const complaint = await Complaint.findById(complaintId);
      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" });
      }

      const citizenId = complaint.createdBy;

      // Check if survey already exists
      const existingSurvey = await SatisfactionSurvey.findOne({
        complaint: complaintId,
        citizen: citizenId,
      });

      if (existingSurvey) {
        return res.json({ success: true, message: "Survey already exists" });
      }

      // Check if citizen is eligible (nextEligibleDate has passed or doesn't exist)
      const recentSurvey = await SatisfactionSurvey.findOne({
        citizen: citizenId,
        nextEligibleDate: { $gt: new Date() },
      });

      if (recentSurvey) {
        return res.json({ success: true, message: "Citizen not eligible yet" });
      }

      // Create new pending survey
      const survey = new SatisfactionSurvey({
        complaint: complaintId,
        citizen: citizenId,
        rating: null,
        comment: null,
        shownAt: new Date(),
      });

      await survey.save();

      res.json({ success: true, message: "Survey triggered successfully" });
    } catch (error) {
      console.error("Trigger survey error:", error);
      res.status(500).json({ success: false, message: "Failed to trigger survey" });
    }
  }

  async getSurveyStats(req, res) {
    try {
      const stats = await SatisfactionSurvey.aggregate([
        {
          $match: {
            rating: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            totalRatings: { $sum: 1 },
            averageRating: { $avg: "$rating" },
            ratingDistribution: {
              $push: "$rating",
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalRatings: 1,
            averageRating: { $round: ["$averageRating", 2] },
            rating5: {
              $size: {
                $filter: {
                  input: "$ratingDistribution",
                  cond: { $eq: ["$$this", 5] },
                },
              },
            },
            rating4: {
              $size: {
                $filter: {
                  input: "$ratingDistribution",
                  cond: { $eq: ["$$this", 4] },
                },
              },
            },
            rating3: {
              $size: {
                $filter: {
                  input: "$ratingDistribution",
                  cond: { $eq: ["$$this", 3] },
                },
              },
            },
            rating2: {
              $size: {
                $filter: {
                  input: "$ratingDistribution",
                  cond: { $eq: ["$$this", 2] },
                },
              },
            },
            rating1: {
              $size: {
                $filter: {
                  input: "$ratingDistribution",
                  cond: { $eq: ["$$this", 1] },
                },
              },
            },
          },
        },
      ]);

      res.json({
        success: true,
        data: stats[0] || {
          totalRatings: 0,
          averageRating: 0,
          rating5: 0,
          rating4: 0,
          rating3: 0,
          rating2: 0,
          rating1: 0,
        },
      });
    } catch (error) {
      console.error("Get survey stats error:", error);
      res.status(500).json({ success: false, message: "Failed to get survey stats" });
    }
  }
}

module.exports = new SatisfactionController();
