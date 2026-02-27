# 🏙️ Smart City Tunisia - Frontend

This is the frontend application for the Smart City Tunisia citizen engagement platform, built with [Next.js 14](https://nextjs.org), TypeScript, and Tailwind CSS.

## ✨ Features

### Authentication & Security

- 🏠 **Landing Page** - Information about the platform
- 📝 **User Registration** - With Google reCAPTCHA V3 protection
- ✅ **Account Verification** - Email-based account activation
- 🔐 **Login** - Secure JWT-based authentication
- 🔑 **Password Reset** - Complete forgot/reset password flow

### User Dashboard

- 📊 **Dashboard** - Interactive dashboard with statistics
- 👤 **User Profile** - Manage profile and settings
- 📈 **Statistics** - View complaint counts by status (Total, In Progress, Resolved, Urgent)

### Complaint Management

- 📝 **New Complaint** - Submit urban issues with location & images
- 📋 **My Complaints** - Track submitted reports
- 💬 **Comments** - Add updates to complaints

### Admin Panel

- 👥 **User Management** - Full CRUD operations (Admin only)
- 🔍 **Search & Filter** - Find users by name, email, or role
- 📊 **User Statistics** - View user counts by role and status
- 📧 **User Invitations** - Invite new users via email

### Technician Interface

- 🎯 **Task Management** - View and complete assigned tasks
- 📍 **Location-based Tasks** - Filter tasks by area

### Design System

- 🎨 **Tunis Vert Civique Theme** - Custom color palette inspired by Tunisia
- 📱 **Responsive Design** - Works on mobile, tablet, and desktop
- ✨ **Animated Components** - Smooth transitions and animations

## 🚀 Getting Started

First, ensure the backend server is running (see root README.md).

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## 📁 Project Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Landing page
│   ├── dashboard/           # Protected dashboard routes
│   │   └── page.tsx        # Main dashboard
│   ├── profile/             # User profile routes
│   │   └── page.tsx        # Profile page
│   ├── complaints/         # Complaint management
│   │   └── new/            # New complaint submission
│   │       └── page.tsx    # Complaint form
│   ├── admin/              # Admin panel
│   │   └── users/          # User management
│   │       └── page.tsx   # Admin user console
│   ├── technician/         # Technician interface
│   │   └── page.tsx       # Task management
│   ├── register/          # Registration routes
│   │   └── page.tsx       # Registration page
│   ├── verify-account/    # Account verification
│   │   └── page.tsx       # Verification page
│   ├── forgot-password/   # Password reset request
│   │   └── page.tsx      # Forgot password page
│   ├── reset-password/    # Password reset form
│   │   └── page.tsx     # Reset password page
│   └── auth/              # Authentication (login)
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx  # Route protection
│   └── ui/
│       ├── Alert.tsx           # Alert component
│       ├── AnimatedBackground.tsx  # Visual effects
│       ├── Button.tsx          # Button component
│       ├── Input.tsx           # Input component
│       └── ReCaptchaBadge.tsx  # reCAPTCHA badge
├── services/
│   ├── api.client.ts        # Axios API client with interceptors
│   ├── auth.service.ts      # Authentication service
│   ├── complaint.service.ts # Complaint service
│   ├── admin.service.ts     # Admin user management
│   └── geo.service.ts       # Geographic data services
├── store/
│   ├── useAuthStore.ts      # Auth state (Zustand)
│   └── useComplaintStore.ts # Complaint state (Zustand)
├── types/
│   └── index.ts            # TypeScript definitions
├── data/
│   └── tunisia-geography.ts # Tunisia governorates & municipalities
├── DASHBOARD_UPDATE.md     # Dashboard update notes
├── TUNIS_THEME.md          # Theme documentation
└── public/                 # Static assets
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Validation**: React Google Recaptcha V3

## 🎨 Tunis Vert Civique Theme

The application uses a custom color palette:

| Color     | Hex       | Usage                    |
| --------- | --------- | ------------------------ |
| Primary   | `#2E7D32` | Main actions, navigation |
| Secondary | `#F5F7FA` | Backgrounds, cards       |
| Urgent    | `#C62828` | Critical alerts          |
| Success   | `#81C784` | Resolved states          |
| Attention | `#F57C00` | In-progress states       |

## 📦 Key Dependencies

- `next` - React framework
- `react` / `react-dom` - UI library
- `tailwindcss` - Utility-first CSS
- `zustand` - State management
- `axios` - HTTP client
- `lucide-react` - Icon library
- `react-google-recaptcha-v3` - CAPTCHA protection

## 🔧 Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Format code with Prettier
npm run format
```

## 🎨 UI Components

Custom UI components are available in [`components/ui/`](./components/ui/):

- `Alert` - Display messages (success, error, warning, info)
- `Button` - Interactive buttons (primary, secondary, outline, ghost)
- `Input` - Form inputs with validation
- `AnimatedBackground` - Gradient visual effects
- `ReCaptchaBadge` - reCAPTCHA badge component

## 📡 API Integration

The frontend communicates with the backend API using services in [`services/`](./services/):

- `api.client.ts` - Base axios configuration with interceptors
- `auth.service.ts` - Authentication (login, register, password reset)
- `complaint.service.ts` - Complaint CRUD operations
- `admin.service.ts` - Admin user management
- `geo.service.ts` - Geographic data (Tunisia regions)

## 🔐 Authentication

Authentication is handled via JWT tokens stored in localStorage. The `useAuthStore` (Zustand) manages authentication state throughout the application.

Protected routes use the `ProtectedRoute` component to ensure only authenticated users can access them.

### Auth Flow

1. **Register** → Create account with CAPTCHA
2. **Verify Email** → Click link in verification email
3. **Login** → Authenticate with email/password
4. **Access Dashboard** → View role-based content
5. **Profile** → Update personal information
6. **Logout** → Clear session

## 🗺️ Geographic Features

The platform supports all 24 Tunisian governorates and their municipalities:

- **Ariana**, **Béja**, **Ben Arous**, **Bizerte**, **Gabès**, **Gafsa**
- **Jendouba**, **Kairouan**, **Kasserine**, **Kébili**, **Le Kef**, **Mahdia**
- **Manouba**, **Médenine**, **Monastir**, **Nabeul**, **Sfax**, **Sidi Bouzid**
- **Siliana**, **Sousse**, **Tataouine**, **Tozeur**, **Tunis**, **Zaghouan**

## 📝 Environment Variables

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

## 🔄 Recent Updates

### Latest Features

- ✅ **Complete Admin Panel** - Full user management with search/pagination
- ✅ **Technician Dashboard** - Task management interface
- ✅ **Password Reset Flow** - Forgot and reset password pages
- ✅ **Email Verification** - Account activation system
- ✅ **Image Upload** - Attach photos to complaints
- ✅ **Dashboard Statistics** - Real-time complaint stats
- ✅ **Tunis Vert Civique Theme** - Complete design overhaul
- ✅ **Responsive Design** - Mobile-optimized layouts

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Theme Documentation](./TUNIS_THEME.md)
- [Dashboard Updates](./DASHBOARD_UPDATE.md)

## 📄 License

This project is part of the Smart City Tunisia platform.
