export interface QueueSlot {
  token: string;
  ip: string;
  joinedAt: number;
  lastActive: number;
  admittedAt?: number;
}

export interface WaitingRoomMetrics {
  activeUsers: number;
  maxCapacity: number;
  queuedUsers: number;
  currentRps: number;
  rpsThreshold: number;
  cpuPercent: number;
  ramPercent: number;
  isTrafficCritical: boolean;
  forceEnabled: boolean;
}

class WaitingRoomManager {
  // Parameter Kapasitas & Perlindungan Lonjakan Beban (High Capacity CBT)
  public maxConcurrentActive = 1000; // Kapasitas 1000 pengguna aktif serentak
  public maxRpsThreshold = 250; // Kuota traffic hingga 250 req/detik
  public tokenTtlMs = 15 * 60 * 1000; // Masa berlaku tiket admit (15 menit)
  public queueTtlMs = 5 * 60 * 1000; // Masa tunggu tiket antrean
  public forceEnabled = false; // Mode darurat aktif manual oleh admin

  // State in-memory
  private activeTokens = new Map<string, QueueSlot>();
  private waitingQueue: QueueSlot[] = [];
  private requestCounter = 0;
  private currentRps = 0;
  private lastRpsCheck = Date.now();

  // Metric CPU Tracking
  private lastCpuUsage: any = null;
  private lastCpuCheck = Date.now();
  private currentCpuPercent = 0;
  private currentRamPercent = 0;

  private timer: any = null;

  constructor() {
    if (typeof process !== 'undefined' && typeof (process as any).cpuUsage === 'function') {
      this.lastCpuUsage = (process as any).cpuUsage();
    }
    this.startMonitoring();
  }

  private startMonitoring() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  private tick() {
    const now = Date.now();
    const elapsed = (now - this.lastRpsCheck) / 1000;
    if (elapsed >= 1) {
      this.currentRps = Math.round(this.requestCounter / elapsed);
      this.requestCounter = 0;
      this.lastRpsCheck = now;
    }

    // Kalkulasi CPU usage persentase Node.js terukur secara aman
    try {
      if (typeof process !== 'undefined' && typeof (process as any).cpuUsage === 'function' && this.lastCpuUsage) {
        const cpuElapsedMs = now - this.lastCpuCheck;
        if (cpuElapsedMs >= 1000) {
          const cpuUsageDiff = (process as any).cpuUsage(this.lastCpuUsage);
          const totalCpuTimeMs = (cpuUsageDiff.user + cpuUsageDiff.system) / 1000;
          this.currentCpuPercent = Math.min(
            100,
            Math.round((totalCpuTimeMs / cpuElapsedMs) * 100),
          );
          this.lastCpuUsage = (process as any).cpuUsage();
          this.lastCpuCheck = now;
        }
      }
    } catch {
      this.currentCpuPercent = 0;
    }

    // Kalkulasi RAM Process Heap vs Total Heap
    try {
      if (typeof process !== 'undefined' && typeof (process as any).memoryUsage === 'function') {
        const mem = (process as any).memoryUsage();
        this.currentRamPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
      }
    } catch {
      this.currentRamPercent = 0;
    }

    // Bersihkan token aktif yang sudah expired
    for (const [token, slot] of this.activeTokens.entries()) {
      if (now - slot.lastActive > this.tokenTtlMs) {
        this.activeTokens.delete(token);
      }
    }

    // Bersihkan antrean yang abandoned (tidak refresh status > 35 detik)
    this.waitingQueue = this.waitingQueue.filter(
      (slot) => now - slot.lastActive < 35000,
    );

    // Admit pengguna antrean terdepan jika kuota slot aktif masih tersedia
    const availableSlots = this.maxConcurrentActive - this.activeTokens.size;
    if (
      availableSlots > 0 &&
      this.waitingQueue.length > 0 &&
      !this.isTrafficCritical()
    ) {
      const toAdmitCount = Math.min(
        availableSlots,
        Math.ceil(this.maxConcurrentActive * 0.2),
        this.waitingQueue.length,
      );
      for (let i = 0; i < toAdmitCount; i++) {
        const nextUser = this.waitingQueue.shift();
        if (nextUser) {
          nextUser.admittedAt = now;
          nextUser.lastActive = now;
          this.activeTokens.set(nextUser.token, nextUser);
        }
      }
    }
  }

  public recordRequest() {
    this.requestCounter++;
  }

  public isTrafficCritical(): boolean {
    if (this.forceEnabled) return true;

    // 1. Cek RPS (Request Per Detik) ekstrem (> 250 req/detik)
    if (this.currentRps > this.maxRpsThreshold) return true;

    // 2. Cek Kapasitas Pengguna Aktif Serentak (> 1000 concurrent user)
    if (this.activeTokens.size >= this.maxConcurrentActive) return true;

    // 3. HIGH DEMAND OPTIMIZATION (HANYA AKTIF JIKA CPU & RAM > 90%)
    const isCpuOverloaded = this.currentCpuPercent > 90;
    const isRamOverloaded = this.currentRamPercent > 90;

    if (isCpuOverloaded && isRamOverloaded) {
      return true;
    }

    return false;
  }

  public isAdmitted(token?: string | null): boolean {
    if (!token) return false;
    const slot = this.activeTokens.get(token);
    if (slot) {
      slot.lastActive = Date.now();
      return true;
    }
    return false;
  }

  public getOrCreateQueue(
    token?: string | null,
    ip?: string,
  ): {
    token: string;
    status: 'ADMITTED' | 'QUEUED';
    position: number;
    totalWaiting: number;
    estimatedWaitSeconds: number;
  } {
    const now = Date.now();

    // 1. Cek apakah sudah admitted
    if (token && this.activeTokens.has(token)) {
      const slot = this.activeTokens.get(token)!;
      slot.lastActive = now;
      return {
        token,
        status: 'ADMITTED',
        position: 0,
        totalWaiting: this.waitingQueue.length,
        estimatedWaitSeconds: 0,
      };
    }

    // 2. Jika sistem TIDAK sedang lonjakan beban & antrean kosong, langsung admit tanpa antre
    if (!this.isTrafficCritical() && this.waitingQueue.length === 0) {
      const newToken = token || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
      this.activeTokens.set(newToken, {
        token: newToken,
        ip: ip || 'unknown',
        joinedAt: now,
        lastActive: now,
        admittedAt: now,
      });
      return {
        token: newToken,
        status: 'ADMITTED',
        position: 0,
        totalWaiting: 0,
        estimatedWaitSeconds: 0,
      };
    }

    // 3. Sistem sedang lonjakan beban / antrean penuh -> Masukkan ke Waiting Queue
    let existingIndex = token
      ? this.waitingQueue.findIndex((s) => s.token === token)
      : -1;
    let slotToken = token;

    if (existingIndex >= 0) {
      this.waitingQueue[existingIndex].lastActive = now;
    } else {
      slotToken = token || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36));
      this.waitingQueue.push({
        token: slotToken,
        ip: ip || 'unknown',
        joinedAt: now,
        lastActive: now,
      });
      existingIndex = this.waitingQueue.length - 1;
    }

    const position = existingIndex + 1;
    const estimatedWaitSeconds = Math.max(3, Math.ceil(position * 1.5));

    return {
      token: slotToken!,
      status: 'QUEUED',
      position,
      totalWaiting: this.waitingQueue.length,
      estimatedWaitSeconds,
    };
  }

  public getMetrics(): WaitingRoomMetrics {
    return {
      activeUsers: this.activeTokens.size,
      maxCapacity: this.maxConcurrentActive,
      queuedUsers: this.waitingQueue.length,
      currentRps: this.currentRps,
      rpsThreshold: this.maxRpsThreshold,
      cpuPercent: this.currentCpuPercent,
      ramPercent: this.currentRamPercent,
      isTrafficCritical: this.isTrafficCritical(),
      forceEnabled: this.forceEnabled,
    };
  }

  public setCapacity(maxActive?: number, maxRps?: number, force?: boolean): WaitingRoomMetrics {
    if (typeof maxActive === 'number' && maxActive > 0) this.maxConcurrentActive = maxActive;
    if (typeof maxRps === 'number' && maxRps > 0) this.maxRpsThreshold = maxRps;
    if (typeof force === 'boolean') this.forceEnabled = force;
    return this.getMetrics();
  }
}

// Preserve instance across Next.js hot reloads in dev mode
const globalForWaitingRoom = globalThis as unknown as {
  waitingRoomManager?: WaitingRoomManager;
};

export const waitingRoomService =
  globalForWaitingRoom.waitingRoomManager ?? new WaitingRoomManager();

if (process.env.NODE_ENV !== 'production') {
  globalForWaitingRoom.waitingRoomManager = waitingRoomService;
}
