# Smart City Tunisia

Plateforme citoyenne de signalement et de gestion des problèmes urbains en Tunisie. Permet aux citoyens de signaler des incidents (déchets, routes, éclairage, eau, sécurité, etc.), de suivre leur traitement, et aux autorités municipales de gérer ces signalements.

---

## Architecture

```
smart-city/
├── frontend/              # Next.js 16 + TypeScript + Tailwind CSS
├── backend/               # Express.js + MongoDB (port 5000)
├── ai-services/           # Service Python FastAPI (port 8000)
│   ├── main.py           # Point d'entrée AI (prédiction, doublons, tendances)
│   └── services/
│       ├── category_predictor.py   # Prédiction de catégorie
│       ├── duplicate_detector.py   # Détection de doublons
│       ├── urgency_predictor.py    # Prédiction d'urgence
│       └── trend_predictor.py      # Prévisions de tendances
└── mobile/                # Application Flutter (Dart)
```

---

## Démarrage Rapide

### Prérequis
- Node.js 18+
- Python 3.10+
- MongoDB (local ou Atlas)
- Git

### 1. Backend (Express + MongoDB)
```bash
cd backend
npm install
cp .env.example .env
# Modifier .env : MONGODB_URI, JWT_SECRET, etc.
npm run dev
```
→ `http://localhost:5000`

### 2. Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
→ `http://localhost:3000`

### 3. Services IA (Python FastAPI)
```bash
cd ai-services
pip install -r requirements.txt
python main.py
```
→ `http://localhost:8000`

---

## Fonctionnalités par Rôle

### Citoyen
| Fonctionnalité | Description |
|---|---|
| Signaler un problème | Formulaire avec titre, description, catégorie, localisation (carte), photos |
| Prédiction de catégorie IA | Suggestion automatique de la catégorie via analyse sémantique du texte |
| Détection de doublons IA | Alerte si un signalement similaire existe déjà (même lieu + même description) |
| Suivi des signalements | Tableau de bord avec statuts : Nouveau, En cours, Résolu, Archivé |
| Confirmation communautaire | Les citoyens peuvent confirmer les signalements des autres |
| Localisation précise | Carte interactive avec géolocalisation, sélection par commune/gouvernorat |
| Pièces jointes | Upload de photos avant/après |
| Notifications | Mise à jour par email sur le statut du signalement |
| Archivage | Consultation de l'historique complet des signalements clos/rejetés |

### Agent Municipal
| Fonctionnalité | Description |
|---|---|
| File d'attente | Liste des signalements à valider (SUBMITTED) |
| Validation/R eject | Approuver ou rejeter les signalements avec motif |
| Détection de doublons | Panneau IA listant les doublons potentiels, fusion ou rejet |
| Gestion des médias | Visualisation des photos avant validation |
| Statistiques | Métriques de performance : taux de résolution, délais, urgences |
| Recherche & filtres | Filtre par statut, date, catégorie, commune |

### Technicien
| Fonctionnalité | Description |
|---|---|
| Tâches assignées | Liste des signalements affectés (ASSIGNED) |
| Mise à jour de statut | Passage à EN_COURS, ajout de notes de résolution |
| Photos après intervention | Preuve de complétion avec photos |
| Statistiques personnelles | Nombre de tâches complétées, délai moyen |

### Manager (Chef de Département)
| Fonctionnalité | Description |
|---|---|
| Dashboard analytique | Graphiques : signalements par catégorie, par commune, tendances |
| Affectation d'équipe | Création d'équipe de réparation, assignation à un signalement |
| Définition de priorité | Score de priorité basé sur l'urgence citoyenne + analyse IA |
| Prévisions IA | Tendances 7 jours, alertes de pics d'activité |
| Métriques SLA | Taux de résolution dans les délais, délai moyen par commune |
| Classement communal | Leaderboard des communes par nombre de signalements |

### Administrateur
| Fonctionnalité | Description |
|---|---|
| Gestion des utilisateurs | CRUD complet, recherche, filtre par rôle |
| Invitations par email | Envoi d'invitation aux nouveaux agents/techniciens/managers |
| Statistiques système | Vue d'ensemble : totaux, taux de résolution, délais |
| Audit | Logs des actions système |

---

## Services IA Détail

### Prédiction de Catégorie (POST /predict-category)
Analyse le titre et la description pour suggérer une catégorie :
1. **Stratégie 1** : Claude API (Haiku) — meilleure précision
2. **Stratégie 2** : HuggingFace zero-shot (bart-large-mnli)
3. **Stratégie 3** : Correspondance floue de mots-clés (fuzzy matching, seuil 0.60)

### Détection de Doublons (POST /ai/duplicate/check)
Compare un nouveau signalement avec les existants en base :
- **Similarité textuelle** (poids 0.50) — embeddings sémantiques (sentence-transformers)
- **Proximité géographique** (poids 0.20) — distance en mètres via haversine (rayon < 150m)
- **Correspondance photo** (poids 0.15) — mêmes URLs d'image
- **Catégorie** (poids 0.10) — même catégorie renforce le score
- Seuil de décision : 0.50 / Règle stricte : deux coordonnées valides et distantes > 150m → non doublon

### Prédiction d'Urgence (POST /ai/urgency/predict)
Calcule un niveau d'urgence (LOW/MEDIUM/HIGH) basé sur :
- Urgence déclarée par le citoyen
- Mots-clés détectés dans la description
- Catégorie du signalement
- Signal communautaire (nombre de confirmations)

### Prévisions de Tendances (GET /ai/trend/forecast)
Prévisions sur 7/30 jours par commune utilisant la régression Ridge.

---

## Pages de l'Application

### Pages Publiques
| Route | Description |
|---|---|
| `/` | Page d'accueil |
| `/register` | Inscription citoyen |
| `/login` | Connexion |
| `/forgot-password` | Mot de passe oublié |
| `/reset-password` | Réinitialisation |
| `/transparency` | Tableau de bord public (statistiques des communes, gouvernorats) |
| `/transparency/complaints/:id` | Détail public d'un signalement |
| `/municipalities` | Classement des communes |

### Pages Citoyen
| Route | Description |
|---|---|
| `/dashboard` | Tableau de bord personnel |
| `/complaints/new` | Nouveau signalement |
| `/my-complaints` | Mes signalements |
| `/archive` | Signalements archivés |
| `/profile` | Profil utilisateur |

### Pages Agent
| Route | Description |
|---|---|
| `/dashboard` | Tableau de bord agent |
| `/agent/complaints` | File des signalements à traiter |

### Pages Manager
| Route | Description |
|---|---|
| `/dashboard` | Tableau de bord manager |
| `/manager/pending` | Signalements en attente d'assignation |
| `/dashboard/complaints/:id` | Détail d'un signalement (actions : assigner, prioriser) |

### Pages Technicien
| Route | Description |
|---|---|
| `/dashboard` | Tableau de bord technicien |
| `/tasks` | Tâches assignées |
| `/tasks/:id` | Détail d'une tâche |

### Pages Admin
| Route | Description |
|---|---|
| `/dashboard` | Tableau de bord admin |
| `/admin/complaints` | Tous les signalements (lecture seule) |
| `/admin/users` | Gestion des utilisateurs |
| `/admin/settings` | Paramètres SLA |

---

## Modèles de Données (MongoDB)

| Modèle | Champs clés |
|---|---|
| **User** | email, password, role (CITIZEN/AGENT/TECHNICIAN/MANAGER/ADMIN), fullName, phone, municipality, governorate, municipalityNormalized |
| **Complaint** | title, description, category, status, priorityScore, location (lat/lng), municipality, municipalityNormalized, governorate, governorateNormalized, media[], assignedTo, assignedTeam, aiUrgencyPrediction, aiDuplicateCheck, slaDeadline, resolvedAt |
| **RepairTeam** | name, members[], createdBy, department |
| **Comment** | complaintId, userId, text, media[] |
| **Notification** | userId, type, message, read |
| **Department** | name, categoryKey |
| **AuditLog** | userId, action, resource, details |

---

## Variables d'Environnement

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartcity
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
AI_SERVICE_URL=http://localhost:8000
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=
MAIL_PASS=
RECAPTCHA_SECRET_KEY=
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
```

### Services IA (.env)
```
ANTHROPIC_API_KEY=     # Optionnel : pour Claude API (prédiction catégorie)
```

---

## Licence

ISC License
