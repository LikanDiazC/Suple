import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    value: 8.45,
    previousValue: 7.90,
    label: 'Inventory Turnover',
    unit: 'x',
    sparkline: [6.8, 7.0, 7.2, 7.1, 7.4, 7.6, 7.8, 7.9, 8.0, 8.2, 8.3, 8.45],
    updatedAt: new Date().toISOString(),
  });
}
