import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette Tunis Vert Civique
        primary: {
          DEFAULT: '#2E7D32',
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#2E7D32',
          600: '#2C6B2F',
          700: '#1B5E20',
          800: '#145A1F',
          900: '#0D4715',
        },
        secondary: {
          DEFAULT: '#F5F7FA',
          50: '#FFFFFF',
          100: '#FAFBFC',
          200: '#F5F7FA',
          300: '#E8EDF3',
          400: '#D1DBE5',
          500: '#F5F7FA',
          600: '#C4CED8',
          700: '#A8B4C0',
          800: '#8F9AA8',
          900: '#6B7784',
        },
        urgent: {
          DEFAULT: '#C62828',
          50: '#FFEBEE',
          100: '#FFCDD2',
          200: '#EF9A9A',
          300: '#E57373',
          400: '#EF5350',
          500: '#C62828',
          600: '#B71C1C',
          700: '#A31A1A',
          800: '#8E1616',
          900: '#6D1212',
        },
        success: {
          DEFAULT: '#81C784',
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#81C784',
          600: '#4CAF50',
          700: '#43A047',
          800: '#388E3C',
          900: '#2E7D32',
        },
        attention: {
          DEFAULT: '#F57C00',
          50: '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#F57C00',
          600: '#F57C00',
          700: '#E65100',
          800: '#D84315',
          900: '#BF360C',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [tailwindcssAnimate],
}
