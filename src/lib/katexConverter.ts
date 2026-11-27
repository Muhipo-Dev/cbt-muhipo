/**
 * Utility untuk konversi otomatis format equation / formula dari:
 * - Microsoft Word (OMML, MathML, UnicodeMath, Word Equation)
 * - Microsoft Excel (Formulas, Math symbols, superscript/subscript)
 * - Raw LaTeX tanpa pembungkus $...$
 * - Unicode math (pecahan ½, akar √, pangkat x², indeks x₁, simbol Yunani α β θ π, dsb.)
 * Menjadi format KaTeX standar ($...$).
 */

// Mapping Unicode Superscripts ke LaTeX
const SUPERSCRIPT_MAP: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
  '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-', '⁼': '=', '⁽': '(', '⁾': ')',
  'ⁿ': 'n', 'ⁱ': 'i', 'ᵃ': 'a', 'ᵇ': 'b', 'ᶜ': 'c',
  'ᵈ': 'd', 'ᵉ': 'e', 'ᶠ': 'f', 'ᵍ': 'g', 'ʰ': 'h',
  'ʲ': 'j', 'ᵏ': 'k', 'ˡ': 'l', 'ᵐ': 'm', 'ᵒ': 'o',
  'ᵖ': 'p', 'ʳ': 'r', 'ˢ': 's', 'ᵗ': 't', 'ᵘ': 'u',
  'ᵛ': 'v', 'ʷ': 'w', 'ˣ': 'x', 'ʸ': 'y', 'ᶻ': 'z',
};

// Mapping Unicode Subscripts ke LaTeX
const SUBSCRIPT_MAP: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  '₊': '+', '₋': '-', '₌': '=', '₍': '(', '₎': ')',
  'ₐ': 'a', 'ₑ': 'e', 'ₕ': 'h', 'ᵢ': 'i', 'ⱼ': 'j',
  'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₒ': 'o',
  'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't', 'ᵤ': 'u',
  'ᵥ': 'v', 'ₓ': 'x',
};

// Mapping Unicode Fractions
const FRACTION_MAP: Record<string, string> = {
  '½': '\\frac{1}{2}', '⅓': '\\frac{1}{3}', '⅔': '\\frac{2}{3}',
  '¼': '\\frac{1}{4}', '¾': '\\frac{3}{4}', '⅕': '\\frac{1}{5}',
  '⅖': '\\frac{2}{5}', '⅗': '\\frac{3}{5}', '⅘': '\\frac{4}{5}',
  '⅙': '\\frac{1}{6}', '⅚': '\\frac{5}{6}', '⅛': '\\frac{1}{8}',
  '⅜': '\\frac{3}{8}', '⅝': '\\frac{5}{8}', '⅞': '\\frac{7}{8}',
};

// Mapping Unicode Greek & Math Symbols (TIDAK mengubah panah kalimat atau tanda hubung biasa agar teks kalimat tetap utuh!)
const SYMBOL_MAP: Record<string, string> = {
  'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta',
  'ε': '\\epsilon', 'ζ': '\\zeta', 'η': '\\eta', 'θ': '\\theta',
  'ι': '\\iota', 'κ': '\\kappa', 'λ': '\\lambda', 'μ': '\\mu',
  'ν': '\\nu', 'ξ': '\\xi', 'π': '\\pi', 'ρ': '\\rho',
  'σ': '\\sigma', 'τ': '\\tau', 'υ': '\\upsilon', 'φ': '\\phi',
  'χ': '\\chi', 'ψ': '\\psi', 'ω': '\\omega',
  'Γ': '\\Gamma', 'Δ': '\\Delta', 'Θ': '\\Theta', 'Λ': '\\Lambda',
  'Ξ': '\\Xi', 'Π': '\\Pi', 'Σ': '\\Sigma', 'Υ': '\\Upsilon',
  'Φ': '\\Phi', 'Ψ': '\\Psi', 'Ω': '\\Omega',
  '±': '\\pm', '∓': '\\mp',
  '≠': '\\neq', '≤': '\\le', '≥': '\\ge', '≈': '\\approx',
  '≡': '\\equiv', '≅': '\\cong', '∝': '\\propto',
  '∞': '\\infty', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint',
  '∮': '\\oint', '∂': '\\partial', '∇': '\\nabla', '∑': '\\sum',
  '∏': '\\prod', '∈': '\\in', '∉': '\\notin', '⊂': '\\subset',
  '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '∪': '\\cup', '∩': '\\cap', '∧': '\\land', '∨': '\\lor',
  '¬': '\\neg', '⇒': '\\Rightarrow', '⇔': '\\Leftrightarrow',
};

/**
 * Konversi MathML string (dari Word / Web export) ke LaTeX
 */
function mathmlToLatex(mathmlStr: string): string {
  let res = mathmlStr;

  // Hapus tag pembungkus math
  res = res.replace(/<\/?m:oMath[^>]*>/gi, '');
  res = res.replace(/<\/?math[^>]*>/gi, '');

  // Pecahan: <mfrac><mn>a</mn><mn>b</mn></mfrac> atau <m:f><m:num>...</m:num><m:den>...</m:den></m:f>
  res = res.replace(/<mfrac[^>]*>([\s\S]*?)<\/mfrac>/gi, (_, inner) => {
    const parts = inner.split(/<\/(?:mn|mi|mo|mrow|mtext)>/gi).filter(Boolean);
    const num = cleanMathTags(parts[0] || '');
    const den = cleanMathTags(parts[1] || '');
    return `\\frac{${num}}{${den}}`;
  });
  res = res.replace(/<m:f[^>]*>[\s\S]*?<m:num[^>]*>([\s\S]*?)<\/m:num>[\s\S]*?<m:den[^>]*>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/gi, (_, num, den) => {
    return `\\frac{${cleanMathTags(num)}}{${cleanMathTags(den)}}`;
  });

  // Akar pangkat n: <mroot><mn>8</mn><mn>3</mn></mroot> atau <m:rad><m:radPr>...<m:deg>3</m:deg><m:e>8</m:e></m:rad>
  res = res.replace(/<mroot[^>]*>([\s\S]*?)<\/mroot>/gi, (_, inner) => {
    const parts = inner.split(/<\/(?:mn|mi|mo|mrow|mtext)>/gi).filter(Boolean);
    const rad = cleanMathTags(parts[0] || '');
    const deg = cleanMathTags(parts[1] || '');
    return deg ? `\\sqrt[${deg}]{${rad}}` : `\\sqrt{${rad}}`;
  });
  res = res.replace(/<m:rad[^>]*>[\s\S]*?<m:deg[^>]*>([\s\S]*?)<\/m:deg>[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:rad>/gi, (_, deg, inner) => {
    const cleanDeg = cleanMathTags(deg);
    return cleanDeg ? `\\sqrt[${cleanDeg}]{${cleanMathTags(inner)}}` : `\\sqrt{${cleanMathTags(inner)}}`;
  });

  // Akar kuadrat: <msqrt>...</msqrt> atau <m:rad>
  res = res.replace(/<msqrt[^>]*>([\s\S]*?)<\/msqrt>/gi, (_, inner) => `\\sqrt{${cleanMathTags(inner)}}`);
  res = res.replace(/<m:rad[^>]*>[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:rad>/gi, (_, inner) => `\\sqrt{${cleanMathTags(inner)}}`);

  // Pangkat / Superscript: <msup><mi>x</mi><mn>2</mn></msup>
  res = res.replace(/<msup[^>]*>([\s\S]*?)<\/msup>/gi, (_, inner) => {
    const parts = inner.split(/<\/(?:mn|mi|mo|mrow|mtext)>/gi).filter(Boolean);
    const base = cleanMathTags(parts[0] || '');
    const sup = cleanMathTags(parts[1] || '');
    return `${base}^{${sup}}`;
  });
  res = res.replace(/<m:sSup[^>]*>[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sup[^>]*>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSup>/gi, (_, base, sup) => {
    return `${cleanMathTags(base)}^{${cleanMathTags(sup)}}`;
  });

  // Subscript: <msub><mi>x</mi><mn>1</mn></msub>
  res = res.replace(/<msub[^>]*>([\s\S]*?)<\/msub>/gi, (_, inner) => {
    const parts = inner.split(/<\/(?:mn|mi|mo|mrow|mtext)>/gi).filter(Boolean);
    const base = cleanMathTags(parts[0] || '');
    const sub = cleanMathTags(parts[1] || '');
    return `${base}_{${sub}}`;
  });
  res = res.replace(/<m:sSub[^>]*>[\s\S]*?<m:e[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub[^>]*>([\s\S]*?)<\/m:sub>[\s\S]*?<\/m:sSub>/gi, (_, base, sub) => {
    return `${cleanMathTags(base)}_{${cleanMathTags(sub)}}`;
  });

  // Bersihkan sisa-sisa tag XML MathML
  res = cleanMathTags(res);
  return res.trim();
}

function cleanMathTags(str: string): string {
  return str.replace(/<[^>]+>/g, '').trim();
}

/**
 * Konversi teks umum, formula Excel, Word Equation, atau Unicode Math menjadi format KaTeX ($...$).
 * Aman terhadap tag HTML (tidak merusak atribut src/alt/style pada <img>, <audio>, dsb).
 */
export function convertEquationToKatex(text: string | null | undefined): string {
  if (!text) return '';
  let str = String(text);

  // 1. Tangani MathML / OMML jika terdeteksi dalam teks sebelum memisahkan tag HTML biasa
  if (/<(?:m:oMath|math)[\s>]/i.test(str)) {
    str = str.replace(/<(?:m:oMath|math)[\s\S]*?<\/(?:m:oMath|math)>/gi, (match) => {
      const latex = mathmlToLatex(match);
      return latex ? `$${latex}$` : '';
    });
  }

  // 1b. Konversi delimiter LaTeX bawaan ChatGPT / Gemini: \[...\] -> $$...$$, \(...\) -> $...$, dan ```latex ... ``` -> $$...$$
  str = str
    .replace(/```(?:latex|math|tex)\s*([\s\S]*?)```/gi, (_, m) => `$$${m.trim()}$$`)
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m.trim()}$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`);

  // Pisahkan berdasarkan tag HTML agar tidak merusak tag <img src="...">, <b>, <p>, dll
  const htmlParts = str.split(/(<[^>]+>)/g);
  for (let pIdx = 0; pIdx < htmlParts.length; pIdx += 2) {
    let chunk = htmlParts[pIdx];
    if (!chunk) continue;

    // Decode entitas HTML matematika yang sering terbawa dari copy-paste / editor web / Word (termasuk &lt; &gt; di dalam rumus!)
    chunk = chunk
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
      .replace(/&sup2;/gi, '²')
      .replace(/&sup3;/gi, '³')
      .replace(/&frac12;/gi, '½')
      .replace(/&frac14;/gi, '¼')
      .replace(/&frac34;/gi, '¾')
      .replace(/&nbsp;/gi, ' ');

    // Bersihkan spasi rusak pada escape LaTeX
    chunk = chunk.replace(/\\\s+sqrt\b/g, '\\sqrt').replace(/\\\s+frac\b/g, '\\frac');

    // Konversi format Microsoft Excel / teks: =SQRT(x), SQRT(x), akar(x) -> \sqrt{x}
    chunk = chunk.replace(/(?:=|\b)SQRT\(([^()]+)\)/gi, (_, val) => `$\\sqrt{${val}}$`);
    chunk = chunk.replace(/\bakar\(([^()]+)\)/gi, (_, val) => `$\\sqrt{${val}}$`);
    chunk = chunk.replace(/(?:=|\b)POWER\(([^,]+),\s*([^)]+)\)/gi, (_, b, p) => `$${b.trim()}^{${p.trim()}}$`);

    // Akar pangkat n eksplisit dengan kurung siku atau angka superscript Unicode (³√8, ⁴√16, √[3]{8})
    chunk = chunk.replace(/√\s*\[([^\]]+)\]\s*\{([^}]+)\}/g, (_, n, val) => `$\\sqrt[${n}]{${val}}$`);
    chunk = chunk.replace(/√\s*\[([^\]]+)\]\s*\(([^)]+)\)/g, (_, n, val) => `$\\sqrt[${n}]{${val}}$`);
    chunk = chunk.replace(/√\s*\[([^\]]+)\]\s*([a-zA-Z0-9]+)/g, (_, n, val) => `$\\sqrt[${n}]{${val}}$`);

    chunk = chunk.replace(/([²³⁴⁵⁶⁷⁸⁹ⁿ]+)\s*√\s*\{([^}]+)\}/g, (_, sup, val) => {
      const deg = Array.from(sup).map((c: any) => SUPERSCRIPT_MAP[c] || c).join('');
      return `$\\sqrt[${deg}]{${val}}$`;
    });
    chunk = chunk.replace(/([²³⁴⁵⁶⁷⁸⁹ⁿ]+)\s*√\s*\(([^)]+)\)/g, (_, sup, val) => {
      const deg = Array.from(sup).map((c: any) => SUPERSCRIPT_MAP[c] || c).join('');
      return `$\\sqrt[${deg}]{${val}}$`;
    });
    chunk = chunk.replace(/([²³⁴⁵⁶⁷⁸⁹ⁿ]+)\s*√\s*([a-zA-Z0-9]+)/g, (_, sup, val) => {
      const deg = Array.from(sup).map((c: any) => SUPERSCRIPT_MAP[c] || c).join('');
      return `$\\sqrt[${deg}]{${val}}$`;
    });

    chunk = chunk.replace(/∛\s*\{([^}]+)\}/g, (_, val) => `$\\sqrt[3]{${val}}$`);
    chunk = chunk.replace(/∛\s*\(([^)]+)\)/g, (_, val) => `$\\sqrt[3]{${val}}$`);
    chunk = chunk.replace(/∛\s*([a-zA-Z0-9]+)/g, (_, val) => `$\\sqrt[3]{${val}}$`);
    chunk = chunk.replace(/∜\s*\{([^}]+)\}/g, (_, val) => `$\\sqrt[4]{${val}}$`);
    chunk = chunk.replace(/∜\s*\(([^)]+)\)/g, (_, val) => `$\\sqrt[4]{${val}}$`);
    chunk = chunk.replace(/∜\s*([a-zA-Z0-9]+)/g, (_, val) => `$\\sqrt[4]{${val}}$`);

    // Akar kuadrat dengan atau tanpa koefisien pengali di depannya:
    // Contoh: √14 -> $\sqrt{14}$, 2√3 -> $2\sqrt{3}$, -5√(x+1) -> $-5\sqrt{x+1}$
    // PENTING: 2√3 adalah 2 dikali akar 3 ($2\sqrt{3}$), BUKAN akar pangkat 2 dari 3!
    const segsBeforeWrap = chunk.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
    for (let sIdx = 0; sIdx < segsBeforeWrap.length; sIdx++) {
      if (sIdx % 2 === 1) {
        // Di dalam blok $...$ yang sudah ada: decode &lt;/&gt;/&amp; dari contentEditable & ubah simbol √ menjadi \sqrt{...}
        let inside = segsBeforeWrap[sIdx];
        inside = inside
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/&amp;/gi, '&');
        inside = inside.replace(/√\s*\[([^\]]+)\]\s*\{([^}]+)\}/g, (_, n, val) => `\\sqrt[${n}]{${val}}`);
        inside = inside.replace(/√\s*\[([^\]]+)\]\s*\(([^)]+)\)/g, (_, n, val) => `\\sqrt[${n}]{${val}}`);
        inside = inside.replace(/√\s*\[([^\]]+)\]\s*([a-zA-Z0-9]+)/g, (_, n, val) => `\\sqrt[${n}]{${val}}`);
        inside = inside.replace(/√\s*\{([^}]+)\}/g, (_, val) => `\\sqrt{${val}}`);
        inside = inside.replace(/√\s*\(([^)]+)\)/g, (_, val) => `\\sqrt{${val}}`);
        inside = inside.replace(/√\s*([a-zA-Z0-9]+)/g, (_, val) => `\\sqrt{${val}}`);
        inside = inside.replace(/\\sqrt(?!\[|\{)\s*([0-9]+|[a-zA-Z])(?![a-zA-Z0-9])/g, (_, val) => `\\sqrt{${val}}`);
        segsBeforeWrap[sIdx] = inside;
      } else {
        // Di luar blok $...$: konversi dan bungkus rapi dengan $...$
        let outside = segsBeforeWrap[sIdx];
        if (!outside) continue;

        // Pecahan berdampingan akar: 1/4 √14 -> $\frac{1}{4}\sqrt{14}$
        outside = outside.replace(
          /([+\-]?\d+)\/(\d+)\s*(?:√\s*\{([^}]+)\}|√\s*\(([^)]+)\)|√\s*([a-zA-Z0-9]+)|\\sqrt\{([^}]+)\})/g,
          (_, a, b, g1, g2, g3, g4) => `$\\frac{${a}}{${b}}\\sqrt{${g1 || g2 || g3 || g4}}$`
        );

        // Koefisien (opsional) + Akar kuadrat: 2√3 -> $2\sqrt{3}$, √14 -> $\sqrt{14}$, √(x+y) -> $\sqrt{x+y}$, √2,25 -> $\sqrt{2,25}$
        outside = outside.replace(
          /(?<![a-zA-Z\\])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*\{([^}]+)\}/g,
          (_, coeff, val) => `$${coeff ? coeff.trim() : ''}\\sqrt{${val}}$`
        );
        outside = outside.replace(
          /(?<![a-zA-Z\\])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*\(([^)]+)\)/g,
          (_, coeff, val) => `$${coeff ? coeff.trim() : ''}\\sqrt{${val}}$`
        );
        outside = outside.replace(
          /(?<![a-zA-Z\\])([+\-]?\d+(?:[.,]\d+)?)?\s*√\s*([0-9]+(?:[.,][0-9]+)?|[a-zA-Z0-9]+)/g,
          (_, coeff, val) => `$${coeff ? coeff.trim() : ''}\\sqrt{${val}}$`
        );
        // Jika ada simbol √ berdiri sendiri (misal "lambang akar (√)"), ubah menjadi $\sqrt{\phantom{x}}$ atau biarkan aman tanpa hilang
        outside = outside.replace(/√(?![a-zA-Z0-9{(\[])/g, '$\\surd$');

        // Rapikan \sqrt 14 -> \sqrt{14} & bungkus ekspresi LaTeX mentah HANYA di segmen yang belum terbungkus $...$
        const innerSegs = outside.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
        for (let iIdx = 0; iIdx < innerSegs.length; iIdx += 2) {
          let sub = innerSegs[iIdx];
          if (!sub) continue;

          sub = sub.replace(/\\sqrt(?!\[|\{)\s*([0-9]+|[a-zA-Z])(?![a-zA-Z0-9])/g, (_, val) => `\\sqrt{${val}}`);

          // Bungkus ekspresi LaTeX mentah yang belum dibungkus $...$
          sub = sub.replace(
            /((?:[+\-]?\d+(?:[.,]\d+)?\s*)?\\(?:frac|dfrac|tfrac|cfrac|sqrt|sum|int|lim|prod|pm|times|cdot|div|le|ge|neq|approx|alpha|beta|gamma|delta|theta|pi|sigma|omega)(?:\[[^\[\]]*\]|\{(?:[^{}]|\{[^{}]*\})*\}|[a-zA-Z0-9+\-*/=(),.^_\\])*)/g,
            (match) => `$${match.trim()}$`
          );

          // Pecahan Unicode: ½, ⅓, ¼, ¾, dsb.
          Object.entries(FRACTION_MAP).forEach(([char, latex]) => {
            if (sub.includes(char)) {
              sub = sub.split(char).join(`$${latex}$`);
            }
          });

          // Word/Excel Superscripts (Pangkat): x², x³, 10⁵
          const supChars = Object.keys(SUPERSCRIPT_MAP).join('');
          const supRegex = new RegExp(`([a-zA-Z0-9)]+)([${supChars}]+)`, 'g');
          sub = sub.replace(supRegex, (_, base, sups) => {
            const converted = Array.from(sups).map((c: any) => SUPERSCRIPT_MAP[c] || c).join('');
            return `$${base}^{${converted}}$`;
          });

          // Word/Excel Subscripts (Indeks): x₁, x₂, H₂O
          const subChars = Object.keys(SUBSCRIPT_MAP).join('');
          const subRegex = new RegExp(`([a-zA-Z0-9)]+)([${subChars}]+)`, 'g');
          sub = sub.replace(subRegex, (_, base, subs) => {
            const converted = Array.from(subs).map((c: any) => SUBSCRIPT_MAP[c] || c).join('');
            return `$${base}_{${converted}}$`;
          });

          // Simbol Derajat Suhu: 100°C, 360°, 45°
          sub = sub.replace(/(\d+)\s*°\s*C\b/gi, (_, n) => `$${n}^\\circ\\text{C}$`);
          sub = sub.replace(/(\d+)\s*°/g, (_, n) => `$${n}^\\circ$`);

          // Simbol Khusus (Greek, Operasi)
          Object.entries(SYMBOL_MAP).forEach(([char, latex]) => {
            if (sub.includes(char)) {
              sub = sub.split(char).join(` $${latex}$ `);
            }
          });

          // Format tebal Markdown **teks** bawaan ChatGPT / Gemini di luar rumus $...$ menjadi <strong>teks</strong>
          sub = sub.replace(/\*\*([^\*\n]+?)\*\*/g, '<strong>$1</strong>');

          innerSegs[iIdx] = sub;
        }
        outside = innerSegs.join('');

        segsBeforeWrap[sIdx] = outside;
      }
    }

    chunk = segsBeforeWrap.join('');
    // Bersihkan spasi berlebih tanpa menggabungkan dua blok $...$ secara keliru
    chunk = chunk.replace(/[ \t]{2,}/g, ' ');
    htmlParts[pIdx] = chunk;
  }

  return htmlParts.join('').trim();
}

/**
 * Deteksi apakah sebuah string mengandung indikasi rumus / formula matematika dari Word atau Excel
 */
export function hasEquationOrFormula(text: string | null | undefined): boolean {
  if (!text) return false;
  const str = String(text);

  if (/<(?:m:oMath|math)[\s>]/i.test(str)) return true;
  if (/\\(?:frac|sqrt|sum|int|lim|prod|alpha|beta|theta|pi|times|pm|le|ge)\b/.test(str)) return true;
  if (/(?:=|\b)(?:SQRT|POWER|SUM|AVERAGE|akar)\(/i.test(str)) return true;
  if (/[²³⁴⁵⁶⁷⁸⁹⁰⁺⁻ⁿⁱ₁₂₃₄₅₆₇₈₉₀½⅓⅔¼¾⅕⅙⅛√∛∜±×÷≠≤≥≈∞°αβγδθπλσωΔΩ∑∫]/.test(str)) return true;

  return false;
}
