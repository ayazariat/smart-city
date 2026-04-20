# 🏙️ Smart City Tunisia

A comprehensive citizen engagement platform that allows Tunisian citizens to report urban issues, track complaints, and interact with municipal services. Built with modern web technologies including Next.js 14, Express.js, and MongoDB.

## 🌟 Features

### For Citizens

- 📝 **Report Urban Issues** - Submit complaints about potholes, broken streetlights, garbage collection, and more
- 📍 **Geographic Location Tagging** - Precise location using Tunisia's governorates and municipalities
- 📸 **Image Upload** - Attach photos to complaints for better documentation
- 📊 **Track Complaint Status** - Monitor progress and history of submitted complaints
- 💬 **Comments & Updates** - Provide additional information on reports
- 🔔 **Notifications** - Receive updates on complaint progress via email
- 🔐 **Secure Authentication** - Email verification and password reset functionality

### For Municipal Agents

- 📋 **Complaint Management** - View and manage assigned complaints
- 📝 **Status Updates** - Update complaint status with resolution notes
- 👥 **Team Coordination** - Work with repair teams on issue resolution
- 📊 **Work Statistics** - Track assigned and resolved complaints

### For Technicians

- 🎯 **Task Assignment** - Receive and manage specific technical tasks
- 📍 **Location-based Tasks** - View complaints by geographic area
- ✅ **Completion Reports** - Submit resolution details and outcomes

### For Managers

- 📈 **Analytics Dashboard** - Comprehensive complaint statistics and trends
- 👤 **Team Management** - Oversee municipal agents and technicians
- 📊 **Reports Generation** - Export analytics and performance reports
- 🏛️ **Department Oversight** - Manage by governorate and municipality

### For Administrators

- 👥 **User Management** - Full CRUD operations for all user types (citizens, agents, managers, technicians)
- 🔐 **Role-Based Access Control** - Granular permissions per role
- 📊 **System Analytics** - Platform-wide statistics and audit logs
- 🏢 **Geographic Administration** - Manage users by governorate/municipality
- 📧 **Email Invitations** - Invite new users via email
- 🔍 **User Search & Filtering** - Search users by name, email, or role
- ✅ **Account Verification** - Verify and manage user accounts

## 🏗️ Project Architecture

```
smart-city/
├── frontend/          # Next.js 14 + TypeScript + Tailwind CSS
├── backend/           # Express.js + MongoDB
├── docs/              # Documentation and specifications
└── README.md          # This file
```

## 🎨 Design System - Tunis Vert Civique

The application uses a custom color palette inspired by the Tunisian flag and urban development:

| Color            | Name          | Usage                              |
| ---------------- | ------------- | ---------------------------------- |
| 🟢 **Primary**   | Vert Émeraude | Main actions, navigation, CTAs     |
| ⚪ **Secondary** | Gris Clair    | Backgrounds, cards                 |
| 🔴 **Urgent**    | Rouge Tunis   | Critical alerts, urgent complaints |
| 🟢 **Success**   | Vert Clair    | Resolved states, confirmations     |
| 🟠 **Attention** | Orange        | In-progress states, warnings       |

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

## 📱 Application Pages

### Public Pages

| Route              | Description                            |
| ------------------ | -------------------------------------- |
| `/`                | Landing page with platform information |
| `/register`        | User registration with CAPTCHA         |
| `/verify-account`  | Email account verification             |
| `/forgot-password` | Password reset request                 |
| `/reset-password`  | Password reset form                    |

### Protected Pages (Require Authentication)

| Route             | Roles      | Description                         |
| ----------------- | ---------- | ----------------------------------- |
| `/dashboard`      | All        | Main user dashboard with statistics |
| `/profile`        | All        | User profile management             |
| `/complaints/new` | Citizen    | Submit new complaint                |
| `/admin/users`    | Admin      | User management console             |
| `/technician`     | Technician | Technician task management          |

## 🗄️ Database Models

```
backend/src/models/
├── User.js              # User accounts (5 roles)
├── Complaint.js        # Citizen reports
├── Comment.js           # Complaint discussions
├── Department.js       # Municipal departments
├── Notification.js     # User notifications
├── RepairTeam.js       # Repair team management
├── AuditLog.js         # System audit trail
├── PendingUser.js      # Invitation system
└── Confirmation.js     # Confirmation tokens
```

## 🔐 User Roles

| Role               | Code                 | Permissions                         |
| ------------------ | -------------------- | ----------------------------------- |
| Citizen            | `CITIZEN`            | Submit complaints, view own reports |
| Municipal Agent    | `MUNICIPAL_AGENT`    | Manage assigned complaints          |
| Technician         | `TECHNICIAN`         | Technical task completion           |
| Department Manager | `DEPARTMENT_MANAGER` | Team oversight, analytics           |
| Administrator      | `ADMIN`              | Full system access                  |

## 🗺️ Geographic Support

Full coverage of Tunisia's administrative divisions:

- **24 Governorates**: Tunis, Sfax, Sousse, Ariana, etc.
- **Municipalities**: Complete list of cities and communes
- **Location Tagging**: GPS coordinates for precise complaint mapping

## 📡 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/verify/:token` - Verify email

### Citizen Complaints

- `GET /api/citizen/complaints` - List citizen's complaints
- `POST /api/citizen/complaints` - Create new complaint
- `GET /api/citizen/complaints/:id` - Get complaint details

### Agent Management

- `GET /api/agent/complaints` - List assigned complaints
- `PUT /api/agent/complaints/:id` - Update complaint status

### Technician Tasks

- `GET /api/technician/tasks` - List assigned tasks
- `PUT /api/technician/tasks/:id/complete` - Mark task complete

### Admin Endpoints

- `GET /api/admin/users` - List all users (paginated)
- `POST /api/admin/users` - Create new user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/stats` - System statistics
- `POST /api/admin/invite` - Invite new user via email

## 📁 Project Structure

### Backend

```
backend/
├── src/
│   ├── app.js              # Express app configuration
│   ├── server.js           # Server entry point
│   ├── config/
│   │   └── db.js          # MongoDB connection
│   ├── middleware/
│   │   ├── auth.js        # Authentication & authorization
│   │   └── upload.js      # File upload handling
│   ├── models/            # Mongoose models
│   ├── routes/           # API route handlers
│   ├── controllers/      # Business logic
│   ├── validators/       # Input validation
│   └── utils/            # JWT, mailer, SMS, recaptcha
└── tests/                # Test files
```

### Frontend

```
frontend/
├── app/                   # Next.js App Router
│   ├── layout.tsx        # Root layout with providers
│   ├── page.tsx         # Landing page
│   ├── dashboard/       # User dashboard
│   ├── profile/         # Profile management
│   ├── complaints/      # Complaint submission
│   ├── admin/           # Admin panel
│   ├── technician/     # Technician interface
│   └── auth/            # Authentication pages
├── components/
│   ├── auth/            # Auth components
│   └── ui/              # Reusable UI components
├── services/            # API client services
├── store/               # Zustand state management
└── types/               # TypeScript definitions
```

## 🛠️ Tech Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer
- **Validation**: Custom validators
- **Security**: bcryptjs, CORS, Helmet

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom theme
- **State Management**: Zustand
- **HTTP Client**: Axios with interceptors
- **Icons**: Lucide React
- **Security**: Google reCAPTCHA V3

## 📦 Dependencies

### Backend Core

- `express` - Web framework
- `mongoose` - MongoDB ODM
- `jsonwebtoken` - JWT authentication
- `bcryptjs` - Password hashing
- `nodemailer` - Email sending
- `cors` - Cross-origin resource sharing
- `morgan` - HTTP request logging

### Frontend Core

- `next` - React framework
- `react` / `react-dom` - UI library
- `tailwindcss` - Utility-first CSS
- `zustand` - State management
- `lucide-react` - Icon library
- `react-google-recaptcha-v3` - CAPTCHA protection
- `axios` - HTTP client

## 🔧 Environment Variables

### Backend (.env)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/smartcity
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=30d
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USER=your_mail_user
MAIL_PASS=your_mail_password
RECAPTCHA_SECRET_KEY=your_recaptcha_secret
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

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
- [Dashboard Updates](frontend/DASHBOARD_UPDATE.md)
- [Tunis Theme Guide](frontend/TUNIS_THEME.md)

## 🛠️ Development

```bash
# Run backend (Terminal 1)
cd backend && npm run dev

# Run frontend (Terminal 2)
cd frontend && npm run dev
```

## 🔄 Recent Updates

### New Features (Latest)

- ✅ **Technician Role** - Dedicated interface for technical staff
- ✅ **Admin User Management** - Full CRUD with search and pagination
- ✅ **Password Reset Flow** - Complete forgot/reset password system
- ✅ **Email Verification** - Account activation via email
- ✅ **Image Upload** - Attach photos to complaints
- ✅ **Tunis Vert Civique Theme** - Complete design system overhaul
- ✅ **Responsive Dashboard** - Mobile-friendly statistics view
- ✅ **Complaint Validation** - Server-side input validation
- ✅ **Audit Logging** - Track system activities
- ✅ **User Invitations** - Admin can invite users via email

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

Smart City Tunisia Development Team

---

🇹🇳 _Building smarter cities for a better Tunisia_
