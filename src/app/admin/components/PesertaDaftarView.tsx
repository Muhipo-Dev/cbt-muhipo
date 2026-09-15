'use client'

import React, { useState, useMemo } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  KeyRound,
  Download,
  GraduationCap,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface PesertaDaftarViewProps {
  siswaList: any[]
  kelasList: any[]
  onRefresh: () => void
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}

export function PesertaDaftarView({
  siswaList,
  kelasList,
  onRefresh,
  showNotification,
  showConfirm,
}: PesertaDaftarViewProps) {
  const [search, setSearch] = useState('')
  const [filterKelas, setFilterKelas] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    nomorPeserta: '',
    kelasId: kelasList[0]?.id || '',
    jenisKelamin: 'L',
  })
  const [saving, setSaving] = useState(false)

  const handleOpenCreate = () => {
    setEditingItem(null)
    setForm({
      name: '',
      username: '',
      password: '',
      nomorPeserta: '',
      kelasId: kelasList[0]?.id || '',
      jenisKelamin: 'L',
    })
    setShowModal(true)
  }

  const handleOpenEdit = (item: any) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      username: item.username,
      password: '', // Kosongkan bila tidak ingin ganti password
      nomorPeserta: item.nomorPeserta || item.username || '',
      kelasId: item.kelasId || (item.kelas?.id || ''),
      jenisKelamin: item.jenisKelamin || 'L',
    })
    setShowModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showNotification('Peringatan', 'Nama lengkap peserta wajib diisi', 'warning')
      return
    }
    if (!form.username.trim()) {
      showNotification('Peringatan', 'Username / ID login peserta wajib diisi', 'warning')
      return
    }

    try {
      setSaving(true)
      const action = editingItem ? 'UPDATE_SISWA' : 'CREATE_SISWA'
      const payload = editingItem ? { action, id: editingItem.id, ...form } : { action, ...form }

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        showNotification('Berhasil', editingItem ? 'Data peserta berhasil diperbarui' : 'Peserta baru berhasil didaftarkan', 'success')
        setShowModal(false)
        onRefresh()
      } else {
        showNotification('Gagal', json.message || 'Gagal menyimpan peserta', 'error')
      }
    } catch (err: any) {
      showNotification('Error', 'Gagal menyimpan: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (item: any) => {
    showConfirm(
      'Hapus Peserta?',
      `Apakah Anda yakin ingin menghapus peserta "${item.name}" (${item.username})? Riwayat ujian peserta ini akan terhapus.`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_SISWA', id: item.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Berhasil', 'Peserta berhasil dihapus', 'success')
            onRefresh()
          } else {
            showNotification('Gagal', json.message || 'Gagal menghapus peserta', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal menghapus: ' + err.message, 'error')
        }
      }
    )
  }

  const handleResetPassword = (item: any) => {
    showConfirm(
      'Reset Password Peserta?',
      `Reset kata sandi untuk ${item.name} (${item.username}) ke default "123456"?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'RESET_PASSWORD', userId: item.id, newPassword: '123456' }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Password Direset', json.message || 'Password berhasil direset ke 123456', 'success')
          } else {
            showNotification('Gagal', json.message || 'Gagal reset password', 'error')
          }
        } catch (err: any) {
          showNotification('Error', 'Gagal reset: ' + err.message, 'error')
        }
      }
    )
  }

  const handleExportExcel = () => {
    if (!filteredSiswa.length) {
      showNotification('Informasi', 'Tidak ada data peserta untuk diekspor.', 'info')
      return
    }

    const rows = filteredSiswa.map((s, idx) => ({
      No: idx + 1,
      Username: s.username,
      'Nama Lengkap': s.name,
      'Nomor Peserta': s.nomorPeserta || s.username,
      'Group / Kelas': s.kelas?.nama || '-',
      'Ruang Ujian': s.ruangUjian || 'Ruang 1',
      'Sesi Ujian': s.sesiUjian || 1,
      'Jenis Kelamin': s.jenisKelamin || 'L',
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Peserta')
    XLSX.writeFile(workbook, `Daftar_Peserta_CBT_${filterKelas !== 'ALL' ? filterKelas : 'Semua'}.xlsx`)
    showNotification('Berhasil', 'Data peserta berhasil diekspor ke Excel.', 'success')
  }

  const filteredSiswa = useMemo(() => {
    return (siswaList || []).filter((s) => {
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.username?.toLowerCase().includes(q) ||
        s.nomorPeserta?.toLowerCase().includes(q)

      const matchKelas = filterKelas === 'ALL' || s.kelasId === filterKelas || s.kelas?.id === filterKelas
      return matchSearch && matchKelas
    })
  }, [siswaList, search, filterKelas])

  return (
    <div className="space-y-4">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-500" />
            <span>Data Peserta Ujian (Siswa)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Daftar seluruh siswa/peserta terdaftar di CBT MUHIPO beserta Username, Group/Kelas, dan nomor peserta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            title="Ekspor Data ke Excel"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Peserta</span>
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan Username / ID, Nama Siswa, No Peserta..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <select
            value={filterKelas}
            onChange={(e) => setFilterKelas(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">Semua Group / Kelas ({siswaList.length} Siswa)</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                Group: {k.nama} (Kls {k.tingkat})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Username / ID</th>
                <th className="py-3.5 px-4">Nama Lengkap Siswa</th>
                <th className="py-3.5 px-4">Group / Kelas</th>
                <th className="py-3.5 px-4">No Peserta</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {filteredSiswa.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    Tidak ada data peserta yang sesuai dengan pencarian / filter.
                  </td>
                </tr>
              ) : (
                filteredSiswa.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {s.username}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-[10px] text-slate-400">JK: {s.jenisKelamin || 'L'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px]">
                        {s.kelas?.nama || 'Tanpa Group'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{s.nomorPeserta || '-'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleResetPassword(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition cursor-pointer"
                          title="Reset Password ke 123456"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition cursor-pointer"
                          title="Edit Peserta"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition cursor-pointer"
                          title="Hapus Peserta"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Peserta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              {editingItem ? 'Edit Data Peserta Ujian' : 'Tambah Peserta Ujian Baru'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Ahmad Dahlan"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username / ID Login *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="Contoh: 20261001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Password {editingItem ? '(Kosongkan jika tetap)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingItem ? '••••••••' : 'Default 123456'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs focus:outline-none focus:border-blue-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nomor Peserta (Opsional)
                  </label>
                  <input
                    type="text"
                    value={form.nomorPeserta}
                    onChange={(e) => setForm({ ...form, nomorPeserta: e.target.value })}
                    placeholder="Contoh: MHP-001"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={form.jenisKelamin}
                    onChange={(e) => setForm({ ...form, jenisKelamin: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Group / Kelas *
                </label>
                <select
                  value={form.kelasId}
                  onChange={(e) => setForm({ ...form, kelasId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">-- Tanpa Group --</option>
                  {kelasList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Daftarkan Peserta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

