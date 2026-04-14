import { NextResponse } from 'next/server';

/**
 * PUT /api/crm/preferences/columns
 *
 * Persists column preferences for the current user.
 * In production: stores in user_preferences table keyed by (user_id, object_type).
 */

// In-memory store for dev
const store = new Map<string, unknown>();

export async function PUT(request: Request) {
  const prefs = await request.json();
  const key = `${prefs.userId}:${prefs.objectType}`;
  store.set(key, prefs);

  return NextResponse.json({ success: true, key });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') ?? 'current_user';
  const objectType = url.searchParams.get('objectType') ?? 'contacts';
  const key = `${userId}:${objectType}`;

  const prefs = store.get(key);
  if (!prefs) return NextResponse.json(null);

  return NextResponse.json(prefs);
}
