const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditAndFix() {
  console.log('[AI KaTeX Audit] Memulai scanning seluruh basis data soal & opsi...');

  const soals = await prisma.soal.findMany({
    include: {
      opsiJawaban: true,
    },
  });

  console.log(`[AI KaTeX Audit] Terdeteksi ${soals.length} soal dalam database.`);
  let fixedOpsiCount = 0;
  let fixedSoalCount = 0;

  for (const s of soals) {
    let soalChanged = false;
    let newPertanyaan = s.pertanyaan;

    // Bersihkan entitas dan perbaiki spasi KaTeX di pertanyaan
    if (newPertanyaan) {
      const cleaned = newPertanyaan
        .replace(/&radic;/gi, '√')
        .replace(/&#8730;/g, '√')
        .replace(/\\\s+sqrt/g, '\\sqrt')
        .replace(/\\\s+frac/g, '\\frac');
      if (cleaned !== newPertanyaan) {
        newPertanyaan = cleaned;
        soalChanged = true;
      }
    }

    if (soalChanged) {
      await prisma.soal.update({
        where: { id: s.id },
        data: { pertanyaan: newPertanyaan },
      });
      fixedSoalCount++;
    }

    for (const o of s.opsiJawaban) {
      if (!o.konten) continue;
      let newKonten = o.konten;

      // Bersihkan karakter rusak pada opsi
      newKonten = newKonten
        .replace(/&radic;/gi, '√')
        .replace(/&#8730;/g, '√')
        .replace(/\\\s+sqrt/g, '\\sqrt')
        .replace(/\\\s+frac/g, '\\frac');

      // Jika format raw LaTeX seperti \frac{1}{4}\sqrt{14} belum ber-dollar, tambahkan dollar
      if (
        (newKonten.includes('\\frac') || newKonten.includes('\\sqrt')) &&
        !newKonten.startsWith('$') &&
        !newKonten.endsWith('$')
      ) {
        newKonten = `$${newKonten.trim()}$`;
      }

      if (newKonten !== o.konten) {
        await prisma.opsiJawaban.update({
          where: { id: o.id },
          data: { konten: newKonten },
        });
        fixedOpsiCount++;
        console.log(` -> Fixed Opsi [${o.label}] di Soal #${s.nomorUrut}: ${o.konten} => ${newKonten}`);
      }
    }
  }

  console.log(`[AI KaTeX Audit] Selesai. Total Soal diperbaiki: ${fixedSoalCount}, Total Opsi diperbaiki: ${fixedOpsiCount}`);
}

auditAndFix()
  .catch((err) => {
    console.error('[AI KaTeX Audit Error]:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

