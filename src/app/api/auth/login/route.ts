import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'ID / Username / No Peserta dan Password wajib diisi' },
        { status: 400 }
      );
    }

    const trimmedInput = username.trim();

    // 1. CARI USER DI DATABASE CBT (Bisa via username, nomorPeserta, atau nip)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmedInput },
          { nomorPeserta: trimmedInput },
          { nip: trimmedInput },
        ],
      },
      include: {
        kelas: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Akun tidak ditemukan. Pastikan ID / Username terdaftar.',
        },
        { status: 401 }
      );
    }

    // 2. Verifikasi Password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message: 'Kata Sandi salah. Silakan coba kembali atau hubungi proktor/administrator.',
        },
        { status: 401 }
      );
    }

    // 3. Catat log aktivitas login
    await prisma.logAktivitasUjian.create({
      data: {
        userId: user.id,
        aktivitas: 'LOGIN',
        detail: `Pengguna ${user.name} (${user.role}) berhasil login ke CBT MUHIPO.`,
      },
    });

    // 4. Generate JWT Token
    const token = await signToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role as any,
      nomorPeserta: user.nomorPeserta,
      kelasNama: user.kelas?.nama || null,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        nomorPeserta: user.nomorPeserta,
        kelas: user.kelas?.nama || null,
        ruangUjian: user.ruangUjian,
        sesiUjian: user.sesiUjian,
      },
    });

    // Deteksi protokol apakah HTTPS
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const isHttps = forwardedProto ? forwardedProto === 'https' : request.url.startsWith('https://');

    // Set cookie HTTP-only
    response.cookies.set({
      name: 'cbt_token',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 12, // 12 Jam
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan pada server: ' + (error?.message || '') },
      { status: 500 }
    );
  }
}

