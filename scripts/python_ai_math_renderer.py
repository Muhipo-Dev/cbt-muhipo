#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CBT Muhipo - Python AI Math & Formula Engine
Engine mandiri (Self-Contained Python AI Engine) yang:
1. Membaca teks mentah / LaTeX / Word equation / ZyaCBT format tanpa merusak tag HTML.
2. Mengubah rumus akar kuadrat, koefisien+akar (2√3), akar pangkat-n (³√8, \sqrt[3]{8}),
   dan pecahan menjadi SVG Mandiri (Self-Contained SVG Vector) murni berskala proporsional (em).
"""

import sys
import re
import html

def latex_to_inline_svg_radical(radicand: str, index: str = "", coeff: str = "") -> str:
    rad = str(radicand or "").strip()
    idx_clean = str(index or "").strip()
    coeff_clean = str(coeff or "").strip()

    idx_offset = max(0, (len(idx_clean) - 1) * 5) if idx_clean else 0
    char_count = max(1, len(rad))
    content_width = max(12, int(char_count * 8.6 + 6))
    hook_start = 2 + idx_offset
    hook_mid = 5.5 + idx_offset
    hook_bottom = 9.5 + idx_offset
    roof_start = 15 + idx_offset
    svg_width = roof_start + content_width + 3
    height = 26
    roof_end = svg_width - 1.5

    radical_path = f"M {hook_start},14.5 L {hook_mid},13 L {hook_bottom},21.5 L {roof_start},3.5 L {roof_end},3.5 L {roof_end},6"

    index_svg = ""
    if idx_clean:
        index_svg = f'<text x="{hook_start}" y="11" font-size="9.5" font-family="KaTeX_Main, Times New Roman, Georgia, serif" font-weight="600" fill="currentColor">{html.escape(idx_clean)}</text>'

    content_svg = f'<text x="{roof_start + 2.5}" y="19" font-size="14.5" font-family="KaTeX_Main, Times New Roman, Georgia, serif" fill="currentColor">{html.escape(rad)}</text>'

    w_em = round(svg_width / 16.0, 3)
    h_em = round(height / 16.0, 3)

    svg = (
        f'<svg class="inline-math-svg inline-block align-middle" style="width:{w_em}em;height:{h_em}em;vertical-align:-0.28em;margin:0 0.08em;overflow:visible;" '
        f'viewBox="0 0 {svg_width} {height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'
        f'{index_svg}'
        f'<path d="{radical_path}" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" />'
        f'{content_svg}'
        f'</svg>'
    )
    if coeff_clean:
        return f'<span class="cbt-ai-math-compound inline-flex items-baseline"><span class="font-serif tracking-tight">{html.escape(coeff_clean)}</span>{svg}</span>'
    return svg

def latex_to_inline_svg_fraction(numerator: str, denominator: str) -> str:
    num = str(numerator or "").strip()
    den = str(denominator or "").strip()
    max_len = max(1, len(num), len(den))
    width = max(18, max_len * 9 + 8)
    height = 34
    center_x = width / 2
    w_em = round(width / 16.0, 3)
    h_em = round(height / 16.0, 3)

    return (
        f'<svg class="inline-math-svg inline-block align-middle" style="width:{w_em}em;height:{h_em}em;vertical-align:-0.58em;margin:0 0.12em;overflow:visible;" '
        f'viewBox="0 0 {width} {height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">'
        f'<text x="{center_x}" y="12" font-size="12.5" font-family="KaTeX_Main, Times New Roman, Georgia, serif" text-anchor="middle" fill="currentColor">{html.escape(num)}</text>'
        f'<line x1="2" y1="17" x2="{width - 2}" y2="17" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" />'
        f'<text x="{center_x}" y="30" font-size="12.5" font-family="KaTeX_Main, Times New Roman, Georgia, serif" text-anchor="middle" fill="currentColor">{html.escape(den)}</text>'
        f'</svg>'
    )

def render_math_with_python_ai(content: str) -> str:
    if not content:
        return ""

    text = str(content)
    text = re.sub(r'&radic;|&#8730;|&#x221a;', '√', text, flags=re.I)
    text = re.sub(r'&plusmn;|&#177;', '±', text, flags=re.I)
    text = re.sub(r'&times;', '×', text, flags=re.I)
    text = re.sub(r'&divide;', '÷', text, flags=re.I)
    text = re.sub(r'\\\s+sqrt\b', r'\\sqrt', text)
    text = re.sub(r'\\\s+frac\b', r'\\frac', text)

    # Pecahan berdampingan akar: \frac{1}{4}\sqrt{14}
    text = re.sub(
        r'\\frac\{([^}]+)\}\{([^}]+)\}\s*\\sqrt(?:\[([^\]]+)\])?\{([^}]+)\}',
        lambda m: f'<span class="cbt-ai-math-compound inline-flex items-center">{latex_to_inline_svg_fraction(m.group(1), m.group(2))}{latex_to_inline_svg_radical(m.group(4), m.group(3) or "")}</span>',
        text
    )

    # 1/4 √14 atau 1/4 \sqrt{14}
    text = re.sub(
        r'([+\-]?\d+)/(\d+)\s*(?:\\sqrt\{([^}]+)\}|√\s*\{([^}]+)\}|√\s*\(([^)]+)\)|√\s*([0-9a-zA-Z.,]+))',
        lambda m: f'<span class="cbt-ai-math-compound inline-flex items-center">{latex_to_inline_svg_fraction(m.group(1), m.group(2))}{latex_to_inline_svg_radical(m.group(3) or m.group(4) or m.group(5) or m.group(6) or "")}</span>',
        text
    )

    # Akar pangkat n & akar kuadrat dengan/tanpa koefisien (2\sqrt{3}, 2√3, \sqrt[3]{8}, ∛8)
    text = re.sub(
        r'([+\-]?\d+(?:[.,]\d+)?)?\s*\\sqrt\[([^\]]+)\]\{([^}]+)\}',
        lambda m: latex_to_inline_svg_radical(m.group(3), m.group(2), m.group(1) or ""),
        text
    )
    text = re.sub(
        r'([+\-]?\d+(?:[.,]\d+)?)?\s*\\sqrt\{([^}]+)\}',
        lambda m: latex_to_inline_svg_radical(m.group(2), "", m.group(1) or ""),
        text
    )
    text = re.sub(
        r'(?<![\w])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*\{([^}]+)\}',
        lambda m: latex_to_inline_svg_radical(m.group(2), "", m.group(1) or ""),
        text
    )
    text = re.sub(
        r'(?<![\w])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*\(([^)]+)\)',
        lambda m: latex_to_inline_svg_radical(m.group(2), "", m.group(1) or ""),
        text
    )
    text = re.sub(
        r'(?<![\w])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*([0-9]+(?:[.,][0-9]+)?|[0-9a-zA-Z]+)',
        lambda m: latex_to_inline_svg_radical(m.group(2), "", m.group(1) or ""),
        text
    )

    # Pecahan mandiri: \frac{a}{b}
    text = re.sub(
        r'\\frac\{([^}]+)\}\{([^}]+)\}',
        lambda m: latex_to_inline_svg_fraction(m.group(1), m.group(2)),
        text
    )

    return text

if __name__ == '__main__':
    inp = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    print(render_math_with_python_ai(inp))
