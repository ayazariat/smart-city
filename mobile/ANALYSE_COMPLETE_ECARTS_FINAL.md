# ANALYSE COMPLÈTE - Écarts Mobile vs Web (Frontend Next.js)

## Contexte

- **Web** : Frontend Next.js (`frontend/`) - 5 rôles (CITIZEN, TECHNICIAN, MUNICIPAL_AGENT, DEPARTMENT_MANAGER, ADMIN)
- **Mobile** : Flutter (`mobile/`) - Actuellement simplifié à 2 rôles (CITIZEN, TECHNICIAN)
- **Objectif** : Parité exacte entre mobile et web

---

## 1. ARCHITECTURE & NAVIGATION

| #   | Fonctionnalité Web                                             | État Mobile                                                    | Priorité | Statut      |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------- | -------- | ----------- |
| 1.1 | **Dashboard Layout** (Sidebar + Topbar responsive)             | Navigation par routes nommées uniquement, pas de layout global | CRITIQUE | ❌ MANQUANT |
| 1.2 | **Topbar globale** (notifications, profil, langue, thème)      | Chaque écran a sa propre AppBar isolée                         | CRITIQUE | ❌ MANQUANT |
| 1.3 | **Sidebar responsive** (collapse, icônes, badges notification) | Absente totalement                                             | CRITIQUE | ❌ MANQUANT |
| 1.4 | **ProtectedRoute** (middleware vérification rôles)             | Aucune garde de route, navigation libre                        | CRITIQUE | ❌ MANQUANT |
| 1.5 | **Navigation par onglets** (BottomNav/Drawer)                  | Simple MaterialPageRoute, pas de structure tabulaire           | HAUTE    | ❌ MANQUANT |
| 1.6 | **Breadcrumbs / Fil d'Ariane**                                 | Absent                                                         | MOYENNE  | ❌ MANQUANT |
| 1.7 | **PageHeader réutilisable** (titre, sous-titre, back, actions) | Chaque écran implémente son propre header                      | MOYENNE  | ❌ MANQUANT |

---

## 2. RÔLES UTILISATEURS & ÉCRANS

Le web supporte **5 rôles complets**, le mobile actuel n'en supporte que **2** (CITIZEN, TECHNICIAN).

### 2.1 CITIZEN (Citoyen)

| #     | Écran Web                 | Route Web             | Équivalent Mobile       | Statut                                          |
| ----- | ------------------------- | --------------------- | ----------------------- | ----------------------------------------------- |
| 2.1.1 | **Dashboard Citoyen**     | `/dashboard`          | `DashboardScreen`       | ⚠️ Partiel (stats basiques uniquement)          |
| 2.1.2 | **Mes Réclamations**      | `/my-complaints`      | `ComplaintsScreen`      | ⚠️ Partiel (pas de pagination, filtres limités) |
| 2.1.3 | **Détail Réclamation**    | `/my-complaints/[id]` | `ComplaintDetailScreen` | ⚠️ Partiel (pas de timeline, commentaires)      |
| 2.1.4 | **Nouvelle Réclamation**  | `/complaints/new`     | `NewComplaintScreen`    | ⚠️ Partiel (pas d'IA, pas de géoloc)            |
| 2.1.5 | **Transparence Publique** | `/transparency`       | `TransparencyScreen`    | ❌ Existe mais basique, pas de carte/graphiques |
| 2.1.6 | **Archives**              | `/archive`            | `ArchiveScreen`         | ⚠️ Existe mais pas de recherche/export          |
| 2.1.7 | **Profil**                | `/profile`            | `ProfileScreen`         | ❌ Probablement basique                         |
| 2.1.8 | **Notifications**         | Intégré topbar        | `NotificationsScreen`   | ⚠️ Écran existe mais non intégré                |

### 2.2 TECHNICIAN (Technicien)

| #     | Écran Web                | Route Web     | Équivalent Mobile            | Statut                                   |
| ----- | ------------------------ | ------------- | ---------------------------- | ---------------------------------------- |
| 2.2.1 | **Tâches Technicien**    | `/tasks`      | `TechnicianTasksScreen`      | ⚠️ Liste basique, pas de stats dashboard |
| 2.2.2 | **Détail Tâche**         | `/tasks/[id]` | `TechnicianTaskDetailScreen` | ⚠️ Probablement basique                  |
| 2.2.3 | **Dashboard Technicien** | `/dashboard`  | Partagé avec HomeScreen      | ❌ Pas de dashboard spécifique           |

### 2.3 MUNICIPAL_AGENT (Agent Municipal) - SUPPRIMÉ DU MOBILE

| #     | Écran Web                    | Route Web                      | Équivalent Mobile | Statut      |
| ----- | ---------------------------- | ------------------------------ | ----------------- | ----------- |
| 2.3.1 | **File d'Attente Agent**     | `/agent/complaints`            | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |
| 2.3.2 | **Validation Réclamations**  | `/agent/complaints`            | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |
| 2.3.3 | **Assignation Département**  | Modal dans `/agent/complaints` | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |
| 2.3.4 | **Gestion Doublons (BL-25)** | Modal dans `/agent/complaints` | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |
| 2.3.5 | **Approbation Résolution**   | `/agent/complaints`            | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |

### 2.4 DEPARTMENT_MANAGER (Manager) - SUPPRIMÉ DU MOBILE

| #     | Écran Web                    | Route Web          | Équivalent Mobile | Statut      |
| ----- | ---------------------------- | ------------------ | ----------------- | ----------- |
| 2.4.1 | **Réclamations Département** | `/manager/pending` | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |
| 2.4.2 | **Assignation Techniciens**  | `/manager/pending` | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |
| 2.4.3 | **Création Équipe**          | `/manager/pending` | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |
| 2.4.4 | **Gestion Priorité**         | `/manager/pending` | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |

### 2.5 ADMIN - SUPPRIMÉ DU MOBILE

| #     | Écran Web                    | Route Web           | Équivalent Mobile | Statut      |
| ----- | ---------------------------- | ------------------- | ----------------- | ----------- |
| 2.5.1 | **Liste Réclamations Admin** | `/admin/complaints` | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |
| 2.5.2 | **Gestion Utilisateurs**     | `/admin/users`      | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |
| 2.5.3 | **Paramètres Système**       | `/admin/settings`   | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |
| 2.5.4 | **Stats Système**            | `/admin/complaints` | ❌ SUPPRIMÉ       | ❌ SUPPRIMÉ |

---

## 3. TABLEAU DE BORD (DASHBOARD)

Le web (`frontend/app/dashboard/page.tsx`) a un **dashboard ultra-complet par rôle**.

### 3.1 Fonctionnalités Dashboard Web

| #      | Fonctionnalité                | Description                                                 | Statut Mobile |
| ------ | ----------------------------- | ----------------------------------------------------------- | ------------- |
| 3.1.1  | **Welcome personnalisé**      | "Bonjour [Prénom]" avec salutation selon heure              | ✅ Présent    |
| 3.1.2  | **Actions rapides** par rôle  | Boutons contextuels (Nouvelle réclamation, Voir file, etc.) | ❌ MANQUANT   |
| 3.1.3  | **Alertes Priorités**         | Section "Priorités du jour" avec liens d'action             | ❌ MANQUANT   |
| 3.1.4  | **Activités Récentes**        | Liste des dernières actions (RecentActivities component)    | ❌ MANQUANT   |
| 3.1.5  | **Aperçu Municipalité**       | MunicipalityOverview avec mini-carte et stats               | ❌ MANQUANT   |
| 3.1.6  | **Alertes Tendance**          | TrendForecastChart + DuplicateStatsCard (BL-37)             | ❌ MANQUANT   |
| 3.1.7  | **Graphique Catégories**      | Barres horizontales avec % par catégorie                    | ❌ MANQUANT   |
| 3.1.8  | **Stats CITIZEN**             | 4 cartes (Total, Pending, In Progress, Resolved)            | ✅ Présent    |
| 3.1.9  | **Stats AGENT**               | 6 cartes + barre taux résolution                            | ❌ SUPPRIMÉ   |
| 3.1.10 | **Stats MANAGER**             | 6 cartes + barre SLA compliance                             | ❌ SUPPRIMÉ   |
| 3.1.11 | **Stats TECHNICIAN**          | 5 cartes (Total, Assigned, In Progress, Resolved, Overdue)  | ❌ MANQUANT   |
| 3.1.12 | **Stats ADMIN**               | 6 cartes + barres résolution + alertes                      | ❌ SUPPRIMÉ   |
| 3.1.13 | **Réclamations municipalité** | Liste des réclamations de la commune avec confirm/upvote    | ❌ MANQUANT   |
| 3.1.14 | **Résolutions récentes**      | Dernières réclamations résolues de la commune               | ❌ MANQUANT   |
| 3.1.15 | **Auto-refresh**              | Refresh toutes les 60 secondes                              | ✅ Présent    |

### 3.2 Composants Dashboard Web Manquants

- `DashboardLayout` ❌
- `DashboardSidebar` ❌
- `Topbar` ❌
- `RecentActivities` ❌
- `MunicipalityOverview` ❌
- `MunicipalityMiniMap` ❌
- `TrendForecastChart` ❌
- `DuplicateStatsCard` ❌
- `AIAnalysisCard` ❌

---

## 4. LISTE DES RÉCLAMATIONS

### 4.1 Filtres & Recherche

| #     | Filtre Web                                          | Statut Mobile |
| ----- | --------------------------------------------------- | ------------- |
| 4.1.1 | **Recherche texte** (titre, description, catégorie) | ✅            |
| 4.1.2 | **Filtre statut**                                   | ✅            |
| 4.1.3 | **Filtre gouvernorat**                              | ❌            |
| 4.1.4 | **Filtre municipalité** (cascade gouvernorat)       | ❌            |
| 4.1.5 | **Filtre catégorie**                                | ❌            |
| 4.1.6 | **Filtre priorité** (score)                         | ❌            |
| 4.1.7 | **Filtre date** (dateFrom/dateTo)                   | ❌            |
| 4.1.8 | **Filtre département** (manager)                    | ❌ SUPPRIMÉ   |

### 4.2 Actions & Export

| #     | Fonctionnalité                             | Statut Mobile |
| ----- | ------------------------------------------ | ------------- |
| 4.2.1 | **Export CSV**                             | ❌            |
| 4.2.2 | **Export PDF** (impression)                | ❌            |
| 4.2.3 | **Pagination** (page/limit/totalPages)     | ❌            |
| 4.2.4 | **Tri** (date, priorité)                   | ❌            |
| 4.2.5 | **Quick Filters** (stats cards cliquables) | ❌            |

### 4.3 Performance & UX

| #     | Fonctionnalité                                                                  | Statut Mobile |
| ----- | ------------------------------------------------------------------------------- | ------------- |
| 4.3.1 | **Stats cards interactives** (clic = filtre)                                    | ❌            |
| 4.3.2 | **Performance Metrics** (In Progress, Avg Days, Resolution Rate, High Priority) | ❌            |
| 4.3.3 | **Catégories tag cloud**                                                        | ❌            |
| 4.3.4 | **SLA indicators** (overdue, at-risk)                                           | ❌            |

---

## 5. DÉTAIL D'UNE RÉCLAMATION

### 5.1 Visualisation

| #     | Fonctionnalité Web                           | Statut Mobile |
| ----- | -------------------------------------------- | ------------- |
| 5.1.1 | **Galerie photos** (preview + zoom)          | ✅ Basique    |
| 5.1.2 | **Carte interactive** (Leaflet)              | ❌            |
| 5.1.3 | **Timeline** (historique statuts avec dates) | ❌            |
| 5.1.4 | **Notes internes** (staff only)              | ❌            |
| 5.1.5 | **Commentaires publics**                     | ❌            |
| 5.1.6 | **SLA deadline display**                     | ❌            |

### 5.2 Actions par Rôle

| #      | Action                             | Web | Mobile          |
| ------ | ---------------------------------- | --- | --------------- |
| 5.2.1  | **Confirmer** (citoyen BL-28)      | ✅  | ❌              |
| 5.2.2  | **Upvote** (citoyen BL-28)         | ✅  | ❌              |
| 5.2.3  | **Valider** (agent)                | ✅  | ❌ SUPPRIMÉ     |
| 5.2.4  | **Rejeter** (agent)                | ✅  | ❌ SUPPRIMÉ     |
| 5.2.5  | **Assigner département** (agent)   | ✅  | ❌ SUPPRIMÉ     |
| 5.2.6  | **Assigner technicien** (manager)  | ✅  | ❌ SUPPRIMÉ     |
| 5.2.7  | **Modifier priorité** (manager)    | ✅  | ❌ SUPPRIMÉ     |
| 5.2.8  | **Démarrer travail** (technicien)  | ✅  | ⚠️ Probablement |
| 5.2.9  | **Résoudre + photos** (technicien) | ✅  | ⚠️ Probablement |
| 5.2.10 | **Approuver résolution** (agent)   | ✅  | ❌ SUPPRIMÉ     |

---

## 6. CRÉATION DE RÉCLAMATION

### 6.1 Formulaire Web (`frontend/app/complaints/new/page.tsx`)

| #     | Fonctionnalité                                    | Web | Mobile     |
| ----- | ------------------------------------------------- | --- | ---------- |
| 6.1.1 | **Prédiction IA catégorie**                       | ✅  | ❌         |
| 6.1.2 | **Prédiction IA urgence** (BL-24)                 | ✅  | ❌         |
| 6.1.3 | **Détection doublons** (BL-25)                    | ✅  | ❌         |
| 6.1.4 | **Upload multi-photos** avec preview              | ✅  | ⚠️ Basique |
| 6.1.5 | **Géolocalisation automatique**                   | ✅  | ❌         |
| 6.1.6 | **Score priorité calculé**                        | ✅  | ❌         |
| 6.1.7 | **Cascading select** (gouvernorat → municipalité) | ✅  | ❌         |
| 6.1.8 | **ReCaptcha**                                     | ✅  | ❌         |
| 6.1.9 | **Validation temps réel**                         | ✅  | ⚠️         |

---

## 7. NOTIFICATIONS TEMPS RÉEL

| #   | Fonctionnalité                      | Web | Mobile            |
| --- | ----------------------------------- | --- | ----------------- |
| 7.1 | **Service notifications**           | ✅  | ⚠️ Service existe |
| 7.2 | **Socket.IO temps réel**            | ✅  | ❌                |
| 7.3 | **NotificationBell avec badge**     | ✅  | ❌                |
| 7.4 | **Toast notifications** (showToast) | ✅  | ❌                |
| 7.5 | **Centre notifications**            | ✅  | ⚠️ Écran existe   |
| 7.6 | **Mark as read / Read all**         | ✅  | ⚠️ Service existe |

---

## 8. PAGE TRANSPARENCE PUBLIQUE (`/transparency`)

### 8.1 Contenu Web

| #   | Section                                             | Statut Mobile |
| --- | --------------------------------------------------- | ------------- |
| 8.1 | **Stats publiques** (total, résolu, en cours, taux) | ❌            |
| 8.2 | **Carte thermique** (heatmap des réclamations)      | ❌            |
| 8.3 | **Liste réclamations publiques** avec filtres       | ❌            |
| 8.4 | **Graphiques** (tendances, catégories)              | ❌            |
| 8.5 | **Détail réclamation publique**                     | ❌            |

---

## 9. CARTE & GÉOLOCALISATION

| #   | Fonctionnalité                         | Web | Mobile |
| --- | -------------------------------------- | --- | ------ |
| 9.1 | **Carte interactive** (Leaflet)        | ✅  | ❌     |
| 9.2 | **Heatmap** (couches de chaleur)       | ✅  | ❌     |
| 9.3 | **Marqueurs réclamations**             | ✅  | ❌     |
| 9.4 | **Filtrage carte** (catégorie, statut) | ✅  | ❌     |
| 9.5 | **GPS tracking** (technicien)          | ✅  | ❌     |
| 9.6 | **Géocoding** (adresse → coordonnées)  | ✅  | ❌     |

---

## 10. INTERNATIONALISATION (i18n)

| #    | Aspect                    | Web           | Mobile          |
| ---- | ------------------------- | ------------- | --------------- |
| 10.1 | **Système i18n**          | react-i18next | ❌ Hardcoded FR |
| 10.2 | **Langues**               | FR, AR, EN    | FR uniquement   |
| 10.3 | **Direction RTL** (arabe) | ✅            | ❌              |
| 10.4 | **Fichiers traduction**   | JSON complets | ❌              |
| 10.5 | **LanguagePicker**        | ✅            | ❌              |

---

## 11. THÈME & UI/UX

| #    | Fonctionnalité                        | Web            | Mobile      |
| ---- | ------------------------------------- | -------------- | ----------- |
| 11.1 | **Thème sombre/clair**                | ✅             | ❌          |
| 11.2 | **Design system** (tokens, variables) | ✅             | ❌          |
| 11.3 | **Composants réutilisables**          | 15+ composants | Basique     |
| 11.4 | **Animations** (framer-motion)        | ✅             | ❌          |
| 11.5 | **Skeleton loaders**                  | ✅             | ❌          |
| 11.6 | **Empty states** designés             | ✅             | ⚠️ Basiques |
| 11.7 | **Responsive design**                 | ✅             | N/A         |
| 11.8 | **Loading spiners** personnalisés     | ✅             | ⚠️ Basiques |

### 11.1 Composants UI Web Manquants

- `Alert` ❌
- `AnimatedBackground` ❌
- `Badge` ❌
- `Button` (design system) ❌
- `ComplaintCard` avancé ❌
- `ConfirmationModal` ❌
- `EmptyState` ❌
- `FilterBar` ❌
- `Icons` (librairie custom) ❌
- `Input` (design system) ❌
- `LanguagePicker` ❌
- `LoadingSpinner` ❌
- `Modal` ❌
- `PageHeader` ❌
- `ReCaptchaBadge` ❌
- `StatCard` ❌
- `ThemeToggle` ❌
- `Toast` ❌

---

## 12. SERVICES & LOGIQUE MÉTIER

### 12.1 Services Web vs Mobile

| Service Web               | Service Mobile              | Statut                                     |
| ------------------------- | --------------------------- | ------------------------------------------ |
| `admin.service.ts`        | `admin_service.dart`        | ⚠️ Existe mais non utilisé (rôle supprimé) |
| `agent.service.ts`        | `agent_service.dart`        | ⚠️ Existe mais non utilisé (rôle supprimé) |
| `manager.service.ts`      | `manager_service.dart`      | ⚠️ Existe mais non utilisé (rôle supprimé) |
| `technician.service.ts`   | `technician_service.dart`   | ⚠️ Utilisé partiellement                   |
| `complaint.service.ts`    | `complaint_service.dart`    | ⚠️ Utilisé mais incomplet                  |
| `auth.service.ts`         | `auth_service.dart`         | ✅                                         |
| `notification.service.ts` | `notification_service.dart` | ⚠️ Existe mais non intégré UI              |
| `heatmap.service.ts`      | `heatmap_service.dart`      | ❌ Existe mais non utilisé                 |
| `ai.service.ts`           | `ai_service.dart`           | ⚠️ Existe mais non utilisé                 |
| `geo.service.ts`          | `geo_service.dart`          | ⚠️ Existe mais non utilisé                 |

### 12.2 Stores & Hooks

| Web                      | Mobile                    | Statut                              |
| ------------------------ | ------------------------- | ----------------------------------- |
| `useAuthStore` (Zustand) | `authProvider` (Riverpod) | ⚠️ Équivalent fonctionnel           |
| `useComplaintStore`      | ❌                        | ❌ Pas de store global réclamations |
| `useNotifications`       | ❌                        | ❌                                  |
| `useSLA`                 | ❌                        | ❌                                  |
| `useLastVisitedPage`     | ❌                        | ❌                                  |
| `useComplaints`          | ❌                        | ❌                                  |

---

## 13. FONCTIONNALITÉS IA / ANALYTIQUES

| #    | Fonctionnalité (BL-XX)         | Web                | Mobile |
| ---- | ------------------------------ | ------------------ | ------ |
| 13.1 | **Prédiction catégorie** (IA)  | ✅                 | ❌     |
| 13.2 | **Prédiction urgence** (BL-24) | ✅                 | ❌     |
| 13.3 | **Détection doublons** (BL-25) | ✅                 | ❌     |
| 13.4 | **Alertes tendance** (BL-37)   | ✅                 | ❌     |
| 13.5 | **Clustering géographique**    | ✅                 | ❌     |
| 13.6 | **SLA Calculator**             | ✅ (lib + backend) | ❌     |
| 13.7 | **Keyword extraction**         | ✅                 | ❌     |
| 13.8 | **Urgency predictor**          | ✅                 | ❌     |

---

## 14. AUTHENTIFICATION & SÉCURITÉ

| #    | Fonctionnalité                   | Web | Mobile |
| ---- | -------------------------------- | --- | ------ |
| 14.1 | **ReCaptcha**                    | ✅  | ❌     |
| 14.2 | **Refresh token auto**           | ✅  | ✅     |
| 14.3 | **Vérification email**           | ✅  | ✅     |
| 14.4 | **Set password (lien magique)**  | ✅  | ✅     |
| 14.5 | **Roles guards** (middleware.ts) | ✅  | ❌     |
| 14.6 | **Session timeout**              | ✅  | ❌     |
| 14.7 | **Secure storage tokens**        | N/A | ✅     |

---

## 15. ARCHIVES (`/archive`)

| #    | Fonctionnalité                            | Web | Mobile     |
| ---- | ----------------------------------------- | --- | ---------- |
| 15.1 | **Stats cards** (Total, Closed, Rejected) | ✅  | ⚠️ Basique |
| 15.2 | **Filtres par statut**                    | ✅  | ⚠️ Basique |
| 15.3 | **Recherche**                             | ✅  | ❌         |
| 15.4 | **Export CSV/PDF**                        | ✅  | ❌         |
| 15.5 | **Pagination**                            | ✅  | ❌         |

---

## 16. PROFIL (`/profile`)

| #    | Fonctionnalité                  | Web | Mobile |
| ---- | ------------------------------- | --- | ------ |
| 16.1 | **Édition profil complet**      | ✅  | ❌     |
| 16.2 | **Changement photo**            | ✅  | ❌     |
| 16.3 | **Changement mot de passe**     | ✅  | ❌     |
| 16.4 | **Affichage rôle/municipalité** | ✅  | ❌     |
| 16.5 | **Préférences langue**          | ✅  | ❌     |
| 16.6 | **Préférences thème**           | ✅  | ❌     |

---

## 17. PAGES PUBLIQUES

| #    | Page Web                                 | Statut Mobile          |
| ---- | ---------------------------------------- | ---------------------- |
| 17.1 | **Page d'accueil** (`/`)                 | ❌ Redirige vers login |
| 17.2 | **Transparence** (`/transparency`)       | ⚠️ Basique             |
| 17.3 | **Login** (`/login`)                     | ✅                     |
| 17.4 | **Register** (`/register`)               | ✅                     |
| 17.5 | **Forgot Password** (`/forgot-password`) | ✅                     |
| 17.6 | **Reset Password** (`/reset-password`)   | ✅                     |
| 17.7 | **Set Password** (`/set-password`)       | ✅                     |
| 17.8 | **Verify Account** (`/verify-account`)   | ✅                     |

---

## 18. DÉPENDANCES & PACKAGES

### 18.1 Web (frontend/package.json) - Packages clés manquants côté mobile

| Package Web        | Usage            | Équivalent Flutter                    | Statut                  |
| ------------------ | ---------------- | ------------------------------------- | ----------------------- |
| `react-i18next`    | i18n             | `flutter_localizations` + `intl`      | ❌ Non ajouté           |
| `leaflet`          | Carte            | `google_maps_flutter` / `flutter_map` | ❌ Non ajouté           |
| `react-leaflet`    | Carte React      | N/A                                   | ❌                      |
| `leaflet.heat`     | Heatmap          | N/A                                   | ❌                      |
| `recharts`         | Graphiques       | `fl_chart`                            | ⚠️ `charts.dart` existe |
| `socket.io-client` | Temps réel       | `socket_io_client`                    | ❌ Non ajouté           |
| `framer-motion`    | Animations       | `animations` package                  | ❌                      |
| `zustand`          | State management | `flutter_riverpod`                    | ✅                      |

---

## RÉCAPITULATIF PAR PRIORITÉ

### 🔴 CRITIQUE (Bloquant la parité fonctionnelle)

1. Restaurer les **3 rôles supprimés** (AGENT, MANAGER, ADMIN) et leurs écrans
2. Ajouter **navigation structurée** (BottomNavBar/NavigationRail)
3. Implémenter **Page Transparence** complète (stats, carte, graphiques)
4. Intégrer **Notifications temps réel** (Socket.IO + UI)
5. Ajouter **Multilingue** (FR/AR/EN) avec RTL
6. Intégrer **Carte interactive** (Google Maps/Mapbox)

### 🟠 HAUTE (Fonctionnalités métier essentielles)

7. **Dashboards riches** par rôle (stats, graphiques, alertes)
8. **Filtres avancés** sur toutes les listes
9. **Exports CSV/PDF**
10. **Système de commentaires** (publics + internes)
11. **Timeline** historique réclamations
12. **Actions par rôle** (valider, assigner, résoudre, etc.)

### 🟡 MOYENNE (IA et automatisation)

13. **Prédiction IA** (catégorie, urgence)
14. **Détection doublons** (BL-25)
15. **Carte thermique** (heatmap)
16. **Alertes tendance** (BL-37)
17. **SLA indicators**

### 🟢 BASSE (Polish UI/UX)

18. **Thème sombre**
19. **Animations** (transitions, skeletons)
20. **ReCaptcha** mobile
21. **Design system** complet
22. **Responsive images** (srcset)

---

## FICHIERS À CRÉER/MODIFIER (Vue d'ensemble)

### Nouveaux écrans requis (~25 écrans)

- `lib/screens/citizen/dashboard_screen.dart` (remplacer l'actuel)
- `lib/screens/citizen/transparency_screen.dart` (remplacer l'actuel)
- `lib/screens/citizen/complaint_detail_screen.dart` (enrichir)
- `lib/screens/citizen/new_complaint_screen.dart` (enrichir)
- `lib/screens/agent/agent_complaints_screen.dart` (restaurer)
- `lib/screens/manager/manager_pending_screen.dart` (restaurer)
- `lib/screens/admin/admin_dashboard_screen.dart` (restaurer)
- `lib/screens/admin/admin_users_screen.dart` (restaurer)
- `lib/screens/admin/admin_settings_screen.dart` (restaurer)
- `lib/screens/shared/map_screen.dart` (nouveau)
- `lib/screens/shared/heatmap_screen.dart` (nouveau)
- `lib/screens/shared/comments_screen.dart` (nouveau)
- `lib/screens/shared/timeline_screen.dart` (nouveau)

### Nouveaux composants requis (~20 composants)

- `lib/widgets/app_bottom_nav.dart`
- `lib/widgets/app_drawer.dart`
- `lib/widgets/dashboard_layout.dart`
- `lib/widgets/topbar.dart`
- `lib/widgets/notification_bell.dart`
- `lib/widgets/complaint_card_advanced.dart`
- `lib/widgets/stats_grid.dart`
- `lib/widgets/filter_bar.dart`
- `lib/widgets/search_field.dart`
- `lib/widgets/empty_state.dart`
- `lib/widgets/loading_skeleton.dart`
- `lib/widgets/timeline.dart`
- `lib/widgets/comments_section.dart`
- `lib/widgets/photo_gallery.dart`
- `lib/widgets/map_view.dart`
- `lib/widgets/heatmap_overlay.dart`
- `lib/widgets/export_button.dart`
- `lib/widgets/language_picker.dart`
- `lib/widgets/theme_toggle.dart`

### Nouveaux services/providers

- `lib/providers/socket_provider.dart` (Socket.IO)
- `lib/providers/i18n_provider.dart` (Internationalisation)
- `lib/providers/theme_provider.dart` (Thème sombre)
- `lib/services/notification_socket_service.dart`

---

## CONCLUSION

Pour atteindre une **parité exacte** avec le web Next.js, le mobile Flutter nécessite :

1. **~25 nouveaux écrans** (restauration des rôles supprimés + enrichissement)
2. **~20 nouveaux composants UI** réutilisables
3. **~5 nouveaux services/providers** (Socket.IO, i18n, thème)
4. **Intégration de packages** (carte, graphiques, i18n, sockets)
5. **Architecture** (navigation structurée, layout global, guards)

**Estimation effort** : 3-4 semaines de développement Flutter à temps plein pour un développeur senior.

**Alternative recommandée** : Si le scope est limité aux rôles CITIZEN et TECHNICIAN, l'effort est réduit à ~1-2 semaines pour ajouter les fonctionnalités critiques manquantes (dashboard, filtres, carte, notifications, i18n).
