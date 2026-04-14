import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    value: 147,
    previousValue: 132,
    label: 'Active Processes',
    unit: '',
    sparkline: [98, 105, 110, 115, 118, 122, 128, 130, 135, 140, 143, 147],
    updatedAt: new Date().toISOString(),
  });
}
