'use client'

import { useState, useEffect } from 'react'

export interface ServerTimePayload {
  serverTimestamp: number
  serverTimeIso: string
  serverTimeFormatted: string
  serverDateFormatted: string
  serverTimeString: string
  timezone: string
  serverLocation: string
}

export const DEFAULT_SERVER_TIMEZONE = 'Asia/Jakarta'

let globalServerTimeOffset = 0

export async function syncServerTime(): Promise<{ offset: number; serverInfo: ServerTimePayload }> {
  const t0 = Date.now()
  try {
    const res = await fetch('/api/pengaturan', { cache: 'no-store' })
    const t3 = Date.now()
    if (!res.ok) throw new Error('Gagal sync')
    const json = await res.json()
    const serverTimestamp = json.serverTime?.timestamp || Date.now()
    const calculatedOffset = serverTimestamp - Math.floor((t0 + t3) / 2)
    globalServerTimeOffset = calculatedOffset

    return {
      offset: calculatedOffset,
      serverInfo: {
        serverTimestamp,
        serverTimeIso: json.serverTime?.iso || new Date().toISOString(),
        serverTimeFormatted: `${json.serverTime?.dateString} ${json.serverTime?.timeString}`,
        serverDateFormatted: json.serverTime?.dateString || formatDateWib(new Date()),
        serverTimeString: json.serverTime?.timeString || formatTimeWib(new Date()),
        timezone: json.data?.timezone || DEFAULT_SERVER_TIMEZONE,
        serverLocation: json.data?.serverLocation || 'Ponorogo, Jawa Timur',
      },
    }
  } catch (err) {
    return {
      offset: globalServerTimeOffset,
      serverInfo: {
        serverTimestamp: Date.now(),
        serverTimeIso: new Date().toISOString(),
        serverTimeFormatted: formatDateTimeWib(new Date()),
        serverDateFormatted: formatDateWib(new Date()),
        serverTimeString: formatTimeWib(new Date()),
        timezone: DEFAULT_SERVER_TIMEZONE,
        serverLocation: 'Ponorogo, Jawa Timur',
      },
    }
  }
}

export function getSyncedDate(): Date {
  return new Date(Date.now() + globalServerTimeOffset)
}

export function formatDateWib(date: Date | string | number | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: DEFAULT_SERVER_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatTimeWib(date: Date | string | number | null | undefined): string {
  if (!date) return '--:--:--'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '--:--:--'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: DEFAULT_SERVER_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d).replace(/\./g, ':')
}

export function formatDateTimeWib(date: Date | string | number | null | undefined): string {
  if (!date) return '-'
  return `${formatDateWib(date)} pukul ${formatTimeWib(date)} WIB`
}

export function useRealtimeServerClock(syncIntervalMs = 60000) {
  const [clock, setClock] = useState<{
    date: Date
    timeString: string
    dateString: string
    dateTimeString: string
  }>(() => {
    const now = getSyncedDate()
    return {
      date: now,
      timeString: formatTimeWib(now),
      dateString: formatDateWib(now),
      dateTimeString: formatDateTimeWib(now),
    }
  })

  useEffect(() => {
    syncServerTime().then((res) => {
      const now = new Date(Date.now() + res.offset)
      setClock({
        date: now,
        timeString: formatTimeWib(now),
        dateString: formatDateWib(now),
        dateTimeString: formatDateTimeWib(now),
      })
    })

    const secondInterval = setInterval(() => {
      const now = getSyncedDate()
      setClock({
        date: now,
        timeString: formatTimeWib(now),
        dateString: formatDateWib(now),
        dateTimeString: formatDateTimeWib(now),
      })
    }, 1000)

    const syncInterval = setInterval(() => {
      syncServerTime()
    }, syncIntervalMs)

    return () => {
      clearInterval(secondInterval)
      clearInterval(syncInterval)
    }
  }, [syncIntervalMs])

  return clock
}
