# Smart City - 7 Problems Implementation Plan

## PROBLÈME 1: LOCATION MAP INCOMPLÈTE ✅

- [x] Backend: Update Complaint model to store full address fields (street, municipality, governorate)
- [x] Backend: Add reverse geocoding endpoint using Nominatim
- [x] Frontend: Enhance complaint detail page with formatted address display
- [x] Frontend: Display format "🏛️ Beni Khiar (Gouvernorat Nabeul) 📍 Rue Bourguiba n°12"

## PROBLÈME 2: PHOTOS DISPARAISSENT SESSION FERMÉE ✅

- [x] Backend: Add Cloudinary integration for media upload
- [x] Backend: Create upload endpoint (POST /api/upload)
- [x] Frontend: Update media upload to use Cloudinary
- [x] Frontend: Store permanent URLs in database

## PROBLÈME 3: CITOYEN NE PEUT PAS MODIFIER ✅

- [x] Backend: Add PUT /citizen/complaints/:id endpoint
- [x] Backend: Add validation - only SUBMITTED status can be edited
- [x] Frontend: Add "Modifier" button on complaint detail for SUBMITTED status
- [x] Frontend: Create edit form pre-filled with existing data

## PROBLÈME 4: TECHNICIEN ACTIF SANS VÉRIFICATION ✅

- [x] Backend: Add PENDING_VERIFICATION status to User model
- [x] Backend: Modify createUser to set PENDING_VERIFICATION by default
- [x] Backend: Add verification email with token
- [x] Backend: Add password creation endpoint
- [x] Frontend: Create verify-account page with password form
- [x] Frontend: Update login to check verification status

## PROBLÈME 5: DASHBOARDS VIDES - RBAC CASSÉ ✅

- [x] Backend: Fix getAllComplaints with proper role-based filtering
- [x] Backend: Implement correct filters for each role:
  - [x] MANAGER: departmentId + municipalityId
  - [x] TECHNICIEN: technicianId = moi OR repairTeam.members includes moi
  - [x] AGENT: municipalityId (all statuses)
  - [x] CITOYEN: authorId = moi
  - [x] ADMIN: all + dropdown filters

## PROBLÈME 6: ARCHIVAGE INCORRECT ✅

- [x] Backend: Auto-archive CLOSED complaints after 30 days
- [x] Backend: Only archive status=CLOSED (not all)
- [x] Backend: Add archivedAt timestamp
- [x] Frontend: Main dashboard filters archived:false
- [x] Frontend: Create /archive page for CLOSED complaints

## PROBLÈME 7: ASSIGNATION MANAGER → REPAIR TEAM MANUELLE ✅

- [x] Backend: Add RepairTeam creation when assigning technicians
- [x] Backend: Store team with members array
- [x] Backend: Link RepairTeam to complaint
- [x] Frontend: Display team members in complaint detail
- [x] Frontend: Show "Équipe: Karim + Ali + Eya (3 techs)"

## ANIMATIONS & UI IMPROVEMENTS ✅

- [x] Status timeline: smooth progress bar slide
- [x] Action buttons: pulse + scale hover
- [x] Photo gallery: masonry fadeIn stagger
- [x] Cards: subtle 3D flip hover
- [x] Notes: slide-in from right
- [x] Uniform colors, forms, buttons across all pages
