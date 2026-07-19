export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        white: 'rgb(var(--tw-color-white) / <alpha-value>)',
        black: 'rgb(var(--tw-color-black) / <alpha-value>)',
        gray: {
          50: 'rgb(var(--tw-color-gray-50) / <alpha-value>)',
          100: 'rgb(var(--tw-color-gray-100) / <alpha-value>)',
          200: 'rgb(var(--tw-color-gray-200) / <alpha-value>)',
          300: 'rgb(var(--tw-color-gray-300) / <alpha-value>)',
          400: 'rgb(var(--tw-color-gray-400) / <alpha-value>)',
          500: 'rgb(var(--tw-color-gray-500) / <alpha-value>)',
          600: 'rgb(var(--tw-color-gray-600) / <alpha-value>)',
          700: 'rgb(var(--tw-color-gray-700) / <alpha-value>)',
          800: 'rgb(var(--tw-color-gray-800) / <alpha-value>)',
          900: 'rgb(var(--tw-color-gray-900) / <alpha-value>)',
        },
        slate: {
          50: 'rgb(var(--tw-color-slate-50) / <alpha-value>)',
          100: 'rgb(var(--tw-color-slate-100) / <alpha-value>)',
          200: 'rgb(var(--tw-color-slate-200) / <alpha-value>)',
          300: 'rgb(var(--tw-color-slate-300) / <alpha-value>)',
          400: 'rgb(var(--tw-color-slate-400) / <alpha-value>)',
          450: 'rgb(var(--tw-color-slate-450) / <alpha-value>)',
          500: 'rgb(var(--tw-color-slate-500) / <alpha-value>)',
          600: 'rgb(var(--tw-color-slate-600) / <alpha-value>)',
          650: 'rgb(var(--tw-color-slate-650) / <alpha-value>)',
          700: 'rgb(var(--tw-color-slate-700) / <alpha-value>)',
          800: 'rgb(var(--tw-color-slate-800) / <alpha-value>)',
          900: 'rgb(var(--tw-color-slate-900) / <alpha-value>)',
        },
        indigo: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          650: '#4338ca',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          500: '#a855f7',
          600: '#9333ea',
          650: '#7e22ce',
          800: '#6b21a8',
        },
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          650: '#047857',
          850: '#064e3b',
        },
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          800: '#92400e',
        },
        sky: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          850: '#075985',
        },
        violet: {
          600: '#7c3aed',
        },
        blue: {
          100: '#dbeafe',
          600: '#2563eb',
          650: '#1d4ed8',
        },
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          650: '#b91c1c',
        },
        yellow: {
          400: '#facc15',
        },
        green: {
          400: '#4ade80',
        },
      }
    },
  },
  plugins: [],
}

// touch for HMR
