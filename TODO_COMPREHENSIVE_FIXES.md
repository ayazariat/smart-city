# Comprehensive Task List - Smart City Fixes

## Issue Categories

### 1. Citizen - See & Confirm Redirect Issue

- When citizen clicks "See & Confirm existing issue" from similarity modal, redirect to complaint details in same page
- Currently shows "Complaint Not Found" error

### 2. Similarity Detection Modal

- Remove "Cancel" button from modal
- Keep "See & Confirm existing issue" and "Submit Anyway" buttons only

### 3. Notifications System

- Must be triggered by: validation, assignment, status update, closure
- Verify notification triggers are working

### 4. Agent Page - Duplicate Detection

- Similarity detection must work in agent page
- Show as suggestion + notification (like citizen page)
- Allow agent to decide to merge or cancel

### 5. Remove Duplicate Buttons

- Remove "Duplicates" and "Confirms" buttons from complaint list
- Keep them only in complaint details page

### 6. Comments Text Fix

- Fix "Comments (0)" showing technical "complaintDetail.noCommentsYet"
- Use proper localized text

### 7. History - Department Display

- Show assigned department in history for all roles
- Currently: "By Agent Beni Khiar" without department

### 8. Recent Resolution Cards

- Must show technician's description (resolution report) and photos
- Currently only shows "Issue resolved by municipal team"

### 9. Dashboard Statistics

- Total should be all platform complaints for that role
- Fix: Total=20 but resolved+closed+fixed = 17+6+2 = 25 (wrong)
- Statistics page should show only assigned, resolved, in-progress totals

### 10. AI Features Layout

- Duplicate Detection and Trend Forecasts should appear side by side
- Prevent white spaces

### 11. SLA Performance

- Remove duplicated content
- Add new unique metrics

### 12. Community Actions

- Allow citizens to like/confirm active complaints
- Currently only works for resolved complaints

### 13. Admin Role

- Remove ability to assign/validate complaints
- Admin should only supervise and manage statistics

### 14. Language Translation

- All sections must be properly translated
- No mixing of English/French/Arabic

### 15. Unified Design

- Same design across all pages and roles

## Files to Modify

### Frontend Pages

- frontend/app/dashboard/page.tsx
- frontend/app/dashboard/complaints/[id]/page.tsx
- frontend/app/agent/complaints/page.tsx
- frontend/app/transparency/page.tsx
- frontend/app/transparency/complaints/[id]/page.tsx

### Components

- frontend/components/dashboard/NotificationsPanel.tsx
- frontend/components/dashboard/TrendForecastChart.tsx
- frontend/components/dashboard/DuplicateStatsCard.tsx
- frontend/components/complaints/Timeline.tsx
- frontend/components/ui/ComplaintCard.tsx

### Services

- frontend/services/notification.service.ts
- frontend/services/complaint.service.ts

### Backend

- backend/src/controllers/complaintController.js
- backend/src/controllers/agentController.js
- backend/src/controllers/managerController.js
- backend/src/routes/notifications.routes.js
