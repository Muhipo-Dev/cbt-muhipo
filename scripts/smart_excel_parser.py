#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CBT Muhipo - AI Smart Question Parser (Python)
Mendukung:
1. Format Standar ZyaCBT (Kolom horizontal: NO, JENIS SOAL, SOAL, PILIHAN A..E / OPSI A..E, KUNCI, BOBOT/SKOR)
2. Format Vertikal CBT Muhipo (Kolom vertikal: Tipe [Q, Q1, Q2..Q6, A], Isi Soal/Jawaban, Status Jawaban [1/0], Kesulitan)
3. Format Horizontal CBT Muhipo (Pertanyaan, Opsi A-E, Kunci Jawaban, Bobot)
4. AI Auto-Formula / Auto-KaTeX Math Normalization ($...$ atau LaTeX formatting)
"""

import sys
import json
import re

def clean_text(val):
    if val is None:
        return ""
    return str(val).strip()

def normalize_math_katex(text):
    if not text:
        return ""
    t = str(text)

    # 1. Decode entitas HTML matematika yang sering terbawa dari copy-paste / editor web / Word
    t = re.sub(r'&radic;', '√', t, flags=re.I)
    t = re.sub(r'&#8730;', '√', t)
    t = re.sub(r'&plusmn;', '±', t, flags=re.I)
    t = re.sub(r'&#177;', '±', t)
    t = re.sub(r'&times;', '×', t, flags=re.I)
    t = re.sub(r'&divide;', '÷', t, flags=re.I)
    t = re.sub(r'&le;', '≤', t, flags=re.I)
    t = re.sub(r'&ge;', '≥', t, flags=re.I)
    t = re.sub(r'&ne;', '≠', t, flags=re.I)
    t = re.sub(r'&deg;', '°', t, flags=re.I)

    # 2. Deteksi sintaks math tag [tex]...[/tex], <math>...</math>, serta delimiter ChatGPT/Gemini \[...\] dan \(...\)
    t = re.sub(r'```(?:latex|math|tex)\s*([\s\S]*?)```', lambda m: '$$' + m.group(1).strip() + '$$', t, flags=re.IGNORECASE)
    t = re.sub(r'\\\[([\s\S]*?)\\\]', lambda m: '$$' + m.group(1).strip() + '$$', t)
    t = re.sub(r'\\\(([\s\S]*?)\\\)', lambda m: '$' + m.group(1).strip() + '$', t)
    t = re.sub(r'\[tex\](.*?)\[/tex\]', r'$\1$', t, flags=re.IGNORECASE | re.DOTALL)
    t = re.sub(r'<math>(.*?)</math>', r'$\1$', t, flags=re.IGNORECASE | re.DOTALL)

    # 3. Format pecahan biasa yang berdampingan dengan akar: 1/4 √14 -> $\frac{1}{4}\sqrt{14}$
    t = re.sub(
        r'([+\-]?\d+)/(\d+)\s*(?:\$\\sqrt\{([^}]+)\}\$|\\sqrt\{([^}]+)\}|√\s*\{([^}]+)\}|√\s*\(([^)]+)\)|√\s*([0-9]+(?:[.,][0-9]+)?|[0-9a-zA-Z]+))',
        lambda m: r'$\frac{' + m.group(1) + '}{' + m.group(2) + r'}\sqrt{' + (m.group(3) or m.group(4) or m.group(5) or m.group(6) or m.group(7) or '') + '}$',
        t
    )

    # 4. Akar pangkat n eksplisit (√[3]{8}, ³√8, ∛8, ∜16) & akar kuadrat dengan/tanpa koefisien (2√3 -> $2\sqrt{3}$, √14 -> $\sqrt{14}$, √2,25 -> $\sqrt{2,25}$)
    sup_map = {'²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ⁿ': 'n'}
    t = re.sub(r'√\s*\[([^\]]+)\]\s*\{([^}]+)\}', r'$\\sqrt[\1]{\2}$', t)
    t = re.sub(r'√\s*\[([^\]]+)\]\s*\(([^)]+)\)', r'$\\sqrt[\1]{\2}$', t)
    t = re.sub(r'√\s*\[([^\]]+)\]\s*([0-9]+(?:[.,][0-9]+)?|[0-9a-zA-Z]+)', r'$\\sqrt[\1]{\2}$', t)
    t = re.sub(
        r'([²³⁴⁵⁶⁷⁸⁹ⁿ]+)\s*√\s*(?:\{([^}]+)\}|\(([^)]+)\)|([0-9]+(?:[.,][0-9]+)?|[0-9a-zA-Z]+))',
        lambda m: '$\\sqrt[' + ''.join(sup_map.get(ch, ch) for ch in m.group(1)) + ']{' + (m.group(2) or m.group(3) or m.group(4) or '') + '}$',
        t
    )
    t = re.sub(r'∛\s*\{([^}]+)\}', r'$\\sqrt[3]{\1}$', t)
    t = re.sub(r'∛\s*\(([^)]+)\)', r'$\\sqrt[3]{\1}$', t)
    t = re.sub(r'∛\s*([0-9]+(?:[.,][0-9]+)?|[0-9a-zA-Z]+)', r'$\\sqrt[3]{\1}$', t)
    t = re.sub(r'∜\s*\{([^}]+)\}', r'$\\sqrt[4]{\1}$', t)
    t = re.sub(r'∜\s*\(([^)]+)\)', r'$\\sqrt[4]{\1}$', t)
    t = re.sub(r'∜\s*([0-9]+(?:[.,][0-9]+)?|[0-9a-zA-Z]+)', r'$\\sqrt[4]{\1}$', t)
    t = re.sub(r'(?<![\$\w])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*\{([^}]+)\}', lambda m: '$' + (m.group(1).strip() if m.group(1) else '') + r'\sqrt{' + m.group(2) + '}$', t)
    t = re.sub(r'(?<![\$\w])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*\(([^)]+)\)', lambda m: '$' + (m.group(1).strip() if m.group(1) else '') + r'\sqrt{' + m.group(2) + '}$', t)
    t = re.sub(r'(?<![\$\w])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*([0-9]+(?:[.,][0-9]+)?|[0-9a-zA-Z]+)', lambda m: '$' + (m.group(1).strip() if m.group(1) else '') + r'\sqrt{' + m.group(2) + '}$', t)

    # 5. Segmented LaTeX Auto-Wrapper untuk ekspresi LaTeX mentah tanpa pembungkus $
    segments = re.split(r'(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)', t)
    for i in range(0, len(segments), 2):
        seg = segments[i]
        if not seg:
            continue
        seg = re.sub(r'\\sqrt(?!\[|\{)\s*([0-9a-zA-Z]+)', r'\\sqrt{\1}', seg)
        seg = re.sub(
            r'((?:[+\-]?\d+(?:[.,]\d+)?\s*)?\\(?:frac|sqrt|sum|int|lim|prod|pm|times|div|le|ge|neq|approx|alpha|beta|gamma|delta|theta|pi|sigma|omega)(?:\[[^\[\]]*\]|\{[^{}]*\}|[a-zA-Z0-9\+\-\*/\=\(\)\,\.^_\\])*)',
            lambda m: '$' + m.group(1).strip() + '$',
            seg
        )
        segments[i] = seg
    t = ''.join(segments)

    return t

def parse_zyacbt_or_muhipo(rows):
    if not rows or not isinstance(rows, list):
        return []

    # 1. Cek apakah ada baris yang menggunakan pola Vertikal Muhipo (kolom tipe memiliki nilai Q / A)
    has_vertical_pattern = False
    tipe_col_key = None

    for r in rows[:25]:
        if not isinstance(r, dict):
            continue
        for k, v in r.items():
            if k.strip().lower() in ['tipe', 'type', 't']:
                val = str(v).strip().upper()
                if val.startswith('Q') or val == 'A':
                    has_vertical_pattern = True
                    tipe_col_key = k
                    break
        if has_vertical_pattern:
            break

    if has_vertical_pattern and tipe_col_key:
        return parse_vertical_muhipo(rows, tipe_col_key)

    return parse_horizontal_zyacbt(rows)

def parse_vertical_muhipo(rows, tipe_col_key):
    letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    parsed_items = []
    current_soal = None

    for r in rows:
        if not isinstance(r, dict):
            continue

        raw_tipe = clean_text(r.get(tipe_col_key, '')).upper()

        # Ambil teks pertanyaan / isi opsi
        raw_content = ""
        for pattern in ['isi soal / jawaban', 'isi soal', 'pertanyaan / soal', 'pertanyaan', 'soal', 'konten', 'isi']:
            for k, v in r.items():
                if k.strip().lower() == pattern:
                    raw_content = clean_text(v)
                    break
            if raw_content:
                break

        raw_content = normalize_math_katex(raw_content)

        # Ambil status jawaban (1 atau 0)
        raw_status = ""
        for pattern in ['status jawaban', 'status', 'kunci', 'jawaban']:
            for k, v in r.items():
                if k.strip().lower() == pattern:
                    raw_status = clean_text(v)
                    break
            if raw_status:
                break

        # Ambil bobot
        raw_bobot = None
        for pattern in ['kesulitan', 'bobot', 'poin', 'skor']:
            for k, v in r.items():
                if k.strip().lower() == pattern:
                    try:
                        raw_bobot = float(clean_text(v))
                    except:
                        pass
                    break
            if raw_bobot is not None:
                break

        if raw_tipe.startswith('Q'):
            if current_soal and current_soal.get('pertanyaan'):
                parsed_items.append(current_soal)

            db_tipe = 'PG'
            if raw_tipe in ['Q', 'Q1']:
                db_tipe = 'PG'
            elif raw_tipe == 'Q2':
                db_tipe = 'ESAI'
            elif raw_tipe == 'Q3':
                db_tipe = 'ISIAN'
            elif raw_tipe == 'Q4':
                db_tipe = 'PG_KOMPLEKS'
            elif raw_tipe == 'Q5':
                db_tipe = 'BENAR_SALAH'
            elif raw_tipe == 'Q6':
                db_tipe = 'MENJODOHKAN'

            default_bobot = 4.0 if db_tipe == 'ESAI' else (2.0 if db_tipe == 'ISIAN' else 1.0)
            final_bobot = raw_bobot if (raw_bobot and raw_bobot > 0) else default_bobot

            current_soal = {
                'tipeSoal': db_tipe,
                'pertanyaan': raw_content,
                'bobot': final_bobot,
                'opsi': [],
                'rawMatchingPairs': [],
                'matchingData': None,
                'kunciJawabanTeks': None
            }

            if raw_status:
                current_soal['kunciJawabanTeks'] = normalize_math_katex(raw_status)

        elif raw_tipe == 'A' and current_soal:
            if current_soal['tipeSoal'] == 'MENJODOHKAN':
                left = raw_content
                right = normalize_math_katex(raw_status)
                if left and right:
                    current_soal['rawMatchingPairs'].append({'left': left, 'right': right})
            elif current_soal['tipeSoal'] == 'BENAR_SALAH':
                is_benar = raw_status == '1' or raw_status.lower() in ['benar', 'true']
                idx = len(current_soal['opsi'])
                label = letters[idx] if idx < len(letters) else f"Opsi {idx + 1}"
                if raw_content:
                    current_soal['opsi'].append({
                        'label': label,
                        'konten': raw_content,
                        'isBenar': is_benar
                    })
            elif current_soal['tipeSoal'] in ['ISIAN', 'ESAI']:
                if raw_content and not current_soal['kunciJawabanTeks']:
                    current_soal['kunciJawabanTeks'] = raw_content
            else:
                # PG & PG_KOMPLEKS
                is_benar = raw_status == '1' or raw_status.lower() in ['true', 'benar']
                idx = len(current_soal['opsi'])
                label = letters[idx] if idx < len(letters) else f"Opsi {idx + 1}"
                if raw_content:
                    current_soal['opsi'].append({
                        'label': label,
                        'konten': raw_content,
                        'isBenar': is_benar
                    })

    if current_soal and current_soal.get('pertanyaan'):
        parsed_items.append(current_soal)

    for item in parsed_items:
        if item['tipeSoal'] == 'MENJODOHKAN' and item.get('rawMatchingPairs'):
            item['matchingData'] = json.dumps(item['rawMatchingPairs'], ensure_ascii=False)
        item.pop('rawMatchingPairs', None)

    return parsed_items

def parse_horizontal_zyacbt(rows):
    """
    Parser untuk format Horizontal ZyaCBT dan Format Standar Muhipo
    """
    parsed_items = []

    for r in rows:
        if not isinstance(r, dict):
            continue

        # 1. Cari teks pertanyaan secara akurat (hindari mencocokkan 'Jenis Soal' atau 'Tipe Soal')
        pertanyaan = ""
        exact_soal_keys = ['soal', 'pertanyaan', 'naskah soal', 'isi soal', 'pertanyaan / soal']
        for ek in exact_soal_keys:
            for k, v in r.items():
                if k.strip().lower() == ek:
                    val = clean_text(v)
                    if val:
                        pertanyaan = val
                        break
            if pertanyaan:
                break

        if not pertanyaan:
            for k, v in r.items():
                k_lower = k.strip().lower()
                if ('soal' in k_lower or 'pertanyaan' in k_lower) and not any(x in k_lower for x in ['jenis', 'tipe', 'nomor', 'no', 'bobot', 'skor']):
                    val = clean_text(v)
                    if val:
                        pertanyaan = val
                        break

        pertanyaan = normalize_math_katex(pertanyaan)
        if not pertanyaan:
            continue

        # 2. Cari Tipe Soal (ZyaCBT: 1=PG, 2=Essay, 3=Isian, dst)
        tipe_val = ""
        for pattern in ['jenis soal', 'jenis', 'tipe soal', 'tipe', 'type']:
            for k, v in r.items():
                if k.strip().lower() == pattern:
                    tipe_val = clean_text(v).upper()
                    break
            if tipe_val:
                break

        tipe_soal = 'PG'
        if tipe_val in ['2', 'ESAI', 'ESSAY', 'URAIAN']:
            tipe_soal = 'ESAI'
        elif tipe_val in ['3', 'ISIAN', 'ISIAN SINGKAT', 'SHORT']:
            tipe_soal = 'ISIAN'
        elif tipe_val in ['4', 'PG KOMPLEKS', 'PG_KOMPLEKS', 'KOMPLEKS']:
            tipe_soal = 'PG_KOMPLEKS'
        elif tipe_val in ['5', 'BENAR SALAH', 'BENAR_SALAH', 'B_S']:
            tipe_soal = 'BENAR_SALAH'
        elif tipe_val in ['6', 'MENJODOHKAN', 'MATCHING']:
            tipe_soal = 'MENJODOHKAN'
        elif tipe_val in ['1', 'PG', 'PILIHAN GANDA']:
            tipe_soal = 'PG'

        # 3. Cari Bobot / Skor
        bobot = 4.0 if tipe_soal == 'ESAI' else (2.0 if tipe_soal == 'ISIAN' else 1.0)
        for pattern in ['bobot', 'skor', 'score', 'poin', 'kesulitan']:
            for k, v in r.items():
                if k.strip().lower() == pattern:
                    try:
                        raw_num = float(clean_text(v))
                        if raw_num > 0:
                            bobot = raw_num
                    except:
                        pass
                    break

        # 4. Cari Kunci Jawaban
        kunci_raw = ""
        kunci_original_case = ""
        for pattern in ['kunci jawaban (a/b/c/d/e)', 'kunci jawaban', 'kunci', 'jawaban benar', 'answer', 'key']:
            for k, v in r.items():
                if k.strip().lower() == pattern:
                    kunci_original_case = clean_text(v)
                    kunci_raw = kunci_original_case.upper()
                    break
            if kunci_raw:
                break

        # Normalisasi angka kunci ZyaCBT (misal: 1 -> A, 2 -> B, dst) HANYA untuk soal pilihan ganda / pilihan
        num_to_letter = {'1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F'}
        if tipe_soal in ['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'] and kunci_raw in num_to_letter:
            kunci_raw = num_to_letter[kunci_raw]

        # 5. Cari Opsi Jawaban (A, B, C, D, E, F)
        opsi_list = []
        letters = ['A', 'B', 'C', 'D', 'E', 'F']

        for ltr in letters:
            konten_opsi = ""
            search_patterns = [
                f'jawaban {ltr.lower()}',
                f'jawaban_{ltr.lower()}',
                f'pilihan {ltr.lower()}',
                f'pilihan_{ltr.lower()}',
                f'opsi {ltr.lower()}',
                f'opsi_{ltr.lower()}',
                f'pilihan {ltr}',
                f'opsi {ltr}',
                f'{ltr.lower()}',
                ltr
            ]

            for sp in search_patterns:
                for k, v in r.items():
                    if k.strip().lower() == sp.lower():
                        val = clean_text(v)
                        if val:
                            konten_opsi = val
                            break
                if konten_opsi:
                    break

            if konten_opsi:
                is_benar = (ltr in kunci_raw) or (clean_text(konten_opsi).upper() == kunci_raw)
                opsi_list.append({
                    'label': ltr,
                    'konten': normalize_math_katex(konten_opsi),
                    'isBenar': is_benar
                })

        # Kunci teks untuk essay / isian
        kunci_teks = None
        if tipe_soal in ['ESAI', 'ISIAN']:
            kunci_teks = normalize_math_katex(kunci_original_case or kunci_raw)

        # Menjodohkan pasangan format A=B
        matching_data = None
        if tipe_soal == 'MENJODOHKAN':
            pairs = []
            for op in opsi_list:
                if '=' in op['konten']:
                    parts = op['konten'].split('=')
                    left = parts[0].strip()
                    right = "=".join(parts[1:]).strip()
                    if left and right:
                        pairs.append({'left': left, 'right': right})
            if pairs:
                matching_data = json.dumps(pairs, ensure_ascii=False)

        parsed_items.append({
            'tipeSoal': tipe_soal,
            'pertanyaan': pertanyaan,
            'bobot': bobot,
            'opsi': opsi_list,
            'matchingData': matching_data,
            'kunciJawabanTeks': kunci_teks
        })

    return parsed_items

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data.strip():
            print(json.dumps({'success': False, 'message': 'Input JSON kosong'}))
            return

        raw_rows = json.loads(input_data)
        soal_items = parse_zyacbt_or_muhipo(raw_rows)

        print(json.dumps({
            'success': True,
            'soalItems': soal_items,
            'totalParsed': len(soal_items)
        }, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }))

if __name__ == '__main__':
    main()
