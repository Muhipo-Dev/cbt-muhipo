#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CBT Muhipo - AI Database KaTeX & Math Formula Sanitizer & Doctor
Memeriksa seluruh basis data soal dan opsi jawaban di Prisma,
mendeteksi kesalahan rumus/simbol matematika, dan memperbaikinya secara otomatis
tanpa mengubah makna koefisien akar (2√3 -> $2\sqrt{3}$) maupun tag HTML.
"""

import re
import subprocess

def normalize_math_ai(text: str) -> str:
    if not text:
        return ""
    t = str(text)

    # Pisahkan tag HTML agar atribut HTML tetap 100% aman
    parts = re.split(r'(<[^>]+>)', t)
    sup_map = {'²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ⁿ': 'n'}

    for idx in range(0, len(parts), 2):
        chunk = parts[idx]
        if not chunk:
            continue

        html_entities = {
            r'&radic;': '√',
            r'&#8730;': '√',
            r'&#x221a;': '√',
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
            chunk = re.sub(ent, char, chunk, flags=re.IGNORECASE)

        chunk = re.sub(r'\\\s+sqrt\b', r'\\sqrt', chunk)
        chunk = re.sub(r'\\\s+frac\b', r'\\frac', chunk)
        chunk = re.sub(r'\\\s+times\b', r'\\times', chunk)
        chunk = re.sub(r'\\\s+div\b', r'\\div', chunk)

        chunk = re.sub(r'\[tex\](.*?)\[/tex\]', r'$\1$', chunk, flags=re.IGNORECASE | re.DOTALL)

        # Akar pangkat n eksplisit: √[3]{8}, ³√8, ∛8, ∜16
        chunk = re.sub(r'√\s*\[([^\]]+)\]\s*\{([^}]+)\}', r'$\\sqrt[\1]{\2}$', chunk)
        chunk = re.sub(r'√\s*\[([^\]]+)\]\s*\(([^)]+)\)', r'$\\sqrt[\1]{\2}$', chunk)
        chunk = re.sub(r'√\s*\[([^\]]+)\]\s*([0-9a-zA-Z]+)', r'$\\sqrt[\1]{\2}$', chunk)
        chunk = re.sub(
            r'([²³⁴⁵⁶⁷⁸⁹ⁿ]+)\s*√\s*(?:\{([^}]+)\}|\(([^)]+)\)|([0-9a-zA-Z]+))',
            lambda m: '$\\sqrt[' + ''.join(sup_map.get(ch, ch) for ch in m.group(1)) + ']{' + (m.group(2) or m.group(3) or m.group(4) or '') + '}$',
            chunk
        )
        chunk = re.sub(r'∛\s*\{([^}]+)\}', r'$\\sqrt[3]{\1}$', chunk)
        chunk = re.sub(r'∛\s*\(([^)]+)\)', r'$\\sqrt[3]{\1}$', chunk)
        chunk = re.sub(r'∛\s*([0-9a-zA-Z]+)', r'$\\sqrt[3]{\1}$', chunk)
        chunk = re.sub(r'∜\s*\{([^}]+)\}', r'$\\sqrt[4]{\1}$', chunk)
        chunk = re.sub(r'∜\s*\(([^)]+)\)', r'$\\sqrt[4]{\1}$', chunk)
        chunk = re.sub(r'∜\s*([0-9a-zA-Z]+)', r'$\\sqrt[4]{\1}$', chunk)

        # Pecahan berdampingan akar: 1/4 √14 -> $\frac{1}{4}\sqrt{14}$
        chunk = re.sub(
            r'([+\-]?\d+)/(\d+)\s*(?:\$\\sqrt\{([^}]+)\}\$|\\sqrt\{([^}]+)\}|√\s*\{([^}]+)\}|√\s*\(([^)]+)\)|√\s*([0-9a-zA-Z]+))',
            lambda m: r'$\frac{' + m.group(1) + '}{' + m.group(2) + r'}\sqrt{' + (m.group(3) or m.group(4) or m.group(5) or m.group(6) or m.group(7) or '') + '}$',
            chunk
        )

        # Koefisien + Akar kuadrat: 2√3 -> $2\sqrt{3}$, √14 -> $\sqrt{14}$
        chunk = re.sub(r'(?<![\$\w])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*\{([^}]+)\}', lambda m: '$' + (m.group(1).strip() if m.group(1) else '') + r'\sqrt{' + m.group(2) + '}$', chunk)
        chunk = re.sub(r'(?<![\$\w])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*\(([^)]+)\)', lambda m: '$' + (m.group(1).strip() if m.group(1) else '') + r'\sqrt{' + m.group(2) + '}$', chunk)
        chunk = re.sub(r'(?<![\$\w])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*([0-9]+(?:[.,][0-9]+)?|[0-9a-zA-Z]+)', lambda m: '$' + (m.group(1).strip() if m.group(1) else '') + r'\sqrt{' + m.group(2) + '}$', chunk)

        # Auto-wrapper rumus LaTeX mentah di luar tanda $
        segments = re.split(r'(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)', chunk)
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
        parts[idx] = ''.join(segments)

    return ''.join(parts)

if __name__ == '__main__':
    print("[AI Math Engine] Menjalankan modul diagnosis database KaTeX...")
    cmd = ["node", "scripts/db_katex_audit.js"]
    res = subprocess.run(cmd, capture_output=True, text=True)
    print(res.stdout)
    if res.stderr:
        print("[STDERR]:", res.stderr)
