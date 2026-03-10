# Smart City - 7 Problems Implementation Plan

## PROBLÈME 1: LOCATION MAP INCOMPLÈTE

- [ ] Backend: Update Complaint model to store full address fields (street, municipality, governorate)
- [ ] Backend: Add reverse geocoding endpoint using Nominatim
- [ ] Frontend: Enhance complaint detail page with formatted address display
- [ ] Frontend: Display format "🏛️ Beni Khiar (Gouvernorat Nabeul) 📍 Rue Bourguiba n°12"

## PROBLÈME 2: PHOTOS DISPARAISSENT SESSION FERMÉE

- [ ] Backend: Add Cloudinary integration for media upload
- [ ] Backend: Create upload endpoint (POST /api/upload)
- [ ] Frontend: Update media upload to use Cloudinary
- [ ] Frontend: Store permanent URLs in database

## PROBLÈME 3: CITOYEN NE PEUT PAS MODIFIER

- [ ] Backend: Add PUT /citizen/complaints/:id endpoint
- [ ] Backend: Add validation - only SUBMITTED status can be edited
- [ ] Frontend: Add "Modifier" button on complaint detail for SUBMITTED status
- [ ] Frontend: Create edit form pre-filled with existing data

## PROBLÈME 4: TECHNICIEN ACTIF SANS VÉRIFICATION

- [ ] Backend: Add PENDING_VERIFICATION status to User model
- [ ] Backend: Modify createUser to set PENDING_VERIFICATION by default
- [ ] Backend: Add verification email with token
- [ ] Backend: Add password creation endpoint
- [ ] Frontend: Create verify-account page with password form
- [ ] Frontend: Update login to check verification status

## PROBLÈME 5: DASHBOARDS VIDES - RBAC CASSÉ

- [ ] Backend: Fix getAllComplaints with proper role-based filtering
- [ ] Backend: Implement correct filters for each role:
  - [ ] MANAGER: departmentId + municipalityId
  - [ ] TECHNICIEN: technicianId = moi OR repairTeam.members includes moi
  - [ ] AGENT: municipalityId (all statuses)
  - [ ] CITOYEN: authorId = moi
  - [ ] ADMIN: all + dropdown filters

## PROBLÈME 6: ARCHIVAGE INCORRECT

- [ ] Backend: Auto-archive CLOSED complaints after 30 days
- [ ] Backend: Only archive status=CLOSED (not all)
- [ ] Backend: Add archivedAt timestamp
- [ ] Frontend: Main dashboard filters archived:false
- [ ] Frontend: Create /archive page for CLOSED complaints

## PROBLÈME 7: ASSIGNATION MANAGER → REPAIR TEAM MANUELLE

- [ ] Backend: Add RepairTeam creation when assigning technicians
- [ ] Backend: Store team with members array
- [ ] Backend: Link RepairTeam to complaint
- [ ] Frontend: Display team members in complaint detail
- [ ] Frontend: Show "Équipe: Karim + Ali + Eya (3 techs)"

## ANIMATIONS & UI IMPROVEMENTS

- [ ] Status timeline: smooth progress bar slide
- [ ] Action buttons: pulse + scale hover
- [ ] Photo gallery: masonry fadeIn stagger
- [ ] Cards: subtle 3D flip hover
- [ ] Notes: slide-in from right
- [ ] Uniform colors, forms, buttons across all pages
