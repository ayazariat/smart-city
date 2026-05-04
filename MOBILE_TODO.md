# Mobile-Web Matching Implementation TODO

## Status: Analysis Complete - Ready to Implement

**Scope**: Only CITIZEN and TECHNICIAN roles  
**Goal**: Mobile matches web exactly

---

## Current Matching Status ✅

| Component            | Web                       | Mobile         | Status  |
| -------------------- | ------------------------- | -------------- | ------- |
| Colors               | #2E7D32, #F57C00, #C62828 | Same           | ✅ DONE |
| Login gradient       | AnimatedBackground        | Gradient       | ✅ DONE |
| Register geolocation | Not in web                | ✅ IMPLEMENTED | ✅ DONE |
| Password strength    | Not in web                | ✅ IMPLEMENTED | ✅ DONE |
| Dashboard stats      | 4 cards                   | 4 cards        | ✅ DONE |
| Navigation           | Sidebar                   | BottomNav      | ✅ DONE |

---

## TODO - Implementation Required

### Phase 1: Authentication Enhancement

- [ ] Add username to dashboard greeting (show "Bonjour [Name]!")
- [ ] Add role display on profile screen
- [ ] Verify email notifications are working

### Phase 2: Dashboard Polish

- [ ] Add municipality name display on dashboard
- [ ] Add notification badge with count
- [ ] Add pull-to-refresh animation

### Phase 3: Complaints Enhancement

- [ ] Add search functionality to complaints list
- [ ] Add status filter dropdown
- [ ] Add category filter
- [ ] Add date range filter

### Phase 4: Complaint Detail Enhancement

- [ ] Add timeline/history section
- [ ] Add public comments section
- [ ] Add photo gallery with zoom

### Phase 5: Notifications Integration

- [ ] Add notification badge to nav bar
- [ ] Add mark as read functionality
- [ ] Add unread count indicator

---

## Files to Modify

1. `mobile/lib/screens/dashboard_screen.dart`
2. `mobile/lib/screens/complaints_screen.dart`
3. `mobile/lib/screens/complaint_detail_screen.dart`
4. `mobile/lib/screens/home/notifications_screen.dart`
5. `mobile/lib/screens/profile_screen.dart`
6. `mobile/lib/routes/app_routes.dart`

---

## Testing Checklist

- [ ] Login colors match web
- [ ] Register geolocation works
- [ ] Dashboard shows username
- [ ] Stats grid matches web
- [ ] Complaints list has filters
- [ ] Detail shows timeline
- [ ] Notifications badge works

---

## Estimated Time: 3-4 hours remaining
