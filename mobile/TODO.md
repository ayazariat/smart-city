# TODO - Synchronisation Mobile ↔ Web

## Objectif

Faire correspondre exactement l'application mobile au frontend web (Next.js).

## Architecture cible (2 rôles uniquement)

- **CITIZEN** (citoyen) : dashboard, mes signalements, nouveau signalement, transparence, profil
- **TECHNICIAN** (technicien) : dashboard, mes tâches, transparence, profil

## Phase 1 : Nettoyage & Fondation

- [x] Simplifier `home_screen.dart` → CITIZEN + TECHNICIAN uniquement
- [ ] Réécrire `main.dart` → routes simplifiées, pas de routes admin/agent/manager
- [ ] Mettre à jour `app_routes.dart` → seulement les routes utiles
- [ ] Vérifier `login_screen.dart` → redirection selon rôle vers HomeScreen
- [ ] Supprimer les écrans non utilisés (admin/, agent/, manager/ si inutilisés)

## Phase 2 : Dashboard CITIZEN (correspond à `/dashboard` web)

### Manquant critique :

- [ ] **Priorités du jour** : section avec alertes personnalisées (comme sur le web)
- [ ] **Activités récentes** : liste des dernières actions (RecentActivities)
- [ ] **Carte municipale** : aperçu des signalements dans la municipalité (MunicipalityOverview)
- [ ] **Signalements municipaux** : voir + confirmer les signalements publics
- [ ] **Résolutions récentes** : cartes des signalements récemment résolus
- [ ] **Taux de résolution** : barre de progression + pourcentage
- [ ] **Répartition par catégorie** : graphiques en barres horizontales

## Phase 3 : Dashboard TECHNICIAN (correspond à `/tasks` web)

### Manquant critique :

- [ ] **Cartes de stats** : Total, Assigned, In Progress, Resolved, Overdue
- [ ] **Filtres de statut** : ALL, ASSIGNED, IN_PROGRESS, RESOLVED
- [ ] **Recherche** : barre de recherche dans les tâches
- [ ] **Cartes de tâches riches** : status, urgence, priorité, SLA deadline, photos
- [ ] **Actions rapides** : Start Work, Mark Resolved
- [ ] **Modal Résolution** : notes + photos de preuve
- [ ] **Confirmation modals** : avant action destructrice

## Phase 4 : Complaints Screen (correspond à `/my-complaints`)

### Manquant critique :

- [ ] **Filtres** : par statut, catégorie, priorité, recherche texte
- [ ] **Tri** : date, priorité
- [ ] **Pagination** : infinite scroll ou page numbers
- [ ] **Cartes riches** : image, statut coloré, catégorie, municipalité, date
- [ ] **Actions** : modifier (si SUBMITTED), supprimer, voir détails

## Phase 5 : Complaint Detail (correspond à `/dashboard/complaints/[id]`)

### Manquant critique :

- [ ] **Timeline** : flux chronologique des statuts (Timeline component)
- [ ] **Notes internes** : (si technicien/agent)
- [ ] **Commentaires publics** : liste + ajout
- [ ] **Confirmer/Résoudre** : bouton selon statut
- [ ] **Carte** : localisation géographique
- [ ] **Photos** : avant/après en galerie

## Phase 6 : New Complaint (correspond à `/complaints/new`)

### Manquant critique :

- [ ] **Prédiction IA catégorie** : auto-suggest basé sur le texte
- [ ] **Prédiction IA urgence** : score automatique
- [ ] **Sélection géo** : gouvernorat → municipalité (autocomplete)
- [ ] **Upload photos** : multi-sélection + preview
- [ ] **Carte** : pin sur la carte pour localisation

## Phase 7 : Transparence (correspond à `/transparency`)

### Manquant critique :

- [ ] **Stats publiques** : total, résolus, en cours, taux
- [ ] **Carte heatmap** : densité des signalements
- [ ] **Filtres** : gouvernorat, catégorie, statut
- [ ] **Liste publique** : signalements visibles par tous
- [ ] **Confirmer un signalement** : bouton "moi aussi"
- [ ] **Commentaires publics**

## Phase 8 : Archive (correspond à `/archive`)

### Manquant critique :

- [ ] **Filtres** : CLOSED vs REJECTED
- [ ] **Recherche** : dans les archives
- [ ] **Stats** : compteurs closed/rejected
- [ ] **Export** : CSV/PDF (si pertinent sur mobile)

## Phase 9 : Services & API

### Manquant :

- [ ] **Heatmap service** : correspond à `frontend/services/heatmap.service.ts`
- [ ] **Geo service** : correspond à `frontend/services/geo.service.ts`
- [ ] **AI service** : predictions (catégorie, urgence, duplicates, trends)
- [ ] **Notification service** : socket.io temps réel
- [ ] **Manager service** : si besoin plus tard
- [ ] **Admin service** : si besoin plus tard

## Phase 10 : UI Components

### Manquant :

- [ ] **PageHeader** : titre + sous-titre + back button
- [ ] **FilterBar** : chips de filtres actifs
- [ ] **ComplaintCard** : carte riche uniforme
- [ ] **EmptyState** : illustration + texte quand vide
- [ ] **LoadingSpinner** : skeleton ou spinner
- [ ] **Modal** : bottom sheet ou dialog
- [ ] **ConfirmationModal** : alerte avant action
- [ ] **StatCard** : carte de statistique
- [ ] **Timeline** : composant chronologique
- [ ] **Badge** : statut coloré
- [ ] **Toast** : notifications éphémères

## Phase 11 : Thème & UX

### Manquant :

- [ ] **Dark mode** : bascule clair/sombre
- [ ] **i18n** : AR, FR, EN (actuellement hardcodé FR)
- [ ] **Animations** : fade, slide, shimmer
- [ ] **Pull-to-refresh** : sur toutes les listes
- [ ] **Infinite scroll** : pagination automatique

## Priorisation

1. Phase 1 (fondation) → immédiat
2. Phase 2 + 3 (dashboards) → haute priorité
3. Phase 5 (détail signalement) → haute priorité
4. Phase 4 (liste signalements) → moyenne priorité
5. Phase 6 (nouveau signalement) → moyenne priorité
6. Phase 7 (transparence) → basse priorité
7. Phase 8+ (reste) → basse priorité
