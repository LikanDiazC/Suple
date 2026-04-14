import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    value: 18,
    previousValue: 22,
    label: 'Pipeline Velocity',
    unit: 'days',
    sparkline: [28, 26, 25, 24, 23, 22, 21, 20, 19.5, 19, 18.5, 18],
    updatedAt: new Date().toISOString(),
  });
}
