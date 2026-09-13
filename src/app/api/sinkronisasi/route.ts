import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, mapSimasmuhRoleToCbt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const SIMASMUH_PG_URL =
  process.env.SIMASMUH_DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres?schema=public';

async function getSimasmuhClient() {
  const client = new Client({ connectionString: SIMASMUH_PG_URL });
  await client.connect();
  return client;
}

import { normalizeJurusan, DAFTAR_JURUSAN_MUHIPO, getTingkatFromNamaKelas } from '@/lib/constants';

// GET: Cek Status Sinkronisasi Real-Time antara SIMASMUH & CBT MUHIPO
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    // ...
    // ...


    let isSimasmuhConnected = false;
    let simasmuhStats = {
      siswaCount: 0,
      kelasCount: 0,
      mapelCount: 0,
      guruCount: 0,
      adminCount: 0,
      programs: [] as any[],
    };

    try {
      const client = await getSimasmuhClient();
      try {
        const [stRes, clRes, sbRes, tcRes, admRes, prgRes] = await Promise.all([
          client.query('SELECT count(*) FROM "Student"'),
          client.query('SELECT count(*) FROM "Class"'),
          client.query('SELECT count(*) FROM "Subject"'),
          client.query(`
            SELECT count(DISTINCT u.id) as count
            FROM "User" u
            LEFT JOIN "TeacherProfile" tp ON tp."userId" = u.id
            WHERE u.role = 'GURU'
               OR (
                 tp.id IS NOT NULL AND (
                   EXISTS (SELECT 1 FROM "TeacherSubject" ts JOIN "Subject" sub ON ts."subjectId" = sub.id WHERE ts."teacherId" = tp.id)
                   OR EXISTS (SELECT 1 FROM "Schedule" sc JOIN "Subject" sub ON sc."subjectId" = sub.id WHERE sc."teacherId" = tp.id)
                 )
               )
          `),
          client.query(
            "SELECT count(*) FROM \"User\" WHERE role IN ('SUPERADMIN', 'ADMIN_IT', 'ADMIN_TU', 'ADMIN', 'PEGAWAI', 'KEPALA_SEKOLAH') OR role LIKE '%ADMIN%'"
          ),
          client.query('SELECT id, code, name, description FROM "ProgramConfig" ORDER BY name ASC').catch(() => ({ rows: [] })),
        ]);

        simasmuhStats = {
          siswaCount: parseInt(stRes.rows[0].count, 10) || 0,
          kelasCount: parseInt(clRes.rows[0].count, 10) || 0,
          mapelCount: parseInt(sbRes.rows[0].count, 10) || 0,
          guruCount: parseInt(tcRes.rows[0].count, 10) || 0,
          adminCount: parseInt(admRes.rows[0].count, 10) || 0,
          programs: prgRes.rows || [],
        };
        isSimasmuhConnected = true;
      } finally {
        await client.end();
      }
    } catch (e: any) {
      console.warn('SIMASMUH DB direct connection failed:', e.message);
    }

    // Ambil data lokal CBT MUHIPO
    const [
      cbtAdminCount,
      cbtGuruCount,
      cbtSiswaCount,
      cbtKelasCount,
      cbtMapelCount,
      cbtBankSoalCount,
      cbtSoalCount,
      cbtUjianCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({
        where: {
          OR: [
            { role: 'GURU' },
            { mataPelajaran: { some: {} } },
          ],
        },
      }),
      prisma.user.count({ where: { role: 'SISWA' } }),
      prisma.kelas.count(),
      prisma.mataPelajaran.count(),
      prisma.bankSoal.count(),
      prisma.soal.count(),
      prisma.ujian.count(),
    ]);

    // Daftar Bank Soal & Status Kesiapan Ujian
    const bankSoalKesiapan = await prisma.bankSoal.findMany({
      include: {
        mataPelajaran: {
          include: {
            gurus: {
              include: {
                guru: { select: { id: true, name: true, username: true } },
              },
            },
          },
        },
        pembuat: { select: { id: true, name: true, username: true, role: true } },
        _count: { select: { soalList: true, ujianList: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        simasmuh: {
          connected: isSimasmuhConnected,
          port: 54322,
          ...simasmuhStats,
        },
        cbt: {
          port: 54332,
          adminCount: cbtAdminCount,
          guruCount: cbtGuruCount,
          siswaCount: cbtSiswaCount,
          kelasCount: cbtKelasCount,
          mapelCount: cbtMapelCount,
          bankSoalCount: cbtBankSoalCount,
          soalCount: cbtSoalCount,
          ujianCount: cbtUjianCount,
        },
        bankSoalKesiapan: bankSoalKesiapan.map((b) => ({
          id: b.id,
          kodeBank: b.kodeBank,
          nama: b.nama,
          tingkat: b.tingkat,
          mapelKode: b.mataPelajaran.kode,
          mapelNama: b.mataPelajaran.nama,
          jumlahSoal: b._count.soalList,
          isSiapUjian: b._count.soalList > 0,
          terjadwalCount: b._count.ujianList,
        })),
      },
    });
  } catch (error: any) {
    console.error('Sinkronisasi GET error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST: Jalankan Sinkronisasi Penuh (Admin, Guru, Siswa, Kelas, Mapel)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { target = 'ALL' } = body; // 'ALL' | 'SISWA' | 'KELAS_MAPEL' | 'ADMIN_GURU'

    const client = await getSimasmuhClient();

    let stats = {
      kelasCount: 0,
      mapelCount: 0,
      adminCount: 0,
      guruCount: 0,
      siswaCount: 0,
    };

    try {
      // 1. SINKRONISASI KELAS (Class SIMASMUH -> Kelas CBT)
      if (target === 'ALL' || target === 'KELAS_MAPEL' || target === 'KELAS') {
        const classesRes = await client.query(`
          SELECT c.id, c.name, c."gradeLevel", 
            (SELECT s.program FROM "Student" s WHERE s."classId" = c.id AND s.program IS NOT NULL LIMIT 1) as "sampleProgram"
          FROM "Class" c
        `);
        for (const row of classesRes.rows) {
          const rawProgram = row.sampleProgram || row.name;
          const jurusan = normalizeJurusan(rawProgram);
          // Selaraskan tingkat: prioritaskan deteksi dari nama kelas (X=10, XI=11, XII=12) lalu fallback gradeLevel
          const calculatedTingkat = getTingkatFromNamaKelas(row.name) || row.gradeLevel || 10;
          await prisma.kelas.upsert({
            where: { nama: row.name.trim() },
            update: {
              tingkat: calculatedTingkat,
              jurusan,
            },
            create: {
              nama: row.name.trim(),
              tingkat: calculatedTingkat,
              jurusan,
            },
          });
          stats.kelasCount++;
        }
      }

      // 2. SINKRONISASI MATA PELAJARAN (Subject SIMASMUH -> MataPelajaran CBT)
      if (target === 'ALL' || target === 'KELAS_MAPEL' || target === 'MAPEL') {
        const subjectsRes = await client.query('SELECT id, name, code FROM "Subject"');
        for (const row of subjectsRes.rows) {
          const cleanCode = (row.code || '').trim().toUpperCase();
          const cleanName = (row.name || '').trim();
          if (!cleanCode) continue;

          await prisma.mataPelajaran.upsert({
            where: { kode: cleanCode },
            update: { nama: cleanName },
            create: {
              kode: cleanCode,
              nama: cleanName,
            },
          });
          stats.mapelCount++;
        }
      }

      // 3. SINKRONISASI ADMIN & GURU (SIMASMUH User & TeacherProfile -> CBT User)
      if (target === 'ALL' || target === 'ADMIN_GURU' || target === 'GURU') {
        const usersRes = await client.query(`
          SELECT 
            u.id, 
            u.username, 
            u.password as password_hash, 
            u.name, 
            u.role,
            COALESCE(NULLIF(TRIM(tp.nip), ''), NULLIF(TRIM(u."nipNbm"), '')) as nip,
            tp.id as teacher_profile_id,
            COALESCE((
              SELECT count(*) 
              FROM "TeacherSubject" ts 
              JOIN "Subject" sub ON ts."subjectId" = sub.id 
              WHERE ts."teacherId" = tp.id
            ), 0)::int as mapel_count,
            COALESCE((
              SELECT count(*) 
              FROM "Schedule" sc 
              JOIN "Subject" sub ON sc."subjectId" = sub.id 
              WHERE sc."teacherId" = tp.id
            ), 0)::int as schedule_count
          FROM "User" u
          LEFT JOIN "TeacherProfile" tp ON tp."userId" = u.id
          WHERE u.role != 'SISWA'
        `);

        for (const u of usersRes.rows) {
          const cbtRole = mapSimasmuhRoleToCbt(u.role);

          // Lewati jika role SISWA atau WALI_MURID
          if (cbtRole === 'SISWA') continue;

          await prisma.user.upsert({
            where: { username: u.username },
            update: {
              name: u.name,
              password: u.password_hash,
              role: cbtRole,
              nip: u.nip || undefined,
            },
            create: {
              username: u.username,
              password: u.password_hash,
              name: u.name,
              role: cbtRole,
              nip: u.nip || undefined,
            },
          });

          if (cbtRole === 'ADMIN') {
            stats.adminCount++;
          }
          
          // Hitung guru pengampu (baik role utama GURU maupun role lain yang memiliki sub-role guru / terhubung ke mata pelajaran)
          const isGuruPengampu = cbtRole === 'GURU' || (u.teacher_profile_id && (u.mapel_count > 0 || u.schedule_count > 0));
          if (isGuruPengampu) {
            stats.guruCount++;
          }
        }

        // Sinkronisasi Relasi Guru & Mata Pelajaran dari TeacherSubject & Schedule SIMASMUH
        try {
          // 1. Dari tabel TeacherSubject SIMASMUH (Penugasan Guru Mapel Resmi)
          const teacherSubjectRes = await client.query(`
            SELECT sub.code as subject_code, u.username as teacher_username
            FROM "TeacherSubject" ts
            JOIN "Subject" sub ON ts."subjectId" = sub.id
            JOIN "TeacherProfile" tp ON ts."teacherId" = tp.id
            JOIN "User" u ON tp."userId" = u.id
          `);

          for (const ts of teacherSubjectRes.rows) {
            const mapel = await prisma.mataPelajaran.findUnique({ where: { kode: ts.subject_code } });
            const teacher = await prisma.user.findUnique({ where: { username: ts.teacher_username } });
            if (mapel && teacher) {
              await prisma.guruMataPelajaran.upsert({
                where: {
                  guruId_mataPelajaranId: {
                    guruId: teacher.id,
                    mataPelajaranId: mapel.id,
                  },
                },
                update: {},
                create: {
                  guruId: teacher.id,
                  mataPelajaranId: mapel.id,
                },
              });
            }
          }

          // 2. Dari tabel Schedule SIMASMUH (Jadwal Mengajar Mapel & Rombel Kelas)
          const scheduleRes = await client.query(`
            SELECT sub.code as subject_code, u.username as teacher_username, c.name as class_name
            FROM "Schedule" s
            JOIN "Subject" sub ON s."subjectId" = sub.id
            JOIN "TeacherProfile" tp ON s."teacherId" = tp.id
            JOIN "User" u ON tp."userId" = u.id
            LEFT JOIN "Class" c ON s."classId" = c.id
          `);

          for (const sched of scheduleRes.rows) {
            const mapel = await prisma.mataPelajaran.findUnique({ where: { kode: sched.subject_code } });
            const teacher = await prisma.user.findUnique({ where: { username: sched.teacher_username } });
            if (mapel && teacher) {
              await prisma.guruMataPelajaran.upsert({
                where: {
                  guruId_mataPelajaranId: {
                    guruId: teacher.id,
                    mataPelajaranId: mapel.id,
                  },
                },
                update: {},
                create: {
                  guruId: teacher.id,
                  mataPelajaranId: mapel.id,
                },
              });
            }

            // Sinkronisasi Guru ke Rombel Kelas yang diajar
            if (teacher && sched.class_name) {
              const k = await prisma.kelas.findUnique({ where: { nama: sched.class_name } });
              if (k) {
                await prisma.guruKelas.upsert({
                  where: {
                    guruId_kelasId: {
                      guruId: teacher.id,
                      kelasId: k.id,
                    },
                  },
                  update: {},
                  create: {
                    guruId: teacher.id,
                    kelasId: k.id,
                  },
                });
              }
            }
          }

          // 3. Sinkronisasi kepemilikan Bank Soal agar selalu mencerminkan Guru Pengampu dari SIMASMUH
          const allBankSoal = await prisma.bankSoal.findMany({
            include: {
              mataPelajaran: {
                include: {
                  gurus: {
                    include: { guru: true },
                  },
                },
              },
              pembuat: true,
            },
          });

          for (const bank of allBankSoal) {
            const pengampu = bank.mataPelajaran?.gurus?.[0]?.guru;
            if (pengampu && bank.pembuatId !== pengampu.id && bank.pembuat?.role === 'ADMIN') {
              await prisma.bankSoal.update({
                where: { id: bank.id },
                data: { pembuatId: pengampu.id },
              });
            }
          }
        } catch (schedErr: any) {
          console.warn('Gagal sinkronisasi relasi guru-mapel-kelas dari SIMASMUH:', schedErr.message);
        }
      }

      // 4. SINKRONISASI SISWA (Student SIMASMUH -> User SISWA CBT)
      if (target === 'ALL' || target === 'SISWA') {
        const studentsRes = await client.query(`
          SELECT s.id, s.nisn, s.nis, s.name, s.gender, c.name as class_name, u.password as password_hash
          FROM "Student" s
          LEFT JOIN "Class" c ON s."classId" = c.id
          LEFT JOIN "User" u ON s."userId" = u.id OR s.nis = u.username
        `);

        const validNisList: string[] = [];

        for (const s of studentsRes.rows) {
          const cleanNis = s.nis ? String(s.nis).trim() : '';
          const cleanNisn = s.nisn ? String(s.nisn).trim() : '';
          if (!cleanNis && !cleanNisn) continue;

          const username = cleanNis || cleanNisn;
          validNisList.push(username);

          let cbtKelasId: string | null = null;
          if (s.class_name) {
            const k = await prisma.kelas.findUnique({ where: { nama: s.class_name } });
            if (k) cbtKelasId = k.id;
          }

          const passwordHash = s.password_hash || (await bcrypt.hash(cleanNis || '123456', 10));

          await prisma.user.upsert({
            where: { username },
            update: {
              name: s.name,
              password: passwordHash,
              role: 'SISWA',
              nis: cleanNis || undefined,
              nisn: cleanNisn || undefined,
              nomorPeserta: cleanNis || cleanNisn,
              kelasId: cbtKelasId,
              jenisKelamin: s.gender === 'P' ? 'P' : 'L',
            },
            create: {
              username,
              password: passwordHash,
              name: s.name,
              role: 'SISWA',
              nis: cleanNis || username,
              nisn: cleanNisn || null,
              nomorPeserta: cleanNis || cleanNisn,
              kelasId: cbtKelasId,
              jenisKelamin: s.gender === 'P' ? 'P' : 'L',
              ruangUjian: 'Lab Komputer 1',
              sesiUjian: 1,
            },
          });
          stats.siswaCount++;
        }

        // Hapus siswa CBT yang tidak terdaftar di SIMASMUH
        if (validNisList.length > 0) {
          await prisma.user.deleteMany({
            where: {
              role: 'SISWA',
              username: { notIn: validNisList },
              nis: { notIn: validNisList },
            },
          });
        }

        // Otomatis daftarkan siswa resmi HANYA ke ujian yang ditujukan untuk kelasnya
        const activeUjians = await prisma.ujian.findMany({
          include: {
            ujianKelas: true,
          },
        });

        for (const uj of activeUjians) {
          const targetKelasIds = uj.ujianKelas.map((uk) => uk.kelasId);
          if (targetKelasIds.length > 0) {
            const eligibleSiswa = await prisma.user.findMany({
              where: {
                role: 'SISWA',
                kelasId: { in: targetKelasIds },
              },
            });

            for (const sw of eligibleSiswa) {
              await prisma.pesertaUjian.upsert({
                where: {
                  ujianId_siswaId: {
                    ujianId: uj.id,
                    siswaId: sw.id,
                  },
                },
                update: {},
                create: {
                  ujianId: uj.id,
                  siswaId: sw.id,
                  status: 'BELUM_MULAI',
                  sisaDetik: uj.durasiMenit * 60,
                },
              });
            }
          }
        }
      }

        // 5. SINKRONISASI NILAI UJIAN CBT KE MASTER SIMASMUH (PesertaUjian CBT -> Grade SIMASMUH)
        if (target === 'ALL' || target === 'NILAI') {
          // Ambil seluruh data peserta ujian yang sudah menyelesaikan ujian (atau sudah dikoreksi)
          const pesertaSelesai = await prisma.pesertaUjian.findMany({
            where: {
              status: 'SELESAI',
            },
            include: {
              siswa: true,
              ujian: {
                include: {
                  bankSoal: {
                    include: {
                      mataPelajaran: true,
                    },
                  },
                },
              },
            },
          });

          // Ambil peta data Siswa & Subject dari SIMASMUH untuk matching yang akurat
          const [simasmuhStudents, simasmuhSubjects] = await Promise.all([
            client.query('SELECT id, nis, nisn FROM "Student"'),
            client.query('SELECT id, code, name FROM "Subject"'),
          ]);

          const studentMapByNis = new Map<string, string>();
          for (const s of simasmuhStudents.rows) {
            if (s.nis) {
              const cleanNis = String(s.nis).trim();
              studentMapByNis.set(cleanNis, s.id);
              studentMapByNis.set(cleanNis.toLowerCase(), s.id);
            }
            if (s.nisn) {
              const cleanNisn = String(s.nisn).trim();
              studentMapByNis.set(cleanNisn, s.id);
              studentMapByNis.set(cleanNisn.toLowerCase(), s.id);
            }
          }

          const subjectMapByCode = new Map<string, string>();
          const subjectMapByName = new Map<string, string>();
          for (const sb of simasmuhSubjects.rows) {
            if (sb.code) subjectMapByCode.set(String(sb.code).trim().toUpperCase(), sb.id);
            if (sb.name) subjectMapByName.set(String(sb.name).trim().toUpperCase(), sb.id);
          }

          let syncedGradeCount = 0;

          for (const p of pesertaSelesai) {
            const rawNis = p.siswa.nis || p.siswa.username;
            const studentNis = rawNis ? String(rawNis).trim() : '';
            const subjectCode = p.ujian.bankSoal.mataPelajaran.kode ? String(p.ujian.bankSoal.mataPelajaran.kode).trim().toUpperCase() : '';
            const subjectName = p.ujian.bankSoal.mataPelajaran.nama ? String(p.ujian.bankSoal.mataPelajaran.nama).trim().toUpperCase() : '';

            const simasmuhStudentId = studentMapByNis.get(studentNis) || studentMapByNis.get(studentNis.toLowerCase());
            const simasmuhSubjectId = subjectMapByCode.get(subjectCode) || subjectMapByName.get(subjectName);

            if (!simasmuhStudentId || !simasmuhSubjectId) continue;

            // Tentukan tipe ujian (PAS, PTS, STS, SAS, UH, CBT)
            const examCodeUpper = p.ujian.kodeUjian.toUpperCase();
            let gradeType = 'CBT';
            if (examCodeUpper.includes('PAS') || examCodeUpper.includes('SAS')) {
              gradeType = 'PAS';
            } else if (examCodeUpper.includes('PTS') || examCodeUpper.includes('STS') || examCodeUpper.includes('UTS')) {
              gradeType = 'PTS';
            } else if (examCodeUpper.includes('UH') || examCodeUpper.includes('HARIAN')) {
              gradeType = 'UH';
            }

            const semesterNum = 1; // Semester default
            const finalScore = Number(p.nilaiTotal) || 0;
            const gradeId = `cbt-grade-${p.id}`;

            // Upsert ke tabel "Grade" di database SIMASMUH (Strict ON CONFLICT)
            await client.query(
              `
              INSERT INTO "Grade" (id, "studentId", "subjectId", type, semester, score)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT ("studentId", "subjectId", type, semester)
              DO UPDATE SET score = EXCLUDED.score
              `,
              [gradeId, simasmuhStudentId, simasmuhSubjectId, gradeType, semesterNum, finalScore]
            );

            syncedGradeCount++;
          }

          (stats as any).gradeCount = syncedGradeCount;
        }

        let messageDetail = '';
        if (target === 'GURU') {
          messageDetail = `Sinkronisasi Guru Berhasil (${stats.guruCount} Guru)`;
        } else if (target === 'KELAS') {
          messageDetail = `Sinkronisasi Kelas Berhasil (${stats.kelasCount} Rombel Kelas)`;
        } else if (target === 'MAPEL') {
          messageDetail = `Sinkronisasi Mata Pelajaran Berhasil (${stats.mapelCount} Mapel)`;
        } else if (target === 'KELAS_MAPEL') {
          messageDetail = `Sinkronisasi Kelas & Mapel Berhasil (${stats.kelasCount} Kelas, ${stats.mapelCount} Mapel)`;
        } else if (target === 'SISWA') {
          messageDetail = `Sinkronisasi Siswa Berhasil (${stats.siswaCount} Siswa)`;
        } else if (target === 'NILAI') {
          messageDetail = `Sinkronisasi Nilai Berhasil (${(stats as any).gradeCount || 0} Nilai Ujian Terkirim ke SIMASMUH)`;
        } else {
          messageDetail = `Sinkronisasi Penuh SIMASMUH Berhasil! (${stats.adminCount} Admin, ${stats.guruCount} Guru, ${stats.siswaCount} Siswa, ${stats.kelasCount} Rombel Kelas, ${stats.mapelCount} Mapel, ${(stats as any).gradeCount || 0} Nilai Ujian)`;
        }

        return NextResponse.json({
          success: true,
          message: messageDetail,
          stats,
        });
      } finally {
        await client.end();
      }
  } catch (error: any) {
    console.error('Sinkronisasi POST error:', error);
    return NextResponse.json({
      success: false,
      message: `Gagal sinkronisasi data SIMASMUH: ${error.message}. Pastikan database SIMASMUH aktif.`,
    }, { status: 500 });
  }
}
