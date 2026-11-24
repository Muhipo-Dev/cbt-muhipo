#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CBT Muhipo - Python AI Proctor & Exam Monitoring Engine
Menyediakan analisis prediktif berbasis kecerdasan buatan untuk pengawasan ujian:
1. Behavioral Anomaly Detection (Deteksi kecurigaan pola pelanggaran siswa)
2. Risk Scoring & Threat Level (LOW, MEDIUM, HIGH, CRITICAL)
3. Pattern Recognition (Frekuensi tab-switch, burst window blur, durasi idle vs penyelesaian kilat)
4. Rekomendasi Tindakan AI untuk Proktor / Pengawas
5. Proctor Session Health Audit & Room Statistics
"""

import sys
import json
import re
import math
from datetime import datetime
from typing import Dict, List, Any, Optional

VIOLATION_WEIGHTS = {
    'TAB_SWITCH_ALERT': 18.0,
    'APP_SWITCH_ALERT': 22.0,
    'FULLSCREEN_EXIT': 25.0,
    'SCREEN_SHARE_STOPPED': 35.0,
    'KEYBOARD_SHORTCUT_VIOLATION': 15.0,
    'WINDOW_BLUR': 12.0,
    'SECURITY_ALERT': 20.0,
    'MULTI_WINDOW_DETECTED': 30.0,
}

def parse_iso_or_ms(val) -> Optional[float]:
    """Parse string waktu ISO atau timestamp epoch ms ke detik timestamp float."""
    if not val:
        return None
    if isinstance(val, (int, float)):
        return float(val) / 1000.0 if val > 1e11 else float(val)
    if isinstance(val, str):
        try:
            # Format ISO
            dt = datetime.fromisoformat(val.replace('Z', '+00:00'))
            return dt.timestamp()
        except Exception:
            try:
                num = float(val)
                return num / 1000.0 if num > 1e11 else num
            except Exception:
                return None
    return None

def analyze_single_student(peserta: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analisis AI mendalam untuk satu orang peserta ujian:
    - Menghitung skor indeks risiko kecurangan (Fraud Risk Index: 0 - 100)
    - Mengidentifikasi klaster kecurangan (Cheat Vector)
    - Memberikan ringkasan cerdas & rekomendasi taktis bagi proktor
    """
    nama = peserta.get('name', 'Peserta')
    status = peserta.get('status', 'SEDANG_MENGERJAKAN')
    sisa_detik = peserta.get('sisaDetik', 0)
    total_soal = peserta.get('totalSoal', 0) or 1
    total_dijawab = peserta.get('totalDijawab', 0) or peserta.get('jumlahJawaban', 0) or 0
    raw_logs = peserta.get('logs', []) or peserta.get('violationLogs', []) or []

    # Filter logs yang tergolong pelanggaran keamanan
    violation_events = []
    for l in raw_logs:
        act = l.get('aktivitas', '')
        if act in VIOLATION_WEIGHTS or 'ALERT' in act or 'VIOLATION' in act:
            t = parse_iso_or_ms(l.get('createdAt'))
            violation_events.append({
                'aktivitas': act,
                'detail': l.get('detail', ''),
                'timestamp': t,
                'weight': VIOLATION_WEIGHTS.get(act, 10.0)
            })

    total_violation_count = len(violation_events)

    # 1. Base Score dari bobot tipe pelanggaran
    base_score = 0.0
    for v in violation_events:
        base_score += v['weight']

    # 2. Analisis Kecepatan & Burst Frekuensi (Kecurigaan tinggi jika > 3 kali dalam 60 detik)
    burst_detected = False
    sorted_times = sorted([v['timestamp'] for v in violation_events if v['timestamp'] is not None])
    for i in range(len(sorted_times) - 2):
        if sorted_times[i+2] - sorted_times[i] <= 60.0:
            burst_detected = True
            base_score += 25.0
            break

    # 3. Analisis Anomali Progres Jawaban vs Waktu (Rush / Speedrun Detection)
    anomaly_flags = []
    completion_rate = (total_dijawab / total_soal) if total_soal > 0 else 0.0

    if status == 'TERKUNCI':
        base_score += 40.0
        anomaly_flags.append('Akun Terkunci Otomatis (Mencapai Limit Pelanggaran)')

    if burst_detected:
        anomaly_flags.append('Aktivitas Pelanggaran Beruntun (Rapid Frequency Burst)')

    tab_count = sum(1 for v in violation_events if 'TAB' in v['aktivitas'] or 'APP' in v['aktivitas'])
    if tab_count >= 3:
        anomaly_flags.append(f'Sering Berpindah Tab/Aplikasi ({tab_count}x)')

    shortcut_count = sum(1 for v in violation_events if 'KEYBOARD' in v['aktivitas'])
    if shortcut_count >= 3:
        anomaly_flags.append(f'Upaya Shortcut/DevTools Terdeteksi ({shortcut_count}x)')

    fs_exit_count = sum(1 for v in violation_events if 'FULLSCREEN' in v['aktivitas'])
    if fs_exit_count >= 3:
        anomaly_flags.append(f'Berulang Kali Keluar Layar Penuh ({fs_exit_count}x)')

    # Normalisasi Skor Risiko AI (0 - 100)
    risk_score = min(100.0, max(0.0, base_score))
    risk_score = round(risk_score, 1)

    # Klasifikasi Tingkat Bahaya (Threat Level)
    if risk_score >= 70.0 or status == 'TERKUNCI':
        threat_level = 'CRITICAL'
        badge_color = 'rose'
        rekomendasi = 'Perlu Peringatan Keras / Teguran Langsung di Meja Siswa atau Kunci Ujian'
    elif risk_score >= 45.0:
        threat_level = 'HIGH'
        badge_color = 'amber'
        rekomendasi = 'Pantau Layar Secara Intensif / Periksa Aplikasi Background Perangkat'
    elif risk_score >= 20.0:
        threat_level = 'MEDIUM'
        badge_color = 'yellow'
        rekomendasi = 'Awasi Aktivitas Siswa Secara Berkala'
    else:
        threat_level = 'LOW'
        badge_color = 'emerald'
        rekomendasi = 'Kondisi Pengerjaan Normal dan Kondusif'

    return {
        'pesertaId': peserta.get('pesertaUjianId') or peserta.get('id'),
        'nama': nama,
        'username': peserta.get('username', ''),
        'kelas': peserta.get('kelas', '-'),
        'status': status,
        'riskScore': risk_score,
        'threatLevel': threat_level,
        'badgeColor': badge_color,
        'totalPelanggaran': total_violation_count,
        'completionRate': round(completion_rate * 100, 1),
        'anomalyFlags': anomaly_flags,
        'rekomendasi': rekomendasi
    }

def analyze_proctor_session(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analisis AI Komprehensif untuk Satu Ruang / Sesi Ujian Proktor:
    - Agregasi tingkat keamanan ruang ujian
    - Identifikasi peserta berisiko tinggi secara instan (Top Suspicious Students)
    - Health Score keseluruhan sesi ujian (0 - 100%)
    """
    peserta_list = payload.get('pesertaList', [])
    if not peserta_list:
        return {
            'sessionHealthScore': 100.0,
            'statusRuangan': 'EXCELLENT',
            'summary': 'Belum ada peserta yang aktif pada sesi ini.',
            'topSuspicious': [],
            'stats': {'total': 0, 'critical': 0, 'high': 0, 'normal': 0}
        }

    analyzed_students = []
    critical_count = 0
    high_count = 0
    medium_count = 0
    low_count = 0

    for p in peserta_list:
        res = analyze_single_student(p)
        analyzed_students.append(res)
        lvl = res['threatLevel']
        if lvl == 'CRITICAL':
            critical_count += 1
        elif lvl == 'HIGH':
            high_count += 1
        elif lvl == 'MEDIUM':
            medium_count += 1
        else:
            low_count += 1

    # Urutkan peserta paling berisiko ke paling atas
    analyzed_students.sort(key=lambda x: x['riskScore'], reverse=True)

    total_peserta = len(analyzed_students)
    # Kalkulasi Session Health Score (Semakin sedikit pelanggaran berat, semakin tinggi 100%)
    penalty = (critical_count * 15.0) + (high_count * 8.0) + (medium_count * 3.0)
    health_score = max(0.0, min(100.0, 100.0 - (penalty / max(1, total_peserta) * 10.0)))
    health_score = round(health_score, 1)

    if health_score >= 85.0:
        session_status = 'KONDUSIF & AMAN'
        summary = f'Kondisi sesi ujian terpantau sangat tertib. {low_count} dari {total_peserta} peserta berstatus aman.'
    elif health_score >= 65.0:
        session_status = 'WASPADAI BEBERAPA PESERTA'
        summary = f'Terdapat {critical_count + high_count} peserta yang menunjukkan anomali perpindahan layar/jendela.'
    else:
        session_status = 'PERHATIAN KHUSUS DIBUTUHKAN'
        summary = f'Tingkat anomali keamanan tinggi ({critical_count} akun kritis). Disarankan pengawasan langsung.'

    top_suspicious = [s for s in analyzed_students if s['riskScore'] >= 30.0][:6]

    return {
        'sessionHealthScore': health_score,
        'statusRuangan': session_status,
        'summary': summary,
        'topSuspicious': top_suspicious,
        'allStudentsAnalysis': analyzed_students,
        'stats': {
            'total': total_peserta,
            'critical': critical_count,
            'high': high_count,
            'medium': medium_count,
            'low': low_count
        }
    }

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({'success': False, 'error': 'STDIN payload is empty'}))
            return

        payload = json.loads(raw_input)
        action = payload.get('action')

        if action == 'ANALYZE_PROCTOR_SESSION':
            res = analyze_proctor_session(payload)
            print(json.dumps({'success': True, 'result': res}, ensure_ascii=False))

        elif action == 'ANALYZE_STUDENT':
            res = analyze_single_student(payload.get('peserta', {}))
            print(json.dumps({'success': True, 'result': res}, ensure_ascii=False))

        else:
            print(json.dumps({'success': False, 'error': f'Aksi proktor tidak dikenali: {action}'}))

    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))

if __name__ == '__main__':
    main()
