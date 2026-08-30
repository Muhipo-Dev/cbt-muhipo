import { NextResponse } from 'next/server';
import { waitingRoomService } from '@/lib/waiting-room';

export async function GET() {
  const metrics = waitingRoomService.getMetrics();
  return NextResponse.json(metrics);
}
