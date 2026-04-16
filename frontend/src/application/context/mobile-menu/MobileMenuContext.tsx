'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MobileMenuContextValue {
  /** True when the mobile sidebar overlay is visible. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const MobileMenuContext = createContext<MobileMenuContextValue | null>(null);

export function MobileMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo<MobileMenuContextValue>(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );

  return (
    <MobileMenuContext.Provider value={value}>
      {children}
    </MobileMenuContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMobileMenu(): MobileMenuContextValue {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) {
    // Safe fallback: allows components outside the provider (e.g. login) to
    // render without throwing. The dashboard layout always wraps in the
    // provider, so real usage inside the app gets the live value.
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}
