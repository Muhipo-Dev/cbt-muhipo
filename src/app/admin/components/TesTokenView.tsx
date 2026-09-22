'use client'

import React, { useState, useEffect } from 'react'
import { KeyRound, RefreshCw, Copy, Check, Clock, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react'

interface TesTokenViewProps {
  ujianList: any[]
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
}

function generateRandomToken(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let token = ''
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

export function TesTokenView({
  ujianList,
  onRefresh,
  showNotification,
}: TesTokenViewProps) {
  const activeExams = ujianList.filter((u) => u.status !== 'NONAKTIF')
  const defaultToken = activeExams[0]?.token || 'ABCDEF'

  const [currentToken, setCurrentToken] = useState(defaultToken)
  const [copied, setCopied] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (activeExams[0]?.token) {
      setCurrentToken(activeExams[0].token)
    }
  }, [activeExams])

  const handleCopy = () => {
    navigator.clipboard.writeText(currentToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    showNotification('Tersalin', `Token ujian '${currentToken}' berhasil disalin ke clipboard!`, 'success')
  }

  const handleGenerateNew = async () => {
    const newToken = generateRandomToken(6)
    try {
      setUpdating(true)
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GENERATE_TOKEN_UJIAN',
          length: 6,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCurrentToken(json.token || newToken)
        showNotification('Token Terbit', `Token ujian berhasil diperbarui menjadi '${json.token || newToken}'.`, 'success')
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal generate token', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal generate: ' + err.message, 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleApplyCustomToken = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = customInput.trim().toUpperCase()
    if (!clean) return

    try {
      setUpdating(true)
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_TOKEN_UJIAN',
          token: clean,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setCurrentToken(clean)
        setCustomInput('')
        showNotification('Token Diperbarui', `Token ujian berhasil diubah menjadi '${clean}'.`, 'success')
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal update token', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal update token: ' + err.message, 'error')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Main Token Display Card */}
      <div className="bg-gradient-to-br from-blue-900/40 via-indigo-950/50 to-slate-900/80 border border-blue-500/30 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl text-center space-y-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-400 text-xs font-bold">
            <KeyRound className="w-3.5 h-3.5 animate-pulse" />
            <span>Manajemen Token Ujian CBT</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Token Ujian Aktif Saat Ini
          </h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Bagikan token 6 karakter berikut kepada peserta ujian untuk membuka lembar soal pengerjaan CBT.
          </p>
        </div>

        {/* Large Token Badge */}
        <div className="py-5 px-8 max-w-md mx-auto rounded-3xl bg-slate-950/80 border-2 border-blue-500/50 shadow-inner flex items-center justify-center gap-3">
          {currentToken.split('').map((char: string, idx: number) => (
            <span
              key={idx}
              className="w-12 h-14 rounded-2xl bg-gradient-to-b from-blue-600 to-indigo-700 text-white font-mono font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-blue-600/40 border border-blue-400/40"
            >
              {char}
            </span>
          ))}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Token Tersalin!' : 'Salin Token'}</span>
          </button>

          <button
            type="button"
            disabled={updating}
            onClick={handleGenerateNew}
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center gap-2 border border-white/10 shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${updating ? 'animate-spin' : ''}`} />
            <span>{updating ? 'Memperbarui...' : 'Generate Token Baru (Acak)'}</span>
          </button>
        </div>

        {/* Custom Input Form */}
        <form onSubmit={handleApplyCustomToken} className="max-w-sm mx-auto pt-4 border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            maxLength={8}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
            placeholder="Atur Token Manual (cth: PAS01)..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-mono font-bold uppercase text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 text-center tracking-wider"
          />
          <button
            type="submit"
            disabled={updating || !customInput.trim()}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
          >
            Terapkan
          </button>
        </form>
      </div>

      {/* List of Active Tests Linked to this Token */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-sm backdrop-blur-xl space-y-3">
        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Jadwal Tes Terhubung dengan Token Ini ({activeExams.length} Tes)</span>
        </h3>

        <div className="space-y-2">
          {activeExams.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              Belum ada jadwal tes yang aktif. Buat tes baru pada menu "Tambah Tes".
            </div>
          ) : (
            activeExams.map((u) => (
              <div
                key={u.id}
                className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200/60 dark:border-white/5 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{u.judul}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Mapel: {u.bankSoal?.mataPelajaran?.nama || '-'} • Durasi: {u.durasiMenit} Menit
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {u.token || currentToken}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    {u.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
