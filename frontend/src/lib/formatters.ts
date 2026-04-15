/**
 * Shared formatting utilities — single source of truth.
 * Replaces 4+ duplicate formatDate() implementations across BPMS pages.
 */

/** Full date + time for card details (e.g. "15 abr. 2026, 14:30") */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Short date without time (e.g. "15 abr. 2026") */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** How many hours ago from now (rounded) */
export function hoursAgo(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
}

/** Truncate long IDs with ellipsis */
export function truncateId(id: string, maxLen = 12): string {
  return id.length > maxLen ? `${id.slice(0, maxLen)}\u2026` : id;
}
