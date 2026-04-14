import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    value: 24.3,
    previousValue: 21.8,
    label: 'Lead Conversion',
    unit: '%',
    sparkline: [18, 19.5, 20, 21, 20.5, 22, 21.8, 23, 22.5, 23.8, 24, 24.3],
    updatedAt: new Date().toISOString(),
  });
}
