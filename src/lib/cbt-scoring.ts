/**
 * CBT Scoring & Automatic Answer Evaluation Engine
 *
 * Aturan Penilaian Terpadu (Berlaku serentak di Submit Siswa, Auto-Submit Timer, Force-Finish Proktor, & Evaluasi Guru/Admin):
 * 1. Pilihan Ganda (PG) & Benar/Salah (BENAR_SALAH):
 *    - Pencocokan ID opsi tepat -> Nilai penuh (100% bobot) jika benar, 0 jika salah.
 * 2. Pilihan Ganda Kompleks (PG_KOMPLEKS):
 *    - Pencocokan himpunan proporsional AKM dengan penalti pilihan salah -> 0 s.d. 100% bobot.
 * 3. Menjodohkan (MENJODOHKAN):
 *    - Proporsional pasangan tepat (Correct Pairs / Total Pairs) -> 0 s.d. 100% bobot.
 * 4. Isian Singkat (ISIAN):
 *    - WAJIB EXACT MATCH (persis sesuai kunci jawaban setelah normalisasi huruf besar/kecil, spasi,
 *      angka desimal 2,5 == 2.5, atau ekspresi matematika ekuivalen 2√3 == $2\sqrt{3}$).
 *    - Mendukung multi-alternatif kunci dipisahkan tanda `|` atau `;`.
 *    - Jika Exact Match -> Nilai Penuh (100% bobot); selain itu -> 0 (TANPA toleransi typo fuzzy).
 * 5. Esai / Uraian (ESAI):
 *    - Penilaian otomatis berbasis analisis kemiripan makna, konsep/kata kunci, sinonim & imbuhan Bahasa Indonesia,
 *      kesesuaian angka/rumus, serta pengecekan negasi terhadap Kunci Jawaban / Rubrik:
 *      • NILAI PENUH (100% bobot): Jika detail penjelasan sesuai/lengkap atau maksudnya sama persis dengan kunci jawaban.
 *      • NILAI SETENGAH (50% bobot): Jika penjelasan hampir mendekati kunci jawaban atau maksud/intinya mirip sebagian.
 *      • NILAI NOL (0): Jika kosong, tidak relevan, atau bertentangan (negasi berlawanan) dengan kunci jawaban.
 */

export interface OpsiItem {
  id: string;
  label: string;
  konten: string;
  isBenar: boolean;
}

export interface EsaiAutoEvalResult {
  skor: number;
  kategori: 'PENUH' | 'SETENGAH' | 'NOL' | 'BELUM_ADA_KUNCI';
  isBenar: boolean;
  kemiripanPersen: number;
  catatan: string;
}

/**
 * Bersihkan tag HTML & decode entitas umum tanpa mengubah isi teks jawaban/kunci
 */
export function stripHtmlAndDecodeEntities(raw: string): string {
  if (!raw) return '';
  return String(raw)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&radic;|&#8730;|&#x221a;/gi, '√')
    .replace(/&plusmn;|&#177;/gi, '±')
    .replace(/&times;/gi, '×')
    .replace(/&divide;/gi, '÷')
    .replace(/&le;/gi, '≤')
    .replace(/&ge;/gi, '≥')
    .replace(/&ne;/gi, '≠')
    .replace(/&deg;/gi, '°')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

/**
 * Normalisasi ekspresi matematika agar notasi ekuivalen (akar, pecahan, KaTeX) dapat dicocokkan secara presisi
 */
export function normalizeMathExpression(expr: string): string {
  if (!expr) return '';
  let m = stripHtmlAndDecodeEntities(expr);
  m = m
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/^\$+|\$+$/g, '')
    .replace(/\$/g, '')
    .trim();
  m = m.replace(/\s+/g, '');
  m = m.replace(/\\(?:times|cdot)|×|\*/g, 'x');
  m = m.replace(/\\div|÷|:/g, '/');
  m = m.replace(/(\d+),(\d+)/g, '$1.$2');
  const supMap: Record<string, string> = {
    '⁰': '0',
    '¹': '1',
    '²': '2',
    '³': '3',
    '⁴': '4',
    '⁵': '5',
    '⁶': '6',
    '⁷': '7',
    '⁸': '8',
    '⁹': '9',
    'ⁿ': 'n',
  };
  m = m.replace(/([a-zA-Z0-9)]+)([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+)/g, (_, base: string, sups: string) => {
    const conv = Array.from(sups)
      .map((c) => supMap[c] || c)
      .join('');
    return `${base}^${conv}`;
  });
  m = m.replace(/\\(?:d|t|c)?frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  m = m.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, 'root($1,$2)');
  m = m.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  m = m.replace(/\\sqrt\(([^)]+)\)/g, 'sqrt($1)');
  m = m.replace(/\\sqrt([0-9a-zA-Z.]+)/g, 'sqrt($1)');
  m = m.replace(/√\[([^\]]+)\]\{([^}]+)\}/g, 'root($1,$2)');
  m = m.replace(/√\[([^\]]+)\]\(([^)]+)\)/g, 'root($1,$2)');
  m = m.replace(/√\[([^\]]+)\]([0-9a-zA-Z.]+)/g, 'root($1,$2)');
  m = m.replace(
    /([²³⁴⁵⁶⁷⁸⁹ⁿ]+)√\{([^}]+)\}/g,
    (_, s: string, v: string) =>
      `root(${Array.from(s)
        .map((c) => supMap[c] || c)
        .join('')},${v})`
  );
  m = m.replace(
    /([²³⁴⁵⁶⁷⁸⁹ⁿ]+)√\(([^)]+)\)/g,
    (_, s: string, v: string) =>
      `root(${Array.from(s)
        .map((c) => supMap[c] || c)
        .join('')},${v})`
  );
  m = m.replace(
    /([²³⁴⁵⁶⁷⁸⁹ⁿ]+)√([0-9a-zA-Z.]+)/g,
    (_, s: string, v: string) =>
      `root(${Array.from(s)
        .map((c) => supMap[c] || c)
        .join('')},${v})`
  );
  m = m.replace(/∛\{([^}]+)\}/g, 'root(3,$1)');
  m = m.replace(/∛\(([^)]+)\)/g, 'root(3,$1)');
  m = m.replace(/∛([0-9a-zA-Z.]+)/g, 'root(3,$1)');
  m = m.replace(/∜\{([^}]+)\}/g, 'root(4,$1)');
  m = m.replace(/∜\(([^)]+)\)/g, 'root(4,$1)');
  m = m.replace(/∜([0-9a-zA-Z.]+)/g, 'root(4,$1)');
  // 2√3 -> 2sqrt(3)
  m = m.replace(/√\{([^}]+)\}/g, 'sqrt($1)');
  m = m.replace(/√\(([^)]+)\)/g, 'sqrt($1)');
  m = m.replace(/√([0-9a-zA-Z.]+)/g, 'sqrt($1)');
  m = m.replace(/\bakar\(([^)]+)\)/gi, 'sqrt($1)');
  m = m.replace(/\\(?:left|right|mathrm|mathbf|text)/g, '');
  m = m.replace(/\{([a-zA-Z0-9.]+)\}/g, '$1');
  m = m.replace(/\((\d+(?:\.\d+)?)\)\/\((\d+(?:\.\d+)?)\)/g, '$1/$2');
  m = m.replace(/\\/g, '');
  return m.toLowerCase();
}

/**
 * Normalisasi teks standar (tanpa mengubah ejaan kata!) untuk pencocokan Exact Match pada Isian Singkat
 */
export function normalizeAnswerText(text: string): string {
  if (!text) return '';
  return stripHtmlAndDecodeEntities(text)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/^["'`$]+|["'`$]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '')
    .trim();
}

/**
 * Menghitung jarak Levenshtein (digunakan khusus untuk toleransi morfologi kata panjang di Esai)
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
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }
  return matrix[bn][an];
}

function hasMathIndicators(s: string): boolean {
  return /[0-9√∛∜±×÷≤≥≠^/*+=\\$]|\b(?:sqrt|akar|frac|sin|cos|tan|log)\b/i.test(s);
}

/**
 * Algoritma Pencocokan Isian Singkat — STRICT EXACT MATCH!
 * - Jawaban yang persis (exact) dengan kunci jawaban mendapat Nilai Penuh (100% bobot).
 * - Jawaban yang tidak persis (termasuk salah eja/huruf berbeda) mendapat 0.
 * - Mendukung multi-alternatif kunci resmi yang dipisahkan `|`, `;`, atau baris baru.
 */
export function matchIsianSingkat(jawabanSiswa: string, kunciJawabanTeks: string): boolean {
  const userClean = normalizeAnswerText(jawabanSiswa);
  if (!userClean) return false;

  const rawKunci = stripHtmlAndDecodeEntities(kunciJawabanTeks || '');
  if (!rawKunci) return false;

  const kunciList = rawKunci
    .split(/[|;\r\n]+/)
    .map((k) => k.trim())
    .filter(Boolean);

  if (kunciList.length === 0) return false;

  const pureNumberRegex = /^[+-]?\d+(?:[.,]\d+)?$/;
  const userIsPureNum = pureNumberRegex.test(userClean);
  const userMath = hasMathIndicators(jawabanSiswa) ? normalizeMathExpression(jawabanSiswa) : '';

  for (const rawK of kunciList) {
    const kunci = normalizeAnswerText(rawK);
    if (!kunci) continue;

    // 1. Exact Match Teks Standar (setelah trim, case-fold, normalisasi spasi)
    if (userClean === kunci) {
      return true;
    }

    // 2. Exact Match Angka Murni (contoh: "1,5" === "1.5" atau "05" === "5")
    if (userIsPureNum && pureNumberRegex.test(kunci)) {
      const numU = Number(userClean.replace(',', '.'));
      const numK = Number(kunci.replace(',', '.'));
      if (Number.isFinite(numU) && Number.isFinite(numK) && Math.abs(numU - numK) < 1e-9) {
        return true;
      }
    }

    // 3. Exact Match Ekspresi Matematika Ekuivalen (contoh: "2√3" === "$2\sqrt{3}$")
    if (userMath && hasMathIndicators(rawK)) {
      const kunciMath = normalizeMathExpression(rawK);
      if (kunciMath && userMath === kunciMath) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================================
// MESIN PENILAIAN ESAI OTOMATIS (PENUH 100% / SETENGAH 50% / NOL 0%)
// ============================================================================

const INDONESIAN_STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'pada', 'dalam', 'untuk', 'dengan', 'adalah',
  'ialah', 'merupakan', 'yaitu', 'yakni', 'sebagai', 'atau', 'ini', 'itu', 'tersebut',
  'dapat', 'bisa', 'akan', 'telah', 'sudah', 'sedang', 'oleh', 'karena', 'sebab',
  'sehingga', 'agar', 'supaya', 'jika', 'apabila', 'bila', 'maka', 'secara', 'hal',
  'suatu', 'sebuah', 'para', 'ia', 'dia', 'mereka', 'kita', 'kami', 'anda', 'saya',
  'nya', 'pun', 'juga', 'serta', 'maupun', 'antara', 'lain', 'seperti', 'contoh',
  'contohnya', 'misal', 'misalnya', 'ketika', 'saat', 'waktu', 'terhadap', 'melalui',
  'tentang', 'mengenai', 'menurut', 'berdasarkan', 'hingga', 'sampai', 'lebih', 'sangat',
  'paling', 'ada', 'adanya', 'terjadi', 'terjadinya', 'proses', 'cara', 'bagian',
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'have', 'has',
]);

const NEGATION_TOKENS = new Set([
  'tidak', 'bukan', 'tanpa', 'jangan', 'belum', 'mustahil', 'tiada', 'tak', 'non', 'gagal', 'salah', 'not', 'never', 'without',
]);

// Kamus sinonim & konsep ekuivalen lintas mata pelajaran sekolah (IPA, MTK, IPS, Bahasa, PAI, PPKn)
const SYNONYM_CLUSTERS: string[][] = [
  ['cahaya', 'sinar', 'foton'],
  ['matahari', 'surya'],
  ['tumbuhan', 'tanaman', 'flora', 'nabati'],
  ['hewan', 'binatang', 'fauna', 'hewani'],
  ['manusia', 'orang', 'masyarakat', 'penduduk', 'warga', 'individu'],
  ['air', 'h2o', 'hidrogenoksida'],
  ['oksigen', 'o2'],
  ['karbondioksida', 'co2'],
  ['glukosa', 'gula', 'karbohidrat', 'amilum'],
  ['energi', 'tenaga', 'daya'],
  ['panas', 'kalor', 'termal'],
  ['suhu', 'temperatur', 'derajat'],
  ['cepat', 'kecepatan', 'laju', 'kelajuan'],
  ['besar', 'tinggi', 'meningkat', 'bertambah', 'naik', 'maksimal', 'banyak'],
  ['kecil', 'rendah', 'menurun', 'berkurang', 'turun', 'minimal', 'sedikit'],
  ['sama', 'setara', 'ekuivalen', 'sebanding', 'identik', 'serupa'],
  ['beda', 'berbeda', 'perbedaan', 'selisih'],
  ['buat', 'produksi', 'hasil', 'bentuk', 'cipta', 'sintesis', 'masak'],
  ['ubah', 'konversi', 'transformasi', 'ganti'],
  ['tarik', 'gravitasi', 'pikat'],
  ['dorong', 'tolak'],
  ['untung', 'laba', 'manfaat', 'fungsi', 'guna', 'faedah', 'positif'],
  ['rugi', 'dampakburuk', 'bahaya', 'negatif', 'kerusakan'],
  ['aturan', 'peraturan', 'norma', 'hukum', 'undang', 'tata', 'tertib'],
  ['adil', 'keadilan', 'merata', 'kesetaraan'],
  ['merdeka', 'kemerdekaan', 'bebas', 'kebebasan', 'kedaulatan', 'berdaulat'],
  ['negara', 'bangsa', 'pemerintah', 'nasional'],
  ['ekonomi', 'keuangan', 'finansial', 'perdagangan', 'pasar'],
  ['lingkungan', 'ekosistem', 'alam', 'habitat'],
  ['sel', 'jaringan', 'organ'],
  ['napas', 'pernapasan', 'respirasi'],
  ['makan', 'makanan', 'nutrisi', 'gizi', 'pangan'],
  ['gerak', 'pergerakan', 'perpindahan', 'kinetik'],
  ['letak', 'posisi', 'kedudukan', 'lokasi', 'tempat'],
  ['jumlah', 'total', 'akumulasi', 'penjumlahan'],
  ['kurang', 'pengurangan', 'selisih'],
  ['kali', 'perkalian', 'produk'],
  ['bagi', 'pembagian', 'rasio', 'perbandingan'],
];

const SYNONYM_CANONICAL_MAP: Record<string, string> = {};
for (const cluster of SYNONYM_CLUSTERS) {
  const canonical = cluster[0];
  for (const word of cluster) {
    SYNONYM_CANONICAL_MAP[word] = canonical;
  }
}

/**
 * Stemmer ringan Bahasa Indonesia untuk menyamakan kata berimbuhan dengan kata dasarnya
 * (contoh: "menghasilkan" -> "hasil", "perubahan" -> "ubah", "berklorofil" -> "klorofil")
 */
export function stemIndonesianWord(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length <= 4 || /\d/.test(w)) {
    return SYNONYM_CANONICAL_MAP[w] || w;
  }
  if (SYNONYM_CANONICAL_MAP[w]) return SYNONYM_CANONICAL_MAP[w];

  // Hapus partikel & kepunyaan di akhir (-lah, -kah, -tah, -nya)
  w = w.replace(/(?:lah|kah|tah)$/, '');
  if (w.length > 5) {
    w = w.replace(/nya$/, '');
  }
  if (SYNONYM_CANONICAL_MAP[w]) return SYNONYM_CANONICAL_MAP[w];

  // Hapus akhiran derivasional (-kan, -an, -i) bila panjang sisa kata memadai
  if (w.length > 6 && w.endsWith('kan')) w = w.slice(0, -3);
  else if (w.length > 5 && w.endsWith('an')) w = w.slice(0, -2);
  else if (w.length > 5 && w.endsWith('i') && !w.endsWith('ai') && !w.endsWith('oi')) w = w.slice(0, -1);

  if (SYNONYM_CANONICAL_MAP[w]) return SYNONYM_CANONICAL_MAP[w];

  // Hapus awalan Bahasa Indonesia dengan peluluhan K-T-S-P
  if (w.length > 5) {
    if (w.startsWith('meng') || w.startsWith('peng')) {
      const rest = w.slice(4);
      if (rest.length >= 3) {
        w = /^[aiueo]/.test(rest) && SYNONYM_CANONICAL_MAP[`k${rest}`] ? `k${rest}` : rest;
      }
    } else if (w.startsWith('meny') || w.startsWith('peny')) {
      const rest = w.slice(4);
      if (rest.length >= 3) w = `s${rest}`;
    } else if (w.startsWith('men') || w.startsWith('pen')) {
      const rest = w.slice(3);
      if (rest.length >= 3) {
        w = /^[aiueo]/.test(rest) ? `t${rest}` : rest;
      }
    } else if (w.startsWith('mem') || w.startsWith('pem')) {
      const rest = w.slice(3);
      if (rest.length >= 3) {
        w = /^[aiueo]/.test(rest) ? `p${rest}` : rest;
      }
    } else if (w.startsWith('me') || w.startsWith('pe')) {
      const rest = w.slice(2);
      if (rest.length >= 4) w = rest;
    } else if (w.startsWith('ber') || w.startsWith('ter') || w.startsWith('per')) {
      const rest = w.slice(3);
      if (rest.length >= 3) w = rest;
    } else if (w.startsWith('di') || w.startsWith('ke') || w.startsWith('se')) {
      const rest = w.slice(2);
      if (rest.length >= 4) w = rest;
    }
  }

  return SYNONYM_CANONICAL_MAP[w] || w;
}

function preprocessEssayForComparison(raw: string): string {
  let s = stripHtmlAndDecodeEntities(raw).toLowerCase();
  // Satukan istilah majemuk umum agar tidak terpecah saat tokenisasi
  s = s
    .replace(/\bkarbon\s+dioksida\b/g, 'karbondioksida')
    .replace(/\bdampak\s+buruk\b/g, 'dampakburuk')
    .replace(/\brumah\s+kaca\b/g, 'rumahkaca')
    .replace(/\bsinar\s+matahari\b/g, 'cahaya matahari')
    .replace(/(\d+),(\d+)/g, '$1.$2')
    .replace(/\\(?:d|t|c)?frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt$1')
    .replace(/√\s*([0-9a-z.]+)/g, 'sqrt$1');
  return s;
}

interface ExtractedConcept {
  stem: string;
  raw: string;
  negated: boolean;
  isNumeric: boolean;
}

function extractConceptsWithPolarity(text: string): ExtractedConcept[] {
  const pre = preprocessEssayForComparison(text);
  const rawTokens = pre.match(/[\p{L}\p{N}.^/+-]+/gu) || [];
  const concepts: ExtractedConcept[] = [];
  let negateWindow = 0;

  for (const tok of rawTokens) {
    const cleanTok = tok.replace(/^[.,;:!?()[\]{}'"`+-]+|[.,;:!?()[\]{}'"`]+$/g, '');
    if (!cleanTok) continue;

    if (NEGATION_TOKENS.has(cleanTok)) {
      negateWindow = 2; // Negasi berlaku untuk 1-2 konsep tepat setelah kata negasi
      continue;
    }

    if (INDONESIAN_STOPWORDS.has(cleanTok)) {
      continue;
    }

    const isNum = /^\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?$/.test(cleanTok);
    if (!isNum && cleanTok.length < 2) continue;

    const stem = isNum ? cleanTok : stemIndonesianWord(cleanTok);
    if (!isNum && INDONESIAN_STOPWORDS.has(stem)) continue;

    concepts.push({
      stem,
      raw: cleanTok,
      negated: negateWindow > 0,
      isNumeric: isNum,
    });

    if (negateWindow > 0) negateWindow--;
  }

  return concepts;
}

function diceTrigramSimilarity(a: string, b: string): number {
  const s1 = a.replace(/\s+/g, ' ').trim();
  const s2 = b.replace(/\s+/g, ' ').trim();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.length < 3 || s2.length < 3) {
    return s1 === s2 ? 1 : 0;
  }

  const getTrigrams = (str: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i <= str.length - 3; i++) {
      const tri = str.slice(i, i + 3);
      map.set(tri, (map.get(tri) || 0) + 1);
    }
    return map;
  };

  const m1 = getTrigrams(s1);
  const m2 = getTrigrams(s2);
  let intersection = 0;
  let total1 = 0;
  let total2 = 0;

  for (const [, c] of m1) total1 += c;
  for (const [, c] of m2) total2 += c;
  for (const [tri, c1] of m1) {
    const c2 = m2.get(tri) || 0;
    intersection += Math.min(c1, c2);
  }

  return total1 + total2 > 0 ? (2 * intersection) / (total1 + total2) : 0;
}

function conceptsMatch(kConcept: ExtractedConcept, uConcept: ExtractedConcept): boolean {
  if (kConcept.stem === uConcept.stem || kConcept.raw === uConcept.raw) return true;
  if (kConcept.isNumeric || uConcept.isNumeric) {
    const n1 = Number(kConcept.stem);
    const n2 = Number(uConcept.stem);
    if (Number.isFinite(n1) && Number.isFinite(n2) && Math.abs(n1 - n2) < 1e-6) return true;
    return false;
  }
  // Substring kata majemuk panjang (>= 5 huruf) atau kemiripan morfologi ketat
  if (kConcept.stem.length >= 5 && uConcept.stem.length >= 5) {
    if (kConcept.stem.includes(uConcept.stem) || uConcept.stem.includes(kConcept.stem)) return true;
    if (Math.abs(kConcept.stem.length - uConcept.stem.length) <= 1) {
      if (levenshteinDistance(kConcept.stem, uConcept.stem) <= 1) return true;
    }
  }
  return false;
}

/**
 * Evaluasi Otomatis Jawaban Esai / Uraian terhadap Kunci Jawaban / Rubrik:
 * - PENUH (1.0 * bobot): Penjelasan sesuai / mencakup konsep utama kunci jawaban dengan tepat.
 * - SETENGAH (0.5 * bobot): Penjelasan hampir mendekati kunci jawaban atau maksudnya mirip sebagian.
 * - NOL (0): Kosong, tidak nyambung, atau bertentangan makna (negasi berlawanan).
 */
export function evaluateEsaiOtomatis(
  jawabanSiswa: string,
  kunciJawabanTeks: string,
  bobot: number
): EsaiAutoEvalResult {
  const safeBobot = Number(bobot) > 0 ? Number(bobot) : 1.0;
  const userNorm = normalizeAnswerText(jawabanSiswa);
  if (!userNorm) {
    return {
      skor: 0,
      kategori: 'NOL',
      isBenar: false,
      kemiripanPersen: 0,
      catatan: 'Siswa tidak mengisi jawaban uraian.',
    };
  }

  const rawKeyClean = stripHtmlAndDecodeEntities(kunciJawabanTeks || '');
  if (!rawKeyClean) {
    return {
      skor: 0,
      kategori: 'BELUM_ADA_KUNCI',
      isBenar: false,
      kemiripanPersen: 0,
      catatan: 'Kunci jawaban / rubrik esai belum diatur oleh guru; menunggu koreksi manual.',
    };
  }

  // Dukung beberapa variasi rubrik alternatif yang dipisahkan tanda `|`
  const rubricAlternatives = rawKeyClean
    .split(/\|+/)
    .map((r) => r.trim())
    .filter(Boolean);

  let bestResult: EsaiAutoEvalResult = {
    skor: 0,
    kategori: 'NOL',
    isBenar: false,
    kemiripanPersen: 0,
    catatan: 'Penjelasan belum sesuai dengan konsep pada kunci jawaban.',
  };

  const userConcepts = extractConceptsWithPolarity(jawabanSiswa);
  const userMath = hasMathIndicators(jawabanSiswa) ? normalizeMathExpression(jawabanSiswa) : '';

  for (const rubric of rubricAlternatives) {
    const keyNorm = normalizeAnswerText(rubric);
    if (!keyNorm) continue;

    // 1. Cek kecocokan persis (teks maupun ekspresi matematika penuh)
    const keyMath = hasMathIndicators(rubric) ? normalizeMathExpression(rubric) : '';
    if (userNorm === keyNorm || (userMath && keyMath && userMath === keyMath)) {
      return {
        skor: safeBobot,
        kategori: 'PENUH',
        isBenar: true,
        kemiripanPersen: 100,
        catatan: 'Otomatis Nilai Penuh (100%): Jawaban sesuai persis dengan kunci jawaban.',
      };
    }

    const keyConcepts = extractConceptsWithPolarity(rubric);
    // Dedup konsep kunci berdasarkan stem + polaritas
    const uniqueKeyConcepts: ExtractedConcept[] = [];
    const seenKeyStems = new Set<string>();
    for (const kc of keyConcepts) {
      const sig = `${kc.negated ? '!' : ''}${kc.stem}`;
      if (!seenKeyStems.has(sig)) {
        seenKeyStems.add(sig);
        uniqueKeyConcepts.push(kc);
      }
    }

    const trigramSim = diceTrigramSimilarity(
      preprocessEssayForComparison(jawabanSiswa),
      preprocessEssayForComparison(rubric)
    );

    if (uniqueKeyConcepts.length === 0) {
      const simPct = Math.round(trigramSim * 100);
      if (trigramSim >= 0.72) {
        return {
          skor: safeBobot,
          kategori: 'PENUH',
          isBenar: true,
          kemiripanPersen: simPct,
          catatan: `Otomatis Nilai Penuh (100%): Penjelasan sangat sesuai dengan kunci (${simPct}%).`,
        };
      }
      if (trigramSim >= 0.38 && bestResult.skor < safeBobot * 0.5) {
        bestResult = {
          skor: Number((safeBobot * 0.5).toFixed(2)),
          kategori: 'SETENGAH',
          isBenar: true,
          kemiripanPersen: simPct,
          catatan: `Otomatis Nilai Setengah (50%): Penjelasan mendekati kunci jawaban (${simPct}%).`,
        };
      }
      continue;
    }

    let matchedPositive = 0;
    let polarityContradictions = 0;

    for (const kc of uniqueKeyConcepts) {
      let foundSamePolarity = false;
      let foundOppositePolarity = false;

      for (const uc of userConcepts) {
        if (conceptsMatch(kc, uc)) {
          if (kc.negated === uc.negated) {
            foundSamePolarity = true;
            break;
          } else {
            foundOppositePolarity = true;
          }
        }
      }

      if (foundSamePolarity) {
        matchedPositive++;
      } else if (foundOppositePolarity) {
        polarityContradictions++;
      }
    }

    const totalKeyConcepts = uniqueKeyConcepts.length;
    const rawRecall = matchedPositive / totalKeyConcepts;
    const contradictionPenalty = (polarityContradictions / totalKeyConcepts) * 0.65;
    const effectiveRecall = Math.max(0, rawRecall - contradictionPenalty);

    // Hitung presisi ringan agar jawaban spam kata acak tidak mendapat skor penuh palsu
    const uniqueUserCount = Math.max(1, new Set(userConcepts.map((u) => u.stem)).size);
    const reasonableLengthCap = Math.max(totalKeyConcepts * 3.5, 12);
    const brevityOrSpamFactor =
      uniqueUserCount > reasonableLengthCap ? reasonableLengthCap / uniqueUserCount : 1.0;

    const composite = Math.max(
      0,
      Math.min(1, (effectiveRecall * 0.72 + trigramSim * 0.28) * brevityOrSpamFactor)
    );
    const simPct = Math.round(Math.max(effectiveRecall, composite) * 100);

    // Jika pernyataan pendek tunggal berlawanan negasi langsung (misal kunci "bertambah", siswa "tidak bertambah") -> 0
    if (polarityContradictions > 0 && matchedPositive === 0) {
      continue;
    }

    // TIER 1: NILAI PENUH (100% bobot)
    // Diberikan jika konsep utama kunci tercakup >= 72% (tanpa kontradiksi negasi) ATAU skor gabungan >= 68% dengan cakupan >= 62%
    const qualifiesFull =
      polarityContradictions === 0 &&
      (effectiveRecall >= 0.72 ||
        (composite >= 0.68 && effectiveRecall >= 0.62) ||
        (totalKeyConcepts <= 2 && effectiveRecall >= 1.0));

    if (qualifiesFull) {
      return {
        skor: safeBobot,
        kategori: 'PENUH',
        isBenar: true,
        kemiripanPersen: Math.max(75, simPct),
        catatan: `Otomatis Nilai Penuh (100%): Detail & maksud penjelasan sesuai kunci (${matchedPositive}/${totalKeyConcepts} konsep kunci cocok).`,
      };
    }

    // TIER 2: NILAI SETENGAH (50% bobot)
    // Diberikan jika penjelasan mendekati kunci jawaban atau maksudnya mirip sebagian (cakupan konsep >= 34% atau gabungan >= 35%)
    const qualifiesHalf =
      effectiveRecall >= 0.34 ||
      composite >= 0.35 ||
      (trigramSim >= 0.42 && effectiveRecall >= 0.25);

    if (qualifiesHalf) {
      const halfScore = Number((safeBobot * 0.5).toFixed(2));
      if (halfScore > bestResult.skor || (halfScore === bestResult.skor && simPct > bestResult.kemiripanPersen)) {
        bestResult = {
          skor: halfScore,
          kategori: 'SETENGAH',
          isBenar: true,
          kemiripanPersen: Math.max(50, simPct),
          catatan: `Otomatis Nilai Setengah (50%): Penjelasan mendekati / semakna sebagian dengan kunci (${matchedPositive}/${totalKeyConcepts} konsep kunci cocok).`,
        };
      }
    } else if (simPct > bestResult.kemiripanPersen && bestResult.skor === 0) {
      bestResult = {
        skor: 0,
        kategori: 'NOL',
        isBenar: false,
        kemiripanPersen: simPct,
        catatan: `Otomatis Nilai 0: Penjelasan belum mencakup konsep kunci (${matchedPositive}/${totalKeyConcepts} konsep cocok).`,
      };
    }
  }

  return bestResult;
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

  const correctSet = new Set(correctOpsiIds);

  if (chosenIds.length === correctOpsiIds.length && chosenIds.every((id) => correctSet.has(id))) {
    return { isBenar: true, skor: bobot };
  }

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

    const userAnswers: Record<string, string> = {};
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

// ============================================================================
// FUNGSI KALKULASI NILAI AKHIR TERPADU (DIGUNAKAN DI SELESAI, PROKTOR & KOREKSI)
// ============================================================================

export interface GradedSoalUpdate {
  soalId: string;
  jawabanId?: string;
  jawabanDipilih: string;
  tipeSoal: string;
  isBenar: boolean;
  skor: number;
  catatanKoreksi?: string | null;
}

export interface UnifiedExamGradeSummary {
  updates: GradedSoalUpdate[];
  nilaiPG: number;
  nilaiEsai: number;
  nilaiTotal: number;
  isKoreksiSelesai: boolean;
}

/**
 * Menghitung penilaian otomatis seluruh butir soal peserta secara konsisten:
 * - PG, BENAR_SALAH, PG_KOMPLEKS, MENJODOHKAN -> masuk ke komponen `nilaiPG` (Skor Pilihan)
 * - ISIAN (Exact Match = Penuh / 0) & ESAI (Penuh / Setengah / 0) -> masuk ke komponen `nilaiEsai` (Skor Isian & Esai)
 * - Dinormalisasi secara proporsional terhadap `totalBobotAssigned` dan rentang `[minNilai .. maxNilai]`
 */
export function evaluateExamSubmissionItems(params: {
  soalList: Array<{
    id: string;
    tipeSoal: string;
    bobot?: number | null;
    kunciJawabanTeks?: string | null;
    matchingData?: string | null;
    opsiJawaban?: OpsiItem[];
  }>;
  jawabanList: Array<{
    id?: string;
    soalId: string;
    jawabanDipilih?: string | null;
    skor?: number | null;
    catatanKoreksi?: string | null;
  }>;
  nilaiMaksimal?: number | null;
  nilaiMinimal?: number | null;
  preserveManualEssayScores?: boolean;
  modePenilaian?: string | null;
}): UnifiedExamGradeSummary {
  const {
    soalList,
    jawabanList,
    nilaiMaksimal = 100.0,
    nilaiMinimal = 0.0,
    preserveManualEssayScores = false,
    modePenilaian = 'SKALA_100',
  } = params;

  const isPoinSoalMode = String(modePenilaian || 'SKALA_100').toUpperCase() === 'POIN_SOAL';

  const jawabanMap = new Map(jawabanList.map((j) => [j.soalId, j]));

  let rawEarnedPilihan = 0;
  let rawEarnedTulisan = 0;
  let totalBobotAssigned = 0;
  let hasEsaiWithoutKey = false;
  const updates: GradedSoalUpdate[] = [];

  for (const soal of soalList) {
    const bobot = isPoinSoalMode ? 1.0 : Number(soal.bobot) > 0 ? Number(soal.bobot) : 1.0;
    totalBobotAssigned += bobot;

    const existingJ = jawabanMap.get(soal.id);
    const chosenText = existingJ?.jawabanDipilih ?? '';
    const tipe = String(soal.tipeSoal || 'PG').toUpperCase();

    if (tipe === 'PG' || tipe === 'BENAR_SALAH') {
      const opsiBenar = (soal.opsiJawaban || []).find((o) => o.isBenar);
      const isBenar = Boolean(chosenText && opsiBenar && chosenText === opsiBenar.id);
      const skor = isBenar ? bobot : 0;
      rawEarnedPilihan += skor;

      updates.push({
        soalId: soal.id,
        jawabanId: existingJ?.id,
        jawabanDipilih: chosenText,
        tipeSoal: tipe,
        isBenar,
        skor,
      });
    } else if (tipe === 'PG_KOMPLEKS') {
      let chosenIds: string[] = [];
      try {
        if (chosenText) chosenIds = JSON.parse(chosenText);
      } catch {
        chosenIds = [];
      }
      const res = matchPGKompleks(chosenIds, soal.opsiJawaban || [], bobot);
      rawEarnedPilihan += res.skor;

      updates.push({
        soalId: soal.id,
        jawabanId: existingJ?.id,
        jawabanDipilih: chosenText,
        tipeSoal: tipe,
        isBenar: res.isBenar,
        skor: res.skor,
      });
    } else if (tipe === 'MENJODOHKAN') {
      const res = matchMenjodohkan(chosenText || undefined, soal.matchingData || undefined, bobot);
      rawEarnedPilihan += res.skor;

      updates.push({
        soalId: soal.id,
        jawabanId: existingJ?.id,
        jawabanDipilih: chosenText,
        tipeSoal: tipe,
        isBenar: res.isBenar,
        skor: res.skor,
      });
    } else if (tipe === 'ISIAN') {
      if (isPoinSoalMode) {
        updates.push({
          soalId: soal.id,
          jawabanId: existingJ?.id,
          jawabanDipilih: chosenText,
          tipeSoal: tipe,
          isBenar: false,
          skor: 0,
          catatanKoreksi: 'Mode Poin Soal: Isian dinilai 0.',
        });
      } else if (preserveManualEssayScores && existingJ && typeof existingJ.skor === 'number') {
        const manualSkor = Math.max(0, Math.min(bobot, Number(existingJ.skor)));
        rawEarnedTulisan += manualSkor;
        updates.push({
          soalId: soal.id,
          jawabanId: existingJ.id,
          jawabanDipilih: chosenText,
          tipeSoal: tipe,
          isBenar: manualSkor > 0,
          skor: manualSkor,
          catatanKoreksi: existingJ.catatanKoreksi,
        });
      } else {
        const isExact = matchIsianSingkat(chosenText, soal.kunciJawabanTeks || '');
        const skor = isExact ? bobot : 0;
        rawEarnedTulisan += skor;

        updates.push({
          soalId: soal.id,
          jawabanId: existingJ?.id,
          jawabanDipilih: chosenText,
          tipeSoal: tipe,
          isBenar: isExact,
          skor,
          catatanKoreksi: isExact
            ? 'Otomatis Nilai Penuh (100%): Jawaban isian tepat (Exact Match).'
            : chosenText.trim()
            ? 'Otomatis Nilai 0: Jawaban isian tidak persis dengan kunci jawaban.'
            : 'Siswa tidak mengisi jawaban.',
        });
      }
    } else if (tipe === 'ESAI') {
      if (isPoinSoalMode) {
        updates.push({
          soalId: soal.id,
          jawabanId: existingJ?.id,
          jawabanDipilih: chosenText,
          tipeSoal: tipe,
          isBenar: false,
          skor: 0,
          catatanKoreksi: 'Mode Poin Soal: Esai dinilai 0.',
        });
      } else {
      const hasKey = Boolean(stripHtmlAndDecodeEntities(soal.kunciJawabanTeks || ''));
      if (preserveManualEssayScores && existingJ && typeof existingJ.skor === 'number') {
        const manualSkor = Math.max(0, Math.min(bobot, Number(existingJ.skor)));
        rawEarnedTulisan += manualSkor;
        updates.push({
          soalId: soal.id,
          jawabanId: existingJ.id,
          jawabanDipilih: chosenText,
          tipeSoal: tipe,
          isBenar: manualSkor > 0,
          skor: manualSkor,
          catatanKoreksi: existingJ.catatanKoreksi,
        });
      } else if (hasKey) {
        const esaiEval = evaluateEsaiOtomatis(chosenText, soal.kunciJawabanTeks || '', bobot);
        rawEarnedTulisan += esaiEval.skor;

        updates.push({
          soalId: soal.id,
          jawabanId: existingJ?.id,
          jawabanDipilih: chosenText,
          tipeSoal: tipe,
          isBenar: esaiEval.isBenar,
          skor: esaiEval.skor,
          catatanKoreksi: esaiEval.catatan,
        });
      } else {
        hasEsaiWithoutKey = true;
        updates.push({
          soalId: soal.id,
          jawabanId: existingJ?.id,
          jawabanDipilih: chosenText,
          tipeSoal: tipe,
          isBenar: false,
          skor: 0,
          catatanKoreksi: 'Menunggu koreksi guru (kunci/rubrik esai belum diisi).',
        });
      }
      }
    }
  }

  if (isPoinSoalMode) {
    const finalPoinPG = Number(rawEarnedPilihan.toFixed(2));
    return {
      updates,
      nilaiPG: finalPoinPG,
      nilaiEsai: 0,
      nilaiTotal: finalPoinPG,
      isKoreksiSelesai: true,
    };
  }

  const maxNilai = Number(nilaiMaksimal) > 0 ? Number(nilaiMaksimal) : 100.0;
  const minNilai = Number(nilaiMinimal) >= 0 ? Number(nilaiMinimal) : 0.0;

  let scaledPG = rawEarnedPilihan;
  let scaledEsai = rawEarnedTulisan;

  if (totalBobotAssigned > 0) {
    scaledPG = Number(((rawEarnedPilihan / totalBobotAssigned) * maxNilai).toFixed(2));
    scaledEsai = Number(((rawEarnedTulisan / totalBobotAssigned) * maxNilai).toFixed(2));
  }

  const finalNilaiPG = Math.min(maxNilai, Math.max(0, scaledPG));
  const finalNilaiEsai = Math.min(maxNilai, Math.max(0, scaledEsai));
  const nilaiTotal = Math.min(
    maxNilai,
    Math.max(minNilai, Number((finalNilaiPG + finalNilaiEsai).toFixed(2)))
  );

  return {
    updates,
    nilaiPG: finalNilaiPG,
    nilaiEsai: finalNilaiEsai,
    nilaiTotal,
    isKoreksiSelesai: !hasEsaiWithoutKey,
  };
}
