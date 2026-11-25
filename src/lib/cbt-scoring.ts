/**
 * CBT Scoring & Answer Matching Algorithm (Kompatibel ZyaCBT + Modern AI Matching)
 * 
 * Standar Algoritma:
 * 1. Pilihan Ganda (PG):
 *    - Strict ID / Label match (A/B/C/D/E)
 *    - Nilai penuh jika benar, 0 jika salah
 * 
 * 2. PG Kompleks:
 *    - Pencocokan himpunan opsi (Subset / Proporsional AKM)
 *    - Siswa mendapat nilai proporsional jika benar sebagian tanpa jawaban salah,
 *      atau nilai penuh jika identik.
 * 
 * 3. Isian Singkat (Cerdas Toleran Typo & Whitespace):
 *    - Case-insensitive & Whitespace-trimmed
 *    - Multi-kunci jawaban yang dipisah tanda koma (,), titik koma (;), atau pipa (|)
 *    - Normalisasi numerik (misal: "2,5" vs "2.5")
 *    - Levenshtein Distance (toleransi 1 karakter typo untuk kata panjang >= 5 huruf)
 * 
 * 4. Benar / Salah:
 *    - Pencocokan status boolean (1/0, Benar/Salah, True/False)
 * 
 * 5. Menjodohkan:
 *    - Pencocokan pasangan kiri & kanan secara proporsional (Correct Pairs / Total Pairs)
 *    - Toleran normalisasi spasi dan huruf besar/kecil
 */

export interface OpsiItem {
  id: string;
  label: string;
  konten: string;
  isBenar: boolean;
}

/**
 * Normalisasi ekspresi matematika agar ekuivalen (akar, pecahan, KaTeX)
 */
export function normalizeMathExpression(expr: string): string {
  if (!expr) return '';
  let m = String(expr)
    .replace(/&radic;|&#8730;|&#x221a;/gi, '√')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&times;/gi, 'x')
    .replace(/&divide;/gi, '/')
    .trim();
  m = m.replace(/^\$+|\$+$/g, '').trim();
  m = m.replace(/\s+/g, '');
  m = m.replace(/\\(?:times|cdot)|\*/g, 'x');
  m = m.replace(/\\div|:/g, '/');
  m = m.replace(/(\d+),(\d+)/g, '$1.$2');
  const supMap: Record<string, string> = {
    '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ⁿ': 'n',
  };
  m = m.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  m = m.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'root($1,$2)');
  m = m.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  m = m.replace(/\\sqrt\(([^)]+)\)/g, 'sqrt($1)');
  m = m.replace(/\\sqrt([0-9a-zA-Z]+)/g, 'sqrt($1)');
  m = m.replace(/√\[([^\]]+)\]\{([^}]+)\}/g, 'root($1,$2)');
  m = m.replace(/√\[([^\]]+)\]\(([^)]+)\)/g, 'root($1,$2)');
  m = m.replace(/√\[([^\]]+)\]([0-9a-zA-Z]+)/g, 'root($1,$2)');
  m = m.replace(/([²³⁴⁵⁶⁷⁸⁹ⁿ]+)√\{([^}]+)\}/g, (_, s: string, v: string) => `root(${Array.from(s).map((c) => supMap[c] || c).join('')},${v})`);
  m = m.replace(/([²³⁴⁵⁶⁷⁸⁹ⁿ]+)√\(([^)]+)\)/g, (_, s: string, v: string) => `root(${Array.from(s).map((c) => supMap[c] || c).join('')},${v})`);
  m = m.replace(/([²³⁴⁵⁶⁷⁸⁹ⁿ]+)√([0-9a-zA-Z]+)/g, (_, s: string, v: string) => `root(${Array.from(s).map((c) => supMap[c] || c).join('')},${v})`);
  m = m.replace(/∛\{([^}]+)\}/g, 'root(3,$1)');
  m = m.replace(/∛\(([^)]+)\)/g, 'root(3,$1)');
  m = m.replace(/∛([0-9a-zA-Z]+)/g, 'root(3,$1)');
  m = m.replace(/∜\{([^}]+)\}/g, 'root(4,$1)');
  m = m.replace(/∜\(([^)]+)\)/g, 'root(4,$1)');
  m = m.replace(/∜([0-9a-zA-Z]+)/g, 'root(4,$1)');
  // 2√3 -> 2sqrt(3) (perkalian koefisien dengan akar kuadrat, selaras dengan 2\sqrt{3})
  m = m.replace(/√\{([^}]+)\}/g, 'sqrt($1)');
  m = m.replace(/√\(([^)]+)\)/g, 'sqrt($1)');
  m = m.replace(/√([0-9a-zA-Z.]+)/g, 'sqrt($1)');
  m = m.replace(/\\(?:left|right|mathrm|mathbf|text)/g, '');
  m = m.replace(/\((\d+)\)\/\((\d+)\)/g, '$1/$2');
  m = m.replace(/\\/g, '');
  return m.toLowerCase();
}

/**
 * Normalisasi teks untuk perbandingan isian cerdas
 */
export function normalizeAnswerText(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'") // curly quotes
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ') // multi-spaces to single space
    .replace(/[.,;:]+$/, ''); // trailing punctuation
}

/**
 * Menghitung jarak Levenshtein sederhana untuk toleransi typo ringan
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));

  for (let i = 0; i <= an; i++) matrix[0][i] = i;
  for (let j = 0; j <= bn; j++) matrix[j][0] = j;

  for (let j = 1; j <= bn; j++) {
    for (let i = 1; i <= an; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[bn][an];
}

/**
 * Algoritma Pencocokan Isian Singkat Cerdas (ZyaCBT + AI Normalization)
 */
export function matchIsianSingkat(jawabanSiswa: string, kunciJawabanTeks: string): boolean {
  const userClean = normalizeAnswerText(jawabanSiswa);
  if (!userClean) return false;

  const rawKunci = kunciJawabanTeks || '';
  if (!rawKunci.trim()) return false;

  const userMath = normalizeMathExpression(jawabanSiswa);

  // Mendukung multi-kunci alternatif yang dipisahkan oleh tanda |, ;, atau koma
  // Contoh: "Jakarta | DKI Jakarta" atau "Oksigen, O2"
  const delimiterRegex = /[|;]/;
  const kunciList = rawKunci.includes('|') || rawKunci.includes(';')
    ? rawKunci.split(delimiterRegex).map((k) => k.trim()).filter(Boolean)
    : [rawKunci.trim()];

  for (const rawK of kunciList) {
    const kunci = normalizeAnswerText(rawK);
    const kunciMath = normalizeMathExpression(rawK);

    if (userClean === kunci || (userMath && userMath === kunciMath)) return true;

    // Normalisasi angka desimal: 2,5 vs 2.5
    const cleanNumUser = userClean.replace(',', '.');
    const cleanNumKunci = kunci.replace(',', '.');
    if (!isNaN(Number(cleanNumUser)) && !isNaN(Number(cleanNumKunci))) {
      if (Number(cleanNumUser) === Number(cleanNumKunci)) {
        return true;
      }
    }

    // Toleransi typo ringan (Levenshtein distance = 1 jika panjang kata >= 5)
    if (kunci.length >= 5 && Math.abs(userClean.length - kunci.length) <= 1) {
      if (levenshteinDistance(userClean, kunci) <= 1) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Algoritma Pencocokan PG Kompleks (Proporsional AKM)
 */
export function matchPGKompleks(
  chosenIds: string[],
  opsiJawaban: OpsiItem[],
  bobot: number
): { isBenar: boolean; skor: number } {
  const correctOpsiIds = opsiJawaban.filter((o) => o.isBenar).map((o) => o.id);
  if (correctOpsiIds.length === 0) return { isBenar: false, skor: 0 };

  const chosenSet = new Set(chosenIds);
  const correctSet = new Set(correctOpsiIds);

  // Cek apakah persis identik
  if (chosenIds.length === correctOpsiIds.length && chosenIds.every((id) => correctSet.has(id))) {
    return { isBenar: true, skor: bobot };
  }

  // Hitung proporsi benar (Jawaban benar yang dipilih dikurangi penalti jawaban salah yang dipilih)
  let benarDipilih = 0;
  let salahDipilih = 0;

  for (const id of chosenIds) {
    if (correctSet.has(id)) benarDipilih++;
    else salahDipilih++;
  }

  const rawRatio = (benarDipilih - salahDipilih * 0.5) / correctOpsiIds.length;
  const ratio = Math.max(0, Math.min(1, rawRatio));
  const skor = Number((ratio * bobot).toFixed(2));

  return {
    isBenar: skor >= bobot,
    skor,
  };
}

/**
 * Algoritma Pencocokan Menjodohkan
 */
export function matchMenjodohkan(
  jawabanRaw: string | undefined,
  matchingDataRaw: string | undefined,
  bobot: number
): { isBenar: boolean; skor: number } {
  try {
    const keyPairs: { left: string; right: string }[] = JSON.parse(matchingDataRaw || '[]');
    const totalPairs = keyPairs.length;
    if (totalPairs === 0) return { isBenar: false, skor: 0 };

    let userAnswers: Record<string, string> = {};
    if (jawabanRaw) {
      const parsed = JSON.parse(jawabanRaw);
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          if (p.left && p.right) {
            userAnswers[normalizeAnswerText(p.left)] = normalizeAnswerText(p.right);
          }
        });
      } else if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([k, v]) => {
          userAnswers[normalizeAnswerText(k)] = normalizeAnswerText(String(v));
        });
      }
    }

    let pairsCorrect = 0;
    for (const kp of keyPairs) {
      const expectedLeft = normalizeAnswerText(kp.left);
      const expectedRight = normalizeAnswerText(kp.right);
      if (userAnswers[expectedLeft] && userAnswers[expectedLeft] === expectedRight) {
        pairsCorrect++;
      }
    }

    const proportion = pairsCorrect / totalPairs;
    const skor = Number((proportion * bobot).toFixed(2));
    const isBenar = pairsCorrect === totalPairs;

    return { isBenar, skor };
  } catch {
    return { isBenar: false, skor: 0 };
  }
}
