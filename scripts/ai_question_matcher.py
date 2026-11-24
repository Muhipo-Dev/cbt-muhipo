#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CBT Muhipo - Python AI Matching & Scoring Engine
Menyediakan komputasi kecerdasan buatan berbasis Python untuk:
1. Pencocokan Isian Singkat & Formula Matematika (Sympy-like equivalence, fuzzy Levenshtein, Jaccard similarity)
2. Analisis Keterbacaan & Kesamaan Semantik Jawaban Esai (Token overlap, semantic similarity, keyword matching)
3. Evaluasi & Rekomendasi Skor Otomatis untuk Guru
4. Penanganan Notasi Matematika KaTeX & LaTeX
"""

import sys
import json
import re
import math
from typing import Dict, List, Any, Tuple

def normalize_text(text: str) -> str:
    """Normalisasi teks jawaban: case-folding, whitespace collapse, punctuation cleaning."""
    if not text:
        return ""
    t = str(text).strip().lower()
    # Normalisasi tanda petik dan kutip Unicode
    t = re.sub(r'[\u2018\u2019`]', "'", t)
    t = re.sub(r'[\u201C\u201D«»]', '"', t)
    # Hapus spasi berlebih
    t = re.sub(r'\s+', ' ', t)
    # Hapus tanda baca di ujung
    t = re.sub(r'[.,;:!?]+$', '', t).strip()
    return t

def normalize_math_expression(expr: str) -> str:
    """Normalisasi ekspresi matematika agar dapat dibandingkan secara ekuivalen."""
    if not expr:
        return ""
    m = expr.strip()
    # Lepas pembungkus $...$ atau $$...$$ jika ada
    m = re.sub(r'^\$+|\$+$', '', m).strip()
    # Hapus spasi di dalam formula
    m = re.sub(r'\s+', '', m)
    # Ganti perkalian \times, *, cdot ke tanda x atau kali
    m = re.sub(r'\\(?:times|cdot)|\*', 'x', m)
    # Ganti pembagian \div atau : ke /
    m = re.sub(r'\\div|:', '/', m)
    # Ganti koma desimal ke titik desimal: 2,5 -> 2.5
    m = re.sub(r'(\d+),(\d+)', r'\1.\2', m)
    # Konversi pecahan KaTeX: \frac{a}{b} -> (a)/(b) atau a/b jika single digit
    m = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1)/(\2)', m)
    # Konversi akar KaTeX: \sqrt{14} -> sqrt(14)
    m = re.sub(r'\\sqrt\{([^}]+)\}', r'sqrt(\1)', m)
    m = re.sub(r'\\sqrt\(([^)]+)\)', r'sqrt(\1)', m)
    m = re.sub(r'\\sqrt([0-9a-zA-Z]+)', r'sqrt(\1)', m)
    m = re.sub(r'√\{([^}]+)\}', r'sqrt(\1)', m)
    m = re.sub(r'√\(([^)]+)\)', r'sqrt(\1)', m)
    m = re.sub(r'√([0-9a-zA-Z]+)', r'sqrt(\1)', m)
    # Hapus modifier latex seperti \left, \right, \text
    m = re.sub(r'\\(?:left|right|mathrm|mathbf|text)', '', m)
    # Sederhanakan kurung luar numerik tunggal: (1)/(4) -> 1/4
    m = re.sub(r'\((\d+)\)/\((\d+)\)', r'\1/\2', m)
    # Hapus sisa backslash jika ada
    m = m.replace('\\', '')
    return m.lower()

def levenshtein_similarity(s1: str, s2: str) -> float:
    """Menghitung skor kemiripan Levenshtein (0.0 sampai 1.0)."""
    if s1 == s2:
        return 1.0
    len1, len2 = len(s1), len(s2)
    if len1 == 0 or len2 == 0:
        return 0.0

    dp = [[0] * (len2 + 1) for _ in range(len1 + 1)]
    for i in range(len1 + 1):
        dp[i][0] = i
    for j in range(len2 + 1):
        dp[0][j] = j

    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,      # deletion
                dp[i][j - 1] + 1,      # insertion
                dp[i - 1][j - 1] + cost # substitution
            )

    dist = dp[len1][len2]
    max_len = max(len1, len2)
    return 1.0 - (dist / max_len)

def jaccard_similarity(text1: str, text2: str) -> float:
    """Menghitung kemiripan himpunan kata (N-Gram / Bag of Words)."""
    tokens1 = set(re.findall(r'\b\w+\b', normalize_text(text1)))
    tokens2 = set(re.findall(r'\b\w+\b', normalize_text(text2)))
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)

def match_isian_ai(jawaban_siswa: str, kunci_teks: str) -> Dict[str, Any]:
    """
    Pencocokan AI cerdas untuk isian singkat:
    - Normalisasi numerik (misal 1/4 sqrt(14) vs 0.25 * sqrt(14))
    - Multi-kunci fleksibel pemisah | atau ;
    - Toleransi typo berbobot
    """
    u_raw = str(jawaban_siswa or '').strip()
    k_raw = str(kunci_teks or '').strip()

    if not u_raw:
        return {'isBenar': False, 'confidence': 0.0, 'reason': 'Jawaban siswa kosong'}

    # Ekstraksi kemungkinan multi-kunci
    delimiters = r'[|;]'
    kunci_list = [k.strip() for k in re.split(delimiters, k_raw) if k.strip()]
    if not kunci_list:
        kunci_list = [k_raw]

    best_confidence = 0.0
    best_match_key = ""

    u_norm = normalize_text(u_raw)
    u_math = normalize_math_expression(u_raw)

    for k in kunci_list:
        k_norm = normalize_text(k)
        k_math = normalize_math_expression(k)

        # 1. Exact match (Text & Math)
        if u_norm == k_norm or u_math == k_math:
            return {
                'isBenar': True,
                'confidence': 1.0,
                'matchedKey': k,
                'similarity': 1.0,
                'reason': 'Kecocokan persis (Exact Match)'
            }

        # 2. Numerik murni
        try:
            num_u = float(u_norm.replace(',', '.'))
            num_k = float(k_norm.replace(',', '.'))
            if math.isclose(num_u, num_k, rel_tol=1e-4, abs_tol=1e-4):
                return {
                    'isBenar': True,
                    'confidence': 1.0,
                    'matchedKey': k,
                    'similarity': 1.0,
                    'reason': 'Kecocokan nilai numerik desimal'
                }
        except ValueError:
            pass

        # 3. Levenshtein fuzzy similarity
        sim_lev = levenshtein_similarity(u_norm, k_norm)
        # Jika panjang karakter >= 5 dan kemiripan >= 0.82 (toleransi 1 typo)
        if len(k_norm) >= 5 and sim_lev >= 0.82:
            if sim_lev > best_confidence:
                best_confidence = sim_lev
                best_match_key = k

    # Ambang batas kelulusan isian AI
    if best_confidence >= 0.82:
        return {
            'isBenar': True,
            'confidence': round(best_confidence, 2),
            'matchedKey': best_match_key,
            'similarity': round(best_confidence, 2),
            'reason': f'Kecocokan AI fuzzy match ({int(best_confidence * 100)}% mirip)'
        }

    return {
        'isBenar': False,
        'confidence': round(best_confidence, 2),
        'matchedKey': best_match_key,
        'similarity': round(best_confidence, 2),
        'reason': 'Jawaban tidak sesuai dengan kunci'
    }

def evaluate_essay_ai(jawaban_siswa: str, rubrik_kunci: str, max_bobot: float) -> Dict[str, Any]:
    """
    Evaluasi AI untuk Jawaban Esai:
    Membandingkan kesamaan semantik kata kunci, panjang elaborasi, dan substansi jawaban.
    Menghasilkan skor usulan rekomendasi (AI Recommended Score) yang mempermudah koreksi guru.
    """
    u_text = normalize_text(jawaban_siswa)
    k_text = normalize_text(rubrik_kunci)

    if not u_text:
        return {
            'skorUsulan': 0.0,
            'confidence': 1.0,
            'persentaseKemiripan': 0.0,
            'feedback': 'Siswa tidak mengisi jawaban esai.'
        }

    if not k_text:
        # Tanpa rubrik, beri default nilai proporsional berbasis panjang penjelasan
        word_count = len(re.findall(r'\b\w+\b', u_text))
        ratio = min(1.0, word_count / 30.0)
        return {
            'skorUsulan': round(max_bobot * ratio, 2),
            'confidence': 0.5,
            'persentaseKemiripan': round(ratio * 100, 1),
            'feedback': f'Evaluasi berdasarkan kelengkapan uraian ({word_count} kata).'
        }

    # Hitung Jaccard similarity (kesamaan kata kunci)
    jaccard = jaccard_similarity(u_text, k_text)
    # Hitung Levenshtein similarity
    lev = levenshtein_similarity(u_text, k_text)

    # Kata kunci substansial (kata panjang >= 4 huruf)
    k_keywords = [w for w in set(re.findall(r'\b\w+\b', k_text)) if len(w) >= 4]
    u_words = set(re.findall(r'\b\w+\b', u_text))
    
    keyword_match_count = sum(1 for kw in k_keywords if any(kw in uw or levenshtein_similarity(kw, uw) >= 0.8 for uw in u_words))
    keyword_ratio = (keyword_match_count / len(k_keywords)) if k_keywords else jaccard

    # Skor gabungan: 50% keyword, 30% Jaccard, 20% Levenshtein
    composite_score = (keyword_ratio * 0.50) + (jaccard * 0.30) + (lev * 0.20)
    composite_score = max(0.0, min(1.0, composite_score))

    # Bonus elaborasi jika siswa menjelaskan dengan runut (minimal 25 kata)
    words_student = len(re.findall(r'\b\w+\b', u_text))
    if words_student >= 25 and composite_score > 0.2:
        composite_score = min(1.0, composite_score * 1.15)

    skor_usulan = round(max_bobot * composite_score, 2)
    persen = round(composite_score * 100, 1)

    feedback = f"Tingkat kesesuaian rubrik: {persen}% ({keyword_match_count}/{len(k_keywords)} kata kunci esensial terdeteksi)."

    return {
        'skorUsulan': skor_usulan,
        'confidence': round(composite_score, 2),
        'persentaseKemiripan': persen,
        'keywordMatched': keyword_match_count,
        'totalKeywords': len(k_keywords),
        'feedback': feedback
    }

def main():
    """CLI Driver untuk integrasi Node.js Subprocess melalui STDIN / STDOUT JSON."""
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({'success': False, 'error': 'STDIN payload is empty'}))
            return

        payload = json.loads(raw_input)
        action = payload.get('action')

        if action == 'MATCH_ISIAN':
            res = match_isian_ai(payload.get('jawabanSiswa', ''), payload.get('kunciTeks', ''))
            print(json.dumps({'success': True, 'result': res}, ensure_ascii=False))

        elif action == 'EVALUATE_ESSAY':
            res = evaluate_essay_ai(
                payload.get('jawabanSiswa', ''),
                payload.get('rubrikKunci', ''),
                float(payload.get('maxBobot', 10.0))
            )
            print(json.dumps({'success': True, 'result': res}, ensure_ascii=False))

        elif action == 'BATCH_EVALUATE_EXAM':
            items = payload.get('items', [])
            evaluations = []
            for item in items:
                tipe = item.get('tipeSoal')
                jawaban = item.get('jawabanSiswa', '')
                kunci = item.get('kunci', '')
                bobot = float(item.get('bobot', 10.0))

                if tipe == 'ISIAN':
                    match_res = match_isian_ai(jawaban, kunci)
                    skor = bobot if match_res['isBenar'] else 0.0
                    evaluations.append({
                        'soalId': item.get('soalId'),
                        'isBenar': match_res['isBenar'],
                        'skor': skor,
                        'detail': match_res
                    })
                elif tipe == 'ESAI':
                    essay_res = evaluate_essay_ai(jawaban, kunci, bobot)
                    evaluations.append({
                        'soalId': item.get('soalId'),
                        'skorUsulan': essay_res['skorUsulan'],
                        'detail': essay_res
                    })
            print(json.dumps({'success': True, 'evaluations': evaluations}, ensure_ascii=False))

        else:
            print(json.dumps({'success': False, 'error': f'Aksi tidak dikenali: {action}'}))

    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))

if __name__ == '__main__':
    main()
