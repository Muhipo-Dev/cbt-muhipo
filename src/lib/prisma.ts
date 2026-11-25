import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import { withOptimize } from '@prisma/extension-optimize';

export * from './enums';

function getOptimizedDatabaseUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;

  if (rawUrl.startsWith('prisma://') || rawUrl.startsWith('prisma+postgres://')) {
    return rawUrl;
  }

  try {
    const url = new URL(rawUrl);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', process.env.PRISMA_CONNECTION_LIMIT || '100');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.PRISMA_POOL_TIMEOUT || '30');
    }
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function createPrismaClient() {
  const optimizedUrl = getOptimizedDatabaseUrl();
  const baseClient = new PrismaClient({
    ...(optimizedUrl ? { datasources: { db: { url: optimizedUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  let client: any = baseClient;

  if (process.env.OPTIMIZE_API_KEY) {
    client = client.$extends(withOptimize({ apiKey: process.env.OPTIMIZE_API_KEY }));
  }

  if (optimizedUrl?.startsWith('prisma://') || optimizedUrl?.startsWith('prisma+postgres://')) {
    client = client.$extends(withAccelerate());
  }

  return client as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
