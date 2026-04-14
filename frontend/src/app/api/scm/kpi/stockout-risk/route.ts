import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    value: 3,
    previousValue: 5,
    label: 'Stockout Alerts',
    unit: 'items',
    sparkline: [8, 7, 6, 7, 5, 6, 5, 4, 5, 4, 3, 3],
    updatedAt: new Date().toISOString(),
  });
}
