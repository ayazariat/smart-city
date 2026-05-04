# Unify Complaint Categories & Fix Stats=0

## Status: [IN PROGRESS] 3/8 ✅

### 1. ✅ Create/run seed-complaints.js (30 samples)

### 2. ✅ Run seed-departments.js (8 depts)

### 3. ✅ Edit frontend/lib/complaints.ts - Removed UPPERCASE categoryLabels

### 4. [ ] Edit frontend/app/dashboard/page.tsx - Lowercase categoryColors + getCategoryLabel

### 5. [ ] Edit frontend/app/admin/complaints/page.tsx - Standardize getCategoryLabel

### 6. [ ] Replace categoryLabels → getCategoryLabel(value) in transparency/page.tsx + others

### 7. [ ] Edit frontend/components/ui/ComplaintCard.tsx if uses old labels

### 8. [ ] Test all pages: labels consistent, stats show real data (>0)

**Notes:**

- Backend uses lowercase categories (good)
- Frontend now uses categories.ts exclusively
- Sample data: 30 complaints (mixed cats/status)
