# Smart City Tunisia

Plateforme citoyenne de signalement et de gestion des problèmes urbains en Tunisie.

## Déploiements

| Service | URL |
|---|---|
| **Frontend** | https://smart-city2.vercel.app |
| **Backend** | https://smart-city-x82i.onrender.com |
| **AI Services** | https://smart-city-ai-services.onrender.com |

---

## Architecture

```
smart-city/
├── frontend/              # Next.js 16 + TypeScript + Tailwind CSS
├── backend/               # Express.js + MongoDB (port 5000)
├── ai-services/           # Service Python FastAPI (port 8000)
│   ├── main.py
│   └── services/
│       ├── category_predictor.py
│       ├── duplicate_detector.py
│       ├── urgency_predictor.py
│       └── trend_predictor.py
├── mobile/                # Flutter (Dart)
└── docs/
```

---

## Fichiers .env à créer

### `backend/.env`

```env
PORT=5000
MONGO_URI=

# Cloudinary (photos)
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret

# SMTP (emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre.email@gmail.com
SMTP_PASS=votre_mot_de_passe_16_caractères
MAIL_FROM=SmartCity Tunisia <votre.email@gmail.com>

FRONTEND_URL=http://localhost:3000


# AI Service
AI_SERVICE_URL=http://localhost:8000

# JWT
JWT_SECRET=une_chaine_aleatoire_securisee

# reCAPTCHA
RECAPTCHA_SECRET_KEY=votre_cle_secrete
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=votre_cle_publique
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=votre_cloud_name
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=votre_cle_publique
```

### `ai-services/.env` (optionnel)

```env
ANTHROPIC_API_KEY=sk-ant-...    # Pour Claude API (prédiction catégorie améliorée)
```

---

## Installation et Démarrage

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Éditer .env avec vos infos
npm run dev
# → http://localhost:5000
```

**Build production :**
```bash
npm run build
npm start
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

**Build production :**
```bash
npm run build
npm start
```

### 3. AI Services

```bash
cd ai-services
pip install -r requirements.txt
python main.py
# → http://localhost:8000
```

### 4. Mobile (Flutter)

```bash
cd mobile
flutter pub get
flutter run
```

---

## Créer un Administrateur

Méthode 1 — via l'interface d'inscription (recommandée) :

1. Inscrivez-vous normalement sur `http://localhost:3000/register`
2. Connectez-vous à MongoDB :
   ```bash
   mongosh mongodb://127.0.0.1:27017/smart-city
   ```
3. Passez le compte en ADMIN :
   ```javascript
   db.users.updateOne(
     { email: "votre@email.com" },
     { $set: { role: "ADMIN", isVerified: true, isActive: true, status: "ACTIVE" } }
   )
   ```

Méthode 2 — insertion directe (mot de passe hashé) :

```bash
mongosh mongodb://127.0.0.1:27017/smart-city
```

```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('VotreMotDePasse', 10);
db.users.insertOne({
  fullName: "Super Admin",
  email: "admin@smartcity.tn",
  password: hash,
  role: "ADMIN",
  isVerified: true,
  isActive: true,
  status: "ACTIVE",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

> ⚠️ Ne stockez JAMAIS le mot de passe en clair dans le champ `password`. Utilisez toujours `bcrypt.hashSync()`.

Sur **MongoDB Atlas** (cloud), utilisez le shell intégré dans Atlas → Browse Collections → `users` → Insert Document.

---

## Variables d'Environnement pour le Déploiement

### Render (Backend)

Dans **Render Dashboard → Backend → Environment** :

```
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/smart-city
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.votre_cle_sendgrid
MAIL_FROM=SmartCity Tunisia <votre@email.com>
FRONTEND_URL=https://smart-city2.vercel.app
AI_SERVICE_URL=https://smart-city-ai-services.onrender.com
```

### Vercel (Frontend)

Dans **Vercel Dashboard → Frontend → Settings → Environment Variables** :

```
NEXT_PUBLIC_API_URL=https://smart-city-x82i.onrender.com/api
NEXT_PUBLIC_AI_SERVICE_URL=https://smart-city-ai-services.onrender.com
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
```

### Render (AI Services)

Dans **Render Dashboard → AI Service → Environment** :

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Route des Pages

| Route | Rôle | Description |
|---|---|---|
| `/` | Public | Page d'accueil |
| `/register` | Public | Inscription citoyen |
| `/login` | Public | Connexion |
| `/transparency` | Public | Stats publiques des communes |
| `/municipalities` | Public | Classement des communes |
| `/dashboard` | All | Tableau de bord |
| `/complaints/new` | Citizen | Nouveau signalement |
| `/my-complaints` | Citizen | Mes signalements |
| `/archive` | Citizen | Signalements archivés |
| `/agent/complaints` | Agent | File des signalements |
| `/manager/pending` | Manager | Signalements en attente |
| `/dashboard/complaints/:id` | Agent/Manager | Détail + actions |
| `/tasks` | Technicien | Tâches assignées |
| `/admin/complaints` | Admin | Tous les signalements (lecture) |
| `/admin/users` | Admin | Gestion des utilisateurs |

---

## Services IA

| Endpoint | Description | Port |
|---|---|---|
| `POST /predict-category` | Prédiction de catégorie | 8000 |
| `POST /ai/duplicate/check` | Détection de doublons | 8000 |
| `POST /ai/urgency/predict` | Prédiction d'urgence | 8000 |
| `GET /ai/trend/forecast` | Prévisions 7 jours | 8000 |

---

## API Backend Principale

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion |
| GET | `/api/public/stats` | Statistiques publiques |
| GET | `/api/public/complaints` | Signalements publics |
| POST | `/api/complaints` | Créer un signalement |
| PUT | `/api/manager/complaints/:id/assign-team` | Assigner une équipe |
| PUT | `/api/agent/complaints/:id/validate` | Valider un signalement |

---

## Modèles MongoDB

| Collection | Champs clés |
|---|---|
| `users` | email, password (hashé bcrypt), role, fullName, municipality, governorate, isActive |
| `complaints` | title, description, category, status, location (lat/lng), municipality, municipalityNormalized, governorate, governorateNormalized, media[], assignedTo, assignedTeam |
| `repairteams` | name, members[], createdBy, department |
| `departments` | name, categoryKey |
| `notifications` | userId, type, message, read |
| `auditlogs` | userId, action, resource, details |

---

## Technologies

- **Frontend** : Next.js 16, TypeScript, Tailwind CSS, Zustand, Lucide React
- **Backend** : Node.js, Express.js, Mongoose, JWT, Socket.io
- **AI** : Python, FastAPI, scikit-learn, sentence-transformers, Claude API
- **Mobile** : Flutter, Dart
- **Base de données** : MongoDB
- **Stockage média** : Cloudinary (cloud) / disque local (développement)
- **Email** : SendGrid (production) / Gmail App Password
