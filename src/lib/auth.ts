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
  role: 'SUPERADMIN' | 'ADMIN' | 'GURU' | 'PROKTOR' | 'SISWA';
  nomorPeserta?: string | null;
  kelasNama?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hashedOrPlain: string): Promise<boolean> {
  if (!password || !hashedOrPlain) return false;
  // If stored password matches directly
  if (password === hashedOrPlain) return true;
  // If stored password is a bcrypt hash
  try {
    return await bcrypt.compare(password, hashedOrPlain);
  } catch {
    return false;
  }
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

