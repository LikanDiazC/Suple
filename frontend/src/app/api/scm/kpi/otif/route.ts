import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    value: 96.2,
    previousValue: 94.8,
    label: 'OTIF Rate',
    unit: '%',
    sparkline: [91, 92.5, 93, 93.8, 94, 94.5, 94.8, 95.2, 95.5, 95.8, 96, 96.2],
    updatedAt: new Date().toISOString(),
  });
}
