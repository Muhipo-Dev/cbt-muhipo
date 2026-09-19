import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'PROKTOR', 'GURU'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujianId');
    const filterHari = searchParams.get('filterHari');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const ujianWhereClause: any = {
      mataPelajaran: { status: { not: 'TERHAPUS' } },
    };
    if (user.role === 'GURU') {
      if (filterHari === 'SEMUA') {
        ujianWhereClause.OR = [
          { mataPelajaran: { OR: [{ pembuatId: user.userId }, { gurus: { some: { guruId: user.userId } } }] } },
          { waktuMulai: { lte: endOfToday }, waktuSelesai: { gte: startOfToday } },
        ];
      } else {
        ujianWhereClause.OR = [
          {
            waktuMulai: { lte: endOfToday },
            waktuSelesai: { gte: startOfToday },
          },
          {
            mataPelajaran: { OR: [{ pembuatId: user.userId }, { gurus: { some: { guruId: user.userId } } }] },
          },
          {
            pesertaUjian: {
              some: { status: 'SEDANG_MENGERJAKAN' },
            },
          },
        ];
      }
    }

    const ujianList = await prisma.ujian.findMany({
      where: ujianWhereClause,
      include: {
        mataPelajaran: {
          include: {
            gurus: { include: { guru: { select: { id: true, name: true } } } },
            pembuat: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { waktuMulai: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const activeUjian = ujianId
      ? ujianList.find((u) => u.id === ujianId)
      : ujianList[0] || null;

    let pesertaList: any[] = [];
    if (activeUjian) {
      const peserta = await prisma.pesertaUjian.findMany({
        where: { ujianId: activeUjian.id },
        include: {
          siswa: { include: { kelas: true } },
          _count: { select: { jawabanPeserta: true } },
          logs: {
            take: 20,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { siswa: { name: 'asc' } },
      });

      pesertaList = peserta.map((p) => {
        const violationLogs = p.logs.filter((l) =>
          [
            'TAB_SWITCH_ALERT',
            'APP_SWITCH_ALERT',
            'WINDOW_BLUR',
            'FULLSCREEN_EXIT',
            'SCREEN_SHARE_STOPPED',
            'KEYBOARD_SHORTCUT_VIOLATION',
            'SECURITY_ALERT',
          ].includes(l.aktivitas)
        );

        return {
          pesertaUjianId: p.id,
          siswaId: p.siswa.id,
          nomorPeserta: p.siswa.nomorPeserta || '-',
          username: p.siswa.username,
          name: p.siswa.name,
          plainPassword: p.siswa.plainPassword || '123456',
          kelas: p.siswa.kelas?.nama || '-',
          status: p.status,
          jumlahJawaban: p._count.jawabanPeserta,
          sisaDetik: p.sisaDetik,
          ipAddress: p.ipAddress || '-',
          logsTerakhir: p.logs,
          violationLogs,
          jumlahPelanggaran: violationLogs.length,
          hasViolations: violationLogs.length > 0,
          latestViolationActivity: violationLogs[0]?.aktivitas || null,
          latestViolationDetail: violationLogs[0]?.detail || null,
        };
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ujianList,
        activeUjian,
        pesertaList,
      },
    });
  } catch (error: any) {
    console.error('Proktor GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['SUPERADMIN', 'ADMIN', 'PROKTOR', 'GURU'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'RESET_PASSWORD' || action === 'CHANGE_PASSWORD') {
      const { siswaId, userId, id, pesertaUjianId, newPassword } = body;
      let targetUserId = userId || siswaId || id;
      if (!targetUserId && pesertaUjianId) {
        const pu = await prisma.pesertaUjian.findUnique({
          where: { id: pesertaUjianId },
          select: { siswaId: true },
        });
        targetUserId = pu?.siswaId;
      }
      if (!targetUserId) {
        return NextResponse.json({ success: false, message: 'Data peserta tidak ditemukan' }, { status: 400 });
      }

      const pass = (newPassword || '123456').trim();
      if (!pass) {
        return NextResponse.json({ success: false, message: 'Password baru tidak boleh kosong' }, { status: 400 });
      }

      const hashedPassword = await hashPassword(pass);
      const updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: { password: hashedPassword, plainPassword: pass },
      });

      if (pesertaUjianId) {
        await prisma.logAktivitasUjian.create({
          data: {
            userId: user.userId,
            pesertaUjianId,
            aktivitas: 'RESET_PASSWORD',
            detail: `Pengawas (${user.name}) mengubah kata sandi siswa (${updatedUser.name}) menjadi "${pass}".`,
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Password siswa "${updatedUser.name}" (${updatedUser.username}) berhasil diubah menjadi "${pass}".`,
      });
    }

    if (action === 'RESET_LOGIN') {
      const { pesertaUjianId } = body;
      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: { status: 'RESET_LOGIN' },
      });
      return NextResponse.json({ success: true, message: 'Status peserta berhasil direset ke RESET_LOGIN' });
    }

    if (action === 'FORCE_FINISH') {
      const { pesertaUjianId } = body;
      await prisma.pesertaUjian.update({
        where: { id: pesertaUjianId },
        data: { status: 'SELESAI', waktuSelesai: new Date(), sisaDetik: 0 },
      });
      return NextResponse.json({ success: true, message: 'Ujian peserta berhasil diselesaikan paksa.' });
    }

    if (action === 'RESET_PELANGGARAN') {
      const { pesertaUjianId } = body;
      if (!pesertaUjianId) {
        return NextResponse.json({ success: false, message: 'pesertaUjianId diperlukan' }, { status: 400 });
      }

      // 1. Hapus log pelanggaran peserta
      await prisma.logAktivitasUjian.deleteMany({
        where: {
          pesertaUjianId,
          aktivitas: {
            in: [
              'TAB_SWITCH_ALERT',
              'APP_SWITCH_ALERT',
              'WINDOW_BLUR',
              'FULLSCREEN_EXIT',
              'SCREEN_SHARE_STOPPED',
              'KEYBOARD_SHORTCUT_VIOLATION',
              'SECURITY_ALERT',
            ],
          },
        },
      });

      // 2. Jika status peserta TERKUNCI, buka kembali menjadi SEDANG_MENGERJAKAN
      const peserta = await prisma.pesertaUjian.findUnique({ where: { id: pesertaUjianId } });
      if (peserta && peserta.status === 'TERKUNCI') {
        await prisma.pesertaUjian.update({
          where: { id: pesertaUjianId },
          data: { status: 'SEDANG_MENGERJAKAN' },
        });
      }

      // 3. Catat log audit pengawas
      await prisma.logAktivitasUjian.create({
        data: {
          userId: user.userId,
          pesertaUjianId,
          aktivitas: 'RESET_PELANGGARAN',
          detail: `Proktor/Pengawas (${user.name}) mereset total pelanggaran menjadi 0 dan membuka kunci ujian siswa.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Pelanggaran berhasil direset ke 0 dan status ujian aktif kembali.',
      });
    }

    if (action === 'RESET_ALL_PELANGGARAN') {
      const { ujianId } = body;
      if (!ujianId) {
        return NextResponse.json({ success: false, message: 'ujianId diperlukan' }, { status: 400 });
      }

      const pesertaList = await prisma.pesertaUjian.findMany({
        where: { ujianId },
        select: { id: true },
      });
      const pesertaIds = pesertaList.map((p) => p.id);

      if (pesertaIds.length > 0) {
        await prisma.logAktivitasUjian.deleteMany({
          where: {
            pesertaUjianId: { in: pesertaIds },
            aktivitas: {
              in: [
                'TAB_SWITCH_ALERT',
                'APP_SWITCH_ALERT',
                'WINDOW_BLUR',
                'FULLSCREEN_EXIT',
                'SCREEN_SHARE_STOPPED',
                'KEYBOARD_SHORTCUT_VIOLATION',
                'SECURITY_ALERT',
              ],
            },
          },
        });

        await prisma.pesertaUjian.updateMany({
          where: { ujianId, status: 'TERKUNCI' },
          data: { status: 'SEDANG_MENGERJAKAN' },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Berhasil mereset pelanggaran untuk seluruh ${pesertaIds.length} peserta pada sesi ujian ini.`,
      });
    }

    if (action === 'ADD_TIME' || action === 'ADD_EXTRA_TIME') {
      const { pesertaUjianId, extraMinutes } = body;
      const extraSeconds = (Number(extraMinutes) || 15) * 60;
      const current = await prisma.pesertaUjian.findUnique({ where: { id: pesertaUjianId } });
      if (current) {
        await prisma.pesertaUjian.update({
          where: { id: pesertaUjianId },
          data: { sisaDetik: (current.sisaDetik || 0) + extraSeconds },
        });
      }
      return NextResponse.json({ success: true, message: `Berhasil menambahkan waktu ${extraMinutes} menit.` });
    }

    return NextResponse.json({ success: false, message: 'Action tidak dikenal' }, { status: 400 });
  } catch (error: any) {
    console.error('Proktor POST error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
