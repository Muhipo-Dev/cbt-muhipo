#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CBT Muhipo - Python AI Math & Formula Engine
Engine mandiri (Self-Contained Python AI Engine) yang:
1. Membaca teks mentah / LaTeX / Word equation / ZyaCBT format.
2. Mengubah rumus menjadi SVG Mandiri (Self-Contained SVG Vector) murni
   tanpa ketergantungan CSS eksternal ataupun font browser yang rentan error/hilang.
"""

import sys
import json
import re
import html

def latex_to_inline_svg_radical(radicand: str, index: str = "") -> str:
    rad = str(radicand or "").strip()
    char_count = len(rad)
    content_width = max(18, char_count * 10 + 6)
    svg_width = content_width + 24
    height = 26
    
    roof_end = svg_width - 2
    radical_path = f"M 2,14 L 6,19 L 13,3 L {roof_end},3"
    
    index_svg = ""
    if index:
        index_svg = f'<text x="3" y="11" font-size="9" font-family="KaTeX_Main, Times New Roman, serif" font-style="italic" fill="currentColor">{html.escape(index)}</text>'

    content_svg = f'<text x="17" y="18" font-size="14" font-family="KaTeX_Main, Times New Roman, serif" fill="currentColor">{html.escape(rad)}</text>'

    svg = (
        f'<svg class="inline-math-svg inline-block align-middle" style="vertical-align: -0.22em; margin: 0 0.15em;" '
        f'width="{svg_width}" height="{height}" viewBox="0 0 {svg_width} {height}" xmlns="http://www.w3.org/2000/svg">'
        f'{index_svg}'
        f'<path d="{radical_path}" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />'
        f'{content_svg}'
        f'</svg>'
    )
    return svg

def latex_to_inline_svg_fraction(numerator: str, denominator: str) -> str:
    num = str(numerator or "").strip()
    den = str(denominator or "").strip()
    len_num = len(num)
    len_den = len(den)
    max_len = max(len_num, len_den)
    width = max(18, max_len * 10 + 10)
    height = 34
    center_x = width / 2
    
    svg = (
        f'<svg class="inline-math-svg inline-block align-middle" style="vertical-align: -0.55em; margin: 0 0.15em;" '
        f'width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">'
        f'<text x="{center_x}" y="12" font-size="12" font-family="KaTeX_Main, Times New Roman, serif" text-anchor="middle" fill="currentColor">{html.escape(num)}</text>'
        f'<line x1="2" y1="17" x2="{width - 2}" y2="17" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />'
        f'<text x="{center_x}" y="30" font-size="12" font-family="KaTeX_Main, Times New Roman, serif" text-anchor="middle" fill="currentColor">{html.escape(den)}</text>'
        f'</svg>'
    )
    return svg

def render_math_with_python_ai(content: str) -> str:
    if not content:
        return ""

    text = str(content)

    # 1. Normalisasi entitas
    text = re.sub(r'&radic;', '√', text, flags=re.I)
    text = re.sub(r'&#8730;', '√', text)
    text = re.sub(r'&plusmn;', '±', text, flags=re.I)
    text = re.sub(r'&#177;', '±', text)
    text = re.sub(r'&times;', '×', text, flags=re.I)
    text = re.sub(r'&divide;', '÷', text, flags=re.I)

    # 2. Tangani pecahan berdampingan dengan akar: \frac{1}{4}\sqrt{14}
    text = re.sub(
        r'\\frac\{([^}]+)\}\{([^}]+)\}\s*\\sqrt\{([^}]+)\}',
        lambda m: f'<span class="cbt-ai-math-compound inline-flex items-center gap-0.5">{latex_to_inline_svg_fraction(m.group(1), m.group(2))}{latex_to_inline_svg_radical(m.group(3))}</span>',
        text
    )

    # Tangani format biasa: 1/4 √14 atau 1/4 \sqrt{14}
    text = re.sub(
        r'(\d+)/(\d+)\s*(?:\\sqrt\{([^}]+)\}|√\s*([0-9a-zA-Z]+))',
        lambda m: f'<span class="cbt-ai-math-compound inline-flex items-center gap-0.5">{latex_to_inline_svg_fraction(m.group(1), m.group(2))}{latex_to_inline_svg_radical(m.group(3) or m.group(4))}</span>',
        text
    )

    # 3. Tangani akar mandiri: \sqrt[n]{x}, \sqrt{14}, √14
    text = re.sub(
        r'\\sqrt\[([^\]]+)\]\{([^}]+)\}',
        lambda m: latex_to_inline_svg_radical(m.group(2), m.group(1)),
        text
    )
    text = re.sub(
        r'\\sqrt\{([^}]+)\}',
        lambda m: latex_to_inline_svg_radical(m.group(1)),
        text
    )
    text = re.sub(
        r'(?<![\$\w])√\s*\{([^}]+)\}',
        lambda m: latex_to_inline_svg_radical(m.group(1)),
        text
    )
    text = re.sub(
        r'(?<![\$\w])√\s*([0-9a-zA-Z]+)',
        lambda m: latex_to_inline_svg_radical(m.group(1)),
        text
    )

    # 4. Tangani pecahan mandiri: \frac{a}{b}
    text = re.sub(
        r'\\frac\{([^}]+)\}\{([^}]+)\}',
        lambda m: latex_to_inline_svg_fraction(m.group(1), m.group(2)),
        text
    )

    return text

if __name__ == '__main__':
    if len(sys.argv) > 1:
        inp = sys.argv[1]
    else:
        inp = sys.stdin.read()

    out = render_math_with_python_ai(inp)
    print(out)
