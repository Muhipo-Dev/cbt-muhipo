import { NextRequest, NextResponse } from 'next/server';
import { waitingRoomService } from '@/lib/waiting-room';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin only' }, { status: 403 });
    }

    const body = await req.json();
    const metrics = waitingRoomService.setCapacity(
      typeof body.maxCapacity === 'number' ? body.maxCapacity : undefined,
      typeof body.maxRps === 'number' ? body.maxRps : undefined,
      typeof body.forceEnabled === 'boolean' ? body.forceEnabled : undefined,
    );

    return NextResponse.json({ success: true, metrics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update config' }, { status: 500 });
  }
}
