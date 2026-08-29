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
  return input.trim();
}
