import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, mapSimasmuhRoleToCbt, signToken } from '@/lib/auth';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const SIMASMUH_PG_URL =
  process.env.SIMASMUH_DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'ID / Username / NIS / NISN dan Password wajib diisi' },
        { status: 400 }
      );
    }

    const trimmedInput = username.trim();

    // 1. CARI USER DI DATABASE LOKAL CBT (Bisa via username, nisn, nomorPeserta, atau nip)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmedInput },
          { nisn: trimmedInput },
          { nomorPeserta: trimmedInput },
          { nip: trimmedInput },
        ],
      },
      include: {
        kelas: true,
      },
    });

    let isPasswordValid = false;

    if (user) {
      // Coba verifikasi password lokal CBT
      isPasswordValid = await comparePassword(password, user.password);
    }

    // 2. JIKA USER TIDAK ADA ATAU PASSWORD TIDAK COCOK, COBA OTENTIKASI REAL-TIME KE DATABASE SIMASMUH (:54322)
    if (!user || !isPasswordValid) {
      const client = new Client({ connectionString: SIMASMUH_PG_URL });
      try {
        await client.connect();

        // Cari di tabel User & Student / TeacherProfile SIMASMUH
        const querySimasmuh = `
          SELECT 
            u.id as user_id, 
            u.username, 
            u.password as password_hash, 
            u.name, 
            u.role,
            s.id as student_id,
            s.nisn,
            s.nis,
            s.gender,
            c.name as class_name,
            c."gradeLevel" as grade_level,
            tp.nip
          FROM "User" u
          LEFT JOIN "Student" s ON s."userId" = u.id OR s.nis = u.username OR s.nisn = u.username
          LEFT JOIN "Class" c ON s."classId" = c.id
          LEFT JOIN "TeacherProfile" tp ON tp."userId" = u.id
          WHERE u.username = $1 
             OR s.nis = $1 
             OR s.nisn = $1 
             OR tp.nip = $1
          LIMIT 1;
        `;

        const simasmuhRes = await client.query(querySimasmuh, [trimmedInput]);

        if (simasmuhRes.rows.length > 0) {
          const simUser = simasmuhRes.rows[0];

          // Verifikasi password terhadap hash SIMASMUH
          const simasmuhPasswordValid = await bcrypt.compare(password, simUser.password_hash);

          if (simasmuhPasswordValid) {
            isPasswordValid = true;

            // Sinkronkan / Buat Rombel Kelas di CBT jika ada
            let cbtKelasId: string | null = null;
            if (simUser.class_name) {
              const k = await prisma.kelas.upsert({
                where: { nama: simUser.class_name },
                update: {},
                create: {
                  nama: simUser.class_name,
                  tingkat: simUser.grade_level || 10,
                  jurusan: simUser.class_name.toUpperCase().includes('IPS') ? 'IPS' : 'MIPA',
                },
              });
              cbtKelasId = k.id;
            }

            const cbtRole = mapSimasmuhRoleToCbt(simUser.role);

            const cleanNisn = simUser.nisn || simUser.nis || null;
            const nomorPeserta = `MHP-${simUser.nis || simUser.nisn || simUser.username}`;

            // Upsert / Update akun pengguna di CBT dengan hash password terbaru dari SIMASMUH
            user = await prisma.user.upsert({
              where: { username: simUser.username },
              update: {
                password: simUser.password_hash,
                name: simUser.name,
                role: cbtRole,
                nisn: cleanNisn || undefined,
                nip: simUser.nip || undefined,
                nomorPeserta: cbtRole === 'SISWA' ? nomorPeserta : undefined,
                kelasId: cbtKelasId || undefined,
                jenisKelamin: simUser.gender === 'P' ? 'P' : 'L',
              },
              create: {
                username: simUser.username,
                password: simUser.password_hash,
                name: simUser.name,
                role: cbtRole,
                nisn: cleanNisn,
                nip: simUser.nip || undefined,
                nomorPeserta: cbtRole === 'SISWA' ? nomorPeserta : undefined,
                kelasId: cbtKelasId,
                jenisKelamin: simUser.gender === 'P' ? 'P' : 'L',
                ruangUjian: 'Lab Komputer 1',
                sesiUjian: 1,
              },
              include: {
                kelas: true,
              },
            });
          }
        }
      } catch (err: any) {
        console.warn('Gagal koneksi fallback ke SIMASMUH:', err.message);
      } finally {
        await client.end().catch(() => {});
      }
    }

    if (!user || !isPasswordValid) {
      return NextResponse.json(
        {
          success: false,
          message:
            'ID / NIS / NISN atau Kata Sandi salah. Pastikan akun terdaftar di SIMASMUH atau CBT.',
        },
        { status: 401 }
      );
    }

    // 3. Catat log aktivitas login
    await prisma.logAktivitasUjian.create({
      data: {
        userId: user.id,
        aktivitas: 'LOGIN',
        detail: `Pengguna ${user.name} (${user.role}) berhasil masuk ke portal CBT (Tersinkron SIMASMUH).`,
      },
    });

    // 4. Generate JWT Token
    const token = await signToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      nomorPeserta: user.nomorPeserta,
      nisn: user.nisn,
      kelasNama: user.kelas?.nama || null,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil (Tersinkron SIMASMUH)',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        nomorPeserta: user.nomorPeserta,
        nisn: user.nisn,
        kelas: user.kelas?.nama || null,
        ruangUjian: user.ruangUjian,
        sesiUjian: user.sesiUjian,
      },
    });

    // Set cookie HTTP-only
    response.cookies.set({
      name: 'cbt_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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
