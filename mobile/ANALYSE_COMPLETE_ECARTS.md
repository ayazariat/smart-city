# 📊 Analyse Complète des Écarts entre Web et Mobile

## Vue d'ensemble
Le **frontend web** (Next.js/React) dispose de **23 pages fonctionnelles** tandis que le **mobile Flutter** n'en a que **~15 implémentées**, avec de nombreuses fonctionnalités manquantes.

---

## 1. PAGES MANQUANTES (Non implémentées côté Mobile)

| # | Page Web | Route Web | Statut Mobile | Priorité |
|---|----------|-----------|---------------|----------|
| 1 | **Reset Password** | `/reset-password` | ✅ IMPLÉMENTÉE | Haute |
| 2 | **Set Password** | `/set-password` | ✅ IMPLÉMENTÉE | Haute |
| 3 | **Archive des plaintes** | `/archive` | ✅ IMPLÉMENTÉE | Haute |
| 4 | **Stats publiques** | `/transparency` | ✅ EXISTE déjà | - |
| 5 | **Admin Settings** | `/admin/settings` | ✅ EXISTE déjà | - |
| 6 | **Notifications** | `/notifications` | ✅ EXISTE déjà | - |
| 7 | **Heatmap** | `/dashboard/heatmap` | ✅ EXISTE déjà | - |
| 8 | **Mes plaintes (détail)** | `/my-complaints/:id` | ❌ MANQUANTE | Haute |
| 9 | **Dashboard Complaints** | `/dashboard/complaints` | ❌ MANQUANTE | Moyenne |
| 10 | **Dashboard Unified** | `/dashboard/unified` | ❌ MANQUANTE | Moyenne |
| 11 | **Login** | `/login` | ✅ EXISTE | - |

---

## 2. FONCTIONNALITÉS MANQUANTES PAR RÔLE

### 👤 Citoyen (CITIZEN)

| # | Fonctionnalité | Web | Mobile | Impact |
|---|----------------|-----|--------|--------|
| 1 | Dashboard personnalisé avec stats | ✅ Complet | ⚠️ Basique (4 cartes seulement) | Moyen |
| 2 | Filtrage des plaintes par statut/catégorie | ✅ Complet | ❌ Non implémenté | Haut |
| 3 | Confirmation de résolution (CLOSED) | ✅ Complet | ❌ Non implémenté | Haut |
| 4 | Vote/upvote des plaintes | ✅ Complet | ❌ Non implémenté | Moyen |
| 5 | Commentaires publics | ✅ Complet | ❌ Non implémenté | Moyen |
| 6 | Recherche dans les plaintes | ✅ Complet | ❌ Non implémenté | Moyen |
| 7 | Export CSV/PDF | ✅ Complet | ❌ Non implémenté | Faible |
| 8 | Carte géographique des signalements | ✅ Complet | ❌ Non implémenté | Moyen |
| 9 | Notifications temps réel | ✅ Complet | ⚠️ Basique | Moyen |
| 10 | Historique des activités récentes | ✅ Complet | ❌ Non implémenté | Faible |

### 🏛️ Agent Municipal (MUNICIPAL_AGENT)

| # | Fonctionnalité | Web | Mobile | Impact |
|---|----------------|-----|--------|--------|
| 1 | Dashboard avec priorités du jour | ✅ Complet | ❌ Non implémenté | Haut |
| 2 | Validation/rejet des plaintes | ✅ Complet | ✅ Partiel (API existe) | Moyen |
| 3 | Assignation aux départements | ✅ Complet | ✅ Partiel | Moyen |
| 4 | Gestion des doublons (BL-25) | ✅ Complet | ❌ Non implémenté | Haut |
| 5 | Prédiction IA du département | ✅ Complet | ❌ Non implémenté | Moyen |
| 6 | Filtres avancés (date, priorité, etc.) | ✅ Complet | ❌ Non implémenté | Moyen |
| 7 | Export CSV/PDF | ✅ Complet | ❌ Non implémenté | Faible |
| 8 | Visualisation des stats par catégorie | ✅ Complet | ❌ Non implémenté | Faible |

### 👔 Chef de Département (DEPARTMENT_MANAGER)

| # | Fonctionnalité | Web | Mobile | Impact |
|---|----------------|-----|--------|--------|
| 1 | Dashboard avec stats équipe | ✅ Complet | ❌ Non implémenté | Haut |
| 2 | Assignation des techniciens | ✅ Complet | ✅ Partiel (API existe) | Moyen |
| 3 | Création d'équipes de réparation | ✅ Complet | ❌ Non implémenté | Haut |
| 4 | Modification de priorité | ✅ Complet | ✅ Partiel | Moyen |
| 5 | Filtres avancés et recherche | ✅ Complet | ❌ Non implémenté | Moyen |
| 6 | Visualisation de la charge des techs | ✅ Complet | ❌ Non implémenté | Moyen |
| 7 | Export CSV/PDF | ✅ Complet | ❌ Non implémenté | Faible |

### 🔧 Technicien (TECHNICIAN)

| # | Fonctionnalité | Web | Mobile | Impact |
|---|----------------|-----|--------|--------|
| 1 | Dashboard avec stats personnelles | ✅ Complet | ✅ Existe | - |
| 2 | Démarrer une tâche | ✅ Complet | ✅ Existe | - |
| 3 | Marquer comme résolu | ✅ Complet | ✅ Existe | - |
| 4 | Ajout de photos (avant/après) | ✅ Complet | ✅ Existe | - |
| 5 | Suivi GPS / localisation | ✅ Complet | ❌ Non implémenté | Moyen |
| 6 | Commentaires de type BLOCAGE | ✅ Complet | ❌ Non implémenté | Haut |
| 7 | Filtres par statut | ✅ Complet | ✅ Partiel | - |

### 👨‍💼 Admin (ADMIN)

| # | Fonctionnalité | Web | Mobile | Impact |
|---|----------------|-----|--------|--------|
| 1 | Dashboard admin avec stats système | ✅ Complet | ✅ Existe | - |
| 2 | Gestion des utilisateurs (CRUD) | ✅ Complet | ✅ Existe | - |
| 3 | Création d'utilisateurs avec rôle | ✅ Complet | ✅ Existe | - |
| 4 | Autocomplete gouvernorat/commune | ✅ Complet | ⚠️ Partiel | Moyen |
| 5 | Gestion des départements | ✅ Complet | ❌ Non implémenté | Haut |
| 6 | Configuration des règles SLA | ✅ Complet | ❌ Non implémenté | Haut |
| 7 | Gestion des catégories | ✅ Complet | ❌ Non implémenté | Moyen |
| 8 | Export CSV/PDF global | ✅ Complet | ❌ Non implémenté | Faible |
| 9 | Filtres par gouvernorat, commune, date | ✅ Complet | ❌ Non implémenté | Haut |

---

## 3. FONCTIONNALITÉS IA MANQUANTES

| # | Fonctionnalité IA | Web | Mobile | Priorité |
|---|-------------------|-----|--------|----------|
| 1 | Prédiction de catégorie | ✅ Complet | ❌ Non implémenté | Haut |
| 2 | Prédiction d'urgence (BL-24) | ✅ Complet | ❌ Non implémenté | Haut |
| 3 | Détection de doublons (BL-25) | ✅ Complet | ❌ Non implémenté | Haut |
| 4 | Prévisions de tendances (BL-37) | ✅ Complet | ❌ Non implémenté | Moyen |
| 5 | Alertes de tendances | ✅ Complet | ❌ Non implémenté | Moyen |
| 6 | Carte de chaleur (Heatmap) | ✅ Complet | ✅ Existe | - |
| 7 | Extraction de mots-clés | ✅ Complet | ❌ Non implémenté | Faible |

---

## 4. SERVICES API MANQUANTS CÔTÉ MOBILE

### Services déjà implémentés:
- ✅ `api_client.dart` - Client HTTP de base
- ✅ `auth_service.dart` - Authentification
- ✅ `complaint_service.dart` - Plaintes (complet)
- ✅ `admin_service.dart` - Administration
- ✅ `agent_service.dart` - Agent municipal
- ✅ `manager_service.dart` - Chef de département
- ✅ `technician_service.dart` - Technicien
- ✅ `notification_service.dart` - Notifications
- ✅ `heatmap_service.dart` - Carte de chaleur
- ✅ `geo_service.dart` - Géographie Tunisie
- ✅ `ai_service.dart` - Services IA

### Services manquants:
- ❌ `public_service.dart` - Stats publiques (utilise complaint_service)
- ❌ `export_service.dart` - Export CSV/PDF

---

## 5. COMPOSANTS UI MANQUANTS

| # | Composant Web | Équivalent Mobile | Statut |
|---|---------------|-------------------|--------|
| 1 | `DashboardLayout` avec sidebar | Scaffold avec Drawer | ⚠️ Partiel |
| 2 | `PageHeader` avec breadcrumbs | AppBar personnalisée | ⚠️ Partiel |
| 3 | `ComplaintCard` riche | Carte basique | ⚠️ Partiel |
| 4 | `FilterBar` avancée | Aucune | ❌ Manquant |
| 5 | `Modal` réutilisable | AlertDialog basique | ⚠️ Partiel |
| 6 | `Timeline` des statuts | Aucune | ❌ Manquant |
| 7 | `InternalNotes` | Aucune | ❌ Manquant |
| 8 | `MunicipalityMiniMap` | Aucune | ❌ Manquant |
| 9 | `RecentActivities` | Aucune | ❌ Manquant |
| 10 | `TrendForecastChart` | Aucune | ❌ Manquant |
| 11 | `DuplicateStatsCard` | Aucune | ❌ Manquant |
| 12 | `AIAnalysisCard` | Aucune | ❌ Manquant |

