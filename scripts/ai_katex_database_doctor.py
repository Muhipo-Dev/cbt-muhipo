#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CBT Muhipo - AI Database KaTeX & Math Formula Sanitizer & Doctor
Memeriksa seluruh basis data soal dan opsi jawaban di Prisma,
mendeteksi kesalahan rumus/simbol matematika, dan memperbaikinya secara otomatis.
"""

import re
import json
import subprocess
import sys

def normalize_math_ai(text: str) -> str:
    if not text:
        return ""
    t = str(text)

    # 1. Normalisasi HTML Entities
    html_entities = {
        r'&radic;': '√',
        r'&#8730;': '√',
        r'&plusmn;': '±',
        r'&#177;': '±',
        r'&times;': '×',
        r'&divide;': '÷',
        r'&le;': '≤',
        r'&ge;': '≥',
        r'&ne;': '≠',
        r'&deg;': '°',
        r'&sup2;': '²',
        r'&sup3;': '³',
        r'&infin;': '∞',
        r'&alpha;': 'α',
        r'&beta;': 'β',
        r'&pi;': 'π',
    }
    for ent, char in html_entities.items():
        t = re.sub(ent, char, t, flags=re.IGNORECASE)

    # 2. Perbaiki spasi rusak pada KaTeX escape
    t = re.sub(r'\\\s+sqrt', r'\\sqrt', t)
    t = re.sub(r'\\\s+frac', r'\\frac', t)
    t = re.sub(r'\\\s+times', r'\\times', t)
    t = re.sub(r'\\\s+div', r'\\div', t)

    # 3. Format tag ZyaCBT / Moodle [tex]...[/tex] atau <math>...</math>
    t = re.sub(r'\[tex\](.*?)\[/tex\]', r'$\1$', t, flags=re.IGNORECASE | re.DOTALL)
    t = re.sub(r'<math>(.*?)</math>', r'$\1$', t, flags=re.IGNORECASE | re.DOTALL)

    # 4. Tangani pecahan biasa berdampingan dengan akar: 1/4 √14 -> $\frac{1}{4}\sqrt{14}$
    t = re.sub(
        r'(\d+)/(\d+)\s*(\$\\sqrt\{[^}]+\}\$|√\s*([0-9a-zA-Z]+))',
        lambda m: r'$\frac{' + m.group(1) + '}{' + m.group(2) + r'}\sqrt{' + (m.group(4) or '') + '}$',
        t
    )

    # 5. Konversi simbol akar Unicode: √14 -> $\sqrt{14}$, 3√8 -> $\sqrt[3]{8}$
    t = re.sub(r'(?<![\$\w])([0-9a-zA-Z]+)√\s*\{([^}]+)\}', r'$\\sqrt[\1]{\2}$', t)
    t = re.sub(r'(?<![\$\w])([0-9a-zA-Z]+)√\s*\(([^)]+)\)', r'$\\sqrt[\1]{\2}$', t)
    t = re.sub(r'(?<![\$\w])([0-9a-zA-Z]+)√\s*([0-9a-zA-Z]+)', r'$\\sqrt[\1]{\2}$', t)
    t = re.sub(r'∛\s*\{([^}]+)\}', r'$\\sqrt[3]{\1}$', t)
    t = re.sub(r'∛\s*\(([^)]+)\)', r'$\\sqrt[3]{\1}$', t)
    t = re.sub(r'∛\s*([0-9a-zA-Z]+)', r'$\\sqrt[3]{\1}$', t)
    t = re.sub(r'∜\s*\{([^}]+)\}', r'$\\sqrt[4]{\1}$', t)
    t = re.sub(r'∜\s*\(([^)]+)\)', r'$\\sqrt[4]{\1}$', t)
    t = re.sub(r'∜\s*([0-9a-zA-Z]+)', r'$\\sqrt[4]{\1}$', t)
    t = re.sub(r'(?<![\$\w])√\s*\{([^}]+)\}', r'$\\sqrt{\1}$', t)
    t = re.sub(r'(?<![\$\w])√\s*\(([^)]+)\)', r'$\\sqrt{\1}$', t)
    t = re.sub(r'(?<![\$\w])√\s*([0-9a-zA-Z]+)', r'$\\sqrt{\1}$', t)

    # 6. Auto-wrapper rumus LaTeX mentah di luar tanda $
    segments = re.split(r'(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)', t)
    for i in range(0, len(segments), 2):
        seg = segments[i]
        if not seg:
            continue
        seg = re.sub(r'\\sqrt\s+([0-9a-zA-Z]+)', r'\\sqrt{\1}', seg)
        seg = re.sub(
            r'(\\(?:frac|sqrt|sum|int|lim|prod|pm|times|div|le|ge|neq|approx|alpha|beta|gamma|delta|theta|pi|sigma|omega)(?:\[[^\[\]]*\]|\{[^{}]*\}|[a-zA-Z0-9\+\-\*/\=\(\)\,\s\\])*)',
            r'$\1$',
            seg
        )
        segments[i] = seg
    t = ''.join(segments)

    return t

if __name__ == '__main__':
    print("[AI Math Engine] Menjalankan modul diagnosis database KaTeX...")
    # Jalankan pengecekan melalui Node Prisma Bridge
    cmd = ["node", "scripts/db_katex_audit.js"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(res.stdout)
    if res.stderr:
        print("[STDERR]:", res.stderr)
