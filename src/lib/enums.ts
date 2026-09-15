export const Role = {
  SUPERADMIN: 'SUPERADMIN',
  ADMIN: 'ADMIN',
  GURU: 'GURU',
  PROKTOR: 'PROKTOR',
  SISWA: 'SISWA',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const TipeSoal = {
  PG: 'PG',
  PG_KOMPLEKS: 'PG_KOMPLEKS',
  BENAR_SALAH: 'BENAR_SALAH',
  MENJODOHKAN: 'MENJODOHKAN',
  ISIAN: 'ISIAN',
  ESAI: 'ESAI',
} as const;
export type TipeSoal = (typeof TipeSoal)[keyof typeof TipeSoal];

export const StatusUjian = {
  DRAFT: 'DRAFT',
  DIJADWALKAN: 'DIJADWALKAN',
  SEDANG_BERJALAN: 'SEDANG_BERJALAN',
  SELESAI: 'SELESAI',
  NONAKTIF: 'NONAKTIF',
} as const;
export type StatusUjian = (typeof StatusUjian)[keyof typeof StatusUjian];

export const StatusPeserta = {
  BELUM_MULAI: 'BELUM_MULAI',
  SEDANG_MENGERJAKAN: 'SEDANG_MENGERJAKAN',
  SELESAI: 'SELESAI',
  TERKUNCI: 'TERKUNCI',
  RESET_LOGIN: 'RESET_LOGIN',
} as const;
export type StatusPeserta = (typeof StatusPeserta)[keyof typeof StatusPeserta];
