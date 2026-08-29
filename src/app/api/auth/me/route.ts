import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}

export async function POST() {
  // Logout
  const response = NextResponse.json({ success: true, message: 'Logout berhasil' });
  response.cookies.set({
    name: 'cbt_token',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return response;
}
