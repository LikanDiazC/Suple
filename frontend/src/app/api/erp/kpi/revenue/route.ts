import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    value: 2_847_500,
    previousValue: 2_615_000,
    label: 'Revenue',
    unit: 'USD',
    sparkline: [2.1, 2.3, 2.15, 2.4, 2.55, 2.48, 2.6, 2.72, 2.65, 2.78, 2.85, 2.85],
    updatedAt: new Date().toISOString(),
  });
}
