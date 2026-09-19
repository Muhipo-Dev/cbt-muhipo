import { NextResponse } from 'next/server';

// Endpoint deprecated / nonaktif untuk optimasi hardware
export async function POST() {
  return NextResponse.json({ success: true, message: 'Screen streaming disabled for performance optimization' });
}

export async function GET() {
  return NextResponse.json({ success: true, data: null, message: 'Screen streaming disabled' });
}

