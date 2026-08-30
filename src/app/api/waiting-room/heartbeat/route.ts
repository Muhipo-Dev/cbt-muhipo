import { NextRequest, NextResponse } from 'next/server';
import { waitingRoomService } from '@/lib/waiting-room';

export async function POST(req: NextRequest) {
  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const result = waitingRoomService.getOrCreateQueue(body.token, ip);
  return NextResponse.json(result);
}
