# 🏙️ Smart City Tunisia - Frontend

This is the frontend application for the Smart City Tunisia citizen engagement platform, built with [Next.js 14](https://nextjs.org), TypeScript, and Tailwind CSS.

## ✨ Features

- 🏠 **Home Page** - Landing page with information about the platform
- 📊 **Dashboard** - Interactive dashboard for viewing complaints and statistics
- 👤 **User Profile** - Manage user profile and settings
- 📝 **Registration** - User registration with CAPTCHA protection
- ✅ **Account Verification** - Email-based account verification

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
│   ├── page.tsx             # Home page
│   ├── dashboard/           # Protected dashboard routes
│   │   └── page.tsx         # Main dashboard
│   ├── profile/             # User profile routes
│   │   └── page.tsx         # Profile page
│   ├── register/           # Registration routes
│   │   └── page.tsx         # Registration page
│   └── verify-account/      # Account verification
│       └── page.tsx         # Verification page
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx  # Route protection component
│   └── ui/
│       ├── Alert.tsx           # Alert component
│       ├── AnimatedBackground.tsx
│       ├── Button.tsx          # Button component
│       ├── Input.tsx           # Input component
│       └── ReCaptchaBadge.tsx  # reCAPTCHA badge
├── services/
│   ├── api.client.ts        # Axios API client
│   ├── auth.service.ts      # Authentication service
│   ├── complaint.service.ts # Complaint service
│   └── geo.service.ts       # Geographic service
├── store/
│   ├── useAuthStore.ts      # Auth state management (Zustand)
│   └── useComplaintStore.ts # Complaint state management (Zustand)
├── types/
│   └── index.ts             # TypeScript type definitions
└── public/                   # Static assets
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **Validation**: React Google Recaptcha V3

## 📦 Key Dependencies

- `next` - React framework
- `react` / `react-dom` - UI library
- `tailwindcss` - Utility-first CSS
- `zustand` - State management
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

Custom UI components are available in [`components/ui/`](frontend/components/ui/):

- `Alert` - Display messages
- `Button` - Interactive buttons
- `Input` - Form inputs
- `AnimatedBackground` - Visual effects
- `ReCaptchaBadge` - CAPTCHA badge

## 📡 API Integration

The frontend communicates with the backend API using services located in [`services/`](frontend/services/):

- `api.client.ts` - Base axios configuration with interceptors
- `auth.service.ts` - Authentication endpoints
- `complaint.service.ts` - Complaint CRUD operations
- `geo.service.ts` - Geographic data services

## 🔐 Authentication

Authentication is handled via JWT tokens stored in localStorage. The `useAuthStore` (Zustand) manages authentication state throughout the application.

Protected routes use the `ProtectedRoute` component to ensure only authenticated users can access them.

## 🗺️ Geographic Features

The platform supports geographic coordinates for Tunisia, allowing citizens to tag their complaints with precise location data.

## 📝 Environment Variables

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)

## 📄 License

This project is part of the Smart City Tunisia platform.
