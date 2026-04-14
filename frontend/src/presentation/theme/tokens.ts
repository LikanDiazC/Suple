/**
 * ==========================================================================
 * Design System Tokens
 * ==========================================================================
 *
 * Centralized design tokens for the corporate design system.
 * These tokens are consumed by Tailwind CSS configuration and
 * directly by components for dynamic styling.
 *
 * Design principles:
 *   - High contrast ratios (WCAG 2.1 AA minimum, AAA preferred)
 *   - Restrained color palette conveying corporate solidity
 *   - Consistent spacing scale (4px base unit)
 *   - Typography optimized for data-dense interfaces
 * ==========================================================================
 */

export const tokens = {
  colors: {
    // Primary: Deep corporate blue -- conveys trust and authority
    primary: {
      50: '#EEF2FF',
      100: '#DCE4FE',
      200: '#B9C9FD',
      300: '#8BA7FB',
      400: '#5C82F7',
      500: '#1E3A8A', // Base
      600: '#1A3278',
      700: '#152A66',
      800: '#102154',
      900: '#0B1942',
    },
    // Neutral: Warm grays for UI chrome
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
    // Semantic colors for KPI status
    success: { base: '#059669', light: '#D1FAE5', dark: '#065F46' },
    warning: { base: '#D97706', light: '#FEF3C7', dark: '#92400E' },
    danger:  { base: '#DC2626', light: '#FEE2E2', dark: '#991B1B' },
    info:    { base: '#2563EB', light: '#DBEAFE', dark: '#1E40AF' },
  },

  spacing: {
    unit: 4,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },

  typography: {
    fontFamily: {
      sans: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px -- captions, secondary labels
      sm: '0.875rem',   // 14px -- body secondary, table cells
      base: '1rem',     // 16px -- body text
      lg: '1.125rem',   // 18px -- section headers
      xl: '1.25rem',    // 20px -- card titles
      '2xl': '1.5rem',  // 24px -- page headers
      '3xl': '2rem',    // 32px -- KPI primary values
      '4xl': '2.5rem',  // 40px -- hero metrics
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
  },

  // Animation curves for Framer Motion
  motion: {
    duration: {
      instant: 0.1,
      fast: 0.2,
      normal: 0.35,
      slow: 0.5,
      reveal: 0.7,
    },
    easing: {
      // Custom cubic-bezier curves for corporate luxury feel
      easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
      easeIn: [0.55, 0, 1, 0.45] as [number, number, number, number],
      easeInOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
      spring: { type: 'spring' as const, stiffness: 300, damping: 30 },
      gentleSpring: { type: 'spring' as const, stiffness: 200, damping: 25 },
    },
    stagger: {
      fast: 0.05,
      normal: 0.08,
      slow: 0.12,
    },
  },
} as const;

export type ThemeTokens = typeof tokens;
