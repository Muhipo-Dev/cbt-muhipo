'use client'

import React, { useState } from 'react'
import {
  Printer,
  FileText,
  Users,
  CheckCircle2,
  Calendar,
} from 'lucide-react'

interface CetakDokumenViewProps {
  kelasList: any[]
  jadwalList: any[]
  siswaList: any[]
  settings: any
  showNotification: (title: string, message: string, type?: any) => void
}

export function CetakDokumenView({
  kelasList,
  jadwalList,
  siswaList,
  settings,
  showNotification,
}: CetakDokumenViewProps) {
  const [docType, setDocType] = useState<'kartu' | 'daftar_hadir' | 'berita_acara' | 'rekap_nilai'>('kartu')
  const [selectedKelas, setSelectedKelas] = useState<string>('ALL')
  const [selectedJadwalId, setSelectedJadwalId] = useState<string>('')
  const [pengawas1, setPengawas1] = useState<string>('Drs. H. Pengawas 1, M.Pd.')
  const [pengawas2, setPengawas2] = useState<string>('Pengawas Ruang 2, S.Pd.')

  const filteredSiswa = siswaList.filter((s) => {
    return selectedKelas === 'ALL' || s.kelasId === selectedKelas || s.kelas?.nama === selectedKelas
  })

  const selectedJadwal = jadwalList.find((j) => j.id === selectedJadwalId)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Control Panel (Hidden during print) */}
      <div className="print:hidden bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Cetak Dokumen & Berkas Ujian
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih format dokumen resmi, filter kelas, dan cetak langsung ke printer atau simpan PDF.
              </p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Sekarang (Ctrl+P)</span>
          </button>
        </div>

        {/* Doc Type Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
          {[
            { id: 'kartu', label: 'Kartu Peserta Ujian', icon: Users },
            { id: 'daftar_hadir', label: 'Daftar Hadir Siswa', icon: FileText },
            { id: 'berita_acara', label: 'Berita Acara Ujian', icon: CheckCircle2 },
            { id: 'rekap_nilai', label: 'Rekapitulasi Nilai', icon: Calendar },
          ].map((item) => {
            const Icon = item.icon
            const active = docType === item.id
            return (
              <button
                key={item.id}
                onClick={() => setDocType(item.id as any)}
                className={`p-3.5 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-indigo-500'}`} />
                <span className="text-xs font-bold">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Filter Rombel / Kelas</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white"
            >
              <option value="ALL">Semua Kelas ({siswaList.length} Siswa)</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Pilih Jadwal Ujian (Opsional)</label>
            <select
              value={selectedJadwalId}
              onChange={(e) => setSelectedJadwalId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-white"
            >
              <option value="">Semua / Pilih Ujian...</option>
              {jadwalList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.judul} ({j.bankSoal?.mataPelajaran?.nama || j.bankSoal?.nama})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Nama Pengawas Ujian</label>
            <input
              type="text"
              value={pengawas1}
              onChange={(e) => setPengawas1(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Printable Paper Area */}
      <div className="bg-white text-slate-950 p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0">
        {/* Header Dokumen Resmi */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6 text-center">
          <img
            src={settings.logoUrl || '/pic_logo.png'}
            alt="Logo Sekolah"
            className="w-16 h-16 object-contain shrink-0"
          />
          <div className="flex-1 px-4">
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wider">
              {settings.schoolName || 'SMA MUHAMMADIYAH 1 PONOROGO'}
            </h1>
            <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-800">
              COMPUTER BASED TEST (CBT) • TAHUN AJARAN {settings.academicYear || '2026/2027'}
            </h2>
            <p className="text-[11px] text-slate-600">
              Alamat: Jl. Budi Utomo No. 10, Ronowijayan, Siman, Ponorogo, Jawa Timur
            </p>
          </div>
          <div className="w-16 shrink-0" />
        </div>

        {/* 1. KARTU PESERTA */}
        {docType === 'kartu' && (
          <div>
            <h3 className="text-center font-bold text-sm uppercase underline mb-6">
              KARTU TANDA PESERTA CBT ({filteredSiswa.length} SISWA)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 print:grid-cols-2">
              {filteredSiswa.slice(0, 50).map((s: any) => (
                <div key={s.id} className="border border-black p-4 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center border-b border-black pb-1.5 font-bold">
                    <span>KARTU CBT MUHIPO</span>
                    <span className="font-mono">{s.kelas?.nama || '-'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <span className="text-slate-600">Nama:</span>
                    <span className="col-span-2 font-bold uppercase">{s.name}</span>
                    <span className="text-slate-600">Username:</span>
                    <span className="col-span-2 font-mono font-bold text-blue-800">{s.username}</span>
                    <span className="text-slate-600">Password:</span>
                    <span className="col-span-2 font-mono">123456</span>
                    <span className="text-slate-600">No. Peserta:</span>
                    <span className="col-span-2 font-mono">{s.nomorPeserta || s.username}</span>
                    <span className="text-slate-600">Jaringan Ujian:</span>
                    <span className="col-span-2 font-semibold text-emerald-800">Server Terpusat • WiFi Sekolah</span>
                  </div>
                </div>
              ))}
            </div>
            {filteredSiswa.length > 50 && (
              <p className="print:hidden text-center text-xs text-slate-500 mt-4">
                Menampilkan 50 siswa pertama dari total {filteredSiswa.length} siswa untuk kenyamanan pratinjau.
              </p>
            )}
          </div>
        )}

        {/* 2. DAFTAR HADIR */}
        {docType === 'daftar_hadir' && (
          <div>
            <div className="text-center mb-6">
              <h3 className="font-bold text-sm uppercase underline">DAFTAR HADIR PESERTA UJIAN</h3>
              <p className="text-xs text-slate-700 mt-1 font-semibold">
                Mata Pelajaran: {selectedJadwal?.bankSoal?.mataPelajaran?.nama || 'Semua Mapel'} • Kelas: {selectedKelas === 'ALL' ? 'Semua Kelas' : selectedKelas}
              </p>
            </div>
            <table className="w-full text-xs border-collapse border border-black">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th className="border border-black p-2 w-10">No</th>
                  <th className="border border-black p-2 w-28">Username / ID</th>
                  <th className="border border-black p-2 text-left">Nama Peserta</th>
                  <th className="border border-black p-2 w-24">Kelas</th>
                  <th className="border border-black p-2 w-32">Tanda Tangan</th>
                </tr>
              </thead>
              <tbody>
                {filteredSiswa.slice(0, 40).map((s: any, idx: number) => (
                  <tr key={s.id} className="border-b border-black">
                    <td className="border border-black p-2 text-center font-mono">{idx + 1}</td>
                    <td className="border border-black p-2 text-center font-mono">{s.username}</td>
                    <td className="border border-black p-2 font-semibold uppercase">{s.name}</td>
                    <td className="border border-black p-2 text-center">{s.kelas?.nama || '-'}</td>
                    <td className="border border-black p-2 text-left text-slate-400 pl-4">{idx + 1}. .........</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. BERITA ACARA */}
        {docType === 'berita_acara' && (
          <div className="space-y-4 text-xs">
            <h3 className="text-center font-bold text-sm uppercase underline mb-4">BERITA ACARA PELAKSANAAN UJIAN CBT</h3>
            <p className="leading-relaxed">
              Pada hari ini <b className="font-mono">....................</b> tanggal <b className="font-mono">......</b> bulan <b className="font-mono">....................</b> tahun <b className="font-mono">2026</b>, telah diselenggarakan Computer Based Test (CBT) untuk:
            </p>
            <div className="border border-black p-4 rounded-xl space-y-1">
              <div className="grid grid-cols-4">
                <span className="font-semibold">Mata Pelajaran</span>
                <span className="col-span-3">: {selectedJadwal?.bankSoal?.mataPelajaran?.nama || '...........................................'}</span>
                <span className="font-semibold">Tingkat / Kelas</span>
                <span className="col-span-3">: {selectedKelas === 'ALL' ? 'Semua Kelas' : selectedKelas}</span>
                <span className="font-semibold">Jumlah Peserta Terdaftar</span>
                <span className="col-span-3">: {filteredSiswa.length} Orang</span>
                <span className="font-semibold">Jumlah Peserta Hadir</span>
                <span className="col-span-3">: ...... Orang</span>
                <span className="font-semibold">Jumlah Peserta Tidak Hadir</span>
                <span className="col-span-3">: ...... Orang</span>
              </div>
            </div>
            <div className="pt-8 flex justify-between text-center">
              <div>
                <p>Pengawas Ruang 1</p>
                <div className="h-16" />
                <p className="font-bold underline">({pengawas1})</p>
              </div>
              <div>
                <p>Pengawas Ruang 2 / Proktor</p>
                <div className="h-16" />
                <p className="font-bold underline">({pengawas2})</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. REKAP NILAI */}
        {docType === 'rekap_nilai' && (
          <div>
            <div className="text-center mb-6">
              <h3 className="font-bold text-sm uppercase underline">REKAPITULASI NILAI UJIAN</h3>
              <p className="text-xs text-slate-700 mt-1 font-semibold">
                Ujian: {selectedJadwal?.judul || 'Semua Ujian'} • Kelas: {selectedKelas === 'ALL' ? 'Semua Kelas' : selectedKelas}
              </p>
            </div>
            <table className="w-full text-xs border-collapse border border-black">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th className="border border-black p-2 w-10">No</th>
                  <th className="border border-black p-2 w-28">Username / ID</th>
                  <th className="border border-black p-2 text-left">Nama Siswa</th>
                  <th className="border border-black p-2 w-24">Kelas</th>
                  <th className="border border-black p-2 w-20">Nilai Akhir</th>
                  <th className="border border-black p-2 w-24">Ketuntasan</th>
                </tr>
              </thead>
              <tbody>
                {filteredSiswa.slice(0, 40).map((s: any, idx: number) => (
                  <tr key={s.id} className="border-b border-black text-center">
                    <td className="border border-black p-2 font-mono">{idx + 1}</td>
                    <td className="border border-black p-2 font-mono">{s.username}</td>
                    <td className="border border-black p-2 text-left font-semibold uppercase">{s.name}</td>
                    <td className="border border-black p-2">{s.kelas?.nama || '-'}</td>
                    <td className="border border-black p-2 font-mono font-bold">-</td>
                    <td className="border border-black p-2 font-semibold text-slate-400">Belum Ujian</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
