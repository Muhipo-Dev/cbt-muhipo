import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

// Regex range Unicode untuk aksara Arab (termasuk harakat, tanda baca Al-Quran, dan Arab Pegon)
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Regex range Unicode untuk Aksara Jawa (Hanacaraka, Sandhangan, Angka Jawa)
const JAVANESE_REGEX = /[\uA980-\uA9DF]/;

function escapeSvgXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Mengubah isi dalam akar (radicand) dari notasi LaTeX ringan ke teks tampilan bersih untuk SVG Radical
 */
function formatRadicandDisplay(raw: string): { display: string; visualLen: number } {
  let s = (raw || '').trim();
  const supDigits: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', 'n': 'ⁿ', 'x': 'ˣ', 'y': 'ʸ',
  };
  const subDigits: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  };

  s = s.replace(/\^\{([^}]+)\}/g, (_, exp: string) =>
    Array.from(exp).map((c) => supDigits[c] || c).join('')
  );
  s = s.replace(/\^([0-9+\-nxy])/g, (_, exp: string) => supDigits[exp] || `^${exp}`);
  s = s.replace(/_\{([^}]+)\}/g, (_, sub: string) =>
    Array.from(sub).map((c) => subDigits[c] || c).join('')
  );
  s = s.replace(/_([0-9])/g, (_, sub: string) => subDigits[sub] || `_${sub}`);

  s = s
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\div\b/g, '÷')
    .replace(/\\pm\b/g, '±')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\,/g, ' ')
    .replace(/[{}]/g, '');

  return { display: s, visualLen: Math.max(1, Array.from(s).length) };
}

/**
 * Generator Inline SVG Mandiri untuk simbol akar kuadrat & akar pangkat-n (\sqrt{...}, \sqrt[n]{...})
 * Menghasilkan garis atap (vinculum) dan centang akar vektor SVG murni berskala relatif (em)
 * sehingga PASTI membentuk simbol akar utuh di semua browser mobile/desktop & ikut membesar sesuai ukuran font!
 */
function renderSvgRadical(radicand: string, index: string = ''): string {
  const { display: radText, visualLen } = formatRadicandDisplay(radicand);
  const idxClean = (index || '').trim();
  const idxOffset = idxClean ? Math.max(0, (idxClean.length - 1) * 5) : 0;

  const contentWidth = Math.max(12, visualLen * 8.6 + 6);
  const hookStart = 2 + idxOffset;
  const hookMid = 5.5 + idxOffset;
  const hookBottom = 9.5 + idxOffset;
  const roofStart = 15 + idxOffset;
  const svgWidth = roofStart + contentWidth + 3;
  const height = 26;
  const roofEnd = svgWidth - 1.5;

  const radicalPath = `M ${hookStart},14.5 L ${hookMid},13 L ${hookBottom},21.5 L ${roofStart},3.5 L ${roofEnd},3.5 L ${roofEnd},6`;

  const indexSvg = idxClean
    ? `<text x="${hookStart}" y="11" font-size="9.5" font-family="KaTeX_Main, Times New Roman, Georgia, serif" font-weight="600" fill="currentColor">${escapeSvgXml(idxClean)}</text>`
    : '';

  const contentSvg = `<text x="${roofStart + 2.5}" y="19" font-size="14.5" font-family="KaTeX_Main, Times New Roman, Georgia, serif" fill="currentColor">${escapeSvgXml(radText)}</text>`;

  const widthEm = (svgWidth / 16).toFixed(3);
  const heightEm = (height / 16).toFixed(3);

  return `<svg class="inline-math-svg inline-block align-middle" style="width:${widthEm}em;height:${heightEm}em;vertical-align:-0.28em;margin:0 0.08em;overflow:visible;" viewBox="0 0 ${svgWidth} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">${indexSvg}<path d="${radicalPath}" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" />${contentSvg}</svg>`;
}

/**
 * Generator Inline SVG Mandiri untuk pecahan (\frac)
 */
function renderSvgFraction(numerator: string, denominator: string): string {
  const { display: num, visualLen: numLen } = formatRadicandDisplay(numerator);
  const { display: den, visualLen: denLen } = formatRadicandDisplay(denominator);
  const maxLen = Math.max(numLen, denLen);
  const width = Math.max(18, maxLen * 9 + 8);
  const height = 34;
  const centerX = width / 2;
  const widthEm = (width / 16).toFixed(3);
  const heightEm = (height / 16).toFixed(3);

  return `<svg class="inline-math-svg inline-block align-middle" style="width:${widthEm}em;height:${heightEm}em;vertical-align:-0.58em;margin:0 0.12em;overflow:visible;" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><text x="${centerX}" y="12" font-size="12.5" font-family="KaTeX_Main, Times New Roman, Georgia, serif" text-anchor="middle" fill="currentColor">${escapeSvgXml(num)}</text><line x1="2" y1="17" x2="${width - 2}" y2="17" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" /><text x="${centerX}" y="30" font-size="12.5" font-family="KaTeX_Main, Times New Roman, Georgia, serif" text-anchor="middle" fill="currentColor">${escapeSvgXml(den)}</text></svg>`;
}

/**
 * Mengganti semua kemunculan \sqrt[n]{...} atau \sqrt{...} non-pecahan di dalam ekspresi LaTeX
 * menjadi SVG radical mandiri atau KaTeX hybrid agar simbol akar SELALU membentuk garis atap akar sempurna,
 * baik untuk: 2\sqrt{3}, -5\sqrt{2}, \sqrt{x^2 + y^2}, 3 + 2\sqrt{5}, \sqrt[3]{27}, dsb.
 */
function replaceInlineRadicalsInMath(mathExpr: string, displayMode = false): string {
  const trimmed = mathExpr.trim();

  // 1. Pecahan + Akar langsung: misal \frac{1}{4}\sqrt{14} atau -\frac{2}{3}\sqrt{6}
  const signedFracSqrt = trimmed.match(/^([+\-]?\s*)\\frac\{([^{}]+)\}\{([^{}]+)\}\s*\\sqrt(?:\[([^\]]+)\])?\{([^{}]+)\}$/);
  if (signedFracSqrt && !displayMode) {
    const signPrefix = signedFracSqrt[1].trim();
    const signHtml = signPrefix ? `<span class="mr-0.5 font-serif">${escapeSvgXml(signPrefix)}</span>` : '';
    const fracSvg = renderSvgFraction(signedFracSqrt[2], signedFracSqrt[3]);
    const sqrtSvg = renderSvgRadical(signedFracSqrt[5], signedFracSqrt[4] || '');
    return `<span class="cbt-ai-math-compound inline-flex items-center">${signHtml}${fracSvg}${sqrtSvg}</span>`;
  }

  // 2. Koefisien + Akar tunggal: misal \sqrt{3}, 2\sqrt{3}, -4\sqrt{5}, 12\sqrt[3]{8}, a\sqrt{b}
  const coeffSqrt = trimmed.match(/^([+\-]?\s*[0-9a-zA-Z.,]*)\s*\\sqrt(?:\[([^\]]+)\])?\{((?:[^{}]|\{[^{}]*\})+)\}$/);
  if (coeffSqrt && !coeffSqrt[3].includes('\\frac')) {
    const coeff = coeffSqrt[1].replace(/\s+/g, '');
    const idx = coeffSqrt[2] || '';
    const rad = coeffSqrt[3];
    const coeffHtml = coeff ? `<span class="font-serif tracking-tight">${escapeSvgXml(coeff)}</span>` : '';
    return `<span class="cbt-ai-math-compound inline-flex items-baseline">${coeffHtml}${renderSvgRadical(rad, idx)}</span>`;
  }

  // 3. Pecahan tunggal: \frac{a}{b}
  const fracOnly = trimmed.match(/^([+\-]?\s*)\\frac\{([^{}]+)\}\{([^{}]+)\}$/);
  if (fracOnly && !displayMode) {
    const signPrefix = fracOnly[1].trim();
    const signHtml = signPrefix ? `<span class="mr-0.5 font-serif">${escapeSvgXml(signPrefix)}</span>` : '';
    return `<span class="cbt-ai-math-compound inline-flex items-center">${signHtml}${renderSvgFraction(fracOnly[2], fracOnly[3])}</span>`;
  }

  // 4. Ekspresi majemuk yang mengandung satu atau lebih \sqrt non-pecahan
  //    Contoh: 2\sqrt{3} + 4\sqrt{5}, (3 - \sqrt{2}), x = 5 \pm \sqrt{7}, \sqrt{a+b} - \sqrt{c}
  //    Jika tidak mengandung \frac di dalam \sqrt, kita pecah pada setiap \sqrt agar bagian akarnya
  //    dijamin membentuk vektor SVG bergaris atap penuh, sementara bagian lainnya dirender dengan KaTeX!
  const sqrtTokenRegex = /\\sqrt(?:\[([^\]]+)\])?\{((?:[^{}]|\{[^{}]*\})+)\}/g;
  if (!displayMode && sqrtTokenRegex.test(trimmed)) {
    sqrtTokenRegex.lastIndex = 0;
    // Pastikan setiap \sqrt bukanlah akar pecahan (\sqrt{\frac{...}{...}}) dan tidak berada di dalam \frac{...\sqrt...}{...}
    const isInsideBraces = (str: string, pos: number): boolean => {
      let depth = 0;
      for (let i = 0; i < pos; i++) {
        if (str[i] === '{') depth++;
        else if (str[i] === '}') depth = Math.max(0, depth - 1);
      }
      return depth > 0;
    };

    let canSplitSafely = true;
    let matchCheck: RegExpExecArray | null;
    while ((matchCheck = sqrtTokenRegex.exec(trimmed)) !== null) {
      if (
        matchCheck[2].includes('\\frac') ||
        matchCheck[2].includes('\\dfrac') ||
        matchCheck[2].includes('\\tfrac') ||
        matchCheck[2].includes('\\sqrt') ||
        isInsideBraces(trimmed, matchCheck.index)
      ) {
        canSplitSafely = false;
        break;
      }
    }

    if (canSplitSafely) {
      sqrtTokenRegex.lastIndex = 0;
      let lastIdx = 0;
      let htmlParts = '';
      let m: RegExpExecArray | null;

      while ((m = sqrtTokenRegex.exec(trimmed)) !== null) {
        const before = trimmed.slice(lastIdx, m.index).trim();
        if (before) {
          htmlParts += katex.renderToString(before, {
            displayMode: false,
            throwOnError: false,
            output: 'html',
            trust: true,
          });
        }
        htmlParts += renderSvgRadical(m[2], m[1] || '');
        lastIdx = m.index + m[0].length;
      }

      const after = trimmed.slice(lastIdx).trim();
      if (after) {
        htmlParts += katex.renderToString(after, {
          displayMode: false,
          throwOnError: false,
          output: 'html',
          trust: true,
        });
      }

      return `<span class="cbt-ai-math-compound inline-flex flex-wrap items-baseline gap-x-0.5">${htmlParts}</span>`;
    }
  }

  // 5. Fallback ke KaTeX standar (termasuk untuk \sqrt{\frac{a}{b}} atau \frac{\sqrt{3}}{2})
  //    CSS globals.css telah diperbaiki agar SVG internal KaTeX & garis vinculum (.sqrt-line) tampil 100% utuh!
  return katex.renderToString(trimmed, {
    displayMode,
    throwOnError: false,
    output: 'html',
    trust: true,
  });
}

/**
 * Melindungi tag HTML (seperti <img ...>, <br>, <b>) selama konversi teks matematika
 */
function preprocessOutsideHtmlTags(input: string, processor: (chunk: string) => string): string {
  const parts = input.split(/(<[^>]+>)/g);
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i]) {
      parts[i] = processor(parts[i]);
    }
  }
  return parts.join('');
}

/**
 * Normalisasi notasi akar mentah baik di luar maupun di dalam blok $...$
 */
function normalizeRadicalNotations(chunk: string): string {
  let s = chunk;

  // Decode entitas HTML matematika
  s = s
    .replace(/&radic;/gi, '√')
    .replace(/&#8730;/g, '√')
    .replace(/&#x221a;/gi, '√')
    .replace(/&plusmn;/gi, '±')
    .replace(/&#177;/g, '±')
    .replace(/&times;/gi, '×')
    .replace(/&divide;/gi, '÷')
    .replace(/&le;/gi, '≤')
    .replace(/&ge;/gi, '≥')
    .replace(/&ne;/gi, '≠')
    .replace(/&deg;/gi, '°')
    .replace(/&nbsp;/gi, ' ');

  // Bersihkan spasi rusak pada KaTeX escape: "\ sqrt" -> "\sqrt", "\ frac" -> "\frac"
  s = s.replace(/\\\s+sqrt\b/g, '\\sqrt');
  s = s.replace(/\\\s+frac\b/g, '\\frac');

  // Tangani sintaks teks guru/siswa: akar(x) atau sqrt(x) -> \sqrt{x}
  s = s.replace(/\bsqrt\s*\(([^()]+)\)/gi, (_, val) => `\\sqrt{${val}}`);
  s = s.replace(/\bakar\s*\(([^()]+)\)/gi, (_, val) => `\\sqrt{${val}}`);

  // Tangani pangkat pecahan / indeks akar eksplisit dengan kurung siku: √[3]{8}, √[3](8), √[3]8 -> \sqrt[3]{8}
  s = s.replace(/√\s*\[([^\]]+)\]\s*\{([^}]+)\}/g, (_, n, val) => `\\sqrt[${n}]{${val}}`);
  s = s.replace(/√\s*\[([^\]]+)\]\s*\(([^)]+)\)/g, (_, n, val) => `\\sqrt[${n}]{${val}}`);
  s = s.replace(/√\s*\[([^\]]+)\]\s*([0-9a-zA-Z]+(?:\^[0-9a-zA-Z{}]+)?)/g, (_, n, val) => `\\sqrt[${n}]{${val}}`);

  // Tangani akar pangkat n dengan superscript unicode di depan akar: ³√8, ⁴√16, ⁿ√x -> \sqrt[3]{8}
  const supToNormal: Record<string, string> = {
    '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ⁿ': 'n',
  };
  s = s.replace(/([²³⁴⁵⁶⁷⁸⁹ⁿ]+)\s*√\s*\{([^}]+)\}/g, (_, sup: string, val: string) => {
    const idx = Array.from(sup).map((c) => supToNormal[c] || c).join('');
    return `\\sqrt[${idx}]{${val}}`;
  });
  s = s.replace(/([²³⁴⁵⁶⁷⁸⁹ⁿ]+)\s*√\s*\(([^)]+)\)/g, (_, sup: string, val: string) => {
    const idx = Array.from(sup).map((c) => supToNormal[c] || c).join('');
    return `\\sqrt[${idx}]{${val}}`;
  });
  s = s.replace(/([²³⁴⁵⁶⁷⁸⁹ⁿ]+)\s*√\s*([0-9a-zA-Z]+(?:\^[0-9a-zA-Z{}]+)?)/g, (_, sup: string, val: string) => {
    const idx = Array.from(sup).map((c) => supToNormal[c] || c).join('');
    return `\\sqrt[${idx}]{${val}}`;
  });

  // Tangani simbol khusus ∛ (cube root) dan ∜ (fourth root)
  s = s.replace(/∛\s*\{([^}]+)\}/g, (_, val) => `\\sqrt[3]{${val}}`);
  s = s.replace(/∛\s*\(([^)]+)\)/g, (_, val) => `\\sqrt[3]{${val}}`);
  s = s.replace(/∛\s*([0-9a-zA-Z]+(?:\^[0-9a-zA-Z{}]+)?)/g, (_, val) => `\\sqrt[3]{${val}}`);
  s = s.replace(/∜\s*\{([^}]+)\}/g, (_, val) => `\\sqrt[4]{${val}}`);
  s = s.replace(/∜\s*\(([^)]+)\)/g, (_, val) => `\\sqrt[4]{${val}}`);
  s = s.replace(/∜\s*([0-9a-zA-Z]+(?:\^[0-9a-zA-Z{}]+)?)/g, (_, val) => `\\sqrt[4]{${val}}`);

  // PENTING: Untuk 2√3, 5√2, √2,25 dalam soal matematika Indonesia, angka di depan √ adalah KOEFISIEN KALI (2 kali akar 3),
  // BUKAN akar pangkat 2! Jadi ubah semua √... menjadi \sqrt{...} sambil membiarkan koefisien di depannya tetap sebagai pengali!
  s = s.replace(/√\s*\{([^}]+)\}/g, (_, val) => `\\sqrt{${val}}`);
  s = s.replace(/√\s*\(([^)]+)\)/g, (_, val) => `\\sqrt{${val}}`);
  s = s.replace(/√\s*([0-9]+(?:[.,][0-9]+)?(?:\^[0-9a-zA-Z{}]+|[²³⁴⁵⁶⁷⁸⁹⁰]+)?|[0-9a-zA-Z]+(?:\^[0-9a-zA-Z{}]+|[²³⁴⁵⁶⁷⁸⁹⁰]+)?)/g, (_, val) => `\\sqrt{${val}}`);
  s = s.replace(/√(?![a-zA-Z0-9{(\[\\])/g, '\\surd');

  // Rapikan \sqrt tanpa kurung kurawal: \sqrt 14 -> \sqrt{14}, \sqrt2 -> \sqrt{2}, \sqrt x -> \sqrt{x}, \sqrt{14 (kurung belum ditutup)
  s = s.replace(/\\sqrt(?!\[|\{)\s*([0-9]+(?:[.,][0-9]+)?|[a-zA-Z])(?![a-zA-Z0-9])/g, (_, val) => `\\sqrt{${val}}`);
  s = s.replace(/\\sqrt\[([^\]]+)\](?!\{)\s*([0-9]+(?:[.,][0-9]+)?|[a-zA-Z])(?![a-zA-Z0-9])/g, (_, n, val) => `\\sqrt[${n}]{${val}}`);

  return s;
}

/**
 * Komponen untuk merender teks campuran Formula KaTeX ($...$ / $$...$$),
 * teks Bahasa Arab (dengan tata letak & harakat optimal), Aksara Jawa (Hanacaraka),
 * serta media embed (gambar, audio, video, dan YouTube iframe).
 */
export const MathRenderer: React.FC<MathRendererProps> = React.memo(({ content, className = '' }) => {
  const { hasArabic, hasJavanese, renderedHtml } = React.useMemo(() => {
    if (!content) {
      return { hasArabic: false, hasJavanese: false, renderedHtml: '' };
    }
    const arabic = ARABIC_REGEX.test(content);
    const javanese = JAVANESE_REGEX.test(content);
    const renderContentWithMathAndMedia = (text: string) => {
    // 0. Dukung delimiter LaTeX \( ... \) dan \[ ... \] menjadi $...$ dan $$...$$
    let processed = text
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);

    // Normalisasi simbol akar & entitas HTML di luar tag HTML (mencakup di luar maupun di dalam $...$)
    processed = preprocessOutsideHtmlTags(processed, (chunk) => {
      let c = normalizeRadicalNotations(chunk);

      // Format pecahan biasa yang berdampingan dengan akar di luar $: 1/4 \sqrt{14} -> $\frac{1}{4}\sqrt{14}$
      const segs = c.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
      for (let i = 0; i < segs.length; i += 2) {
        let seg = segs[i];
        if (!seg) continue;

        seg = seg.replace(
          /([+\-]?\d+)\/(\d+)\s*(\\sqrt(?:\[[^\]]+\])?\{[^{}]+\})/g,
          (_, a, b, rad) => `$\\frac{${a}}{${b}}${rad}$`
        );

        // Bungkus ekspresi LaTeX mentah yang belum diapit $...$ (termasuk koefisien di depan \sqrt seperti 2\sqrt{3}, -5\sqrt{2}, \dfrac, \tfrac)
        seg = seg.replace(
          /((?:[+\-]?\d+(?:[.,]\d+)?\s*|[a-zA-Z]\s*)?\\(?:frac|dfrac|tfrac|cfrac|sqrt|sum|int|lim|prod|pm|times|cdot|div|le|ge|neq|approx|alpha|beta|gamma|delta|theta|pi|sigma|omega)(?:\[[^\[\]]*\]|\{(?:[^{}]|\{[^{}]*\})*\}|[a-zA-Z0-9+\-*/=(),.^_\\])*)/g,
          (match) => `$${match.trim()}$`
        );

        segs[i] = seg;
      }
      return segs.join('');
    });

    // 1. Ganti block math $$...$$ (decode &lt; &gt; &amp; bawaan editor HTML sebelum dirender KaTeX!)
    let formatted = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        const cleanMath = math
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&amp;/gi, '&');
        return replaceInlineRadicalsInMath(cleanMath, true);
      } catch {
        return `$$${math}$$`;
      }
    });

    // 2. Ganti inline math $...$ (decode &lt; &gt; &amp; bawaan editor HTML sebelum dirender KaTeX!)
    formatted = formatted.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
      try {
        const cleanMath = math
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&amp;/gi, '&');
        return replaceInlineRadicalsInMath(cleanMath, false);
      } catch {
        return `$${math}$`;
      }
    });

    // 3. Format Video URL langsung (mp4, webm, ogg) jika berupa URL teks di luar atribut HTML
    formatted = formatted.replace(
      /(?<!["'=])(https?:\/\/[^\s<>"']+\.(?:mp4|webm|ogg)|\/uploads\/[^\s<>"']+\.(?:mp4|webm|ogg))/gi,
      `<video controls playsinline class="my-2 rounded-2xl max-w-lg w-full mx-auto shadow-sm"><source src="$1" /></video>`
    );

    // 4. Format YouTube URL embed
    formatted = formatted.replace(
      /(?<!["'=])(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g,
      `<div class="my-2 rounded-2xl overflow-hidden shadow-sm aspect-video max-w-lg mx-auto"><iframe class="w-full h-full" src="https://www.youtube-nocookie.com/embed/$1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    );

    // 5. Format Audio URL langsung (mp3, wav, ogg, m4a) jika berupa URL teks di luar atribut HTML
    formatted = formatted.replace(
      /(?<!["'=])(https?:\/\/[^\s<>"']+\.(?:mp3|wav|m4a|aac|ogg)|\/uploads\/[^\s<>"']+\.(?:mp3|wav|m4a|aac|ogg))/gi,
      `<audio controls class="my-2 w-full max-w-lg mx-auto block"><source src="$1" /></audio>`
    );

    // 6. Format Markdown Image ![alt](url)
    formatted = formatted.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/gi,
      `<img src="$2" alt="$1" class="cbt-zoomable-media my-2 max-h-72 max-w-full mx-auto object-contain cursor-zoom-in" />`
    );

    // 7. Auto-wrap raw Aksara Jawa yang belum dibungkus tag HTML
    formatted = formatted.replace(
      /(?<!<[^>]*)([\uA980-\uA9DF][\uA980-\uA9DF\s\uA9C0-\uA9CF]*[\uA980-\uA9DF]|[\uA980-\uA9DF])/g,
      `<span class="font-javanese-inline">$1</span>`
    );

    // 8. Auto-wrap raw Teks Arab yang belum dibungkus tag HTML agar harakat dan arah RTL sempurna
    formatted = formatted.replace(
      /(?<!<[^>]*)([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u060C\u061B\u061F\u0640\u0660-\u0669\u06F0-\u06F9]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0660-\u0669\u06F0-\u06F9]|[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF])/g,
      `<bdi class="font-arabic-inline" dir="rtl">$1</bdi>`
    );

    // 9. Dukung line breaks (spasi ke bawah / baris baru)
    formatted = formatted.replace(/\n/g, '<br />');

    return formatted;
  };
    return {
      hasArabic: arabic,
      hasJavanese: javanese,
      renderedHtml: renderContentWithMathAndMedia(content),
    };
  }, [content]);

  if (!content) return null;

  // Tentukan class penyesuaian untuk Arab / Aksara Jawa jika terdapat aksara
  const extraClasses = [
    hasArabic ? 'font-arabic-support' : '',
    hasJavanese ? 'font-javanese-support' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      dir="auto"
      className={`prose max-w-none text-slate-800 dark:text-slate-100 leading-relaxed font-sans ${extraClasses} ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
});
MathRenderer.displayName = 'MathRenderer';
