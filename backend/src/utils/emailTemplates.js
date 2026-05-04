const { FRONTEND_URL = 'http://localhost:3000' } = process.env;

/**
 * Role-personalized email templates for complaint assignment (REQ #4)
 */

module.exports = {
  // === EXISTING ASSIGNMENT TEMPLATES (KEEP) ===
  assignmentCitizenEmail: (firstName, complaintTitle, submitDate, departmentName) => ({
    subject: `Your complaint has been assigned — Smart City`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>your complaint titled <strong>"${complaintTitle}"</strong> submitted on <strong>${new Date(submitDate).toLocaleDateString('fr-FR')}</strong> has been assigned to the <strong>${departmentName}</strong> department.</p>
        <p>You will be notified when work begins.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/my-complaints" style="background: #2E7D32; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View My Complaints
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          You received this automated notification from Smart City Tunisia.
        </p>
      </div>
    `
  }),

  assignmentTechnicianEmail: (firstName, complaintTitle, municipalityZone, departmentName) => ({
    subject: `New complaint assigned to your department`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>a complaint titled <strong>"${complaintTitle}"</strong> in <strong>${municipalityZone}</strong> has been assigned to your department <strong>(${departmentName})</strong>.</p>
        <p>Please log in to review it.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/dashboard" style="background: #2E7D32; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Log In & Review
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          You received this automated notification from Smart City Tunisia.
        </p>
      </div>
    `
  }),

  assignmentManagerEmail: (complaintTitle, departmentName, assignDate) => ({
    subject: `Assignment confirmed — ${complaintTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>You have successfully assigned the complaint <strong>"${complaintTitle}"</strong> to the <strong>${departmentName}</strong> team on <strong>${new Date(assignDate).toLocaleDateString('fr-FR')}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/manager/pending" style="background: #2E7D32; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View Assigned Complaints
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          This is your automated assignment confirmation.
        </p>
      </div>
    `
  }),

  // === NEW TEMPLATES FOR ALL 10 EVENTS ===

  // 1. Complaint submitted → Agent of municipality
  newComplaintAgent: (agentName, complaintTitle, zone, municipalityName) => ({
    subject: `New complaint submitted: ${complaintTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${agentName}</strong>,</p>
        <p>A new complaint titled <strong>"${complaintTitle}"</strong> has been submitted in <strong>${zone}</strong>, <strong>${municipalityName}</strong>.</p>
        <p>Please review and validate it promptly.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/agent/complaints" style="background: #2E7D32; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Review New Complaints
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          You received this notification as an agent for ${municipalityName}.
        </p>
      </div>
    `
  }),

  // 2. Validated → Citizen
  complaintValidatedCitizen: (firstName, complaintTitle) => ({
    subject: `Your complaint "${complaintTitle}" has been validated`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>Great news! Your complaint <strong>"${complaintTitle}"</strong> has been validated and is now visible publicly.</p>
        <p>It will be assigned to the appropriate department soon.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/my-complaints" style="background: #2196F3; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View Your Complaints
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Status: Validated
        </p>
      </div>
    `
  }),

  // 3. Rejected → Citizen
  complaintRejectedCitizen: (firstName, complaintTitle, reason) => ({
    subject: `Your complaint "${complaintTitle}" was rejected`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>Your complaint <strong>"${complaintTitle}"</strong> was reviewed and rejected.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>You may submit a new complaint if needed.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/complaints/new" style="background: #F44336; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Submit New Complaint
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Status: Rejected
        </p>
      </div>
    `
  }),

  // 4. Assigned to department → Citizen
  complaintAssignedCitizen: (firstName, complaintTitle, departmentName) => ({
    subject: `Your complaint "${complaintTitle}" assigned to ${departmentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>Your complaint <strong>"${complaintTitle}"</strong> has been assigned to <strong>${departmentName}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/my-complaints" style="background: #FF9800; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Track Progress
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Status: Assigned
        </p>
      </div>
    `  
  }),

  // 5. Assigned to department → Technicians
  complaintAssignedTechnician: (techName, complaintTitle, departmentName, municipalityZone) => ({
    subject: `New: "${complaintTitle}" assigned to ${departmentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${techName}</strong>,</p>
        <p>Complaint <strong>"${complaintTitle}"</strong> in <strong>${municipalityZone}</strong> has been assigned to your team <strong>(${departmentName})</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/dashboard" style="background: #FF9800; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Review Assignment
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Please prioritize based on urgency level.
        </p>
      </div>
    `
  }),

  // 6. Priority changed → Agent
  priorityChangedAgent: (agentName, complaintTitle, newPriority, managerName) => ({
    subject: `Priority updated for "${complaintTitle}": ${newPriority}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${agentName}</strong>,</p>
        <p>The manager <strong>${managerName}</strong> has updated the priority of complaint <strong>"${complaintTitle}"</strong> to <strong>${newPriority}</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/agent/complaints" style="background: #9C27B0; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View Complaint
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Please ensure appropriate handling.
        </p>
      </div>
    `
  }),

  // 7. Status to In Progress → Citizen
  statusInProgressCitizen: (firstName, complaintTitle) => ({
    subject: `Work started on "${complaintTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>Work has started on your complaint <strong>"${complaintTitle}"</strong>.</p>
        <p>The technical team is now handling your request.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/my-complaints" style="background: #FF9800; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Track Progress
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Status: In Progress
        </p>
      </div>
    `
  }),

  // 8. Resolved → Citizen
  complaintResolvedCitizen: (firstName, complaintTitle) => ({
    subject: `"${complaintTitle}" resolved - Please confirm`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>Your complaint <strong>"${complaintTitle}"</strong> has been resolved!</p>
        <p>Please check and confirm if the issue is fixed.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/my-complaints" style="background: #4CAF50; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Review Resolution
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Status: Resolved
        </p>
      </div>
    `
  }),

  // 9. Closed → Citizen
  complaintClosedCitizen: (firstName, complaintTitle) => ({
    subject: `"${complaintTitle}" officially closed`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${firstName}</strong>,</p>
        <p>Your complaint <strong>"${complaintTitle}"</strong> has been officially closed.</p>
        <p>Thank you for using Smart City Tunisia platform.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/my-complaints" style="background: #9E9E9E; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View Complaint History
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Status: Closed
        </p>
      </div>
    `
  }),

  // 10. Upvoted/confirmed → Agent
  complaintUpvotedAgent: (agentName, complaintTitle) => ({
    subject: `Community confirmation for "${complaintTitle}" (+1 upvote)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #2E7D32; margin: 0;">Smart City Tunisia</h1>
        </div>
        <p>Hello <strong>${agentName}</strong>,</p>
        <p>Complaint <strong>"${complaintTitle}"</strong> received a new community confirmation (<strong>+1 upvote</strong>).</p>
        <p>This may indicate increased urgency.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${FRONTEND_URL}/agent/complaints" style="background: #4CAF50; color: white; padding: 12px 24px; display: inline-block; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Review Complaint
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">
          Community Engagement Notification
        </p>
      </div>
    `
  })
};
