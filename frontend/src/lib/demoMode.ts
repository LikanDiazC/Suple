/**
 * Demo mode utilities.
 *
 * Single source of truth for detecting, enabling and clearing demo mode.
 * Demo mode uses a cookie (readable by server-side API routes and middleware)
 * plus localStorage (readable by client components).
 *
 * Rules:
 *  - Demo mode = ONLY static demonstration data, zero API calls.
 *  - Authenticated mode = ONLY real APIs, zero demo data.
 *
 * NOTE: middleware.ts inlines the DEMO_COOKIE constant instead of importing
 * this file, because the Edge runtime cannot load modules that reference
 * `document` or `localStorage` (even in function bodies).
 */

import type { NextRequest } from 'next/server';

export const DEMO_COOKIE = 'demo_mode';

// ── Server-side (API routes — runs in Node.js, NOT Edge) ────────────────────

/** Check if the incoming request is from a demo-mode session. */
export function isDemoRequest(req: NextRequest): boolean {
  return req.cookies.get(DEMO_COOKIE)?.value === 'true';
}

// ── Client-side (components, contexts) ──────────────────────────────────────

/** Activate demo mode: sets both cookie and localStorage. */
export function enableDemoMode(): void {
  document.cookie = `${DEMO_COOKIE}=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  localStorage.setItem('demo_mode', 'true');
  localStorage.setItem(
    'demo_user',
    JSON.stringify({ name: 'Demo User', email: 'demo@suple.cl' }),
  );
}

/** Fully clear demo mode: removes cookie + all localStorage keys. */
export function clearDemoMode(): void {
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('demo_user');
  }
}

/** Read demo flag from localStorage (client-only). */
export function isDemoClient(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem('demo_mode') === 'true';
}
