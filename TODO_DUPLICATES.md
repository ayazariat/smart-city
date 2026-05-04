# DUPLICATE_WARNING_FIXES.md

## Smart City Duplicate Detection Improvements (BL-25)

### COMPLETED: [x] 1. Create TODO.md

### COMPLETED: [x] 2. Fix AI Service - Real DB duplicates ✓

### TODO Steps (in order):

#### PRIORITY 2: Frontend UI Fixes

- [ ] **3. Move duplicateWarning after urgency slider**
- [ ] **3.1 Fix French text + citizen readability**
- [ ] **3.2 Use real match.title (no demo data)**

#### PRIORITY 3: Testing & Validation

- [ ] **4. Test full flow**
  - Real duplicates appear after urgency
  - Click 'Voir détails →' → navigate to real complaint
  - Back preserves form state
- [ ] **5. Restart services**
  - `cd ai-services && python main.py`
- [ ] **6. Final completion**

### Progress: 2/6 COMPLETE

**Next**: Move duplicateWarning JSX block after urgency slider in `frontend/app/complaints/new/page.tsx`
