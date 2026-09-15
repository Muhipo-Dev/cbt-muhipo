import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || !['ADMIN', 'PROKTOR', 'GURU'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ujianId = searchParams.get('ujianId');
    const filterHari = searchParams.get('filterHari');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const ujianWhereClause: any = {};
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
            'WINDOW_BLUR',
            'FULLSCREEN_EXIT',
            'SCREEN_SHARE_STOPPED',
            'KEYBOARD_SHORTCUT_VIOLATION',
            'SECURITY_ALERT',
          ].includes(l.aktivitas)
        );

        const latestScreenshotLog = p.logs.find((l: any) => l.fotoBukti);

        return {
          pesertaUjianId: p.id,
          siswaId: p.siswa.id,
          nomorPeserta: p.siswa.nomorPeserta || '-',
          username: p.siswa.username,
          name: p.siswa.name,
          kelas: p.siswa.kelas?.nama || '-',
          status: p.status,
          jumlahJawaban: p._count.jawabanPeserta,
          sisaDetik: p.sisaDetik,
          ipAddress: p.ipAddress || '-',
          logsTerakhir: p.logs,
          violationLogs,
          jumlahPelanggaran: violationLogs.length,
          hasViolations: violationLogs.length > 0,
          latestScreenshot: (latestScreenshotLog as any)?.fotoBukti || null,
          latestScreenshotTime: latestScreenshotLog?.createdAt || null,
          latestViolationActivity: violationLogs[0]?.aktivitas || null,
          latestViolationDetail: violationLogs[0]?.detail || null,
          hasLiveScreen: Boolean(global.__cbtLiveScreenStore?.get(p.id) && (Date.now() - (global.__cbtLiveScreenStore?.get(p.id)?.timestamp || 0) < 12000)),
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
    if (!user || !['ADMIN', 'PROKTOR', 'GURU'].includes(user.role)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

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

    if (action === 'ADD_TIME') {
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
