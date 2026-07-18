export default {
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
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          450: '#64748b',
          500: '#64748b',
          600: '#475569',
          650: '#334155',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
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
