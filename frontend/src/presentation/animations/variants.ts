import type { Variants, Transition } from 'framer-motion';
import { tokens } from '../theme/tokens';

/**
 * ==========================================================================
 * Animation Variants Library
 * ==========================================================================
 *
 * Centralized Framer Motion variants for consistent, professional
 * animations across the enterprise UI.
 *
 * Design constraints:
 *   - Subtle and purposeful (no gratuitous motion)
 *   - Reduced motion support via prefers-reduced-motion
 *   - Custom easing curves for corporate luxury feel
 *   - Cascade/stagger patterns for dashboard element reveal
 * ==========================================================================
 */

const { motion } = tokens;

// Shared transition presets
const smoothTransition: Transition = {
  duration: motion.duration.normal,
  ease: motion.easing.easeOut,
};

const springTransition: Transition = motion.easing.spring;

// ---------------------------------------------------------------------------
// Page Transitions
// ---------------------------------------------------------------------------

export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motion.duration.slow,
      ease: motion.easing.easeOut,
      staggerChildren: motion.stagger.normal,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: motion.duration.fast,
      ease: motion.easing.easeIn,
    },
  },
};

// ---------------------------------------------------------------------------
// Dashboard Card Variants (Cascade Reveal)
// ---------------------------------------------------------------------------

export const dashboardCardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...smoothTransition,
      duration: motion.duration.reveal,
    },
  },
  hover: {
    y: -2,
    boxShadow: tokens.shadows.lg,
    transition: {
      duration: motion.duration.fast,
      ease: motion.easing.easeOut,
    },
  },
  tap: {
    scale: 0.995,
    transition: { duration: motion.duration.instant },
  },
};

// ---------------------------------------------------------------------------
// KPI Value Animation (Count-Up Effect)
// ---------------------------------------------------------------------------

export const kpiValueVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
};

// ---------------------------------------------------------------------------
// Stagger Container (for grid layouts)
// ---------------------------------------------------------------------------

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: motion.stagger.normal,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: smoothTransition,
  },
};

// ---------------------------------------------------------------------------
// Sidebar / Navigation
// ---------------------------------------------------------------------------

export const sidebarVariants: Variants = {
  collapsed: {
    width: 72,
    transition: {
      duration: motion.duration.normal,
      ease: motion.easing.easeInOut,
    },
  },
  expanded: {
    width: 280,
    transition: {
      duration: motion.duration.normal,
      ease: motion.easing.easeInOut,
    },
  },
};

// ---------------------------------------------------------------------------
// Tooltip / Popover
// ---------------------------------------------------------------------------

export const tooltipVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.96,
    y: 4,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: motion.duration.fast,
      ease: motion.easing.easeOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: motion.duration.instant,
    },
  },
};

// ---------------------------------------------------------------------------
// Micro-interaction: Status Indicator Pulse
// ---------------------------------------------------------------------------

export const statusPulseVariants: Variants = {
  idle: {
    scale: 1,
    opacity: 1,
  },
  pulse: {
    scale: [1, 1.15, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
