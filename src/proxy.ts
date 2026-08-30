import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { waitingRoomService } from '@/lib/waiting-room';

export function proxy(request: NextRequest) {
  waitingRoomService.recordRequest();

  const pathname = request.nextUrl.pathname;

  // Bypass routes: static files, Next.js internals, waiting-room APIs, public assets, logo/favicons
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/waiting-room') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/pic_logo.png') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Jika kondisi traffic kritis (CPU > 90% & RAM > 90%, RPS > 250, concurrent > 1000, atau forceEnabled)
  if (waitingRoomService.isTrafficCritical()) {
    const clientToken =
      request.headers.get('x-waiting-room-token') ||
      request.nextUrl.searchParams.get('wr_token') ||
      request.cookies.get('cbt_wr_token')?.value;

    if (!waitingRoomService.isAdmitted(clientToken)) {
      // Jika request API, kembalikan response 429
      if (pathname.startsWith('/api')) {
        return NextResponse.json(
          {
            statusCode: 429,
            error: 'Waiting Room Required',
            message:
              'Lalu lintas server sedang sangat padat. Anda dialihkan ke ruang tunggu antrean.',
            redirectWaitingRoom: true,
          },
          { status: 429 }
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
