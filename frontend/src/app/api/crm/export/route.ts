import { NextResponse } from 'next/server';

/**
 * POST /api/crm/export
 *
 * Simulates an async export job.
 * In production: creates a background task that generates the file,
 * stores it in object storage, and returns a signed download URL.
 */
export async function POST(request: Request) {
  const job = await request.json();

  // Simulate processing delay (500ms-2s)
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

  // Generate mock download URL
  const filename = `export_${job.objectType}_${Date.now()}.${job.format}`;

  return NextResponse.json({
    jobId: job.id,
    status: 'completed',
    downloadUrl: `/api/crm/export/download/${filename}`,
    totalRecords: job.totalRecords,
    completedAt: new Date().toISOString(),
  });
}
