'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircle2, FileSpreadsheet, Save, Search, UserCheck, AlertCircle, HelpCircle, Bot, Sparkles, RefreshCw } from 'lucide-react'
import { MathRenderer } from '@/components/MathRenderer'

interface TesEvaluasiViewProps {
  ujianList: any[]
  showNotification: (title: string, message: string, type?: any) => void
}

export function TesEvaluasiView({
  ujianList,
  showNotification,
}: TesEvaluasiViewProps) {
  const [selectedUjianId, setSelectedUjianId] = useState(ujianList[0]?.id || '')
  const [koreksiData, setKoreksiData] = useState<any>(null)
  const [selectedPesertaId, setSelectedPesertaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [scoreInputs, setScoreInputs] = useState<Record<string, number>>({})
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, any>>({})
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null)
  const [autoGradingAll, setAutoGradingAll] = useState(false)

  const handleAutoGradeUjian = async () => {
    if (!selectedUjianId) return
    try {
      setAutoGradingAll(true)
      const res = await fetch('/api/guru/koreksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'AUTO_GRADE_UJIAN',
          ujianId: selectedUjianId,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setScoreInputs({})
        showNotification('Penilaian Otomatis Selesai', json.message || 'Seluruh jawaban peserta berhasil dinilai ulang otomatis.', 'success')
        fetchKoreksiData(selectedUjianId)
      } else {
        showNotification('Gagal', json.message || 'Gagal menjalankan penilaian otomatis', 'error')
      }
    } catch (e: any) {
      showNotification('Error', 'Gagal menjalankan penilaian otomatis: ' + e.message, 'error')
    } finally {
      setAutoGradingAll(false)
    }
  }

  const handleRequestAiScore = async (jawaban: any) => {
    try {
      setAiLoadingId(jawaban.id)
      const res = await fetch('/api/guru/koreksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'AI_EVALUATE_ANSWER',
          pertanyaan: jawaban.soal?.pertanyaan || '',
          jawabanSiswa: jawaban.jawabanDipilih || '',
          rubrikKunci: jawaban.soal?.kunciJawabanTeks || '',
          tipeSoal: jawaban.soal?.tipeSoal || 'ESAI',
          bobot: jawaban.soal?.bobot || 5.0,
        }),
      })
      const json = await res.json()
      if (json.success && json.aiEvaluation) {
        setAiSuggestions((prev) => ({
          ...prev,
          [jawaban.id]: json.aiEvaluation,
        }))
        const proposedScore = json.aiEvaluation.skorUsulan !== undefined 
          ? json.aiEvaluation.skorUsulan 
          : (json.aiEvaluation.isBenar ? (jawaban.soal?.bobot || 5.0) : 0)
        setScoreInputs((prev) => ({
          ...prev,
          [jawaban.id]: proposedScore,
        }))
        const engineLabel = json.aiEvaluation.engine || 'AI Studio / Python'
        showNotification('Saran Skor AI Diterapkan', `Rekomendasi ${engineLabel}: ${proposedScore} poin (${json.aiEvaluation.feedback || 'Kesesuaian rubrik teranalisis'})`, 'success')
      }
    } catch (e: any) {
      showNotification('Gagal', 'Gagal memanggil AI Scorer: ' + e.message, 'error')
    } finally {
      setAiLoadingId(null)
    }
  }

  useEffect(() => {
    if (selectedUjianId) {
      fetchKoreksiData(selectedUjianId)
    }
  }, [selectedUjianId])

  const fetchKoreksiData = async (ujianId: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/guru/koreksi?ujianId=${ujianId}`)
      const json = await res.json()
      if (json.success) {
        setKoreksiData(json.data)
        // Auto select first peserta if available
        if (json.data.hasilList?.length > 0 && !selectedPesertaId) {
          setSelectedPesertaId(json.data.hasilList[0].id)
        }
      }
    } catch (err: any) {
      console.error('Fetch koreksi data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveScore = async (jawabanPesertaId: string, skor: number, pesertaUjianId: string) => {
    try {
      setSaving(true)
      const res = await fetch('/api/guru/koreksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jawabanPesertaId,
          skor,
          pesertaUjianId,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Nilai Disimpan', 'Nilai esai berhasil disimpan dan total skor otomatis dihitung ulang.', 'success')
        fetchKoreksiData(selectedUjianId)
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan nilai', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const activePeserta = koreksiData?.hasilList?.find((h: any) => h.id === selectedPesertaId)
  const essayQuestions = activePeserta?.jawabanPeserta?.filter(
    (j: any) => j.soal?.tipeSoal === 'ESAI' || j.soal?.tipeSoal === 'ISIAN'
  ) || []

  return (
    <div className="space-y-4">
      {/* Header & Selector */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-xs backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-500" />
            <span>Evaluasi & Koreksi Jawaban Esai Peserta</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Isian Singkat dinilai otomatis Exact Match (100% / 0), sedangkan Esai dinilai otomatis Penuh (100%), Setengah (50%), atau 0 berdasarkan kemiripan konsep kunci jawaban.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleAutoGradeUjian}
            disabled={autoGradingAll || !selectedUjianId}
            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="Hitung ulang nilai otomatis seluruh peserta (Isian Exact Match & Esai Penuh/Setengah/0)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoGradingAll ? 'animate-spin' : ''}`} />
            <span>{autoGradingAll ? 'Menilai Ulang...' : 'Nilai Otomatis Semua'}</span>
          </button>
          <select
            value={selectedUjianId}
            onChange={(e) => {
              setSelectedUjianId(e.target.value)
              setSelectedPesertaId('')
              setScoreInputs({})
            }}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-base sm:text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {ujianList.map((u) => (
              <option key={u.id} value={u.id}>
                {u.judul}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Kolom Kiri: Daftar Peserta Ujian Ini */}
        <div className="lg:col-span-4 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-sm backdrop-blur-xl space-y-3">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Daftar Peserta ({koreksiData?.hasilList?.length || 0})
          </h3>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {loading ? (
              <div className="text-center py-10 text-slate-400 text-xs">Memuat peserta...</div>
            ) : !koreksiData?.hasilList || koreksiData.hasilList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">Belum ada data pengerjaan ujian ini.</div>
            ) : (
              koreksiData.hasilList.map((p: any) => {
                const isSelected = p.id === selectedPesertaId
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPesertaId(p.id)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/5 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {p.siswa?.name}
                      </span>
                      <span className={`text-[11px] font-mono font-bold ${isSelected ? 'text-blue-200' : 'text-blue-600 dark:text-blue-400'}`}>
                        Total: {p.nilaiTotal ?? 0}
                      </span>
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                      {p.siswa?.kelas?.nama || 'Umum'} • User: {p.siswa?.username}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan: Lembar Koreksi Jawaban Esai Peserta Terpilih */}
        <div className="lg:col-span-8 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-5 shadow-sm backdrop-blur-xl space-y-4">
          {activePeserta ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Lembar Koreksi: {activePeserta.siswa?.name} ({activePeserta.siswa?.kelas?.nama || '-'})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Nilai PG: <b>{activePeserta.nilaiPG}</b> | Nilai Esai: <b>{activePeserta.nilaiEsai}</b> | Total Skor: <b>{activePeserta.nilaiTotal}</b>
                  </p>
                </div>
              </div>

              {essayQuestions.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Tidak ada butir soal esai atau isian singkat pada pengerjaan siswa ini.
                </div>
              ) : (
                <div className="space-y-4">
                  {essayQuestions.map((jawaban: any, idx: number) => {
                    const currentSkor = scoreInputs[jawaban.id] !== undefined ? scoreInputs[jawaban.id] : (jawaban.skor || 0)
                    const maxBobot = jawaban.soal?.bobot || 5.0

                    return (
                      <div
                        key={jawaban.id}
                        className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold">
                            Soal No. {jawaban.soal?.nomorUrut || idx + 1} ({jawaban.soal?.tipeSoal})
                          </span>
                          <span className="text-xs text-slate-500 font-semibold">
                            Maksimal Bobot: <b>{maxBobot} Poin</b>
                          </span>
                        </div>

                        {/* Pertanyaan */}
                        <div className="text-xs text-slate-900 dark:text-white font-medium">
                          <MathRenderer content={jawaban.soal?.pertanyaan || ''} />
                        </div>

                        {/* Kunci Referensi */}
                        {jawaban.soal?.kunciJawabanTeks && (
                          <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                            <b>Kunci Referensi / Rubrik:</b> {jawaban.soal?.kunciJawabanTeks}
                          </div>
                        )}

                        {/* Jawaban Siswa */}
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Jawaban yang ditulis siswa:
                          </span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium whitespace-pre-wrap">
                            {jawaban.jawabanDipilih || '(Siswa tidak mengisi jawaban)'}
                          </p>
                        </div>

                        {/* Catatan Penilaian Otomatis yang Tersimpan */}
                        {jawaban.catatanKoreksi && !aiSuggestions[jawaban.id] && (
                          <div className="p-2.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 text-[11px] text-blue-800 dark:text-blue-200 flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <span><b>Status Penilaian:</b> {jawaban.catatanKoreksi}</span>
                          </div>
                        )}

                        {/* Scoring Input & Save Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-white/5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Beri Skor:
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={maxBobot}
                              value={currentSkor}
                              onChange={(e) =>
                                setScoreInputs({
                                  ...scoreInputs,
                                  [jawaban.id]: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-20 min-h-[44px] sm:min-h-0 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-base sm:text-xs font-bold text-slate-900 dark:text-white text-center focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-xs text-slate-400">/ {maxBobot} Poin</span>

                            {/* Quick Preset Buttons: 0, Setengah (khusus ESAI), Penuh */}
                            <button
                              type="button"
                              onClick={() => handleSaveScore(jawaban.id, 0, activePeserta.id)}
                              disabled={saving}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition cursor-pointer"
                              title="Beri nilai 0"
                            >
                              0
                            </button>
                            {jawaban.soal?.tipeSoal === 'ESAI' && (
                              <button
                                type="button"
                                onClick={() => handleSaveScore(jawaban.id, Number((maxBobot * 0.5).toFixed(2)), activePeserta.id)}
                                disabled={saving}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] font-bold transition cursor-pointer"
                                title="Beri nilai setengah (50%)"
                              >
                                ½ ({Number((maxBobot * 0.5).toFixed(2))})
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSaveScore(jawaban.id, maxBobot, activePeserta.id)}
                              disabled={saving}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold transition cursor-pointer"
                              title="Beri nilai penuh (100%)"
                            >
                              Penuh ({maxBobot})
                            </button>

                            {/* Tombol Saran AI Studio / Python */}
                            <button
                              type="button"
                              onClick={() => handleRequestAiScore(jawaban)}
                              disabled={aiLoadingId === jawaban.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                              title="Hitung skor rekomendasi otomatis berbasis AI Studio / AI Engine"
                            >
                              <Bot className={`w-3.5 h-3.5 ${aiLoadingId === jawaban.id ? 'animate-spin' : 'text-indigo-600 dark:text-indigo-400'}`} />
                              <span>{aiLoadingId === jawaban.id ? 'Menganalisis...' : 'Koreksi Otomatis'}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSaveScore(jawaban.id, currentSkor, activePeserta.id)}
                            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Simpan Nilai</span>
                          </button>
                        </div>

                        {/* Banner Feedback Hasil Evaluasi AI */}
                        {aiSuggestions[jawaban.id] && (
                          <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Analisis Koreksi AI ({aiSuggestions[jawaban.id].engine || 'AI Engine'}):</span>
                            </div>
                            <p className="text-[11px] leading-relaxed">
                              {aiSuggestions[jawaban.id].feedback || 'Jawaban dianalisis berdasarkan kesesuaian konsep rubrik kunci jawaban.'}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 text-xs">
              Pilih salah satu peserta dari daftar sebelah kiri untuk memulai evaluasi esai.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
