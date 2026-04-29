// Shared Design System Tokens
// These tokens are used by both web (Tailwind) and mobile (Flutter)
// to ensure consistent design across platforms

export const colors = {
  // Primary - Tunis Vert Civique (green!)
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryDark: '#1B5E20',

  // Secondary (slate)
  secondary: '#F5F7FA',
  secondaryLight: '#FFFFFF',
  secondaryDark: '#6B7784',

  // Accent (orange)
  accent: '#F57C00',
  accentLight: '#FFA726',
  accentDark: '#E65100',

  // Danger/Urgent (red)
  danger: '#C62828',
  dangerLight: '#EF5350',
  dangerDark: '#B71C1C',
  urgent: '#C62828',

  // Success (green)
  success: '#81C784',
  successLight: '#A5D6A7',
  successDark: '#2E7D32',

  // Attention/Warning (orange)
  warning: '#F57C00',
  attention: '#F57C00',
  info: '#2563EB',

  // Background & Surface
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFC',
  surfaceDark: '#1E293B',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Border
  border: '#E2E8F0',
  borderLight: '#F5F7FA',
  borderDark: '#94A3B8',

  // Shadow
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowLg: 'rgba(0, 0, 0, 0.15)',
}

export const status = {
  pending: '#94A3B8',
  validated: '#2563EB',
  assigned: '#8B5CF6',
  in_progress: '#F59E0B',
  resolved: '#22C55E',
  closed: '#6B7280',
  rejected: '#EF4444',
}

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
}

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
}

export const shadow = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
}

export const transition = {
  fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
}

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
}
