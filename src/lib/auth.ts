import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cbt-muhipo-default-fallback-secret-2026'
);

export interface TokenPayload {
  userId: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'GURU' | 'PROKTOR' | 'SISWA';
  nomorPeserta?: string | null;
  nisn?: string | null;
  kelasNama?: string | null;
}

export function mapSimasmuhRoleToCbt(simasmuhRole?: string | null): 'ADMIN' | 'GURU' | 'PROKTOR' | 'SISWA' {
  if (!simasmuhRole) return 'SISWA';
  const role = String(simasmuhRole).toUpperCase().trim();

  // Semua role admin di SIMASMUH (superadmin, admin IT, admin TU/pegawai, kepala sekolah) mendapatkan role ADMIN di CBT
  if (
    role === 'SUPERADMIN' ||
    role === 'SUPER_ADMIN' ||
    role.includes('ADMIN') ||
    role === 'PEGAWAI' ||
    role === 'TU' ||
    role === 'KEPALA_SEKOLAH' ||
    role === 'KEPSEK'
  ) {
    return 'ADMIN';
  }

  // Role Guru di SIMASMUH mendapatkan role GURU di CBT
  if (role === 'GURU' || role === 'TEACHER' || role.includes('GURU')) {
    return 'GURU';
  }

  // Role Proktor
  if (role === 'PROKTOR' || role.includes('PROKTOR')) {
    return 'PROKTOR';
  }

  // Siswa
  return 'SISWA';
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function getSessionUser(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('cbt_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}
