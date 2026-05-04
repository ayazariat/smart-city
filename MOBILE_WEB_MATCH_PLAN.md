# Mobile-Web Match Plan: Making Mobile Match Web Exactly

## Executive Summary

Based on the comprehensive analysis of web (Next.js) and mobile (Flutter), this plan outlines the changes needed to make the mobile app match the web exactly for **technician** and **citizen** roles.

**Focus**: Only CITIZEN and TECHNICIAN roles (as per user requirement)

---

## 1. Design System Alignment

### 1.1 Colors - ALREADY MATCHING ✅

| Element       | Web (Hex) | Mobile (Flutter)  | Status   |
| ------------- | --------- | ----------------- | -------- |
| Primary       | #2E7D32   | Color(0xFF2E7D32) | ✅ MATCH |
| Primary Light | #4CAF50   | Color(0xFF4CAF50) | ✅ MATCH |
| Primary Dark  | #1B5E20   | Color(0xFF1B5E20) | ✅ MATCH |
| Accent        | #F57C00   | Color(0xFFF57C00) | ✅ MATCH |
| Background    | #F5F7FA   | Color(0xFFF5F7FA) | ✅ MATCH |
| Danger        | #C62828   | Color(0xFFC62828) | ✅ MATCH |
| Text Primary  | #0F172A   | Color(0xFF0F172A) | ✅ MATCH |

### 1.2 Typography - TO UPDATE

| Element       | Web                     | Mobile         | Action           |
| ------------- | ----------------------- | -------------- | ---------------- |
| Font Family   | Inter/System            | Not defined    | Add to theme     |
| Heading sizes | h1: 2.25rem, h2: 1.5rem | Not consistent | Define in theme  |
| Font weights  | 400/500/600/700         | Not consistent | Use semantically |

---

## 2. Authentication Pages

### 2.1 Login Screen - Needs Updates

| Feature                       | Web                         | Mobile          | Action          |
| ----------------------------- | --------------------------- | --------------- | --------------- |
| AnimatedBackground            | Custom component            | Simple gradient | Update to match |
| Logo container                | Gradient + shadow           | ✅ Match        | Keep            |
| Title "Smart City Tunisia"    | ✅                          | ✅              | Keep            |
| Subtitle                      | "Plateforme de signalement" | Same            | Keep            |
| ReCaptcha badge               | Hidden (UX friendly)        | Not implemented | Add placeholder |
| "Statistiques publiques" link | ✅ BarChart3 icon           | ✅ Public icon  | Match icon      |

**Mobile Action**: Update login_screen.dart to match web styling exactly

### 2.2 Register Screen - Needs Updates

| Feature                            | Web                   | Mobile   | Action          |
| ---------------------------------- | --------------------- | -------- | --------------- |
| Governorate/Municipality dropdowns | datalist autocomplete | Dropdown | Use datalist    |
| Phone input with TN prefix         | ✅ styled             | Basic    | Match styling   |
| Password strength meter            | ✅                    | Missing  | Add             |
| "Use my location" button           | ✅ Navigation         | ✅       | Keep            |
| Geolocation                        | ✅                    | ✅       | Keep            |
| Error display                      | Alert component       | Basic    | Use Alert style |

**Files to update**:

- mobile/lib/screens/register_screen.dart

---

## 3. Navigation & Layout

### 3.1 Sidebar → Bottom Navigation

| Web (Sidebar)    | Mobile (BottomNav)                                      | Status       |
| ---------------- | ------------------------------------------------------- | ------------ |
| 260px sidebar    | 56px + labels                                           | ✅ Mobile OK |
| Citizen items    | Dashboard, Complaints, Archive, Report, Public, Profile | ✅ Match     |
| Technician items | Dashboard, Tasks, Archive, Public, Profile              | ✅ Match     |

**Mobile Action**: Add NotificationBell badge to nav items

### 3.2 Role-Based Navigation

```
CITIZEN:
- Dashboard → Complaints → New Complaint → Archive → Public Stats → Profile
TECHNICIAN:
- Dashboard → Tasks → Archive → Public Stats → Profile
```

---

## 4. Dashboard Screens

### 4.1 Citizen Dashboard

| Feature                   | Web                            | Mobile              | Action |
| ------------------------- | ------------------------------ | ------------------- | ------ |
| Greeting "Bonjour [Name]" | "Bonjour!"                     | Add username        |
| Stats grid (4 cards)      | ✅ (2x2 grid)                  | Keep                |
| My Complaints stat        | ✅                             | Keep                |
| Pending                   | ✅                             | Keep                |
| In Progress               | ✅                             | Keep                |
| Resolved                  | ✅                             | Keep                |
| Quick Actions             | "Nouveau" + "Mes signalements" | Keep                |
| Recent complaints list    | ✅                             | Add photo thumbnail |
| Notifications badge       | ✅ Red circle                  | Keep                |
| Auto-refresh 60s          | ✅                             | Keep                |

### 4.2 Technician Dashboard

| Feature            | Web         | Mobile        | Action |
| ------------------ | ----------- | ------------- | ------ |
| Greeting           | Name + time | Add name      |
| Stats: Total       | ✅          | Keep          |
| Stats: Assigned    | ✅          | Keep          |
| Stats: In Progress | ✅          | Keep          |
| Stats: Resolved    | ✅          | Keep          |
| Stats: Overdue     | ✅          | Add           |
| My Tasks list      | ✅          | Match styling |
| Archive access     | ✅          | Keep          |

---

## 5. Complaint Screens

### 5.1 Complaint List

| Feature                    | Web        | Mobile          | Action |
| -------------------------- | ---------- | --------------- | ------ |
| Search                     | ✅         | Add             |
| Filter by status           | ✅         | Add dropdown    |
| Filter by category         | ✅         | Add dropdown    |
| Filter by date             | ✅         | Add date picker |
| Complaint cards with photo | ✅         | Match styling   |
| Status badge               | ✅ Colored | Keep            |
| Created date               | ✅         | Keep            |

### 5.2 New Complaint

| Feature              | Web             | Mobile             | Action |
| -------------------- | --------------- | ------------------ | ------ |
| Category selection   | Chips           | ✅ Keep            |
| Title input          | ✅              | Keep               |
| Description          | ✅ multiline    | Keep               |
| Governorate dropdown | ✅              | Add datalist style |
| Municipality         | ✅ cascade      | Keep               |
| Photo upload         | 5 max           | Keep               |
| Location (GPS)       | ✅ Get Location | Keep               |
| Duplicate detection  | ✅ BL-25        | Add                |
| Submit button        | Gradient        | Use matching style |

### 5.3 Complaint Detail

| Feature             | Web       | Mobile         | Action |
| ------------------- | --------- | -------------- | ------ |
| Photo gallery       | ✅        | Keep           |
| Title + description | ✅        | Keep           |
| Status + badge      | ✅        | Keep           |
| Created date        | ✅        | Keep           |
| Timeline            | ✅        | Add            |
| Comments            | ✅ public | Add            |
| Map location        | ✅        | Add map marker |

---

## 6. Notifications

| Feature            | Web | Mobile | Action |
| ------------------ | --- | ------ | ------ |
| Badge with count   | ✅  | Keep   |
| List view          | ✅  | Keep   |
| Read/unread states | ✅  | Keep   |
| Pull to refresh    | ✅  | Keep   |
| Tap to read        | ✅  | Keep   |

---

## 7. Profile

| Feature           | Web | Mobile | Action |
| ----------------- | --- | ------ | ------ |
| User info display | ✅  | Keep   |
| Role display      | ✅  | Keep   |
| Municipality      | ✅  | Keep   |
| Logout            | ✅  | Keep   |

---

## 8. Public Transparency

| Feature            | Web                        | Mobile          | Action |
| ------------------ | -------------------------- | --------------- | ------ |
| Stats cards        | Total/Resolved/In Progress | Add             |
| Heatmap            | Leaflet map                | Add placeholder |
| Recent resolutions | ✅                         | Add             |

---

## Files to Modify/Update

### Priority 1 (Critical)

1. **mobile/lib/screens/auth/login_screen.dart** - Match web styling exactly
2. **mobile/lib/screens/register_screen.dart** - Add password strength, fix styling
3. **mobile/lib/screens/dashboard_screen.dart** - Add username, refine stats
4. **mobile/lib/screens/complaints_screen.dart** - Add filters
5. **mobile/lib/screens/new_complaint_screen.dart** - Match styling
6. **mobile/lib/screens/complaint_detail_screen.dart** - Add timeline, comments

### Priority 2 (Important)

7. **mobile/lib/screens/technician/dashboard_screen.dart** - Create full technician dashboard
8. **mobile/lib/screens/technician/technician_tasks_screen.dart** - Match styling
9. **mobile/lib/screens/notifications_screen.dart** - Polish
10. **mobile/lib/screens/transparency_screen.dart** - Add stats

### Priority 3 (Nice to have)

11. **mobile/lib/core/constants/app_theme.dart** - Update typography
12. **mobile/lib/widgets/charts.dart** - Match web charts
13. **mobile/lib/screens/home_screen.dart** - Role-based navigation refinement

---

## Email Notifications

Already implemented in backend:

- Registration verification
- Password reset
- Complaint status changes
- Assignment notifications

Backend file: `backend/src/utils/mailer.js` - Already configured

---

## Implementation Order

### Phase 1: Login & Register (Day 1)

1. Update login_screen.dart to match web exactly
2. Update register_screen.dart styling

### Phase 2: Dashboard (Day 2-3)

3. Update citizen dashboard
4. Create technician dashboard

### Phase 3: Complaints (Day 4-5)

5. Update complaints list with filters
6. Update complaint detail with timeline/comments
7. Match new complaint styling

### Phase 4: Other Screens (Day 6-7)

8. Update notifications
9. Add transparency stats
10. Update profile

---

## Testing Checklist

- [ ] Login page matches web styling
- [ ] Register page includes password strength
- [ ] Geolocation works
- [ ] Dashboard shows correct stats
- [ ] Complaints list has filters
- [ ] Complaint detail shows timeline
- [ ] Notifications badge works
- [ ] Navigation matches role
- [ ] Colors exact match web
- [ ] Gradient buttons match web

---

## Conclusion

The mobile app already has very similar structure to the web. Main work is:

1. Styling refinements to match exact web design tokens
2. Adding filters to complaint lists
3. Adding timeline/comments to complaint details
4. Polishing dashboard stats display

Estimated effort: **5-7 days** for full web parity for CITIZEN and TECHNICIAN roles
