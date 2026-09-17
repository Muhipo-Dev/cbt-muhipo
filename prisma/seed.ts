import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memeriksa ketersediaan data pada basis data CBT MUHIPO...');

  // 1. Cek apakah tabel User sudah memiliki data
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    console.log(`ℹ️ Basis data sudah berisi ${userCount} pengguna terdaftar. Mempertahankan seluruh data yang ada.`);
  } else {
    console.log('🌱 Database masih kosong, menginisialisasi akun awal Superadmin...');
    const nailarPassword = await bcrypt.hash('nailar', 10);

    await prisma.user.create({
      data: {
        username: 'nailar',
        password: nailarPassword,
        name: 'Nailar',
        role: 'SUPERADMIN',
      },
    });

    console.log('✅ Akun default Superadmin (nailar) berhasil dibuat.');
  }

  // 2. Pastikan Pengaturan Sistem Terisi (tanpa menimpa data yang sudah diubah jika sudah ada)
  const existingSettings = await prisma.pengaturanSistem.findUnique({
    where: { id: 'default-settings' },
  });

  if (!existingSettings) {
    await prisma.pengaturanSistem.create({
      data: {
        id: 'default-settings',
        schoolName: 'SMA Muhammadiyah 1 Ponorogo',
        appTitle: 'CBT MUHIPO',
        academicYear: '2026/2027',
        semester: 'Ganjil',
        timezone: 'Asia/Jakarta',
        serverLocation: 'Ponorogo, Jawa Timur',
        logoUrl: '/pic_logo.png',
        backgroundUrl: '/muhipo-front.jpg',
        timeSyncOffsetMs: 0,
      },
    });
    console.log('✅ Pengaturan sistem dasar berhasil diinisialisasi.');
  } else {
    console.log('ℹ️ Pengaturan sistem sudah tersedia. Mempertahankan konfigurasi sekolah yang aktif.');
  }

  console.log('✅ Pemeriksaan basis data selesai.');
}

main()
  .catch((e) => {
    console.error('Error saat inisialisasi database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
