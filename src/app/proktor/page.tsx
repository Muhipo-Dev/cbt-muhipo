'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SchoolBrandHeader } from '@/components/SchoolBrandHeader';
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
} from 'lucide-react';

export default function ProktorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [selectedUjianId, setSelectedUjianId] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Modal actions
  const [tokenModal, setTokenModal] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [extraTimeModal, setExtraTimeModal] = useState<any>(null);
  const [extraMinutes, setExtraMinutes] = useState(15);
  const [actionLoading, setActionLoading] = useState(false);

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
    backgroundUrl: '/muhipo-front.jpg',
    appTitle: 'CBT MUHIPO',
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
            backgroundUrl: json.data.backgroundUrl || '/muhipo-front.jpg',
            appTitle: json.data.appTitle || 'CBT MUHIPO',
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

  // Generate / Ganti Token Ujian Baru
  const handleUpdateToken = async () => {
    if (!newToken || !data?.activeUjian?.id) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/proktor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CHANGE_TOKEN',
          ujianId: data.activeUjian.id,
          newToken,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        showNotification('Token Diperbarui', resJson.message, 'success');
        setTokenModal(false);
        fetchMonitorData(true);
      } else {
        showNotification('Gagal', resJson.message || 'Gagal update token', 'error');
      }
    } catch (e) {
      showNotification('Error', 'Gagal update token', 'error');
    } finally {
      setActionLoading(false);
    }
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

  const filteredPeserta = (data?.pesertaList || []).filter((p: any) => {
    const q = searchFilter.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.nis?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q) ||
      (p.nomorPeserta && p.nomorPeserta.toLowerCase().includes(q))
    );
  });

  // Hitung summary
  const totalPeserta = data?.pesertaList?.length || 0;
  const countSelesai = data?.pesertaList?.filter((p: any) => p.status === 'SELESAI').length || 0;
  const countMengerjakan = data?.pesertaList?.filter((p: any) => p.status === 'SEDANG_MENGERJAKAN').length || 0;
  const countBelum = data?.pesertaList?.filter((p: any) => p.status === 'BELUM_MULAI').length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Menghubungkan ke Ruang Proktor CBT Muhipo...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* Proktor Topbar */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between">
        <SchoolBrandHeader
          subtitle={`Ruang Monitoring Proktor & Pengawas - ${settings.schoolName || 'SMA Muhammadiyah 1 Ponorogo'}`}
          logoUrl={settings.logoUrl}
          appTitle={settings.appTitle || 'CBT'}
        />

        <div className="flex items-center gap-3">
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
        {/* Top Controls & Active Exam Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Exam Selector & Details */}
          <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Jadwal Ujian Terpilih
                </span>
                <h2 className="text-xl font-extrabold text-white">
                  {data?.activeUjian?.judul || 'Pilih Jadwal Ujian'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mata Pelajaran: <b>{data?.activeUjian?.bankSoal?.mataPelajaran?.nama}</b> • Durasi: <b>{data?.activeUjian?.durasiMenit} Menit</b>
                </p>
              </div>

              {/* Selector */}
              <select
                value={selectedUjianId}
                onChange={(e) => setSelectedUjianId(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {data?.ujianList?.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.kodeUjian} - {u.judul}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Live Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block">Total Peserta:</span>
                <span className="text-lg font-black text-white">{totalPeserta}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <span className="text-amber-400 block">Mengerjakan:</span>
                <span className="text-lg font-black text-amber-300">{countMengerjakan}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <span className="text-emerald-400 block">Selesai:</span>
                <span className="text-lg font-black text-emerald-300">{countSelesai}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                <span className="text-slate-500 block">Belum Login:</span>
                <span className="text-lg font-black text-slate-400">{countBelum}</span>
              </div>
            </div>
          </div>

          {/* Token Card (Khas Proktor Zya/Candy CBT) */}
          <div className="lg:col-span-4 bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-900 border border-cyan-800/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  TOKEN UJIAN AKTIF
                </span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono">
                  RILIS
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-[0.2em] text-cyan-300 text-center py-4 bg-slate-950/80 rounded-2xl border border-cyan-900/60 shadow-inner my-2">
                {data?.activeUjian?.token || '------'}
              </div>
              <p className="text-[11px] text-slate-400 text-center">
                Sampaikan token ini kepada siswa di ruangan setelah seluruh peserta siap.
              </p>
            </div>

            <button
              onClick={() => {
                setNewToken(data?.activeUjian?.token || '');
                setTokenModal(true);
              }}
              className="w-full mt-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-700/30 transition cursor-pointer"
            >
              Generate / Ganti Token Baru
            </button>
          </div>
        </div>

        {/* Live Student Table Monitor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Live Status & Aktivitas Siswa di Ruangan
              </h3>
              <p className="text-xs text-slate-400">
                Pantau proses pengerjaan, tangani kendala perangkat, kunci pelanggaran, atau selesaikan ujian.
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
                  placeholder="Cari nama siswa / NIS..."
                  className="pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">NIS</th>
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
                          {peserta.nis || peserta.username || peserta.nomorPeserta}
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
                          {peserta.logsTerakhir && peserta.logsTerakhir.length > 0 ? (
                            <div className="text-[11px] text-rose-400 line-clamp-2">
                              ⚠️ {peserta.logsTerakhir[0].aktivitas}: {peserta.logsTerakhir[0].detail}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Normal (Stabil)</span>
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

      {/* Token Modal */}
      {tokenModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Ganti Token Ujian</h3>
            <p className="text-xs text-slate-400">
              Masukkan token baru 6 huruf kapital untuk jadwal ujian aktif ini:
            </p>
            <input
              type="text"
              maxLength={10}
              value={newToken}
              onChange={(e) => setNewToken(e.target.value.toUpperCase())}
              placeholder="Contoh: MUHIPO / PAS2026"
              className="w-full text-center tracking-[0.2em] font-mono text-xl font-bold py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase"
            />
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTokenModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={actionLoading || !newToken}
                onClick={handleUpdateToken}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shadow-lg shadow-cyan-700/30"
              >
                {actionLoading ? 'Menyimpan...' : 'Simpan Token'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        © 2026 Proktor Station — CBT SMA Muhammadiyah 1 Ponorogo
      </footer>

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
