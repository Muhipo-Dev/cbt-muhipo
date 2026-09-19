import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

function generateRandomToken(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'dashboard';

    if (tab === 'dashboard') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const [
        countSiswa,
        countGuru,
        countKelas,
        countTopik,
        countSoalTotal,
        countUjianTotal,
        countUjianHariIni,
        countPesertaMengerjakan,
        countPesertaSelesai,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'SISWA' } }),
        prisma.user.count({
          where: {
            OR: [
              { role: 'GURU' },
              { mataPelajaran: { some: {} } },
            ],
          },
        }),
        prisma.kelas.count(),
        prisma.mataPelajaran.count({ where: { status: { not: 'TERHAPUS' } } }),
        prisma.soal.count({ where: { mataPelajaran: { status: { not: 'TERHAPUS' } } } }),
        prisma.ujian.count(),
        prisma.ujian.count({
          where: {
            waktuMulai: { lte: endOfToday },
            waktuSelesai: { gte: startOfToday },
          },
        }),
        prisma.pesertaUjian.count({
          where: {
            status: 'SEDANG_MENGERJAKAN',
            ujian: {
              waktuMulai: { lte: endOfToday },
              waktuSelesai: { gte: startOfToday },
            },
          },
        }),
        prisma.pesertaUjian.count({
          where: {
            status: 'SELESAI',
            OR: [
              { waktuSelesai: { gte: startOfToday, lte: endOfToday } },
              {
                ujian: {
                  waktuMulai: { lte: endOfToday },
                  waktuSelesai: { gte: startOfToday },
                },
              },
            ],
          },
        }),
      ]);

      const rawRecentUjian = await prisma.ujian.findMany({
        take: 10,
        orderBy: [{ waktuMulai: 'desc' }, { createdAt: 'desc' }],
        include: {
          mataPelajaran: {
            include: {
              _count: { select: { soalList: true } },
            },
          },
          _count: { select: { pesertaUjian: true } },
        },
      });

      const recentUjian = rawRecentUjian.map((u) => {
        const wMulai = u.waktuMulai ? new Date(u.waktuMulai) : null;
        const wSelesai = u.waktuSelesai ? new Date(u.waktuSelesai) : null;
        const isArchived = u.status === 'NONAKTIF';
        const isMulaiHariIni = wMulai ? wMulai >= startOfToday && wMulai <= endOfToday : false;
        const isToday = isMulaiHariIni && !isArchived;
        const isPast = (wMulai ? wMulai < startOfToday : false) || (wSelesai ? wSelesai < startOfToday : false) || isArchived;
        return {
          ...u,
          isToday,
          isPast,
          isArchived,
        };
      });

      const recentLogs = await prisma.logAktivitasUjian.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });

      // Ensure default modul exists
      const defaultModulCount = await prisma.modul.count();
      if (defaultModulCount === 0) {
        await prisma.modul.createMany({
          data: [
            { nama: 'Default', deskripsi: 'Modul Utama / Standar CBT' },
            { nama: 'Ujian Sekolah', deskripsi: 'Asesmen & Ujian Sekolah' },
            { nama: 'Asesmen Sekolah', deskripsi: 'Evaluasi & Asesmen Sekolah' },
          ],
        });
      }

      // Query Master Data CBT secara paralel
      const [
        modulList,
        mapelList,
        kelasList,
        siswaList,
        ujianList,
      ] = await Promise.all([
        prisma.modul.findMany({
          include: {
            _count: { select: { topikList: true } },
          },
          orderBy: { nama: 'asc' },
        }),
        prisma.mataPelajaran.findMany({
          include: {
            modul: true,
            gurus: { include: { guru: { select: { id: true, name: true, role: true } } } },
            pembuat: { select: { id: true, name: true, role: true } },
            _count: { select: { soalList: true, gurus: true } },
          },
          orderBy: { nama: 'asc' },
        }),
        prisma.kelas.findMany({
          include: {
            _count: { select: { users: true, ujianList: true } },
          },
          orderBy: { nama: 'asc' },
        }),
        prisma.user.findMany({
          where: { role: 'SISWA' },
          include: { kelas: true },
          orderBy: [{ kelas: { nama: 'asc' } }, { name: 'asc' }],
        }),
        prisma.ujian.findMany({
          include: {
            mataPelajaran: {
              include: {
                _count: { select: { soalList: true } },
              },
            },
            ujianKelas: { include: { kelas: true } },
            _count: { select: { pesertaUjian: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const sanitizedSiswaList = siswaList.map((s: any) => ({
        ...s,
        plainPassword: s.plainPassword || (!s.password?.startsWith('$2') ? s.password : '123456'),
        password: s.plainPassword || (!s.password?.startsWith('$2') ? s.password : '123456'),
      }));

      return NextResponse.json({
        success: true,
        data: {
          dashboard: {
            counts: {
              countSiswa,
              countGuru,
              countKelas,
              countTopik,
              countSoalTotal,
              countBankSoal: countTopik, // Alias kompatibilitas
              countUjian: countUjianHariIni > 0 ? countUjianHariIni : countUjianTotal,
              countUjianTotal,
              countUjianHariIni,
              countPesertaMengerjakan,
              countPesertaSelesai,
            },
            stats: {
              totalSiswa: countSiswa,
              totalKelas: countKelas,
              totalMapel: countTopik,
              totalBankSoal: countTopik,
              totalSoal: countSoalTotal,
              totalUjianAktif: countUjianHariIni > 0 ? countUjianHariIni : countUjianTotal,
            },
            recentUjian,
            recentLogs,
            serverDate: now.toISOString(),
          },
          modulList,
          modul: modulList,
          bankSoal: mapelList, // Alias agar komponen lama yang membaca bankSoal tetap jalan
          mapel: mapelList,
          kelas: kelasList,
          siswa: { siswaList: sanitizedSiswaList, kelasList },
          jadwal: { ujianList, mapelList, bankSoalList: mapelList, kelasList },
        },
      });
    }

    if (tab === 'siswa' || tab === 'peserta') {
      const siswaList = await prisma.user.findMany({
        where: { role: 'SISWA' },
        include: { kelas: true },
        orderBy: [{ kelas: { nama: 'asc' } }, { name: 'asc' }],
      });
      const sanitizedSiswaList = siswaList.map((s: any) => ({
        ...s,
        plainPassword: s.plainPassword || (!s.password?.startsWith('$2') ? s.password : '123456'),
        password: s.plainPassword || (!s.password?.startsWith('$2') ? s.password : '123456'),
      }));
      const kelasList = await prisma.kelas.findMany({
        orderBy: { nama: 'asc' },
        include: { _count: { select: { users: true } } },
      });
      return NextResponse.json({ success: true, data: { siswaList: sanitizedSiswaList, kelasList } });
    }

    if (tab === 'guru') {
      const guruList = await prisma.user.findMany({
        where: {
          OR: [
            { role: 'GURU' },
            { mataPelajaran: { some: {} } },
          ],
        },
        include: {
          mataPelajaran: { include: { mataPelajaran: true } },
          guruKelas: { include: { kelas: true } },
        },
        orderBy: { name: 'asc' },
      });
      const mapelList = await prisma.mataPelajaran.findMany({ orderBy: { nama: 'asc' } });
      const kelasList = await prisma.kelas.findMany({ orderBy: { nama: 'asc' } });
      return NextResponse.json({ success: true, data: { guruList, mapelList, kelasList } });
    }

    if (tab === 'kelas' || tab === 'group') {
      const kelasList = await prisma.kelas.findMany({
        include: {
          _count: { select: { users: true, ujianList: true } },
        },
        orderBy: { nama: 'asc' },
      });
      return NextResponse.json({ success: true, data: kelasList });
    }

    if (tab === 'modul') {
      const modulList = await prisma.modul.findMany({
        include: {
          _count: { select: { topikList: true } },
        },
        orderBy: { nama: 'asc' },
      });
      return NextResponse.json({ success: true, data: modulList });
    }

    if (tab === 'mapel' || tab === 'topik') {
      const mapelList = await prisma.mataPelajaran.findMany({
        include: {
          modul: true,
          gurus: { include: { guru: { select: { id: true, name: true, role: true } } } },
          pembuat: { select: { id: true, name: true, role: true } },
          _count: { select: { soalList: true, gurus: true } },
        },
        orderBy: { nama: 'asc' },
      });
      return NextResponse.json({ success: true, data: mapelList });
    }

    if (tab === 'jadwal' || tab === 'tes') {
      const jadwalList = await prisma.ujian.findMany({
        include: {
          mataPelajaran: {
            include: {
              _count: { select: { soalList: true } },
            },
          },
          ujianKelas: { include: { kelas: true } },
          _count: { select: { pesertaUjian: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      const mapelList = await prisma.mataPelajaran.findMany({
        include: {
          _count: { select: { soalList: true } },
        },
        orderBy: { nama: 'asc' },
      });
      const kelasList = await prisma.kelas.findMany({ orderBy: { nama: 'asc' } });
      return NextResponse.json({ success: true, data: { jadwalList, mapelList, bankSoalList: mapelList, kelasList } });
    }

    if (tab === 'users') {
      const usersList = await prisma.user.findMany({
        where: {
          role: { in: ['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'] },
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          nip: true,
          ruangUjian: true,
          sesiUjian: true,
          jenisKelamin: true,
          kelasId: true,
          kelas: { select: { id: true, nama: true } },
          createdAt: true,
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      });
      return NextResponse.json({ success: true, data: usersList });
    }

    return NextResponse.json({ success: false, message: 'Tab invalid' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // --- 1. CRUD PESERTA & IMPORT EXCEL ---
    if (action === 'CREATE_SISWA') {
      const {
        username,
        password,
        name,
        nomorPeserta,
        kelasId,
        ruangUjian,
        sesiUjian,
        jenisKelamin,
      } = body;
      const cleanUsername = (username || nomorPeserta || '').trim();
      const rawPassword = (password || cleanUsername || '123456').trim();
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const newSiswa = await prisma.user.create({
        data: {
          username: cleanUsername,
          password: hashedPassword,
          plainPassword: rawPassword,
          name: name?.trim() || 'Peserta Ujian',
          role: 'SISWA',
          nomorPeserta: nomorPeserta?.trim() || cleanUsername,
          kelasId: kelasId || null,
          ruangUjian: ruangUjian?.trim() || null,
          sesiUjian: Number(sesiUjian) || 1,
          jenisKelamin: jenisKelamin === 'P' ? 'P' : 'L',
        },
      });
      return NextResponse.json({ success: true, message: 'Peserta berhasil ditambahkan', data: newSiswa });
    }

    if (action === 'UPDATE_SISWA') {
      const {
        id,
        username,
        password,
        name,
        nomorPeserta,
        kelasId,
        ruangUjian,
        sesiUjian,
        jenisKelamin,
      } = body;

      const updateData: any = {
        name: name?.trim(),
        username: username?.trim(),
        nomorPeserta: nomorPeserta?.trim() || null,
        kelasId: kelasId || null,
        ruangUjian: ruangUjian !== undefined ? (ruangUjian?.trim() || null) : undefined,
        sesiUjian: sesiUjian !== undefined ? (Number(sesiUjian) || 1) : undefined,
        jenisKelamin: jenisKelamin === 'P' ? 'P' : 'L',
      };

      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password.trim(), 10);
        updateData.plainPassword = password.trim();
      }

      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ success: true, message: 'Data peserta berhasil diperbarui', data: updated });
    }

    if (action === 'DELETE_SISWA') {
      const { id } = body;
      await prisma.user.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Peserta berhasil dihapus' });
    }

    // --- 1.1 CRUD PENGGUNA STAFF & HAK AKSES (SUPERADMIN, ADMIN, GURU, PROKTOR) ---
    if (action === 'CREATE_USER') {
      const {
        username,
        password,
        name,
        role,
        nip,
        ruangUjian,
        sesiUjian,
        jenisKelamin,
      } = body;

      const cleanUsername = (username || '').trim();
      if (!cleanUsername) {
        return NextResponse.json({ success: false, message: 'Username wajib diisi.' }, { status: 400 });
      }

      const existing = await prisma.user.findFirst({
        where: { username: cleanUsername },
      });
      if (existing) {
        return NextResponse.json({ success: false, message: `Username "${cleanUsername}" sudah digunakan.` }, { status: 400 });
      }

      const allowedRoles = ['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR', 'SISWA'];
      const targetRole = allowedRoles.includes(role) ? role : 'ADMIN';
      const rawPassword = (password || '123456').trim();
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const newUser = await prisma.user.create({
        data: {
          username: cleanUsername,
          password: hashedPassword,
          name: name?.trim() || 'Pengguna Baru',
          role: targetRole,
          nip: nip?.trim() || null,
          ruangUjian: ruangUjian?.trim() || null,
          sesiUjian: Number(sesiUjian) || 1,
          jenisKelamin: jenisKelamin === 'P' ? 'P' : 'L',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Pengguna ${newUser.name} (${newUser.role}) berhasil ditambahkan.`,
        data: newUser,
      });
    }

    if (action === 'UPDATE_USER') {
      const {
        userId,
        id,
        username,
        password,
        name,
        role,
        nip,
        ruangUjian,
        sesiUjian,
        jenisKelamin,
      } = body;

      const targetId = userId || id;
      if (!targetId) {
        return NextResponse.json({ success: false, message: 'ID pengguna tidak valid.' }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({
        where: { id: targetId },
      });
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan.' }, { status: 404 });
      }

      const cleanUsername = (username || existing.username).trim();
      if (cleanUsername !== existing.username) {
        const duplicate = await prisma.user.findFirst({
          where: { username: cleanUsername, NOT: { id: targetId } },
        });
        if (duplicate) {
          return NextResponse.json({ success: false, message: `Username "${cleanUsername}" sudah digunakan.` }, { status: 400 });
        }
      }

      const updateData: any = {
        name: name?.trim() || existing.name,
        username: cleanUsername,
        nip: nip !== undefined ? (nip?.trim() || null) : existing.nip,
        ruangUjian: ruangUjian !== undefined ? (ruangUjian?.trim() || null) : existing.ruangUjian,
        sesiUjian: sesiUjian !== undefined ? Number(sesiUjian) || 1 : existing.sesiUjian,
        jenisKelamin: jenisKelamin ? (jenisKelamin === 'P' ? 'P' : 'L') : existing.jenisKelamin,
      };

      if (role && ['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR', 'SISWA'].includes(role)) {
        updateData.role = role;
      }

      if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password.trim(), 10);
      }

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        message: `Data hak akses pengguna ${updated.name} berhasil diperbarui.`,
        data: updated,
      });
    }

    if (action === 'DELETE_USER') {
      const { userId, id } = body;
      const targetId = userId || id;
      if (!targetId) {
        return NextResponse.json({ success: false, message: 'ID pengguna tidak valid.' }, { status: 400 });
      }

      if (targetId === user.userId) {
        return NextResponse.json({ success: false, message: 'Tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.' }, { status: 400 });
      }

      await prisma.guruMataPelajaran.deleteMany({ where: { guruId: targetId } });
      await prisma.guruKelas.deleteMany({ where: { guruId: targetId } });
      await prisma.logAktivitasUjian.deleteMany({ where: { userId: targetId } });
      await prisma.user.delete({ where: { id: targetId } });

      return NextResponse.json({ success: true, message: 'Pengguna berhasil dihapus dari sistem.' });
    }

    if (action === 'RESET_PASSWORD') {
      const { userId, id, newPassword } = body;
      const targetId = userId || id;
      const pass = (newPassword || '123456').trim();
      if (!targetId) {
        return NextResponse.json({ success: false, message: 'ID pengguna tidak valid.' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(pass, 10);
      await prisma.user.update({
        where: { id: targetId },
        data: { password: hashedPassword, plainPassword: pass },
      });

      return NextResponse.json({ success: true, message: `Kata sandi berhasil direset menjadi "${pass}".` });
    }

    if (action === 'IMPORT_PESERTA_EXCEL') {
      const { rows } = body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ success: false, message: 'Data baris Excel kosong.' }, { status: 400 });
      }

      let insertedCount = 0;
      let updatedCount = 0;

      const kelasCache = new Map<string, string>();
      const existingKelas = await prisma.kelas.findMany();
      existingKelas.forEach((k) => kelasCache.set(k.nama.toUpperCase().trim(), k.id));

      for (const row of rows) {
        const username = String(row.username || row.Username || row.id || row.ID || '').trim();
        const rawPassword = String(row.password || row.Password || '123456').trim();
        const name = String(row.name || row.Nama || row['Nama Lengkap'] || row['Nama Peserta'] || row['Nama Siswa'] || 'Peserta').trim();
        const nomorPeserta = String(row.nomorPeserta || row['No Peserta'] || row['Nomor Peserta'] || username).trim();
        
        // Format Kolom: Kelas (Tingkat: X, XI, XII atau 10, 11, 12) & Group (Nama Rombel / Group)
        const kelasTingkatStr = String(row.kelas || row.Kelas || 'X').trim();
        const groupStr = String(row.group || row.Group || row.grup || row.Grup || kelasTingkatStr || 'Umum').trim();
        
        let tingkatNum = 10;
        const upperKelas = kelasTingkatStr.toUpperCase();
        if (upperKelas === 'X' || upperKelas === '10' || upperKelas.startsWith('10')) {
          tingkatNum = 10;
        } else if (upperKelas === 'XI' || upperKelas === '11' || upperKelas.startsWith('11')) {
          tingkatNum = 11;
        } else if (upperKelas === 'XII' || upperKelas === '12' || upperKelas.startsWith('12')) {
          tingkatNum = 12;
        } else {
          const m = groupStr.match(/\d+/);
          if (m && [10, 11, 12].includes(parseInt(m[0]))) {
            tingkatNum = parseInt(m[0]);
          }
        }

        const kelasNama = groupStr || `Kelas ${kelasTingkatStr}`;
        const ruangUjian = row.ruang || row['Ruang Ujian'] || row.Ruang ? String(row.ruang || row['Ruang Ujian'] || row.Ruang).trim() : null;
        const sesiUjian = Number(row.sesi || row['Sesi Ujian'] || row.Sesi || 1) || 1;
        const jenisKelamin = String(row.gender || row['Jenis Kelamin'] || row.jk || 'L').toUpperCase().startsWith('P') ? 'P' : 'L';

        if (!username) continue;

        let kelasId = kelasCache.get(kelasNama.toUpperCase());
        if (!kelasId) {
          const newKelas = await prisma.kelas.upsert({
            where: { nama: kelasNama },
            update: { tingkat: tingkatNum },
            create: {
              nama: kelasNama,
              tingkat: tingkatNum,
              jurusan: kelasNama.toUpperCase().includes('IPS') ? 'IPS' : kelasNama.toUpperCase().includes('MIPA') ? 'MIPA' : 'Umum',
            },
          });
          kelasId = newKelas.id;
          kelasCache.set(kelasNama.toUpperCase(), kelasId);
        }

        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const existingUser = await prisma.user.findFirst({
          where: {
            username,
          },
        });

        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name,
              password: hashedPassword,
              plainPassword: rawPassword,
              nomorPeserta: nomorPeserta || existingUser.nomorPeserta,
              group: groupStr,
              kelasId,
              ruangUjian,
              sesiUjian,
              jenisKelamin,
            },
          });
          updatedCount++;
        } else {
          await prisma.user.create({
            data: {
              username,
              password: hashedPassword,
              plainPassword: rawPassword,
              name,
              role: 'SISWA',
              nomorPeserta: nomorPeserta || null,
              group: groupStr,
              kelasId,
              ruangUjian,
              sesiUjian,
              jenisKelamin,
            },
          });
          insertedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Import berhasil! ${insertedCount} peserta baru didaftarkan, ${updatedCount} peserta diperbarui.`,
      });
    }

    // --- 2. CRUD GROUP / KELAS ---
    if (action === 'CREATE_KELAS') {
      const { nama, tingkat, jurusan } = body;
      const newKelas = await prisma.kelas.create({
        data: {
          nama: nama.trim(),
          tingkat: Number(tingkat) || 10,
          jurusan: jurusan?.trim() || 'Umum',
        },
      });
      return NextResponse.json({ success: true, message: 'Group/Kelas berhasil dibuat', data: newKelas });
    }

    if (action === 'UPDATE_KELAS') {
      const { id, nama, tingkat, jurusan } = body;
      const updated = await prisma.kelas.update({
        where: { id },
        data: {
          nama: nama.trim(),
          tingkat: Number(tingkat) || 10,
          jurusan: jurusan?.trim() || 'Umum',
        },
      });
      return NextResponse.json({ success: true, message: 'Group/Kelas berhasil diperbarui', data: updated });
    }

    if (action === 'DELETE_KELAS') {
      const { id } = body;
      await prisma.user.updateMany({ where: { kelasId: id }, data: { kelasId: null } });
      await prisma.ujianKelas.deleteMany({ where: { kelasId: id } });
      await prisma.kelas.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Group/Kelas berhasil dihapus' });
    }

    // --- 2.1 CRUD MODUL ---
    if (action === 'CREATE_MODUL') {
      const { nama, deskripsi } = body;
      const cleanNama = (nama || '').trim();
      if (!cleanNama) {
        return NextResponse.json({ success: false, message: 'Nama modul wajib diisi' }, { status: 400 });
      }

      const existing = await prisma.modul.findFirst({
        where: { nama: cleanNama },
      });
      if (existing) {
        return NextResponse.json({ success: false, message: `Modul "${cleanNama}" sudah ada` }, { status: 400 });
      }

      const newModul = await prisma.modul.create({
        data: {
          nama: cleanNama,
          deskripsi: deskripsi?.trim() || null,
        },
      });

      return NextResponse.json({ success: true, message: 'Modul baru berhasil ditambahkan', data: newModul });
    }

    if (action === 'UPDATE_MODUL') {
      const { id, nama, deskripsi } = body;
      if (!id) {
        return NextResponse.json({ success: false, message: 'ID modul tidak valid' }, { status: 400 });
      }

      const existing = await prisma.modul.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Modul tidak ditemukan' }, { status: 404 });
      }

      const updated = await prisma.modul.update({
        where: { id },
        data: {
          nama: nama?.trim() || existing.nama,
          deskripsi: deskripsi !== undefined ? (deskripsi?.trim() || null) : existing.deskripsi,
        },
      });

      // Update denormalized namaModul on related MataPelajaran
      if (nama && nama.trim() !== existing.nama) {
        await prisma.mataPelajaran.updateMany({
          where: { modulId: id },
          data: { namaModul: nama.trim() },
        });
      }

      return NextResponse.json({ success: true, message: 'Modul berhasil diperbarui', data: updated });
    }

    if (action === 'DELETE_MODUL') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, message: 'ID modul tidak valid' }, { status: 400 });
      }

      const targetModul = await prisma.modul.findUnique({ where: { id } });
      if (!targetModul) {
        return NextResponse.json({ success: false, message: 'Modul tidak ditemukan' }, { status: 404 });
      }

      if (targetModul.nama.toLowerCase() === 'default') {
        return NextResponse.json({ success: false, message: 'Modul Default adalah modul sistem dan tidak dapat dihapus' }, { status: 400 });
      }

      // Pastikan modul "Default" tersedia untuk fallback topik
      let defaultModul = await prisma.modul.findFirst({
        where: { nama: 'Default' },
      });

      if (!defaultModul) {
        defaultModul = await prisma.modul.create({
          data: {
            nama: 'Default',
            deskripsi: 'Modul Utama Default',
          },
        });
      }

      // Alihkan topik ke modul Default agar topik dan soal tidak hilang
      await prisma.mataPelajaran.updateMany({
        where: { modulId: id },
        data: {
          modulId: defaultModul.id,
          namaModul: 'Default',
        },
      });

      await prisma.modul.delete({ where: { id } });

      return NextResponse.json({
        success: true,
        message: `Modul "${targetModul.nama}" berhasil dihapus. Topik di dalamnya telah dipindahkan ke modul Default.`,
      });
    }

    // --- 3. CRUD TOPIK / MATA PELAJARAN (KONTAINER UTAMA SOAL) ---
    if (action === 'CREATE_MAPEL' || action === 'CREATE_TOPIK' || action === 'CREATE_BANK_SOAL') {
      const { kode, kodeBank, nama, modul, modulId, namaModul, deskripsi, tingkat, jurusan, durasiMenit, kkm, nilaiMinimal, nilaiMaksimal, status } = body;
      const cleanKode = (kode || kodeBank || '').trim().toUpperCase();
      if (!cleanKode || !nama?.trim()) {
        return NextResponse.json({ success: false, message: 'Kode dan Nama Topik / Mata Pelajaran wajib diisi' }, { status: 400 });
      }

      const existing = await prisma.mataPelajaran.findUnique({ where: { kode: cleanKode } });
      if (existing) {
        return NextResponse.json({ success: false, message: `Kode '${cleanKode}' sudah digunakan` }, { status: 400 });
      }

      const targetModulNama = (namaModul || modul || 'Default').trim();
      let resolvedModulId = modulId;
      if (!resolvedModulId) {
        let matchedModul = await prisma.modul.findFirst({
          where: { nama: targetModulNama },
        });
        if (!matchedModul) {
          matchedModul = await prisma.modul.create({
            data: {
              nama: targetModulNama,
            },
          });
        }
        resolvedModulId = matchedModul.id;
      }

      const targetJurusan = deskripsi?.trim() || jurusan?.trim() || 'UMUM';
      const targetStatus = status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF';

      const newMapel = await prisma.mataPelajaran.create({
        data: {
          kode: cleanKode,
          nama: nama.trim(),
          modulId: resolvedModulId,
          namaModul: targetModulNama,
          tingkat: tingkat !== undefined ? Number(tingkat) : 10,
          jurusan: targetJurusan,
          durasiMenit: Number(durasiMenit) || 90,
          status: targetStatus,
          kkm: kkm !== undefined ? Number(kkm) : 75.0,
          nilaiMinimal: nilaiMinimal !== undefined ? Number(nilaiMinimal) : 0.0,
          nilaiMaksimal: nilaiMaksimal !== undefined ? Number(nilaiMaksimal) : 100.0,
          pembuatId: user.userId,
        },
      });
      return NextResponse.json({ success: true, message: 'Topik / Mata Pelajaran berhasil dibuat', data: newMapel });
    }

    if (action === 'UPDATE_MAPEL' || action === 'UPDATE_TOPIK' || action === 'UPDATE_BANK_SOAL') {
      const { id, bankSoalId, mataPelajaranId, kode, kodeBank, nama, modul, modulId, namaModul, deskripsi, tingkat, jurusan, durasiMenit, kkm, nilaiMinimal, nilaiMaksimal, status } = body;
      const targetId = id || bankSoalId || mataPelajaranId;
      if (!targetId) {
        return NextResponse.json({ success: false, message: 'ID Topik / Mapel wajib disertakan' }, { status: 400 });
      }

      const cleanKode = (kode || kodeBank) ? (kode || kodeBank).trim().toUpperCase() : undefined;
      const targetJurusan = deskripsi !== undefined ? (deskripsi.trim() || 'UMUM') : (jurusan ? jurusan.trim() : undefined);

      let updateModulId = modulId;
      let updateModulNama = namaModul || modul;
      if (updateModulNama && !updateModulId) {
        let matchedModul = await prisma.modul.findFirst({
          where: { nama: updateModulNama },
        });
        if (!matchedModul) {
          matchedModul = await prisma.modul.create({
            data: {
              nama: updateModulNama,
            },
          });
        }
        updateModulId = matchedModul.id;
      }

      const updated = await prisma.mataPelajaran.update({
        where: { id: targetId },
        data: {
          kode: cleanKode,
          nama: nama ? nama.trim() : undefined,
          modulId: updateModulId || undefined,
          namaModul: updateModulNama || undefined,
          tingkat: tingkat !== undefined ? Number(tingkat) : undefined,
          jurusan: targetJurusan,
          durasiMenit: durasiMenit ? Number(durasiMenit) : undefined,
          status: status ? (status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF') : undefined,
          kkm: kkm !== undefined ? Number(kkm) : undefined,
          nilaiMinimal: nilaiMinimal !== undefined ? Number(nilaiMinimal) : undefined,
          nilaiMaksimal: nilaiMaksimal !== undefined ? Number(nilaiMaksimal) : undefined,
        },
      });
      return NextResponse.json({ success: true, message: 'Topik / Mata Pelajaran berhasil diperbarui', data: updated });
    }

    if (action === 'ARCHIVE_MAPEL' || action === 'ARCHIVE_TOPIK' || action === 'ARCHIVE_BANK_SOAL') {
      const { id, bankSoalId, mataPelajaranId, status = 'NONAKTIF' } = body;
      const targetId = id || bankSoalId || mataPelajaranId;
      if (!targetId) {
        return NextResponse.json({ success: false, message: 'ID Topik / Mapel wajib disertakan' }, { status: 400 });
      }

      const updated = await prisma.mataPelajaran.update({
        where: { id: targetId },
        data: { status: status as any },
      });

      return NextResponse.json({
        success: true,
        message: `Topik "${updated.nama}" berhasil diarsipkan. Topik tidak akan aktif pada ujian baru, tetapi seluruh data soal tetap aman.`,
        data: updated,
      });
    }

    if (action === 'UNARCHIVE_MAPEL' || action === 'UNARCHIVE_TOPIK' || action === 'UNARCHIVE_BANK_SOAL') {
      const { id, bankSoalId, mataPelajaranId } = body;
      const targetId = id || bankSoalId || mataPelajaranId;
      if (!targetId) {
        return NextResponse.json({ success: false, message: 'ID Topik / Mapel wajib disertakan' }, { status: 400 });
      }

      const updated = await prisma.mataPelajaran.update({
        where: { id: targetId },
        data: { status: 'AKTIF' },
      });

      return NextResponse.json({
        success: true,
        message: `Topik "${updated.nama}" berhasil diaktifkan kembali.`,
        data: updated,
      });
    }

    if (action === 'BULK_ARCHIVE_MAPEL' || action === 'BULK_ARCHIVE_TOPIK') {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ success: false, message: 'Daftar ID Topik tidak boleh kosong' }, { status: 400 });
      }

      await prisma.mataPelajaran.updateMany({
        where: { id: { in: ids } },
        data: { status: 'NONAKTIF' },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil mengarsipkan ${ids.length} topik terpilih. Data soal tetap aman dan tersimpan rapi.`,
      });
    }

    if (action === 'BULK_UNARCHIVE_MAPEL' || action === 'BULK_UNARCHIVE_TOPIK') {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ success: false, message: 'Daftar ID Topik tidak boleh kosong' }, { status: 400 });
      }

      await prisma.mataPelajaran.updateMany({
        where: { id: { in: ids } },
        data: { status: 'AKTIF' },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil mengaktifkan kembali ${ids.length} topik terpilih.`,
      });
    }

    // Soft Delete: Pindahkan Topik ke Tempat Sampah (Recycle Bin)
    if (action === 'DELETE_MAPEL' || action === 'DELETE_TOPIK' || action === 'DELETE_BANK_SOAL') {
      const { id, bankSoalId, mataPelajaranId } = body;
      const targetId = id || bankSoalId || mataPelajaranId;
      if (!targetId) {
        return NextResponse.json({ success: false, message: 'ID Topik / Mapel wajib disertakan' }, { status: 400 });
      }

      await prisma.mataPelajaran.update({
        where: { id: targetId },
        data: { status: 'TERHAPUS' },
      });

      return NextResponse.json({
        success: true,
        message: 'Topik berhasil dipindahkan ke Tempat Sampah (Recycle Bin). Anda dapat memulihkannya kapan saja.',
      });
    }

    // Soft Delete Massal: Pindahkan banyak topik ke Tempat Sampah
    if (action === 'BULK_DELETE_MAPEL' || action === 'BULK_DELETE_TOPIK') {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ success: false, message: 'Daftar ID Topik tidak boleh kosong' }, { status: 400 });
      }

      await prisma.mataPelajaran.updateMany({
        where: { id: { in: ids } },
        data: { status: 'TERHAPUS' },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil memindahkan ${ids.length} topik terpilih ke Tempat Sampah (Recycle Bin).`,
      });
    }

    // Restore / Pulihkan Topik Tunggal dari Tempat Sampah
    if (action === 'RESTORE_MAPEL' || action === 'RESTORE_TOPIK') {
      const { id, bankSoalId, mataPelajaranId } = body;
      const targetId = id || bankSoalId || mataPelajaranId;
      if (!targetId) {
        return NextResponse.json({ success: false, message: 'ID Topik / Mapel wajib disertakan' }, { status: 400 });
      }

      await prisma.mataPelajaran.update({
        where: { id: targetId },
        data: { status: 'AKTIF' },
      });

      return NextResponse.json({
        success: true,
        message: 'Topik berhasil dipulihkan dan kembali aktif.',
      });
    }

    // Restore Massal: Pulihkan banyak topik sekaligus
    if (action === 'BULK_RESTORE_MAPEL' || action === 'BULK_RESTORE_TOPIK') {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ success: false, message: 'Daftar ID Topik tidak boleh kosong' }, { status: 400 });
      }

      await prisma.mataPelajaran.updateMany({
        where: { id: { in: ids } },
        data: { status: 'AKTIF' },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil memulihkan ${ids.length} topik terpilih.`,
      });
    }

    // Hapus Permanen Tunggal (Permanent Hard Delete)
    if (action === 'PERMANENT_DELETE_MAPEL' || action === 'PERMANENT_DELETE_TOPIK') {
      const { id, bankSoalId, mataPelajaranId } = body;
      const targetId = id || bankSoalId || mataPelajaranId;
      if (!targetId) {
        return NextResponse.json({ success: false, message: 'ID Topik / Mapel wajib disertakan' }, { status: 400 });
      }

      const soalList = await prisma.soal.findMany({ where: { mataPelajaranId: targetId }, select: { id: true } });
      const soalIds = soalList.map((s) => s.id);
      if (soalIds.length > 0) {
        await prisma.jawabanPeserta.deleteMany({ where: { soalId: { in: soalIds } } });
        await prisma.opsiJawaban.deleteMany({ where: { soalId: { in: soalIds } } });
        await prisma.soal.deleteMany({ where: { mataPelajaranId: targetId } });
      }

      const ujianList = await prisma.ujian.findMany({ where: { mataPelajaranId: targetId }, select: { id: true } });
      for (const u of ujianList) {
        const peserta = await prisma.pesertaUjian.findMany({ where: { ujianId: u.id }, select: { id: true } });
        const pesertaIds = peserta.map((p) => p.id);
        if (pesertaIds.length > 0) {
          await prisma.jawabanPeserta.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
          await prisma.logAktivitasUjian.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
          await prisma.pesertaUjian.deleteMany({ where: { ujianId: u.id } });
        }
        await prisma.ujianKelas.deleteMany({ where: { ujianId: u.id } });
        await prisma.ujian.delete({ where: { id: u.id } });
      }

      await prisma.guruMataPelajaran.deleteMany({ where: { mataPelajaranId: targetId } });
      await prisma.mataPelajaran.delete({ where: { id: targetId } });

      return NextResponse.json({ success: true, message: 'Topik beserta seluruh butir soalnya telah dihapus secara permanen.' });
    }

    // Hapus Permanen Massal (Bulk Permanent Delete)
    if (action === 'BULK_PERMANENT_DELETE_MAPEL' || action === 'BULK_PERMANENT_DELETE_TOPIK') {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ success: false, message: 'Daftar ID Topik tidak boleh kosong' }, { status: 400 });
      }

      for (const targetId of ids) {
        const soalList = await prisma.soal.findMany({ where: { mataPelajaranId: targetId }, select: { id: true } });
        const soalIds = soalList.map((s) => s.id);
        if (soalIds.length > 0) {
          await prisma.jawabanPeserta.deleteMany({ where: { soalId: { in: soalIds } } });
          await prisma.opsiJawaban.deleteMany({ where: { soalId: { in: soalIds } } });
          await prisma.soal.deleteMany({ where: { mataPelajaranId: targetId } });
        }

        const ujianList = await prisma.ujian.findMany({ where: { mataPelajaranId: targetId }, select: { id: true } });
        for (const u of ujianList) {
          const peserta = await prisma.pesertaUjian.findMany({ where: { ujianId: u.id }, select: { id: true } });
          const pesertaIds = peserta.map((p) => p.id);
          if (pesertaIds.length > 0) {
            await prisma.jawabanPeserta.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
            await prisma.logAktivitasUjian.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
            await prisma.pesertaUjian.deleteMany({ where: { ujianId: u.id } });
          }
          await prisma.ujianKelas.deleteMany({ where: { ujianId: u.id } });
          await prisma.ujian.delete({ where: { id: u.id } });
        }

        await prisma.guruMataPelajaran.deleteMany({ where: { mataPelajaranId: targetId } });
        await prisma.mataPelajaran.delete({ where: { id: targetId } });
      }

      return NextResponse.json({ success: true, message: `Berhasil menghapus permanen ${ids.length} topik terpilih.` });
    }

    // Kosongkan Tempat Sampah (Empty Trash)
    if (action === 'EMPTY_TRASH_MAPEL' || action === 'EMPTY_TRASH_TOPIK') {
      const deletedTopikList = await prisma.mataPelajaran.findMany({
        where: { status: 'TERHAPUS' },
        select: { id: true },
      });
      const ids = deletedTopikList.map((t) => t.id);

      for (const targetId of ids) {
        const soalList = await prisma.soal.findMany({ where: { mataPelajaranId: targetId }, select: { id: true } });
        const soalIds = soalList.map((s) => s.id);
        if (soalIds.length > 0) {
          await prisma.jawabanPeserta.deleteMany({ where: { soalId: { in: soalIds } } });
          await prisma.opsiJawaban.deleteMany({ where: { soalId: { in: soalIds } } });
          await prisma.soal.deleteMany({ where: { mataPelajaranId: targetId } });
        }

        const ujianList = await prisma.ujian.findMany({ where: { mataPelajaranId: targetId }, select: { id: true } });
        for (const u of ujianList) {
          const peserta = await prisma.pesertaUjian.findMany({ where: { ujianId: u.id }, select: { id: true } });
          const pesertaIds = peserta.map((p) => p.id);
          if (pesertaIds.length > 0) {
            await prisma.jawabanPeserta.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
            await prisma.logAktivitasUjian.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
            await prisma.pesertaUjian.deleteMany({ where: { ujianId: u.id } });
          }
          await prisma.ujianKelas.deleteMany({ where: { ujianId: u.id } });
          await prisma.ujian.delete({ where: { id: u.id } });
        }

        await prisma.guruMataPelajaran.deleteMany({ where: { mataPelajaranId: targetId } });
        await prisma.mataPelajaran.delete({ where: { id: targetId } });
      }

      return NextResponse.json({ success: true, message: `Tempat sampah berhasil dikosongkan (${ids.length} topik dihapus permanen).` });
    }

    // --- 4. CRUD GURU ---
    if (action === 'CREATE_GURU') {
      const { username, password, name, nip, mataPelajaranId } = body;
      const hashedPassword = await bcrypt.hash(password || '123456', 10);
      const newGuru = await prisma.user.create({
        data: {
          username: username.trim(),
          password: hashedPassword,
          name: name.trim(),
          role: 'GURU',
          nip: nip?.trim() || null,
          mataPelajaran: mataPelajaranId
            ? { create: { mataPelajaranId } }
            : undefined,
        },
      });
      return NextResponse.json({ success: true, message: 'Guru berhasil ditambahkan', data: newGuru });
    }

    // --- 5. CRUD TES / UJIAN (MENGACU LANGSUNG KE TOPIK / MAPEL) ---
    if (action === 'CREATE_UJIAN') {
      const {
        kodeUjian,
        judul,
        deskripsi,
        mataPelajaranId,
        bankSoalId, // backward-compatibility
        durasiMenit,
        waktuMulai,
        waktuSelesai,
        lockBrowser,
        acakSoal,
        acakOpsi,
        tampilkanHasil,
        token,
        kelasIds,
      } = body;

      const targetMapelId = mataPelajaranId || bankSoalId;
      if (!targetMapelId) {
        return NextResponse.json({ success: false, message: 'Pilih Topik / Mata Pelajaran untuk tes ini' }, { status: 400 });
      }

      const generatedToken = (token || generateRandomToken()).toUpperCase().trim();

      const newUjian = await prisma.ujian.create({
        data: {
          kodeUjian: kodeUjian.trim(),
          judul: judul.trim(),
          deskripsi: deskripsi?.trim() || null,
          mataPelajaranId: targetMapelId,
          durasiMenit: Number(durasiMenit) || 90,
          waktuMulai: waktuMulai ? new Date(waktuMulai) : new Date(),
          waktuSelesai: waktuSelesai
            ? new Date(waktuSelesai)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lockBrowser: lockBrowser !== false,
          acakSoal: acakSoal !== false,
          acakOpsi: acakOpsi !== false,
          tampilkanHasil: tampilkanHasil === true,
          token: generatedToken,
          status: 'DIJADWALKAN',
          ...(kelasIds && Array.isArray(kelasIds) && kelasIds.length > 0
            ? {
                ujianKelas: {
                  create: kelasIds.map((kId: string) => ({ kelasId: kId })),
                },
              }
            : {}),
        },
      });

      // Daftarkan siswa dari group/kelas terkait secara otomatis
      if (kelasIds && Array.isArray(kelasIds) && kelasIds.length > 0) {
        const siswaInKelas = await prisma.user.findMany({
          where: { role: 'SISWA', kelasId: { in: kelasIds } },
        });

        if (siswaInKelas.length > 0) {
          await prisma.pesertaUjian.createMany({
            data: siswaInKelas.map((s) => ({
              ujianId: newUjian.id,
              siswaId: s.id,
              status: 'BELUM_MULAI',
              sisaDetik: Number(durasiMenit || 90) * 60,
            })),
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Tes baru berhasil dibuat dan didistribusikan ke peserta!',
        data: newUjian,
      });
    }

    if (action === 'UPDATE_UJIAN') {
      const {
        ujianId,
        kodeUjian,
        judul,
        deskripsi,
        mataPelajaranId,
        bankSoalId,
        durasiMenit,
        waktuMulai,
        waktuSelesai,
        lockBrowser,
        acakSoal,
        acakOpsi,
        tampilkanHasil,
        token,
        status,
        kelasIds,
      } = body;

      const targetMapelId = mataPelajaranId || bankSoalId;

      const updated = await prisma.ujian.update({
        where: { id: ujianId },
        data: {
          kodeUjian: kodeUjian?.trim(),
          judul: judul?.trim(),
          deskripsi: deskripsi?.trim() || null,
          mataPelajaranId: targetMapelId || undefined,
          durasiMenit: durasiMenit ? Number(durasiMenit) : undefined,
          waktuMulai: waktuMulai ? new Date(waktuMulai) : undefined,
          waktuSelesai: waktuSelesai ? new Date(waktuSelesai) : undefined,
          lockBrowser: lockBrowser !== undefined ? lockBrowser : undefined,
          acakSoal: acakSoal !== undefined ? acakSoal : undefined,
          acakOpsi: acakOpsi !== undefined ? acakOpsi : undefined,
          tampilkanHasil: tampilkanHasil !== undefined ? tampilkanHasil : undefined,
          token: token ? token.toUpperCase().trim() : undefined,
          status: status || undefined,
        },
      });

      if (kelasIds && Array.isArray(kelasIds)) {
        await prisma.ujianKelas.deleteMany({ where: { ujianId } });
        if (kelasIds.length > 0) {
          await prisma.ujianKelas.createMany({
            data: kelasIds.map((kId: string) => ({ ujianId, kelasId: kId })),
          });
          const siswaInKelas = await prisma.user.findMany({
            where: { role: 'SISWA', kelasId: { in: kelasIds } },
          });
          if (siswaInKelas.length > 0) {
            await prisma.pesertaUjian.deleteMany({
              where: { ujianId, status: 'BELUM_MULAI' },
            });
            await prisma.pesertaUjian.createMany({
              data: siswaInKelas.map((s) => ({
                ujianId,
                siswaId: s.id,
                status: 'BELUM_MULAI',
                sisaDetik: (updated.durasiMenit || 90) * 60,
              })),
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Pengaturan Tes berhasil diperbarui!',
        data: updated,
      });
    }

    if (action === 'DELETE_UJIAN') {
      const { ujianId } = body;
      const peserta = await prisma.pesertaUjian.findMany({ where: { ujianId }, select: { id: true } });
      const pesertaIds = peserta.map((p) => p.id);

      if (pesertaIds.length > 0) {
        await prisma.jawabanPeserta.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
        await prisma.logAktivitasUjian.deleteMany({ where: { pesertaUjianId: { in: pesertaIds } } });
        await prisma.pesertaUjian.deleteMany({ where: { ujianId } });
      }
      await prisma.ujianKelas.deleteMany({ where: { ujianId } });
      await prisma.ujian.delete({ where: { id: ujianId } });

      return NextResponse.json({
        success: true,
        message: 'Data Tes berhasil dihapus permanen',
      });
    }

    if (action === 'ARCHIVE_UJIAN') {
      const { ujianId, status = 'NONAKTIF' } = body;
      const updated = await prisma.ujian.update({
        where: { id: ujianId },
        data: { status: status as any },
      });
      return NextResponse.json({
        success: true,
        message: 'Jadwal tes berhasil diarsipkan. Data pengerjaan dan nilai peserta tetap aman.',
        data: updated,
      });
    }

    if (action === 'UNARCHIVE_UJIAN') {
      const { ujianId } = body;
      const updated = await prisma.ujian.update({
        where: { id: ujianId },
        data: { status: 'DIJADWALKAN' },
      });
      return NextResponse.json({
        success: true,
        message: 'Jadwal tes berhasil diaktifkan kembali.',
        data: updated,
      });
    }

    if (action === 'BULK_ARCHIVE_UJIAN') {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ success: false, message: 'Daftar ID Tes tidak boleh kosong' }, { status: 400 });
      }

      await prisma.ujian.updateMany({
        where: { id: { in: ids } },
        data: { status: 'NONAKTIF' },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil mengarsipkan ${ids.length} jadwal tes terpilih.`,
      });
    }

    if (action === 'BULK_UNARCHIVE_UJIAN') {
      const { ids } = body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ success: false, message: 'Daftar ID Tes tidak boleh kosong' }, { status: 400 });
      }

      await prisma.ujian.updateMany({
        where: { id: { in: ids } },
        data: { status: 'DIJADWALKAN' },
      });

      return NextResponse.json({
        success: true,
        message: `Berhasil mengaktifkan kembali ${ids.length} jadwal tes terpilih.`,
      });
    }

    // --- 6. RESET PASSWORD & STATUS PESERTA ---
    if (action === 'RESET_PASSWORD') {
      const { userId, newPassword } = body;
      const pass = newPassword || '123456';
      const defaultPassword = await bcrypt.hash(pass, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password: defaultPassword },
      });
      return NextResponse.json({
        success: true,
        message: `Password user berhasil direset ke '${pass}'`,
      });
    }

    if (action === 'RESET_PESERTA_UJIAN') {
      const { pesertaUjianId } = body;
      await prisma.jawabanPeserta.deleteMany({ where: { pesertaUjianId } });
      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: {
          status: 'BELUM_MULAI',
          waktuMulai: null,
          waktuSelesai: null,
          nilaiPG: 0,
          nilaiEsai: 0,
          nilaiTotal: 0,
          isKoreksiSelesai: false,
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Status ujian peserta berhasil direset ke awal (Belum Mulai).',
      });
    }

    // --- 7. MANAJEMEN HAK AKSES PENGGUNA (SUPER ADMIN) ---
    if (action === 'CREATE_USER') {
      const { username, password, name, role, nip, ruangUjian, sesiUjian, jenisKelamin } = body;
      const cleanUsername = username?.trim();
      if (!cleanUsername) {
        return NextResponse.json({ success: false, message: 'Username wajib diisi' }, { status: 400 });
      }

      const allowedRoles = ['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'];
      const targetRole = role || 'ADMIN';
      if (!allowedRoles.includes(targetRole)) {
        return NextResponse.json({
          success: false,
          message: 'Role tidak valid untuk menu Hak Akses. Pengelolaan data peserta (siswa) dilakukan melalui menu Data Peserta.',
        }, { status: 400 });
      }

      if ((targetRole === 'SUPERADMIN' || targetRole === 'ADMIN') && user.role !== 'SUPERADMIN') {
        return NextResponse.json({ success: false, message: 'Hanya Super Admin yang berhak membuat akun Super Admin atau Admin' }, { status: 403 });
      }

      const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
      if (existing) {
        return NextResponse.json({ success: false, message: `Username '${cleanUsername}' sudah digunakan!` }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password || '123456', 10);
      const newUser = await prisma.user.create({
        data: {
          username: cleanUsername,
          password: hashedPassword,
          name: name?.trim() || cleanUsername,
          role: targetRole,
          nip: nip?.trim() || null,
          ruangUjian: ruangUjian?.trim() || null,
          sesiUjian: sesiUjian ? Number(sesiUjian) : 1,
          jenisKelamin: jenisKelamin || null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Pengguna '${newUser.name}' (${newUser.role}) berhasil ditambahkan!`,
        data: newUser,
      });
    }

    if (action === 'UPDATE_USER') {
      const { userId, username, password, name, role, nip, ruangUjian, sesiUjian, jenisKelamin } = body;
      if (!userId) {
        return NextResponse.json({ success: false, message: 'User ID wajib disertakan' }, { status: 400 });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan' }, { status: 404 });
      }

      const allowedRoles = ['SUPERADMIN', 'ADMIN', 'GURU', 'PROKTOR'];
      if (role && !allowedRoles.includes(role)) {
        return NextResponse.json({
          success: false,
          message: 'Role tidak valid untuk menu Hak Akses. Pengelolaan data peserta (siswa) dilakukan melalui menu Data Peserta.',
        }, { status: 400 });
      }

      if ((targetUser.role === 'SUPERADMIN' || role === 'SUPERADMIN' || role === 'ADMIN') && user.role !== 'SUPERADMIN') {
        return NextResponse.json({ success: false, message: 'Hanya Super Admin yang berhak mengubah hak akses Admin/Super Admin' }, { status: 403 });
      }

      const updateData: any = {
        username: username?.trim() || targetUser.username,
        name: name?.trim() || targetUser.name,
        role: role || targetUser.role,
        nip: nip?.trim() || null,
        ruangUjian: ruangUjian?.trim() || null,
        sesiUjian: sesiUjian ? Number(sesiUjian) : targetUser.sesiUjian,
        jenisKelamin: jenisKelamin || targetUser.jenisKelamin,
      };

      if (password && password.trim()) {
        updateData.password = await bcrypt.hash(password.trim(), 10);
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      return NextResponse.json({
        success: true,
        message: `Data dan hak akses pengguna '${updated.name}' (${updated.role}) berhasil diperbarui!`,
        data: updated,
      });
    }

    if (action === 'DELETE_USER') {
      const { userId } = body;
      if (!userId) {
        return NextResponse.json({ success: false, message: 'User ID wajib disertakan' }, { status: 400 });
      }

      if (userId === user.userId) {
        return NextResponse.json({ success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang digunakan!' }, { status: 400 });
      }

      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan' }, { status: 404 });
      }

      if (targetUser.role === 'SUPERADMIN' && user.role !== 'SUPERADMIN') {
        return NextResponse.json({ success: false, message: 'Hanya Super Admin yang berhak menghapus akun Super Admin' }, { status: 403 });
      }

      await prisma.jawabanPeserta.deleteMany({ where: { pesertaUjian: { siswaId: userId } } });
      await prisma.pesertaUjian.deleteMany({ where: { siswaId: userId } });
      await prisma.guruKelas.deleteMany({ where: { guruId: userId } });
      await prisma.guruMataPelajaran.deleteMany({ where: { guruId: userId } });
      await prisma.logAktivitasUjian.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });

      return NextResponse.json({
        success: true,
        message: `Pengguna '${targetUser.name}' (${targetUser.role}) berhasil dihapus dari sistem!`,
      });
    }

    return NextResponse.json({ success: false, message: 'Action tidak dikenal' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin POST API error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
