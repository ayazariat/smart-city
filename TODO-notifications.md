# Notifications System Completion TODO

## Phase 1: Backend Email Centralization [✅]

### 1.1 Enhance `backend/src/utils/emailTemplates.js` [✅]

### 1.2 Add `sendNotificationEmail` to `backend/src/utils/mailer.js` [✅]

### 1.3 Update `backend/src/services/notification.service.js` [✅]

## Phase 2: Backend Triggers [ ]

### 2.1 `backend/src/controllers/citizenController.js`

- createComplaint → notify municipality agents

### 2.2 `backend/src/controllers/technicianController.js`

- Status IN_PROGRESS/RESOLVED → citizen

### 2.3 `backend/src/controllers/managerController.js`

- priority change → agent

### 2.4 Confirmation/upvote → agent

## Phase 3: Frontend Topbar Bell [✅]

### 3.1 `frontend/components/layout/Topbar.tsx` [✅]

- Bell + badge + dropdown (Today/Earlier, blue unread border, icons, mark read→navigate to complaint)

## Phase 4: Remove Dashboard Panel [ ]

### 4.1 Search & remove NotificationsPanel from dashboard pages

- dashboard/page.tsx, unified, role-specific

### 4.2 Verify useNotifications polling (add 30s interval)

## Phase 5: Test [ ]

### 5.1 Backend API tests

### 5.2 Frontend bell tests all roles

### 5.3 End-to-end 10 events (notifs + emails)

### 5.4 No regressions

**Progress: 1/5 phases complete**
