# 🏙️ Smart City Tunisia

A comprehensive citizen engagement platform that allows Tunisian citizens to report urban issues, track complaints, and interact with municipal services.

## 🌟 Features

### For Citizens

- 📝 Report urban issues (potholes, broken streetlights, garbage collection, etc.)
- 📍 Geographic location tagging using Tunisia's coordinates
- 📊 Track complaint status and history
- 💬 Comment and provide updates on reports
- 🔔 Receive notifications on complaint progress

### For Municipal Agents

- 📋 View and manage assigned complaints
- 📝 Update complaint status and add resolution notes
- 👥 Coordinate with repair teams

### For Managers

- 📈 Dashboard with complaint statistics
- 👤 Manage municipal agents and teams
- 📊 Generate reports and analytics

### For Administrators

- 👥 User management (citizens, agents, managers)
- 🔐 Role-based access control
- 📊 System-wide analytics and audit logs

## 🏗️ Project Architecture

```
smart-city/
├── frontend/          # Next.js 14 + TypeScript + Tailwind CSS
├── backend/           # Express.js + MongoDB
├── docs/              # Documentation and specifications
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Git

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env  # Create environment file
# Edit .env with your MongoDB URI and other config
npm run dev
```

Backend runs on: `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:3000`

## 📁 Backend Structure

```
backend/
├── src/
│   ├── app.js              # Express app configuration
│   ├── server.js           # Server entry point
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── middleware/
│   │   └── auth.js         # Authentication middleware
│   ├── models/
│   │   ├── User.js         # User model
│   │   ├── Complaint.js    # Complaint model
│   │   ├── Comment.js      # Comment model
│   │   ├── Department.js   # Department model
│   │   ├── Notification.js # Notification model
│   │   ├── RepairTeam.js   # Repair team model
│   │   ├── AuditLog.js     # Audit log model
│   │   └── PendingUser.js  # Pending registration model
│   ├── routes/
│   │   ├── auth.js         # Authentication routes
│   │   ├── citizen.routes.js
│   │   ├── agent.routes.js
│   │   ├── manager.routes.js
│   │   └── admin.routes.js
│   └── utils/
│       ├── jwt.js          # JWT utilities
│       ├── mailer.js       # Email sending
│       ├── sms.js          # SMS utilities
│       └── recaptcha.js    # reCAPTCHA validation
└── tests/                   # Test files
```

## 📁 Frontend Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   ├── dashboard/          # Dashboard pages
│   ├── profile/            # User profile
│   ├── register/           # Registration
│   └── verify-account/     # Account verification
├── components/
│   ├── auth/               # Auth components
│   └── ui/                 # Reusable UI components
├── services/
│   ├── api.client.ts       # API client
│   ├── auth.service.ts     # Auth service
│   ├── complaint.service.ts
│   └── geo.service.ts      # Geo services
├── store/
│   ├── useAuthStore.ts     # Auth state
│   └── useComplaintStore.ts # Complaint state
└── types/
    └── index.ts            # TypeScript types
```

## 🔐 Authentication

The platform uses JWT-based authentication with role-based access control:

- **Citizen**: Basic user with complaint submission rights
- **Agent**: Municipal worker with complaint management rights
- **Manager**: Department manager with team oversight
- **Administrator**: Full system access

## 🗺️ Geographic Support

Coordinates are based on Tunisia's geographic system:

- Governorates: Tunis, Sfax, Sousse, etc.
- Cities and municipalities across Tunisia

## 📝 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Complaints

- `GET /api/citizen/complaints` - List citizen's complaints
- `POST /api/citizen/complaints` - Create new complaint
- `GET /api/citizen/complaints/:id` - Get complaint details

### More endpoints in respective route files

## 📦 Dependencies

### Backend

- Express.js - Web framework
- Mongoose - MongoDB ODM
- JWT - Authentication
- Bcryptjs - Password hashing
- Nodemailer - Email sending
- CORS - Cross-origin resource sharing
- Morgan - HTTP request logging

### Frontend

- Next.js 14 - React framework
- React 19 - UI library
- Tailwind CSS - Styling
- Zustand - State management
- Lucide React - Icons
- React Google Recaptcha - CAPTCHA protection

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📚 Documentation

- [Technical Specifications](docs/technical-specifications.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [User Manual](docs/user-manual.md)

## 🛠️ Development

```bash
# Run both frontend and backend
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

Smart City Tunisia Development Team
