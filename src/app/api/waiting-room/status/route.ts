import { NextRequest, NextResponse } from 'next/server';
import { waitingRoomService } from '@/lib/waiting-room';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const result = waitingRoomService.getOrCreateQueue(token, ip);
  return NextResponse.json(result);
}
