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

// Mapping Unicode Greek & Math Symbols
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
  '±': '\\pm', '∓': '\\mp', '×': '\\times', '÷': '\\div',
  '≠': '\\neq', '≤': '\\le', '≥': '\\ge', '≈': '\\approx',
  '≡': '\\equiv', '∼': '\\sim', '≅': '\\cong', '∝': '\\propto',
  '∞': '\\infty', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint',
  '∮': '\\oint', '∂': '\\partial', '∇': '\\nabla', '∑': '\\sum',
  '∏': '\\prod', '∈': '\\in', '∉': '\\notin', '⊂': '\\subset',
  '⊃': '\\supset', '⊆': '\\subseteq', '⊇': '\\supseteq',
  '∪': '\\cup', '∩': '\\cap', '∧': '\\land', '∨': '\\lor',
  '¬': '\\neg', '⇒': '\\Rightarrow', '⇔': '\\Leftrightarrow',
  '→': '\\rightarrow', '←': '\\leftarrow', '↔': '\\leftrightarrow',
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
 */
export function convertEquationToKatex(text: string | null | undefined): string {
  if (!text) return '';
  let str = String(text);

  // 1. Tangani MathML / OMML jika terdeteksi dalam teks
  if (/<(?:m:oMath|math)[\s>]/i.test(str)) {
    str = str.replace(/<(?:m:oMath|math)[\s\S]*?<\/(?:m:oMath|math)>/gi, (match) => {
      const latex = mathmlToLatex(match);
      return latex ? `$${latex}$` : '';
    });
  }

  // 2. Deteksi format LaTeX yang belum dibungkus tanda $
  // Contoh: \frac{a}{b}, \sqrt{x}, \sum_{i=1}^{n}, \int_{0}^{\pi}, \begin{matrix}
  const rawLatexRegex = /(?:\\(?:frac|sqrt|sum|int|lim|prod|alpha|beta|gamma|delta|theta|pi|sigma|omega|Delta|Omega|times|div|pm|le|ge|neq|approx|infty|cdot|deg|circ|mathbf|mathrm|text|left|right|begin)\{[^}]*\})+/g;
  
  // Jika ada raw \frac{...}{...} tanpa $
  str = str.replace(/(\\(?:frac|sqrt|sum|int|lim|prod|left|right)\{[^{}]*\}(?:\{[^{}]*\})?)/g, (match, p1, offset, full) => {
    // Cek apakah sudah di dalam $...$
    const before = full.substring(0, offset);
    const dollarCount = (before.match(/\$/g) || []).length;
    if (dollarCount % 2 !== 0) return match; // Sudah di dalam math block
    return `$${match}$`;
  });

  // 3. Konversi format Microsoft Excel SQRT / Pangkat
  // =SQRT(x) atau SQRT(x) -> \sqrt{x}
  str = str.replace(/(?:=|\b)SQRT\(([^)]+)\)/gi, '$\\sqrt{$1}$');
  // =POWER(x, y) atau POWER(x, y) -> x^{y}
  str = str.replace(/(?:=|\b)POWER\(([^,]+),\s*([^)]+)\)/gi, '${$1}^{$2}$');

  // 4. Konversi Unicode Akar: √(expr), √x, ∛x, ∜x
  str = str.replace(/√\(([^)]+)\)/g, '$\\sqrt{$1}$');
  str = str.replace(/√([a-zA-Z0-9]+)/g, '$\\sqrt{$1}$');
  str = str.replace(/∛\(([^)]+)\)/g, '$\\sqrt[3]{$1}$');
  str = str.replace(/∛([a-zA-Z0-9]+)/g, '$\\sqrt[3]{$1}$');
  str = str.replace(/∜\(([^)]+)\)/g, '$\\sqrt[4]{$1}$');
  str = str.replace(/∜([a-zA-Z0-9]+)/g, '$\\sqrt[4]{$1}$');

  // 5. Konversi Pecahan Unicode: ½, ⅓, ⅔, ¼, ¾, dsb.
  Object.entries(FRACTION_MAP).forEach(([char, latex]) => {
    if (str.includes(char)) {
      str = str.replaceAll(char, `$${latex}$`);
    }
  });

  // 6. Konversi Word/Excel Superscripts (Pangkat): x², x³, 10⁵, dsb.
  const supChars = Object.keys(SUPERSCRIPT_MAP).join('');
  const supRegex = new RegExp(`([a-zA-Z0-9)]+)([${supChars}]+)`, 'g');
  str = str.replace(supRegex, (_, base, sups) => {
    const converted = Array.from(sups).map((c: any) => SUPERSCRIPT_MAP[c] || c).join('');
    return `$${base}^{${converted}}$`;
  });

  // 7. Konversi Word/Excel Subscripts (Indeks): x₁, x₂, H₂O, dsb.
  const subChars = Object.keys(SUBSCRIPT_MAP).join('');
  const subRegex = new RegExp(`([a-zA-Z0-9)]+)([${subChars}]+)`, 'g');
  str = str.replace(subRegex, (_, base, subs) => {
    const converted = Array.from(subs).map((c: any) => SUBSCRIPT_MAP[c] || c).join('');
    return `$${base}_{${converted}}$`;
  });

  // 8. Konversi Simbol Derajat Suhu: 100°C, 360°, 45° -> $100^\circ\text{C}$, $360^\circ$, $45^\circ$
  str = str.replace(/(\d+)\s*°\s*C\b/gi, '$$$1^\\circ\\text{C}$$');
  str = str.replace(/(\d+)\s*°/g, '$$$1^\\circ$$');

  // 9. Konversi Simbol Khusus (Greek, Operasi) jika berdiri bebas atau bersama variabel
  // Contoh: α = 0.05, 5 × 10, ± 2.5
  Object.entries(SYMBOL_MAP).forEach(([char, latex]) => {
    if (str.includes(char)) {
      // Ganti simbol yang tidak berada di dalam tag HTML
      str = str.replaceAll(char, ` $${latex}$ `);
    }
  });

  // 10. Gabungkan $...$ yang berdempetan: misal $x^2$ $+$ $y^2$ -> $x^2 + y^2$
  str = str.replace(/\$\s*\$\s*/g, ' ');
  str = str.replace(/\$\s*([\+\-\*\/\=\<\>\±\times\div\neq\le\ge]+)\s*\$/g, ' $1 ');
  str = str.replace(/\$\s+([a-zA-Z0-9\+\-\*\/\=\^\_\{\}\\]+)\s+\$/g, '$$$1$$');

  // Bersihkan spasi ganda yang tidak sengaja terbentuk
  str = str.replace(/\s{2,}/g, ' ').trim();

  return str;
}

/**
 * Deteksi apakah sebuah string mengandung indikasi rumus / formula matematika dari Word atau Excel
 */
export function hasEquationOrFormula(text: string | null | undefined): boolean {
  if (!text) return false;
  const str = String(text);

  // Periksa MathML, OMML, LaTeX, formula Excel, superscripts, subscripts, atau pecahan unicode
  if (/<(?:m:oMath|math)[\s>]/i.test(str)) return true;
  if (/\\(?:frac|sqrt|sum|int|lim|prod|alpha|beta|theta|pi|times|pm|le|ge)\b/.test(str)) return true;
  if (/(?:=|\b)(?:SQRT|POWER|SUM|AVERAGE)\(/i.test(str)) return true;
  if (/[²³⁴⁵⁶⁷⁸⁹⁰⁺⁻ⁿⁱ₁₂₃₄₅₆₇₈₉₀½⅓⅔¼¾⅕⅙⅛√∛∜±×÷≠≤≥≈∞°αβγδθπλσωΔΩ∑∫]/.test(str)) return true;

  return false;
}
