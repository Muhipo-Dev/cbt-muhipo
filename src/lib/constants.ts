export interface JurusanOption {
  value: string;
  label: string;
  badgeColor?: string;
}

export const DAFTAR_JURUSAN_MUHIPO: JurusanOption[] = [
  { value: 'UMUM', label: 'Umum (Semua Jurusan / Lintas Program)' },
  { value: 'SAINS', label: 'Sains (MIPA / Saintek / SAINSOS)' },
  { value: 'SOSIAL', label: 'Sosial (IPS / Soshum)' },
  { value: 'ARTIFICIAL INTELLIGENCE', label: 'Artificial Intelligence (AI)' },
  { value: 'SENI', label: 'Kelas Seni & Budaya' },
  { value: 'OLAHRAGA', label: 'Kelas Olahraga & Atlet' },
  { value: 'TAHFIDZ', label: "Kelas Tahfidzul Qur'an" },
  { value: 'ENTREPRENEUR', label: 'Kelas Entrepreneur / Kewirausahaan' },
  { value: 'MIC', label: 'Muhipo International Class (MIC)' },
  { value: 'INKLUSI', label: 'Kelas Inklusi' },
  { value: 'KADER', label: 'Kelas Kader Persyarikatan' },
  { value: 'REGULER', label: 'Kelas Reguler' },
];

export function normalizeJurusan(input?: string | null): string {
  if (!input) return 'UMUM';
  const str = input.toUpperCase().trim();
  if (str.includes('MIPA') || str.includes('IPA') || str.includes('SAIN') || str.includes('SAINTEK') || str.includes('SAINSOS')) {
    return 'SAINS';
  }
  if (str.includes('IPS') || str.includes('SOS') || str.includes('SOSHUM')) {
    return 'SOSIAL';
  }
  if (str.includes('ARTIFICIAL') || str.includes('AI') || str.includes('INTELLIGENCE')) {
    return 'ARTIFICIAL INTELLIGENCE';
  }
  if (str.includes('SENI') || str.includes('BUDAYA') || str.includes('ART')) {
    return 'SENI';
  }
  if (str.includes('OLAHRAGA') || str.includes('SPORT') || str.includes('ATLET')) {
    return 'OLAHRAGA';
  }
  if (str.includes('TAHFIDZ') || str.includes('QURAN') || str.includes("QUR'AN")) {
    return 'TAHFIDZ';
  }
  if (str.includes('ENTERPRENEUR') || str.includes('ENTREPRENEUR') || str.includes('WIRAUSAHA') || str.includes('BISNIS')) {
    return 'ENTREPRENEUR';
  }
  if (str.includes('MIC') || str.includes('INTERNASIONAL') || str.includes('INTERNATIONAL')) {
    return 'MIC';
  }
  if (str.includes('INKLUSI') || str.includes('INCLUSION')) {
    return 'INKLUSI';
  }
  if (str.includes('KADER')) {
    return 'KADER';
  }
  if (str.includes('REGULER')) {
    return 'REGULER';
  }
  if (str.includes('UMUM')) {
    return 'UMUM';
  }
  return input.toUpperCase().trim();
}

export interface TipeUjianOption {
  value: string;
  label: string;
  singkatan: string;
}

export const DAFTAR_TIPE_UJIAN: TipeUjianOption[] = [
  { value: 'PAS', label: 'PAS (Penilaian Akhir Semester)', singkatan: 'PAS' },
  { value: 'PAT', label: 'PAT (Penilaian Akhir Tahun)', singkatan: 'PAT' },
  { value: 'UTS', label: 'UTS / PTS (Penilaian Tengah Semester)', singkatan: 'PTS' },
  { value: 'UAS', label: 'UAS (Ujian Akhir Sekolah / Sumatif)', singkatan: 'UAS' },
  { value: 'UH', label: 'UH / Formatif (Ulangan Harian)', singkatan: 'UH' },
  { value: 'TRYOUT', label: 'Try Out / Simulasi Ujian', singkatan: 'TO' },
  { value: 'USP', label: 'USP (Ujian Satuan Pendidikan)', singkatan: 'USP' },
  { value: 'ASAS', label: 'ASAS (Asesmen Sumatif Akhir Semester)', singkatan: 'ASAS' },
  { value: 'ASTS', label: 'ASTS (Asesmen Sumatif Tengah Semester)', singkatan: 'ASTS' },
  { value: 'REMEDIAL', label: 'Remedial / Perbaikan Nilai', singkatan: 'REMED' },
];

/**
 * Mendapatkan angka tingkat (10, 11, 12) dari nama kelas (misal: "X 1" -> 10, "XI 2" -> 11, "XII 3" -> 12)
 */
export function getTingkatFromNamaKelas(namaKelas?: string | null): number {
  if (!namaKelas) return 10;
  const upper = namaKelas.toUpperCase().trim();
  if (upper.startsWith('XII') || upper.includes('KELAS 12') || upper.includes('KLAS 12')) {
    return 12;
  }
  if (upper.startsWith('XI') || upper.includes('KELAS 11') || upper.includes('KLAS 11')) {
    return 11;
  }
  if (upper.startsWith('X') || upper.includes('KELAS 10') || upper.includes('KLAS 10')) {
    return 10;
  }
  return 10;
}

/**
 * Konversi angka tingkat (10, 11, 12) ke awalan Romawi ("X", "XI", "XII")
 */
export function getRomawiTingkat(tingkat?: number | string | null): string {
  const num = Number(tingkat);
  if (num === 12) return 'XII';
  if (num === 11) return 'XI';
  return 'X';
}

/**
 * Filter rekomendasi ID kelas yang selaras dengan tingkat bank soal
 * Contoh: jika tingkat 10 -> rekomendasi semua kelas berawalan 'X ' (X 1, X 2, ...)
 *         jika tingkat 11 -> rekomendasi semua kelas berawalan 'XI ' (XI 1, XI 2, ...)
 *         jika tingkat 12 -> rekomendasi semua kelas berawalan 'XII ' (XII 1, XII 2, ...)
 */
export function getRecommendedKelasList<T extends { id: string; nama: string; tingkat?: number }>(
  kelasList: T[],
  tingkat?: number | string | null
): T[] {
  const targetRomawi = getRomawiTingkat(tingkat);
  return kelasList.filter((k) => {
    const kName = k.nama.trim().toUpperCase();
    if (targetRomawi === 'XII') {
      return kName.startsWith('XII ') || kName === 'XII' || k.tingkat === 12;
    }
    if (targetRomawi === 'XI') {
      return (kName.startsWith('XI ') || kName === 'XI' || k.tingkat === 11) && !kName.startsWith('XII');
    }
    // Romawi 'X'
    return (kName.startsWith('X ') || kName === 'X' || k.tingkat === 10) && !kName.startsWith('XI') && !kName.startsWith('XII');
  });
}

