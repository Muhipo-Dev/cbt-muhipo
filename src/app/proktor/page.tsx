'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SchoolBrandHeader } from '@/components/SchoolBrandHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { NotificationModal, NotificationType } from '@/components/NotificationModal';
import {
  MonitorPlay,
  RotateCcw,
  PlusCircle,
  KeyRound,
  ShieldCheck,
  Users,
  Clock,
  LogOut,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Compass,
  Check,
  AlertTriangle,
} from 'lucide-react';

export default function ProktorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedUjianId, setSelectedUjianId] = useState('');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Modal actions
  const [extraTimeModal, setExtraTimeModal] = useState<any>(null);
  const [extraMinutes, setExtraMinutes] = useState(15);
  const [actionLoading, setActionLoading] = useState(false);
  const [securityModalData, setSecurityModalData] = useState<any>(null);
  const [showProktorGuideModal, setShowProktorGuideModal] = useState(false);

  // In-App Notification / Dialog Modal State
  const [notifModal, setNotifModal] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showNotification = (
    title: string,
    message: string | React.ReactNode,
    type: NotificationType = 'info',
    onConfirm?: () => void
  ) => {
    setNotifModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText: 'Tutup',
      onConfirm: () => {
        setNotifModal((prev) => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  const showConfirm = (
    title: string,
    message: string | React.ReactNode,
    onConfirm: () => void,
    type: NotificationType = 'warning',
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal'
  ) => {
    setNotifModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        setNotifModal((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => {
        setNotifModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };
  const [settings, setSettings] = useState<{
    logoUrl?: string | null;
    backgroundUrl?: string | null;
    appTitle?: string;
    schoolName?: string;
  }>({
    logoUrl: '/pic_logo.png',
    backgroundUrl: '/muhipo-log.jpg',
    appTitle: 'CBT SMA MUHIPO',
    schoolName: 'SMA Muhammadiyah 1 Ponorogo',
  });

  useEffect(() => {
    fetchMonitorData();
    fetch('/api/pengaturan')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSettings({
            logoUrl: json.data.logoUrl || '/pic_logo.png',
            backgroundUrl: json.data.backgroundUrl || '/muhipo-log.jpg',
            appTitle: json.data.appTitle || 'CBT SMA MUHIPO',
            schoolName: json.data.schoolName || 'SMA Muhammadiyah 1 Ponorogo',
          });
        }
      })
      .catch(() => {});

    // Auto-refresh data status peserta setiap 10 detik
    const interval = setInterval(() => {
      fetchMonitorData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedUjianId]);

  const fetchMonitorData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      const url = selectedUjianId
        ? `/api/proktor?ujianId=${selectedUjianId}`
        : '/api/proktor';

      const res = await fetch(url);
      const json = await res.json();

      if (json.success) {
        setData(json.data);
        if (!selectedUjianId && json.data.activeUjian) {
          setSelectedUjianId(json.data.activeUjian.id);
        }
      } else {
        router.push('/login');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'POST' });
    router.push('/login');
  };

  // Reset Login Siswa
  const handleResetLogin = async (pesertaUjianId: string, namaSiswa: string) => {
    showConfirm(
      'Reset Login Peserta',
      `Reset status login siswa "${namaSiswa}" agar dapat login & ujian kembali?`,
      async () => {
        try {
          const res = await fetch('/api/proktor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'RESET_LOGIN',
              pesertaUjianId,
            }),
          });
          const resJson = await res.json();
          if (resJson.success) {
            showNotification('Reset Berhasil', resJson.message, 'success');
            fetchMonitorData(true);
          } else {
            showNotification('Gagal', resJson.message || 'Gagal mereset status peserta', 'error');
          }
        } catch (e) {
          showNotification('Error', 'Gagal mereset status peserta', 'error');
        }
      }
    );
  };

  // Reset Login Semua Siswa
  const handleResetAllLogins = async () => {
    if (!data?.activeUjian?.id) return;
    showConfirm(
      'Reset Login Massal',
      `Reset seluruh status login peserta untuk ujian "${data.activeUjian.judul}"? Siswa yang bermasalah akan dapat login ulang.`,
      async () => {
        try {
          const res = await fetch('/api/proktor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'RESET_ALL_LOGINS',
              ujianId: data.activeUjian.id,
            }),
          });
          const resJson = await res.json();
          if (resJson.success) {
            showNotification('Reset Massal Sukses', resJson.message, 'success');
            fetchMonitorData(true);
          } else {
            showNotification('Gagal', resJson.message || 'Gagal mereset login massal', 'error');
          }
        } catch (e) {
          showNotification('Error', 'Gagal mereset login massal', 'error');
        }
      },
      'warning',
      'Ya, Reset Semua Peserta'
    );
  };

  // Kunci Ujian Siswa
  const handleLockExam = async (pesertaUjianId: string, namaSiswa: string) => {
    showConfirm(
      'Kunci Lembar Ujian',
      `Kunci lembar ujian siswa "${namaSiswa}" karena pelanggaran?`,
      async () => {
        try {
          const res = await fetch('/api/proktor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'LOCK_EXAM', pesertaUjianId }),
          });
          const resJson = await res.json();
          if (resJson.success) {
            showNotification('Ujian Terkunci', resJson.message, 'warning');
            fetchMonitorData(true);
          } else {
            showNotification('Gagal', resJson.message || 'Gagal mengunci ujian', 'error');
          }
        } catch (e) {
          showNotification('Error', 'Gagal mengunci ujian', 'error');
        }
      },
      'error',
      'Ya, Kunci Ujian'
    );
  };

  // Buka Kunci Siswa
  const handleUnlockExam = async (pesertaUjianId: string, namaSiswa: string) => {
    try {
      const res = await fetch('/api/proktor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UNLOCK_EXAM', pesertaUjianId }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        showNotification('Kunci Dibuka', resJson.message, 'success');
        fetchMonitorData(true);
      } else {
        showNotification('Gagal', resJson.message || 'Gagal membuka kunci ujian', 'error');
      }
    } catch (e) {
      showNotification('Error', 'Gagal membuka kunci ujian', 'error');
    }
  };

  // Selesaikan Paksa Ujian Siswa
  const handleFinishForce = async (pesertaUjianId: string, namaSiswa: string) => {
    showConfirm(
      'Selesaikan Paksa Ujian',
      `Selesaikan dan kumpulkan lembar ujian siswa "${namaSiswa}" secara paksa?`,
      async () => {
        try {
          const res = await fetch('/api/proktor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'FINISH_FORCE', pesertaUjianId }),
          });
          const resJson = await res.json();
          if (resJson.success) {
            showNotification('Ujian Diselesaikan', resJson.message, 'success');
            fetchMonitorData(true);
          } else {
            showNotification('Gagal', resJson.message || 'Gagal menyelesaikan paksa ujian', 'error');
          }
        } catch (e) {
          showNotification('Error', 'Gagal menyelesaikan paksa ujian', 'error');
        }
      },
      'error',
      'Ya, Selesaikan Paksa'
    );
  };

  // Tambah Waktu Ujian untuk Siswa Tertentu
  const handleAddExtraTime = async () => {
    if (!extraTimeModal) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/proktor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_TIME',
          pesertaUjianId: extraTimeModal.pesertaUjianId,
          extraMinutes,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        showNotification('Waktu Tambahan', resJson.message, 'success');
        setExtraTimeModal(null);
        fetchMonitorData(true);
      } else {
        showNotification('Gagal', resJson.message || 'Gagal menambah waktu ujian', 'error');
      }
    } catch (e) {
      showNotification('Error', 'Gagal menambah waktu ujian', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // List Kelas Unik di Jadwal Ujian
  const kelasOptions = React.useMemo(() => {
    if (!data?.pesertaList) return [];
    const unique = new Set<string>();
    data.pesertaList.forEach((p: any) => {
      if (p.kelas && p.kelas !== '-') unique.add(p.kelas);
    });
    return Array.from(unique).sort();
  }, [data]);

  const filteredPeserta = (data?.pesertaList || []).filter((p: any) => {
    const matchKelas = selectedKelasFilter === 'ALL' || p.kelas === selectedKelasFilter;
    const q = searchFilter.toLowerCase();
    const matchSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q) ||
      (p.nomorPeserta && p.nomorPeserta.toLowerCase().includes(q)) ||
      (p.kelas && p.kelas.toLowerCase().includes(q));
    return matchKelas && matchSearch;
  });

  // Hitung summary
  const totalPeserta = filteredPeserta.length;
  const countSelesai = filteredPeserta.filter((p: any) => p.status === 'SELESAI').length;
  const countMengerjakan = filteredPeserta.filter((p: any) => p.status === 'SEDANG_MENGERJAKAN').length;
  const countBelum = filteredPeserta.filter((p: any) => p.status === 'BELUM_MULAI').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Menghubungkan ke Ruang Proktor CBT SMA MUHIPO...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* Proktor Topbar */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <SchoolBrandHeader
          subtitle="Manajemen Ujian SMA Muhammadiyah 1 Ponorogo"
          logoUrl={settings.logoUrl}
          appTitle={settings.appTitle || 'CBT SMA MUHIPO'}
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowProktorGuideModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/30 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-cyan-600/20"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Panduan & SOP Proktor</span>
          </button>

          <button
            onClick={() => fetchMonitorData(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-800 text-xs font-semibold text-rose-300 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Monitoring Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Exam Quick Status & Live Stats */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold mb-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>Ujian Aktif Terpilih</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {data?.activeUjian?.judul || 'Tidak Ada Jadwal Ujian Aktif'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Mapel: <b>{data?.activeUjian?.bankSoal?.mataPelajaran?.nama || '-'}</b> • Durasi: <b>{data?.activeUjian?.durasiMenit || 0} Menit</b> • Kode: <span className="font-mono text-cyan-400">{data?.activeUjian?.kodeUjian || '-'}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Selector Kelas Rombel */}
              <select
                value={selectedKelasFilter}
                onChange={(e) => setSelectedKelasFilter(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                <option value="ALL">Semua Kelas ({data?.pesertaList?.length || 0})</option>
                {kelasOptions.map((k) => (
                  <option key={k} value={k}>
                    Kelas {k} ({data?.pesertaList?.filter((p: any) => p.kelas === k).length || 0})
                  </option>
                ))}
              </select>

              <select
                value={selectedUjianId}
                onChange={(e) => {
                  setSelectedUjianId(e.target.value);
                  setSelectedKelasFilter('ALL');
                }}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                {data?.ujianList?.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.kodeUjian} - {u.judul}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Live Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[11px] font-semibold">Total Peserta:</span>
              <span className="text-xl font-black text-white">{totalPeserta}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-amber-400 block text-[11px] font-semibold">Sedang Mengerjakan:</span>
              <span className="text-xl font-black text-amber-300">{countMengerjakan}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-emerald-400 block text-[11px] font-semibold">Selesai Ujian:</span>
              <span className="text-xl font-black text-emerald-300">{countSelesai}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[11px] font-semibold">Belum Memulai:</span>
              <span className="text-xl font-black text-slate-400">{countBelum}</span>
            </div>
          </div>
        </div>

        {/* Live Student Table Monitor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Live Status & Aktivitas Siswa di Ruangan</span>
                {selectedKelasFilter !== 'ALL' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Kelas: {selectedKelasFilter}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Menampilkan <b>{filteredPeserta.length}</b> siswa {selectedKelasFilter !== 'ALL' ? `di kelas ${selectedKelasFilter}` : 'di semua kelas'}
              </p>
            </div>

            {/* Actions & Search Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={handleResetAllLogins}
                className="px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Semua Login</span>
              </button>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Cari nama siswa / ID..."
                  className="pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Filter Cepat Barisan Kelas */}
          {kelasOptions.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-semibold shrink-0">Filter Kelas:</span>
              <button
                type="button"
                onClick={() => setSelectedKelasFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                  selectedKelasFilter === 'ALL'
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Semua Kelas ({data?.pesertaList?.length || 0})
              </button>
              {kelasOptions.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedKelasFilter(k)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                    selectedKelasFilter === k
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Kelas {k} ({data?.pesertaList?.filter((p: any) => p.kelas === k).length || 0})
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Username / ID</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Progress / Soal</th>
                  <th className="py-3 px-4">Catatan Log / Peringatan</th>
                  <th className="py-3 px-4 text-right">Aksi Pengawas / Proktor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPeserta.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Tidak ada data siswa ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredPeserta.map((peserta: any) => {
                    const isSelesai = peserta.status === 'SELESAI';
                    const isMengerjakan = peserta.status === 'SEDANG_MENGERJAKAN';
                    const isTerkunci = peserta.status === 'TERKUNCI';

                    return (
                      <tr key={peserta.pesertaUjianId} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                          {peserta.username}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-white block">{peserta.name}</span>
                          <span className="text-[11px] text-slate-500 font-mono">@{peserta.username}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{peserta.kelas || '-'}</td>
                        <td className="py-3 px-4">
                          {isSelesai ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Selesai
                            </span>
                          ) : isTerkunci ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <AlertCircle className="w-3 h-3" /> Terkunci
                            </span>
                          ) : isMengerjakan ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse">
                              <Clock className="w-3 h-3" /> Mengerjakan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              Belum Login
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">
                          {peserta.jumlahJawaban} Soal
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {peserta.jumlahPelanggaran > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSecurityModalData(peserta)}
                              className="text-left group cursor-pointer"
                            >
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 group-hover:bg-rose-500/25 transition mb-1">
                                <AlertCircle className="w-3 h-3" /> {peserta.jumlahPelanggaran} Pelanggaran
                              </span>
                              {peserta.logsTerakhir && peserta.logsTerakhir.length > 0 && (
                                <p className="text-[11px] text-rose-300/80 line-clamp-1 group-hover:text-rose-200">
                                  {peserta.logsTerakhir[0].detail}
                                </p>
                              )}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <ShieldCheck className="w-3.5 h-3.5" /> Aman / Terkunci Baik
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleResetLogin(peserta.pesertaUjianId, peserta.name)}
                            title="Reset Login Siswa"
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[11px] font-semibold transition cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 inline mr-0.5" />
                            Reset
                          </button>

                          {isMengerjakan && (
                            <button
                              type="button"
                              onClick={() => setExtraTimeModal(peserta)}
                              title="Tambah Waktu Ujian"
                              className="px-2 py-1 rounded-lg bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-[11px] font-semibold transition cursor-pointer"
                            >
                              <PlusCircle className="w-3.5 h-3.5 inline mr-0.5" />
                              +Waktu
                            </button>
                          )}

                          {isTerkunci ? (
                            <button
                              type="button"
                              onClick={() => handleUnlockExam(peserta.pesertaUjianId, peserta.name)}
                              title="Buka Kunci Ujian"
                              className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px] font-semibold transition cursor-pointer"
                            >
                              Buka Kunci
                            </button>
                          ) : !isSelesai ? (
                            <button
                              type="button"
                              onClick={() => handleLockExam(peserta.pesertaUjianId, peserta.name)}
                              title="Kunci Ujian Siswa"
                              className="px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[11px] font-semibold transition cursor-pointer"
                            >
                              Kunci
                            </button>
                          ) : null}

                          {!isSelesai && (
                            <button
                              type="button"
                              onClick={() => handleFinishForce(peserta.pesertaUjianId, peserta.name)}
                              title="Kumpulkan Paksa Ujian Siswa"
                              className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] font-semibold transition cursor-pointer"
                            >
                              Selesaikan
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Extra Time Modal */}
      {extraTimeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Tambah Waktu Ujian</h3>
            <p className="text-xs text-slate-400">
              Berikan tambahan waktu untuk peserta: <b>{extraTimeModal.name}</b>
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Jumlah Menit Tambahan:
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={extraMinutes}
                onChange={(e) => setExtraMinutes(Number(e.target.value))}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-base focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExtraTimeModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleAddExtraTime}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-lg shadow-cyan-700/30"
              >
                {actionLoading ? 'Memproses...' : `+${extraMinutes} Menit`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Audit Modal */}
      {securityModalData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">
                  Audit Keamanan & Log Pelanggaran
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalData(null)}
                className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white"
              >
                Tutup
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Nama Siswa:</span>
                <b className="text-white">{securityModalData.name}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Username / ID:</span>
                <span className="font-mono text-cyan-400">{securityModalData.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kelas:</span>
                <span className="text-slate-200">{securityModalData.kelas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Pelanggaran:</span>
                <span className="font-bold text-rose-400">{securityModalData.jumlahPelanggaran} Kali</span>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <span className="text-xs font-semibold text-slate-400 block">Riwayat Aktivitas Terakhir:</span>
              {securityModalData.logsTerakhir?.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300">{log.aktivitas}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{log.detail}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  handleLockExam(securityModalData.pesertaUjianId, securityModalData.name);
                  setSecurityModalData(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold transition"
              >
                Kunci Ujian Siswa Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResetLogin(securityModalData.pesertaUjianId, securityModalData.name);
                  setSecurityModalData(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                Reset Sesi Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <AppFooter className="border-slate-900 bg-slate-950/80" />

      {/* MODAL PANDUAN & SOP OPERASIONAL PROKTOR CBT */}
      {showProktorGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">Panduan & SOP Pengawas Ruang / Proktor CBT</h3>
                  <p className="text-xs text-slate-400">Petunjuk Pemantauan Live, Penanganan Kendala Peserta, & Reset Login Siswa</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProktorGuideModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-300">
              {/* Seksi 1: Alur Kerja Proktor */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>1. Alur & SOP Pengawasan Ujian di Ruangan</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 inline-block">1. Sebelum Ujian</span>
                    <p className="text-xs leading-relaxed text-slate-400">
                      • Pastikan siswa telah duduk di ruangan sesuai nomor peserta.<br/>
                      • Siswa langsung dapat masuk & memulai ujian sesuai jadwal tanpa memerlukan token.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 inline-block">2. Saat Ujian</span>
                    <p className="text-xs leading-relaxed text-slate-400">
                      • Pantau tabel live (Siswa kuning = sedang mengerjakan, hijau = selesai).<br/>
                      • Cek notifikasi & log warna merah bila siswa kedapatan membuka aplikasi lain atau keluar fullscreen.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 inline-block">3. Selesai Ujian</span>
                    <p className="text-xs leading-relaxed text-slate-400">
                      • Pastikan seluruh status siswa telah berubah menjadi <b>SELESAI (Hijau)</b> sebelum siswa meninggalkan ruang ujian.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seksi 2: Tindakan Cepat Mengatasi Kendala Siswa */}
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span>2. Panduan Tombol Aksi Cepat & Troubleshooting</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <b className="text-cyan-400 font-bold flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Tombol "Reset Login"</span>
                    </b>
                    <p className="text-slate-400 leading-relaxed">
                      Gunakan jika siswa berganti perangkat smartphone/laptop, browser tertutup tanpa sengaja, atau baterai habis. <i>Semua jawaban yang sudah dipilih sebelumnya tetap aman di server.</i>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <b className="text-amber-400 font-bold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Tombol "+ Waktu"</span>
                    </b>
                    <p className="text-slate-400 leading-relaxed">
                      Gunakan untuk memberikan dispensasi waktu tambahan (+15 / +30 menit) kepada siswa yang mengalami keterlambatan teknis di ruang ujian.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <b className="text-rose-400 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Tombol "Kunci Ujian" / "Selesaikan Paksa"</span>
                    </b>
                    <p className="text-slate-400 leading-relaxed">
                      Gunakan jika siswa terbukti melakukan pelanggaran berat berulang kali atau menolak mengikuti tata tertib ruang ujian.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                    <b className="text-purple-400 font-bold flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Tombol "Reset Login Massal"</span>
                    </b>
                    <p className="text-slate-400 leading-relaxed">
                      Gunakan jika terjadi pemadaman listrik sesaat atau restart router WiFi ruangan secara bersamaan agar seluruh siswa dapat langsung login ulang.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowProktorGuideModal(false)}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                Saya Mengerti, Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global In-App Notification & Confirmation Dialog Modal */}
      <NotificationModal
        isOpen={notifModal.isOpen}
        type={notifModal.type}
        title={notifModal.title}
        message={notifModal.message}
        confirmText={notifModal.confirmText}
        cancelText={notifModal.cancelText}
        onConfirm={notifModal.onConfirm}
        onCancel={notifModal.onCancel}
      />
    </div>
  );
}
