import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS configuration extending the corporate design system tokens.
 */
const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '!./src/generated/**',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EEF2FF',
          100: '#DCE4FE',
          200: '#B9C9FD',
          300: '#8BA7FB',
          400: '#5C82F7',
          500: '#1E3A8A',
          600: '#1A3278',
          700: '#152A66',
          800: '#102154',
          900: '#0B1942',
        },
        neutral: {
          0: '#FFFFFF',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"SF Pro Display"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"SF Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        xl: '16px',
      },
    },
  },
  plugins: [],
};

export default config;
