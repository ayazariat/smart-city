# Analyse Complète : Mobile vs Web

> **Date**: Analyse basée sur les codebases frontend/ et mobile/
> **Objectif**: Identifier TOUS les écarts entre le web (Next.js) et le mobile (Flutter)

---

## RÉSUMÉ EXECUTIF

Le **web** est une application Next.js complète avec ~35 pages/routes, ~20 services, et ~30 composants réutilisables. Le **mobile** Flutter a une structure similaire mais avec **des fonctionnalités critiques manquantes** dans presque toutes les sections.

**Écart global estimé**: ~40% des fonctionnalités web ne sont pas encore implémentées dans le mobile.

---

## 1. AUTHENTIFICATION & ONBOARDING

| Feature                                     | Web                     | Mobile                 | Statut       |
| ------------------------------------------- | ----------------------- | ---------------------- | ------------ |
| Login avec email/password                   | ✅                      | ✅                     | OK           |
| Register avec vérification email            | ✅                      | ✅                     | OK           |
| Forgot password (envoi email)               | ✅                      | ✅                     | OK           |
| Reset password (lien magique)               | ✅                      | ❌                     | **MANQUANT** |
| Set password (première connexion)           | ✅                      | ❌                     | **MANQUANT** |
| Verify account (token URL)                  | ✅                      | ✅ (VerifyEmailScreen) | OK           |
| **ReCaptcha v2** (login/register)           | ✅                      | ❌                     | **MANQUANT** |
| Redirection "last visited page" après login | ✅ (useLastVisitedPage) | ❌                     | **MANQUANT** |
| Auto-refresh token                          | ✅                      | ⚠️ Partiel             | À améliorer  |

### Détails des manques:

- **Reset Password Screen**: Le web a `/reset-password` avec token validation. Le mobile n'a qu'un `forgot_password_screen` sans logique de reset via token.
- **Set Password**: Le web a `/set-password` pour les nouveaux utilisateurs créés par admin. Mobile manquant.
- **ReCaptcha**: Le web intègre Google ReCaptchaBadge. Le mobile n'a aucune protection anti-bot.

---

## 2. DASHBOARD (Page d'accueil post-login)

Le web a **UN dashboard unifié** (`app/dashboard/page.tsx`) avec du contenu **dynamique selon le rôle**:

| Feature                                    | Web | Mobile     | Statut       |
| ------------------------------------------ | --- | ---------- | ------------ |
| Bienvenue personnalisée (nom + rôle)       | ✅  | ✅         | OK           |
| **Today's Priorities** (priorités du jour) | ✅  | ❌         | **MANQUANT** |
| Stats adaptatives par rôle                 | ✅  | ⚠️ Partiel | À compléter  |
| **Recent Activities** (8 items)            | ✅  | ❌         | **MANQUANT** |
| **Municipality Overview** (carte + stats)  | ✅  | ❌         | **MANQUANT** |
| **Municipality Complaints** (citoyen)      | ✅  | ❌         | **MANQUANT** |
| **Recent Resolutions** (citoyen)           | ✅  | ❌         | **MANQUANT** |
| Statistiques par catégorie (bar charts)    | ✅  | ❌         | **MANQUANT** |
| **Trend Forecasts / AI Alerts**            | ✅  | ❌         | **MANQUANT** |
| **7-Day Forecast Chart**                   | ✅  | ❌         | **MANQUANT** |
| **Duplicate Stats Card**                   | ✅  | ❌         | **MANQUANT** |
| Resolution rate avec barre de progression  | ✅  | ❌         | **MANQUANT** |
| Refresh auto toutes les 60s                | ✅  | ✅         | OK           |

### Détails des manques:

- **Priorités du jour**: Le web affiche des cartes colorées (rouge/amber/vert) avec les actions urgentes selon le rôle. Ex: "5 overdue need attention", "3 new to validate". Le mobile n'a rien de comparable.
- **RecentActivities**: Composant web complet avec icônes, timestamps, et actions récentes. Mobile manquant.
- **MunicipalityOverview**: Affiche les stats de la municipalité avec mini-carte. Mobile manquant.
- **Trend Alerts**: Prédictions IA sur les tendances (BL-37). Mobile manquant.

---

## 3. ADMINISTRATION (Rôle ADMIN)

### 3.1 Admin Complaints

| Feature                                                                                 | Web | Mobile     | Statut                                      |
| --------------------------------------------------------------------------------------- | --- | ---------- | ------------------------------------------- |
| Liste des plaintes                                                                      | ✅  | ✅         | OK                                          |
| **Filtres avancés** (status, governorate, municipality, category, priority, date range) | ✅  | ⚠️ Partiel | Mobile manque governorate/municipality/date |
| **Export CSV**                                                                          | ✅  | ❌         | **MANQUANT**                                |
| **Export PDF**                                                                          | ✅  | ❌         | **MANQUANT**                                |
| **Stats globales** (total, resolved, at risk, overdue)                                  | ✅  | ⚠️ Partiel | Mobile manque At Risk/Overdue               |
| **Team Performance Metrics**                                                            | ✅  | ❌         | **MANQUANT**                                |
| **Categories breakdown** (tags avec count)                                              | ✅  | ❌         | **MANQUANT**                                |
| **Pagination**                                                                          | ✅  | ❌         | **MANQUANT**                                |
| Auto-refresh stats                                                                      | ✅  | ❌         | **MANQUANT**                                |

### 3.2 Admin Users

| Feature                                                | Web | Mobile     | Statut                                             |
| ------------------------------------------------------ | --- | ---------- | -------------------------------------------------- |
| Liste des utilisateurs                                 | ✅  | ✅         | OK                                                 |
| **Pagination** (10 par page)                           | ✅  | ❌         | **MANQUANT**                                       |
| **Recherche**                                          | ✅  | ✅         | OK                                                 |
| **Création utilisateur** (modal)                       | ✅  | ✅         | OK                                                 |
| **Édition utilisateur** (modal)                        | ✅  | ✅         | OK                                                 |
| Toggle active/inactive                                 | ✅  | ✅         | OK                                                 |
| **Suppression**                                        | ✅  | ✅         | OK                                                 |
| **Autocomplétion governorate/municipality** (datalist) | ✅  | ⚠️ Basic   | Mobile utilise dropdown simple vs autocomplete web |
| Stats cards (total, active, inactive, admins)          | ✅  | ❌         | **MANQUANT**                                       |
| Role color badges                                      | ✅  | ✅         | OK                                                 |
| Department assignment (pour Manager/Tech)              | ✅  | ⚠️ Partiel | Vérifier si présent                                |

### 3.3 Admin Settings

| Feature                                            | Web | Mobile | Statut |
| -------------------------------------------------- | --- | ------ | ------ |
| **Onglet Departments** (CRUD)                      | ✅  | ✅     | OK     |
| **Onglet SLA Rules** (table par catégorie/urgence) | ✅  | ✅     | OK     |
| **Onglet Categories** (visualisation assignation)  | ✅  | ✅     | OK     |
| Édition inline des SLA                             | ✅  | ✅     | OK     |

**Note**: Le mobile a un `AdminSettingsScreen` assez complet. C'est une des sections les mieux couvertes.

---

## 4. AGENT MUNICIPAL (Rôle MUNICIPAL_AGENT)

### 4.1 Agent Complaints Page

Le web (`app/agent/complaints/page.tsx`) est très riche. Le mobile (`screens/agent/agent_complaints_screen.dart`) a une base mais manque beaucoup.

| Feature                                                                         | Web | Mobile     | Statut                                  |
| ------------------------------------------------------------------------------- | --- | ---------- | --------------------------------------- |
| Liste avec filtres                                                              | ✅  | ✅         | OK                                      |
| **AiSuggestion** (prédiction département IA)                                    | ✅  | ❌         | **MANQUANT**                            |
| **Assign Department** avec AI suggestion                                        | ✅  | ❌         | **MANQUANT**                            |
| **Resolution Review** (approve/reject)                                          | ✅  | ❌         | **MANQUANT**                            |
| **Export CSV/PDF**                                                              | ✅  | ❌         | **MANQUANT**                            |
| **Performance Metrics** (in progress, avg days, resolution rate, high priority) | ✅  | ❌         | **MANQUANT**                            |
| **SLA-based Overdue/AtRisk** (basé sur slaDeadline)                             | ✅  | ⚠️ Partiel | Mobile utilise createdAt+7j vs SLA réel |
| **ConfirmationModal** (validation user)                                         | ✅  | ❌         | **MANQUANT**                            |
| **Modals professionnels** (reject, assign, review)                              | ✅  | ✅         | OK                                      |
| Duplicate detection & merge                                                     | ✅  | ✅         | OK (bien implémenté!)                   |

### 4.2 Actions Spécifiques Manquantes

- **Approve Resolution**: Le web a un bouton "Approve & Close" + "Reject & Return" avec modal détaillé. Mobile n'a pas ces actions dans l'écran agent.
- **AI Department Prediction**: Le web appelle `/ai/departments/predict` et affiche une suggestion avec pourcentage de confiance. Mobile manque.

---

## 5. DEPARTMENT MANAGER (Rôle MANAGER)

Le web (`app/manager/pending/page.tsx`) vs mobile (`screens/manager/manager_pending_screen.dart` + `manager_dashboard_screen.dart`)

| Feature                                      | Web | Mobile                     | Statut                               |
| -------------------------------------------- | --- | -------------------------- | ------------------------------------ |
| Liste des plaintes                           | ✅  | ✅                         | OK                                   |
| **Assign Technician** (modal avec liste)     | ✅  | ⚠️ Partiel                 | Mobile manque le modal d'assignation |
| **Assign Team** (multiple technicians)       | ✅  | ❌                         | **MANQUANT**                         |
| **Update Priority** (modal avec slider 1-10) | ✅  | ❌                         | **MANQUANT**                         |
| **Export CSV/PDF**                           | ✅  | ❌                         | **MANQUANT**                         |
| **Performance Metrics**                      | ✅  | ❌                         | **MANQUANT**                         |
| **SLA-based Overdue/AtRisk**                 | ✅  | ⚠️ Partiel                 | Même problème qu'Agent               |
| **Confirmation dialogs**                     | ✅  | ❌                         | **MANQUANT**                         |
| Team Performance screen                      | ✅  | ✅ (TeamPerformanceScreen) | OK mais vérifier contenu             |

---

## 6. TECHNICIAN (Rôle TECHNICIAN)

Le web (`app/tasks/page.tsx`) vs mobile (`screens/technician/`)

| Feature                                                          | Web | Mobile     | Statut                            |
| ---------------------------------------------------------------- | --- | ---------- | --------------------------------- |
| Liste des tâches avec filtres                                    | ✅  | ✅         | OK                                |
| **Stats cards** (total, assigned, inProgress, resolved, overdue) | ✅  | ✅         | OK                                |
| **Start Work** (avec confirmation dialog)                        | ✅  | ⚠️ Partiel | Mobile manque confirmation dialog |
| **Mark Resolved** (avec photos de preuve)                        | ✅  | ⚠️ Partiel | Vérifier si upload photo ok       |
| **SLA Countdown** (temps restant/avance)                         | ✅  | ⚠️ Partiel | Mobile manque le compte à rebours |
| **View Details** navigation                                      | ✅  | ✅         | OK                                |
| **Task Detail Page** complet                                     | ✅  | ✅         | OK                                |
| **GPS Location Tracking**                                        | ✅  | ❌         | **MANQUANT**                      |
| **Add Comment/Note**                                             | ✅  | ⚠️ Partiel | Vérifier                          |
| **Report Blocker**                                               | ✅  | ❌         | **MANQUANT**                      |

---

## 7. CITIZEN (Rôle CITIZEN)

### 7.1 My Complaints

| Feature                                              | Web | Mobile | Statut       |
| ---------------------------------------------------- | --- | ------ | ------------ |
| Liste des plaintes                                   | ✅  | ✅     | OK           |
| Stats cards (submitted, inProgress, resolved, total) | ✅  | ✅     | OK           |
| Filtres par status                                   | ✅  | ✅     | OK           |
| Recherche                                            | ✅  | ✅     | OK           |
| **Pagination**                                       | ✅  | ❌     | **MANQUANT** |
| **Export CSV/PDF**                                   | ❌  | ❌     | N/A          |

### 7.2 New Complaint

| Feature                             | Web | Mobile | Statut                |
| ----------------------------------- | --- | ------ | --------------------- |
| Formulaire avec titre/description   | ✅  | ✅     | OK                    |
| Catégorie (sélection visuelle)      | ✅  | ✅     | OK                    |
| Governorate/Municipality            | ✅  | ✅     | OK                    |
| GPS Location                        | ✅  | ✅     | OK                    |
| Photos (gallery + camera)           | ✅  | ✅     | OK                    |
| **Duplicate Detection proactive**   | ✅  | ✅     | OK (bien implémenté!) |
| **AI Category Prediction**          | ✅  | ❌     | **MANQUANT**          |
| **AI Urgency Prediction**           | ✅  | ❌     | **MANQUANT**          |
| **Keywords extraction** (affichage) | ✅  | ❌     | **MANQUANT**          |

### 7.3 Complaint Detail

| Feature                                                         | Web | Mobile | Statut       |
| --------------------------------------------------------------- | --- | ------ | ------------ |
| Photo gallery avec zoom                                         | ✅  | ✅     | OK           |
| Status/Urgency badges                                           | ✅  | ✅     | OK           |
| Location info                                                   | ✅  | ✅     | OK           |
| Rejection reason                                                | ✅  | ✅     | OK           |
| Resolution notes                                                | ✅  | ✅     | OK           |
| Before/After photos                                             | ✅  | ✅     | OK           |
| **Status Timeline** (web: `components/complaints/Timeline.tsx`) | ✅  | ❌     | **MANQUANT** |
| **Confirm Complaint** (upvote)                                  | ✅  | ✅     | OK           |
| **Upvote**                                                      | ✅  | ✅     | OK           |
| **Public Comments**                                             | ✅  | ✅     | OK           |
| **Internal Notes** (staff only)                                 | ✅  | ❌     | **MANQUANT** |
| Duplicate info section                                          | ✅  | ✅     | OK           |
| **SLA Deadline countdown**                                      | ✅  | ❌     | **MANQUANT** |

---

## 8. ARCHIVE

| Feature                               | Web | Mobile     | Statut                        |
| ------------------------------------- | --- | ---------- | ----------------------------- |
| Liste des plaintes archivées          | ✅  | ✅         | OK                            |
| **Filters** (CLOSED/REJECTED)         | ✅  | ⚠️ Partiel | Vérifier si filtre par status |
| **Export CSV/PDF**                    | ✅  | ❌         | **MANQUANT**                  |
| **Pagination**                        | ✅  | ❌         | **MANQUANT**                  |
| Stats cards (total, closed, rejected) | ✅  | ⚠️ Partiel | Vérifier                      |
| Search                                | ✅  | ⚠️ Partiel | Vérifier                      |

---

## 9. TRANSPARENCE / PUBLIC

| Feature                             | Web | Mobile     | Statut          |
| ----------------------------------- | --- | ---------- | --------------- |
| Dashboard public                    | ✅  | ✅         | OK              |
| Liste des plaintes publiques        | ✅  | ✅         | OK              |
| **Carte de chaleur** (Heatmap)      | ✅  | ❌         | **MANQUANT**    |
| **Stats publiques** avec graphiques | ✅  | ⚠️ Partiel | Vérifier charts |
| Consulter détail plainte publique   | ✅  | ✅         | OK              |

---

## 10. CARTES / GÉOLOCALISATION

| Feature                                     | Web | Mobile | Statut       |
| ------------------------------------------- | --- | ------ | ------------ |
| **Heatmap** (carte de chaleur des plaintes) | ✅  | ❌     | **MANQUANT** |
| **Mini Map** (municipality overview)        | ✅  | ❌     | **MANQUANT** |
| GPS capture (création plainte)              | ✅  | ✅     | OK           |
| GPS tracking (technicien en déplacement)    | ✅  | ❌     | **MANQUANT** |
| Map intéractive (Leaflet)                   | ✅  | ❌     | **MANQUANT** |

---

## 11. SERVICES & API CLIENT

### 11.1 Services Web (frontend/services/)

| Service                   | Web                                                                                                                                                                                                                                                                                                                                 | Mobile     | Statut                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------- |
| `admin.service.ts`        | ✅ (CRUD complet + stats + geography + departments)                                                                                                                                                                                                                                                                                 | ⚠️ Partiel | Mobile manque stats, pagination                           |
| `agent.service.ts`        | ✅ (validate, reject, assign, predictDepartment, approveResolution, rejectResolution, getDepartments)                                                                                                                                                                                                                               | ⚠️ Partiel | Mobile manque predictDepartment, approveResolution...     |
| `manager.service.ts`      | ✅ (assignTechnician, reassignTechnician, assignTeam, updatePriority, getTechnicians, validateComplaint, rejectComplaint)                                                                                                                                                                                                           | ⚠️ Partiel | Mobile manque reassign, assignTeam...                     |
| `technician.service.ts`   | ✅ (startWork, resolveTask, addTaskComment, reportBlocker, updateLocation, startLocationTracking, getTechnicianStats)                                                                                                                                                                                                               | ⚠️ Partiel | Mobile manque comment, blocker, location tracking         |
| `complaint.service.ts`    | ✅ (FULL: create, read, update, delete, getAll, getArchived, confirmResolution, archive/unarchive, predictCategory, predictUrgency, extractKeywords, confirmComplaint, unconfirmComplaint, upvoteComplaint, removeUpvote, getPublicComments, addPublicComment, getTrendForecast, getTrendAlerts, checkDuplicate, getDuplicateStats) | ⚠️ Partiel | Mobile a le CRUD basique + duplicate, manque IA et social |
| `heatmap.service.ts`      | ✅                                                                                                                                                                                                                                                                                                                                  | ❌         | **MANQUANT**                                              |
| `ai.service.ts`           | ✅                                                                                                                                                                                                                                                                                                                                  | ❌         | **MANQUANT**                                              |
| `geo.service.ts`          | ✅                                                                                                                                                                                                                                                                                                                                  | ❌         | **MANQUANT**                                              |
| `notification.service.ts` | ✅                                                                                                                                                                                                                                                                                                                                  | ⚠️ Partiel | Vérifier                                                  |

### 11.2 Fonctionnalités IA Manquantes dans Mobile

| Feature                                       | Description                 | Statut          |
| --------------------------------------------- | --------------------------- | --------------- |
| **predictCategory** (`/ai/predict-category`)  | Prédiction catégorie par IA | ❌ **MANQUANT** |
| **predictUrgency** (`/ai/urgency/predict`)    | Prédiction urgence par IA   | ❌ **MANQUANT** |
| **extractKeywords** (`/extract-keywords`)     | Extraction mots-clés IA     | ❌ **MANQUANT** |
| **getTrendForecast** (`/ai/trend/forecast`)   | Prévision tendance 7 jours  | ❌ **MANQUANT** |
| **getTrendAlerts** (`/ai/trend/alerts`)       | Alertes tendances IA        | ❌ **MANQUANT** |
| **getDuplicateStats** (`/ai/duplicate/stats`) | Stats détection doublons    | ❌ **MANQUANT** |

---

## 12. COMPOSANTS UI / DESIGN SYSTEM

| Composant Web                                        | Mobile Equivalent                      | Statut       |
| ---------------------------------------------------- | -------------------------------------- | ------------ |
| `DashboardLayout` (sidebar + topbar)                 | `HomeScreen` avec bottom nav           | ⚠️ Adapté    |
| `Topbar`                                             | `AppBar`                               | ✅ OK        |
| `DashboardSidebar`                                   | `NavigationBar`                        | ✅ OK        |
| `PageHeader`                                         | `SliverAppBar` / `AppBar`              | ✅ OK        |
| `ComplaintCard`                                      | `Container` custom                     | ⚠️ OK        |
| `Modal`                                              | `showModalBottomSheet` / `AlertDialog` | ⚠️ OK        |
| `ConfirmationModal`                                  | `AlertDialog`                          | ✅ OK        |
| `LoadingSpinner`                                     | `CircularProgressIndicator`            | ✅ OK        |
| `EmptyState`                                         | `Column` custom                        | ✅ OK        |
| `Button` (variants: primary, outline, ghost, danger) | `ElevatedButton` / `OutlinedButton`    | ⚠️ Partiel   |
| `Input` (avec icônes, validation)                    | `TextFormField`                        | ⚠️ Partiel   |
| `FilterBar`                                          | `Wrap` avec chips                      | ⚠️ Partiel   |
| `Toast` (`showToast`)                                | `SnackBar`                             | ⚠️ Partiel   |
| `Timeline`                                           | ❌                                     | **MANQUANT** |
| `InternalNotes`                                      | ❌                                     | **MANQUANT** |
| ` AIAnalysisCard`                                    | ❌                                     | **MANQUANT** |
| `DuplicateStatsCard`                                 | ❌                                     | **MANQUANT** |
| `TrendForecastChart`                                 | ❌                                     | **MANQUANT** |
| `RecentActivities`                                   | ❌                                     | **MANQUANT** |
| `MunicipalityMiniMap`                                | ❌                                     | **MANQUANT** |
| `MunicipalityOverview`                               | ❌                                     | **MANQUANT** |

---

## 13. FONCTIONNALITÉS TRANVERSALES

| Feature                                      | Web                     | Mobile     | Statut                                  |
| -------------------------------------------- | ----------------------- | ---------- | --------------------------------------- |
| **i18n** (AR, FR, EN avec react-i18next)     | ✅                      | ❌         | **MANQUANT** (mobile hardcodé en FR)    |
| **Dark/Light Theme**                         | ✅                      | ⚠️ Partiel | Mobile a toggle mais vérifier cohérence |
| **Notifications temps réel** (WebSocket)     | ✅                      | ⚠️ Partiel | Vérifier implémentation socket          |
| **Redirection intelligente** (dernière page) | ✅ (useLastVisitedPage) | ❌         | **MANQUANT**                            |
| **Hors-ligne / Cache**                       | ❌                      | ❌         | N/A                                     |
| **Animations de page**                       | ✅                      | ❌         | **MANQUANT**                            |
| **Skeleton Loaders**                         | ❌                      | ❌         | Peut être ajouté                        |
| **Infinite Scroll**                          | ❌                      | ❌         | N/A (utilise pagination)                |

---

## 14. RÔLES ET NAVIGATION

### Web Routes (app/)

```
/                    → redirect /transparency
/login               → Login
/register            → Register
/forgot-password     → Forgot Password
/reset-password      → Reset Password (token)
/set-password        → Set Password
/verify-account      → Verify Account
/dashboard           → Role-based Dashboard
/admin/complaints    → Admin Complaints
/admin/users         → Admin Users
/admin/settings      → Admin Settings
/agent/complaints    → Agent Actions
/manager/pending     → Manager Pending
/tasks               → Technician Tasks
/tasks/[id]          → Task Detail
/my-complaints       → My Complaints
/my-complaints/[id]  → Complaint Detail
/complaints/new      → New Complaint
/complaints          → All Complaints (public)
/transparency        → Public Dashboard
/transparency/[id]   → Public Complaint Detail
/archive             → Archive
/profile             → Profile
/dashboard/heatmap   → Heatmap
/dashboard/unified   → Unified Dashboard
```

### Mobile Routes (lib/routes/app_routes.dart)

```dart
/login               ✅
/register            ✅
/forgot-password     ✅
/verify-email        ✅
/dashboard           ✅
/home                ✅
/transparency        ✅
/profile             ✅
/settings            ✅
/complaints          ✅
/complaints/new      ✅
/complaints/:id      ✅
/admin/complaints    ✅
/admin/users         ✅
/agent/complaints    ✅
/manager/dashboard   ✅
/manager/team-performance ⚠️ (vérifier contenu)
/tasks               ✅
/tasks/:id           ✅
```

**Routes manquantes dans le mobile:**

- `/reset-password` ( avec token handler)
- `/set-password` (première connexion)
- `/archive` (vérifier si accessible depuis HomeScreen)
- `/dashboard/heatmap` → **MANQUANT**
- `/dashboard/unified` → **MANQUANT**
- `/transparency/complaints/:id` → vérifier si détail public accessible

---

## 15. BACK-END API ENDPOINTS UTILISÉS

### Endpoints consommés par le web mais PAS par le mobile:

| Endpoint                                          | Usage Web                     | Mobile      |
| ------------------------------------------------- | ----------------------------- | ----------- |
| `GET /public/stats`                               | Stats publiques dashboard     | ⚠️ Vérifier |
| `GET /public/complaints`                          | Liste publique                | ✅          |
| `GET /public/complaints/:id`                      | Détail public                 | ✅          |
| `GET /public/my-municipality-complaints`          | Plaintes municipalité citizen | ❌          |
| `POST /ai/predict-category`                       | Prédiction catégorie          | ❌          |
| `POST /ai/urgency/predict`                        | Prédiction urgence            | ❌          |
| `POST /extract-keywords`                          | Keywords IA                   | ❌          |
| `GET /ai/trend/forecast`                          | Forecast 7 jours              | ❌          |
| `GET /ai/trend/alerts`                            | Alertes tendances             | ❌          |
| `GET /heatmap`                                    | Carte de chaleur              | ❌          |
| `GET /heatmap/categories`                         | Catégories heatmap            | ❌          |
| `PUT /technician/complaints/:id/location`         | GPS tracking                  | ❌          |
| `POST /technician/complaints/:id/comments`        | Commentaires tech             | ❌          |
| `POST /agent/complaints/:id/approve-resolution`   | Approuver résolution          | ❌          |
| `POST /agent/complaints/:id/reject-resolution`    | Rejeter résolution            | ❌          |
| `PUT /manager/complaints/:id/assign-team`         | Assigner équipe               | ❌          |
| `PUT /manager/complaints/:id/reassign-technician` | Réassigner tech               | ❌          |
| `GET /manager/technicians/performance`            | Perf techniciens              | ⚠️ Vérifier |
| `GET /citizen/stats`                              | Stats citizen                 | ✅          |
| `GET /notifications`                              | Notifications                 | ⚠️ Vérifier |
| `GET /notifications/count`                        | Count unread                  | ⚠️ Vérifier |

---

## PRIORISATION DES MANQUES

### 🔴 CRITIQUE (Bloquant pour parité)

1. **AI Category/Urgency Prediction** dans créatio
