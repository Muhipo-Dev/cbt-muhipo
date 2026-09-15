'use client'

import React, { useState } from 'react'
import {
  Settings,
  School,
  Clock,
  Save,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  Database,
} from 'lucide-react'
import { compressImageFile } from '@/lib/imageCompressor'

interface PengaturanViewProps {
  settingsForm: any
  setSettingsForm: React.Dispatch<React.SetStateAction<any>>
  onSaveSettings: (e: React.FormEvent) => void
  savingSettings: boolean
  onNavigateToBackup?: () => void
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
}

export function PengaturanView({
  settingsForm,
  setSettingsForm,
  onSaveSettings,
  savingSettings,
  onNavigateToBackup,
  onRefresh,
  showNotification,
}: PengaturanViewProps) {
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      showNotification('Memproses', 'Mengompres dan menyimpan logo...', 'info')
      const compressed = await compressImageFile(file, { maxWidth: 600, maxHeight: 600, quality: 0.85 })
      const newSettings = { ...settingsForm, logoUrl: compressed.dataUrl }
      setSettingsForm(newSettings)

      const res = await fetch('/api/pengaturan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      const json = await res.json()
      if (json.success && json.data?.logoUrl) {
        setSettingsForm((prev: any) => ({ ...prev, logoUrl: json.data.logoUrl }))
        showNotification('Sukses', 'Logo berhasil disimpan permanen ke basis data!', 'success')
      }
    } catch (err) {
      showNotification('Peringatan', 'Terjadi kesalahan saat memproses logo.', 'warning')
    }
  }

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      showNotification('Memproses', 'Mengompres dan menyimpan wallpaper background...', 'info')
      const compressed = await compressImageFile(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85 })
      const newSettings = { ...settingsForm, backgroundUrl: compressed.dataUrl }
      setSettingsForm(newSettings)

      const res = await fetch('/api/pengaturan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })
      const json = await res.json()
      if (json.success && json.data?.backgroundUrl) {
        setSettingsForm((prev: any) => ({ ...prev, backgroundUrl: json.data.backgroundUrl }))
        showNotification('Sukses', 'Wallpaper Background Master berhasil disimpan!', 'success')
      }
    } catch (err) {
      showNotification('Peringatan', 'Terjadi kesalahan saat memproses wallpaper background.', 'warning')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-400">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Pengaturan CBT
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Konfigurasi identitas sekolah, logo, background, tahun ajaran, dan zona waktu server.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateToBackup && (
            <button
              type="button"
              onClick={onNavigateToBackup}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span>Backup & Pemeliharaan Data</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang Pengaturan</span>
          </button>
        </div>
      </div>

      <form onSubmit={onSaveSettings} className="space-y-6">
        {/* Identitas Sekolah */}
        <div className="bg-white/90 dark:bg-slate-900/85 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-sm dark:shadow-xl backdrop-blur-xl overflow-hidden">
          <div className="border-b border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 flex items-center gap-2">
            <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Identitas & Tampilan Aplikasi</h3>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Satuan Pendidikan / Sekolah
                </label>
                <input
                  type="text"
                  value={settingsForm.schoolName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Aplikasi CBT
                </label>
                <input
                  type="text"
                  value={settingsForm.appTitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, appTitle: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tahun Ajaran Aktif
                </label>
                <input
                  type="text"
                  value={settingsForm.academicYear}
                  onChange={(e) => setSettingsForm({ ...settingsForm, academicYear: e.target.value })}
                  placeholder="2026/2027"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Semester Aktif
                </label>
                <select
                  value={settingsForm.semester}
                  onChange={(e) => setSettingsForm({ ...settingsForm, semester: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white"
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                </select>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-white/5 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Logo Sekolah & CBT
              </label>
              <div className="flex items-center gap-4">
                {settingsForm.logoUrl && (
                  <img
                    src={settingsForm.logoUrl}
                    alt="Logo"
                    className="w-12 h-12 object-contain rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-white dark:bg-slate-800 shadow-sm shrink-0"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-600/20 file:text-blue-700 dark:file:text-blue-300 cursor-pointer"
                />
              </div>
            </div>

            {/* Background Upload */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-white/5 space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Wallpaper Background Master
              </label>
              <div className="flex items-center gap-4">
                {settingsForm.backgroundUrl && (
                  <img
                    src={settingsForm.backgroundUrl}
                    alt="Background"
                    className="w-20 h-12 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 dark:file:bg-blue-600/20 file:text-blue-700 dark:file:text-blue-300 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Menyimpan...' : 'Simpan Perubahan Pengaturan'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
