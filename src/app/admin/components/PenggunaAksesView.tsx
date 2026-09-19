'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  KeyRound,
  Plus,
  Edit,
  Trash2,
  Search,
  CheckCircle2,
  Crown,
  Radio,
  BookOpen,
  GraduationCap,
  Sparkles,
  Lock,
  RotateCcw,
} from 'lucide-react'

interface PenggunaAksesViewProps {
  currentUser: any
  kelasList: any[]
  showNotification: (title: string, message: string, type?: any) => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
}

export function PenggunaAksesView({
  currentUser,
  kelasList,
  showNotification,
  showConfirm,
}: PenggunaAksesViewProps) {
  const [usersList, setUsersList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('ALL')

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'ADMIN',
    nip: '',
    jenisKelamin: 'L',
  })
  const [saving, setSaving] = useState(false)

  // Password reset modal
  const [resetModal, setResetModal] = useState<any>(null)
  const [newPasswordInput, setNewPasswordInput] = useState('')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin?tab=users')
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setUsersList(json.data)
      }
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleOpenCreate = () => {
    setEditingUser(null)
    setForm({
      username: '',
      password: '',
      name: '',
      role: 'ADMIN',
      nip: '',
      jenisKelamin: 'L',
    })
    setShowModal(true)
  }

  const handleOpenEdit = (user: any) => {
    setEditingUser(user)
    setForm({
      username: user.username,
      password: '',
      name: user.name,
      role: user.role,
      nip: user.nip || '',
      jenisKelamin: user.jenisKelamin || 'L',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const action = editingUser ? 'UPDATE_USER' : 'CREATE_USER'
      const payload: any = {
        action,
        ...form,
      }
      if (editingUser) {
        payload.userId = editingUser.id
      }

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json.success) {
        showNotification(
          editingUser ? 'Hak Akses Diperbarui' : 'Pengguna Ditambahkan',
          json.message,
          'success'
        )
        setShowModal(false)
        fetchUsers()
      } else {
        showNotification('Gagal Simpan', json.message || 'Terjadi kesalahan.', 'error')
      }
    } catch (err) {
      showNotification('Error', 'Gagal memproses data pengguna.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (user: any) => {
    showConfirm(
      'Hapus Pengguna',
      `Yakin ingin menghapus pengguna "${user.name}" (${user.username} - ${user.role})?`,
      async () => {
        try {
          const res = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'DELETE_USER', userId: user.id }),
          })
          const json = await res.json()
          if (json.success) {
            showNotification('Pengguna Dihapus', json.message, 'success')
            fetchUsers()
          } else {
            showNotification('Gagal Hapus', json.message || 'Gagal menghapus pengguna.', 'error')
          }
        } catch (err) {
          showNotification('Error', 'Gagal menghapus pengguna.', 'error')
        }
      }
    )
  }

  const handleResetPassword = async () => {
    if (!resetModal) return
    const pass = newPasswordInput.trim()
    if (!pass) {
      showNotification('Peringatan', 'Silakan masukkan kata sandi baru.', 'warning')
      return
    }

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_PASSWORD',
          userId: resetModal.id,
          newPassword: pass,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showNotification('Reset Password', json.message, 'success')
        setResetModal(null)
        setNewPasswordInput('')
      } else {
        showNotification('Gagal', json.message || 'Gagal reset kata sandi', 'error')
      }
    } catch (err) {
      showNotification('Error', 'Gagal reset kata sandi', 'error')
    }
  }

  const roleCounts = useMemo(() => {
    const counts = {
      SUPERADMIN: 0,
      ADMIN: 0,
      PROKTOR: 0,
      GURU: 0,
      TOTAL: usersList.length,
    }
    usersList.forEach((u) => {
      if (counts[u.role as keyof typeof counts] !== undefined) {
        counts[u.role as keyof typeof counts]++
      }
    })
    return counts
  }, [usersList])

  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchRole = filterRole === 'ALL' || u.role === filterRole
      const q = search.toLowerCase().trim()
      const matchSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.nip?.toLowerCase().includes(q)
      return matchRole && matchSearch
    })
  }, [usersList, filterRole, search])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/40 shadow-xs">
            <Crown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            SUPER ADMIN
          </span>
        )
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/40">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            ADMINISTRATOR (FULL AKSES)
          </span>
        )
      case 'PROKTOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/40">
            <Radio className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            PROKTOR
          </span>
        )
      case 'GURU':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            GURU PENGAJAR
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            {role}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Manajemen Pengguna & Hak Akses
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40">
                  Superadmin • Administrator • Proktor • Guru
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kelola hak akses pengguna: <strong className="text-slate-700 dark:text-slate-200">Super Admin</strong>, <strong className="text-blue-600 dark:text-blue-400">Administrator</strong>, <strong className="text-rose-600 dark:text-rose-400">Proktor</strong>, dan <strong className="text-emerald-600 dark:text-emerald-400">Guru (Bank Soal & Koreksi Nilai)</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>

        {/* Role Overview Stat Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200/60 dark:border-white/5 text-xs">
          <div
            onClick={() => setFilterRole('SUPERADMIN')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterRole === 'SUPERADMIN'
                ? 'bg-purple-500/15 border-purple-500/50 shadow-sm'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 hover:bg-purple-500/10'
            }`}
          >
            <span className="text-purple-600 dark:text-purple-400 font-bold block">Super Admin</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">{roleCounts.SUPERADMIN} Akun</span>
          </div>

          <div
            onClick={() => setFilterRole('ADMIN')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterRole === 'ADMIN'
                ? 'bg-blue-500/15 border-blue-500/50 shadow-sm'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 hover:bg-blue-500/10'
            }`}
          >
            <span className="text-blue-600 dark:text-blue-400 font-bold block">Administrator (Full)</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">{roleCounts.ADMIN} Akun</span>
          </div>

          <div
            onClick={() => setFilterRole('PROKTOR')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterRole === 'PROKTOR'
                ? 'bg-rose-500/15 border-rose-500/50 shadow-sm'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 hover:bg-rose-500/10'
            }`}
          >
            <span className="text-rose-600 dark:text-rose-400 font-bold block">Proktor (Pengawasan)</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">{roleCounts.PROKTOR} Akun</span>
          </div>

          <div
            onClick={() => setFilterRole('GURU')}
            className={`p-3 rounded-2xl border transition cursor-pointer ${
              filterRole === 'GURU'
                ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm'
                : 'bg-slate-50 dark:bg-white/5 border-slate-200/60 dark:border-white/5 hover:bg-emerald-500/10'
            }`}
          >
            <span className="text-emerald-600 dark:text-emerald-400 font-bold block">Guru (Soal & Koreksi)</span>
            <span className="text-xl font-black text-slate-900 dark:text-white">{roleCounts.GURU} Akun</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, username, NIP..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
            >
              <option value="ALL">Semua Pengguna ({roleCounts.TOTAL})</option>
              <option value="SUPERADMIN">Super Admin ({roleCounts.SUPERADMIN})</option>
              <option value="ADMIN">Administrator Full Akses ({roleCounts.ADMIN})</option>
              <option value="PROKTOR">Proktor (Pengawasan) ({roleCounts.PROKTOR})</option>
              <option value="GURU">Guru (Soal & Koreksi Nilai) ({roleCounts.GURU})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Pengguna */}
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100/90 dark:bg-slate-950/90 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="py-3 px-4 font-bold w-12">No</th>
                <th className="py-3 px-4 font-bold">Pengguna</th>
                <th className="py-3 px-4 font-bold">Username / Login</th>
                <th className="py-3 px-4 font-bold text-center">Hak Akses (Role)</th>
                <th className="py-3 px-4 font-bold">Wewenang / Otoritas Menu</th>
                <th className="py-3 px-4 font-bold text-center">Aksi Super Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Tidak ditemukan pengguna yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => {
                  const isCurrent = currentUser?.id === u.id || currentUser?.username === u.username
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                              ANDA
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {u.nip ? `NIP: ${u.nip}` : '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {u.username}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getRoleBadge(u.role)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {u.role === 'SUPERADMIN' ? (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            Full Akses Server, Pengaturan & Manajemen Pengguna
                          </span>
                        ) : u.role === 'ADMIN' ? (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            Full Akses: Modul, Soal, Peserta, Tes, Pengawasan & Pengaturan
                          </span>
                        ) : u.role === 'PROKTOR' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Modul Soal, Data Tes (Tambah/Kelola Tes) & Pengawasan Live
                          </span>
                        ) : u.role === 'GURU' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Bank Soal, Pengawasan Live, Koreksi Esai/Isian & Rekap Nilai Siswa
                          </span>
                        ) : (
                          <span>Akses Terbatas</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setResetModal(u)
                              setNewPasswordInput('')
                            }}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition cursor-pointer"
                            title="Reset Kata Sandi"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition cursor-pointer"
                            title="Edit Data & Ubah Role"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrent && (
                            <button
                              onClick={() => handleDelete(u)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition cursor-pointer"
                              title="Hapus Pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Pengguna & Ubah Hak Akses */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {editingUser ? 'Ubah Data & Hak Akses Pengguna' : 'Tambah Pengguna & Hak Akses'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Hak Akses (Role)
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-purple-400/50 dark:border-purple-500/50 text-xs font-bold text-purple-700 dark:text-purple-300 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="SUPERADMIN">👑 SUPER ADMIN (Wewenang Penuh Server & Manajemen User)</option>
                  <option value="ADMIN">🛡️ ADMINISTRATOR (Full Akses Semua Menu CBT)</option>
                  <option value="PROKTOR">📡 PROKTOR (Modul Soal, Data Tes & Pengawasan Live)</option>
                  <option value="GURU">👨‍🏫 GURU (Bank Soal, Pengawasan & Koreksi Nilai Siswa)</option>
                </select>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  * <strong>Superadmin & Administrator</strong> memiliki full akses sistem. <strong>Proktor</strong> mengelola Modul Soal, Tes, dan Pengawasan. <strong>Guru</strong> mengelola Bank Soal, Pengawasan, serta Evaluasi / Koreksi Esai & Rekap Nilai Siswa.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Username / ID Login *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="misal: admin, nailar, guru_mtk"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {editingUser ? 'Password Baru (Kosongkan jika tetap)' : 'Password Awal *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={editingUser ? 'Biarkan kosong jika tidak diubah' : 'Default: 123456'}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap Pengguna *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama Lengkap Beserta Gelar"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  NIP / Identitas Pegawai (Opsional)
                </label>
                <input
                  type="text"
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  placeholder="Nomor Induk Pegawai jika ada"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Reset Kata Sandi</h3>
                <p className="text-xs text-slate-500">{resetModal.name} ({resetModal.username})</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kata Sandi Baru (Diisi Manual) *
              </label>
              <input
                type="text"
                autoFocus
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Masukkan kata sandi baru..."
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-amber-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleResetPassword()
                  }
                }}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Ketikkan kata sandi baru manual untuk pengguna ini.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setResetModal(null)
                  setNewPasswordInput('')
                }}
                className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
