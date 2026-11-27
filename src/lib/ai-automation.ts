/**
 * CBT Muhipo — Bidirectional AI Automation Engine (ChatGPT Task / Operator & Gemini Task)
 *
 * Modul ini memastikan:
 * 1. Sistem CBT Muhipo selalu memahami berbagai variasi input otomatis dari AI Agent
 *    (ChatGPT Task, OpenAI Operator, Gemini Task, Browser-Use, maupun JSON/Markdown/Plain-Text).
 * 2. Format rumus matematika (LaTeX \(...\), \[...\], $...$, $$...$$, \dfrac, Unicode √),
 *    tipe soal, pilihan jawaban, kunci jawaban, dan pasangan menjodohkan dinormalisasi
 *    secara lossless menjadi struktur baku database CBT Muhipo.
 */

import { convertEquationToKatex } from './katexConverter';

export type CanonicalTipeSoal =
  | 'PG'
  | 'PG_KOMPLEKS'
  | 'BENAR_SALAH'
  | 'ISIAN'
  | 'ESAI'
  | 'MENJODOHKAN';

export interface NormalizedOpsiItem {
  label: string;
  konten: string;
  isBenar: boolean;
}

export interface NormalizedMatchingPair {
  left: string;
  right: string;
}

export interface NormalizedSoalPayload {
  tipeSoal: CanonicalTipeSoal;
  pertanyaan: string;
  bobot: number;
  opsi: NormalizedOpsiItem[];
  kunciJawabanTeks: string | null;
  matchingData: NormalizedMatchingPair[] | null;
  mediaGambar?: string | null;
  mediaAudio?: string | null;
  tingkatKesulitan?: number;
}

/**
 * Memetakan berbagai penamaan tipe soal dari ChatGPT, Gemini, ZyaCBT, atau Bahasa Inggris/Indonesia
 * ke enum TipeSoal resmi CBT Muhipo.
 */
export function normalizeTipeSoalAI(rawType?: unknown, fallback: CanonicalTipeSoal = 'PG'): CanonicalTipeSoal {
  if (!rawType) return fallback;
  const clean = String(rawType)
    .trim()
    .toUpperCase()
    .replace(/[\s\-/]+/g, '_');

  if (
    ['PG', 'Q', 'Q1', 'PILIHAN_GANDA', 'MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'MCQ', 'OBJEKTIF'].includes(clean)
  ) {
    return 'PG';
  }
  if (
    [
      'PG_KOMPLEKS',
      'PGK',
      'Q4',
      'PILIHAN_GANDA_KOMPLEKS',
      'MULTIPLE_ANSWER',
      'MULTIPLE_SELECT',
      'MULTIPLE_RESPONSE',
      'CHECKBOX',
      'MCMA',
    ].includes(clean)
  ) {
    return 'PG_KOMPLEKS';
  }
  if (
    [
      'BENAR_SALAH',
      'BS',
      'TF',
      'Q5',
      'TRUE_FALSE',
      'BENAR_ATAU_SALAH',
      'PERNYATAAN_BENAR_SALAH',
      'BOOLEAN',
    ].includes(clean)
  ) {
    return 'BENAR_SALAH';
  }
  if (
    [
      'ISIAN',
      'Q3',
      'ISIAN_SINGKAT',
      'JAWABAN_SINGKAT',
      'SHORT_ANSWER',
      'FILL_IN_THE_BLANK',
      'FILL_IN',
      'SA',
    ].includes(clean)
  ) {
    return 'ISIAN';
  }
  if (['ESAI', 'ESSAY', 'Q2', 'URAIAN', 'LONG_ANSWER', 'OPEN_ENDED', 'DESKRIPSI'].includes(clean)) {
    return 'ESAI';
  }
  if (
    ['MENJODOHKAN', 'Q6', 'MATCHING', 'PASANGKAN', 'JODOHKAN', 'PAIRING', 'PREMIS_RESPONS'].includes(clean)
  ) {
    return 'MENJODOHKAN';
  }

  return fallback;
}

/**
 * Ekstrak daftar huruf/indeks kunci jawaban dari representasi fleksibel:
 * contoh: "B", "Jawaban: C", ["A", "C"], "A, C", 0, "Benar", "True"
 */
function parseAnswerKeyTokens(rawKey: unknown): string[] {
  if (rawKey === null || rawKey === undefined) return [];
  if (Array.isArray(rawKey)) {
    return rawKey.flatMap((k) => parseAnswerKeyTokens(k));
  }
  if (typeof rawKey === 'number' && Number.isInteger(rawKey) && rawKey >= 0 && rawKey < 26) {
    return [String.fromCharCode(65 + rawKey)];
  }
  if (typeof rawKey === 'boolean') {
    return [rawKey ? 'BENAR' : 'SALAH'];
  }

  const s = String(rawKey).trim();
  if (!s) return [];

  // Jika berupa Benar / Salah / True / False
  const upper = s.toUpperCase();
  if (['BENAR', 'TRUE', 'YA', 'T', 'B_TRUE'].includes(upper)) return ['A', 'BENAR', 'TRUE'];
  if (['SALAH', 'FALSE', 'TIDAK', 'F'].includes(upper)) return ['B', 'SALAH', 'FALSE'];

  // Jika huruf tunggal A-H atau daftar huruf dipisahkan koma/spasi/dan: "A, C" / "A dan D" / "B."
  const cleanedPrefix = upper.replace(/^(?:KUNCI(?:\s*JAWABAN)?|JAWABAN(?:\s*BENAR)?|ANSWER|KEY)\s*[:=-]?\s*/i, '').trim();
  if (/^[A-H](?:\s*(?:[,;/|&]|DAN|AND)\s*[A-H])*\.?$/i.test(cleanedPrefix)) {
    return cleanedPrefix
      .replace(/\.$/, '')
      .split(/\s*(?:[,;/|&]|DAN|AND)\s*/i)
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean);
  }

  // Jika diawali "B. <teks opsi>" ambil huruf B
  const leadingLetter = cleanedPrefix.match(/^([A-H])[\.\)\-:]\s+/);
  if (leadingLetter) {
    return [leadingLetter[1].toUpperCase()];
  }

  return [s];
}

/**
 * Normalisasi 1 objek soal dari berbagai variasi JSON AI (ChatGPT / Gemini / ZyaCBT / API internal)
 */
export function normalizeIncomingSoalItem(raw: any): NormalizedSoalPayload | null {
  if (!raw || typeof raw !== 'object') return null;

  const rawPertanyaan =
    raw.pertanyaan ??
    raw.soal ??
    raw.question ??
    raw.stem ??
    raw.konten ??
    raw.text ??
    raw.teks ??
    raw.prompt ??
    '';

  const cleanPertanyaan = convertEquationToKatex(String(rawPertanyaan || '').trim());
  if (!cleanPertanyaan) return null;

  // Deteksi tipe soal secara otomatis bila tidak disebutkan eksplisit
  let inferredFallback: CanonicalTipeSoal = 'PG';
  if (raw.matchingData || raw.pairs || raw.pasangan) {
    inferredFallback = 'MENJODOHKAN';
  } else if (
    !raw.opsi &&
    !raw.opsiJawaban &&
    !raw.options &&
    !raw.pilihan &&
    !raw.choices &&
    raw.opsiA === undefined &&
    raw.A === undefined &&
    (raw.kunciJawabanTeks || raw.isian)
  ) {
    inferredFallback = 'ISIAN';
  }

  const tipeSoal = normalizeTipeSoalAI(
    raw.tipeSoal ?? raw.tipe ?? raw.type ?? raw.jenis ?? raw.jenisSoal ?? raw.questionType,
    inferredFallback
  );

  const bobotRaw = Number(raw.bobot ?? raw.weight ?? raw.poin ?? raw.score ?? raw.points ?? 1);
  const bobot = Number.isFinite(bobotRaw) && bobotRaw > 0 ? bobotRaw : 1.0;

  const rawKey =
    raw.kunciJawabanTeks ??
    raw.kunciJawaban ??
    raw.kunci ??
    raw.jawabanBenar ??
    raw.correctAnswer ??
    raw.correctAnswers ??
    raw.answer ??
    raw.jawaban;

  const keyTokens = parseAnswerKeyTokens(rawKey);

  // 1. Pasangan Menjodohkan
  let matchingData: NormalizedMatchingPair[] | null = null;
  const rawMatching = raw.matchingData ?? raw.pairs ?? raw.pasangan ?? raw.matches;
  if (tipeSoal === 'MENJODOHKAN' || rawMatching) {
    let parsedPairs: any[] = [];
    if (typeof rawMatching === 'string') {
      try {
        const j = JSON.parse(rawMatching);
        if (Array.isArray(j)) parsedPairs = j;
      } catch {
        // Coba parse baris teks "Kiri => Kanan"
        parsedPairs = rawMatching
          .split(/\r?\n/)
          .map((line) => line.split(/\s*(?:=>|->|↔|::|=)\s*/))
          .filter((arr) => arr.length >= 2)
          .map(([l, ...rest]) => ({ left: l, right: rest.join(' = ') }));
      }
    } else if (Array.isArray(rawMatching)) {
      parsedPairs = rawMatching;
    } else if (rawMatching && typeof rawMatching === 'object') {
      parsedPairs = Object.entries(rawMatching).map(([left, right]) => ({ left, right }));
    }

    const validPairs = parsedPairs
      .map((p: any) => ({
        left: convertEquationToKatex(String(p?.left ?? p?.kiri ?? p?.premis ?? p?.premise ?? p?.[0] ?? '').trim()),
        right: convertEquationToKatex(String(p?.right ?? p?.kanan ?? p?.respons ?? p?.response ?? p?.[1] ?? '').trim()),
      }))
      .filter((p) => p.left || p.right);

    if (validPairs.length > 0) {
      matchingData = validPairs;
    }
  }

  // 2. Opsi Jawaban (PG, PG_KOMPLEKS, BENAR_SALAH)
  const opsi: NormalizedOpsiItem[] = [];
  const isChoice = ['PG', 'PG_KOMPLEKS', 'BENAR_SALAH'].includes(tipeSoal);

  if (isChoice) {
    const rawOpsiSource = raw.opsiJawaban ?? raw.opsi ?? raw.options ?? raw.pilihan ?? raw.choices;

    if (Array.isArray(rawOpsiSource) && rawOpsiSource.length > 0) {
      rawOpsiSource.forEach((item: any, idx: number) => {
        const defaultLabel = String.fromCharCode(65 + idx);
        if (typeof item === 'string' || typeof item === 'number') {
          let textStr = String(item).trim();
          // Bersihkan prefix "A. " jika AI menuliskannya di dalam array string
          const prefixMatch = textStr.match(/^([A-H])[\.\)]\s+([\s\S]+)$/i);
          const label = prefixMatch ? prefixMatch[1].toUpperCase() : defaultLabel;
          if (prefixMatch) textStr = prefixMatch[2].trim();

          const isBenar =
            keyTokens.includes(label) ||
            keyTokens.some((kt) => kt.toLowerCase() === textStr.toLowerCase());

          if (textStr) {
            opsi.push({
              label,
              konten: convertEquationToKatex(textStr),
              isBenar,
            });
          }
        } else if (item && typeof item === 'object') {
          const label = String(item.label ?? item.key ?? item.huruf ?? item.id ?? defaultLabel)
            .trim()
            .toUpperCase()
            .slice(0, 2) || defaultLabel;
          const rawKonten = item.konten ?? item.teks ?? item.text ?? item.value ?? item.jawaban ?? '';
          const cleanKonten = convertEquationToKatex(String(rawKonten).trim());
          if (!cleanKonten) return;

          const explicitBool =
            item.isBenar !== undefined
              ? Boolean(item.isBenar)
              : item.benar !== undefined
                ? Boolean(item.benar)
                : item.correct !== undefined
                  ? Boolean(item.correct)
                  : item.isCorrect !== undefined
                    ? Boolean(item.isCorrect)
                    : Number(item.status) === 1;

          const matchedByKey =
            keyTokens.includes(label) ||
            keyTokens.some((kt) => kt.toLowerCase() === String(rawKonten).trim().toLowerCase());

          opsi.push({
            label,
            konten: cleanKonten,
            isBenar: explicitBool || matchedByKey,
          });
        }
      });
    } else if (rawOpsiSource && typeof rawOpsiSource === 'object' && !Array.isArray(rawOpsiSource)) {
      // Bentuk objek map: { A: "...", B: "...", C: "..." }
      Object.entries(rawOpsiSource).forEach(([k, val], idx) => {
        const label = k.trim().toUpperCase() || String.fromCharCode(65 + idx);
        const textStr = String(val ?? '').trim();
        if (!textStr) return;
        opsi.push({
          label,
          konten: convertEquationToKatex(textStr),
          isBenar:
            keyTokens.includes(label) ||
            keyTokens.some((kt) => kt.toLowerCase() === textStr.toLowerCase()),
        });
      });
    } else {
      // Bentuk kolom datar: opsiA..opsiH / pilihanA..pilihanH / A..H
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      for (const L of letters) {
        const candidate =
          raw[`opsi${L}`] ??
          raw[`opsi_${L.toLowerCase()}`] ??
          raw[`pilihan${L}`] ??
          raw[`pilihan_${L.toLowerCase()}`] ??
          raw[`option${L}`] ??
          raw[L] ??
          raw[L.toLowerCase()];
        if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') {
          const textStr = String(candidate).trim();
          opsi.push({
            label: L,
            konten: convertEquationToKatex(textStr),
            isBenar:
              keyTokens.includes(L) ||
              keyTokens.some((kt) => kt.toLowerCase() === textStr.toLowerCase()),
          });
        }
      }
    }

    // Fallback otomatis untuk BENAR_SALAH bila opsi tidak dikirim tetapi ada kunci Benar/Salah
    if (tipeSoal === 'BENAR_SALAH' && opsi.length === 0) {
      const isFalseCorrect =
        keyTokens.includes('SALAH') ||
        keyTokens.includes('FALSE') ||
        (keyTokens.includes('B') && !keyTokens.includes('BENAR'));
      opsi.push(
        { label: 'A', konten: 'Benar', isBenar: !isFalseCorrect },
        { label: 'B', konten: 'Salah', isBenar: isFalseCorrect }
      );
    }

    // Pastikan aturan kunci jawaban tunggal pada PG dan BENAR_SALAH
    if ((tipeSoal === 'PG' || tipeSoal === 'BENAR_SALAH') && opsi.length > 0) {
      const hasTrue = opsi.some((o) => o.isBenar);
      if (!hasTrue) {
        opsi[0].isBenar = true;
      } else {
        let foundFirst = false;
        for (const o of opsi) {
          if (o.isBenar) {
            if (!foundFirst) foundFirst = true;
            else o.isBenar = false;
          }
        }
      }
    }
  }

  // 3. Kunci Jawaban Teks untuk ISIAN / ESAI
  let kunciJawabanTeks: string | null = null;
  if (!isChoice && tipeSoal !== 'MENJODOHKAN') {
    const rawTextKey =
      raw.kunciJawabanTeks ?? raw.kunciJawaban ?? raw.kunci ?? raw.answer ?? raw.jawaban ?? null;
    if (rawTextKey !== null && rawTextKey !== undefined && String(rawTextKey).trim() !== '') {
      kunciJawabanTeks = convertEquationToKatex(String(rawTextKey).trim());
    }
  }

  const resolvedMediaGambar =
    (raw.mediaGambar || raw.gambar || raw.image || raw.imageUrl || raw.gambarUrl || raw.img || null) as string | null;

  const finalPertanyaanWithImage =
    resolvedMediaGambar && !cleanPertanyaan.includes(resolvedMediaGambar)
      ? `<p><img src="${resolvedMediaGambar}" alt="Gambar Soal" class="cbt-zoomable-media my-2 max-h-72 max-w-full object-contain cursor-zoom-in" /></p>${cleanPertanyaan}`
      : cleanPertanyaan;

  return {
    tipeSoal,
    pertanyaan: finalPertanyaanWithImage,
    bobot,
    opsi,
    kunciJawabanTeks,
    matchingData,
    mediaGambar: resolvedMediaGambar,
    mediaAudio: (raw.mediaAudio || raw.audio || raw.audioUrl || null) as string | null,
    tingkatKesulitan: Number(raw.tingkatKesulitan) || 1,
  };
}

/**
 * Parser cerdas untuk memproses teks mentah / Markdown / JSON hasil output ChatGPT Task atau Gemini Task.
 *
 * Mendukung:
 * 1. Array JSON murni atau dibungkus ```json ... ``` (`[...]`, `{ soal: [...] }`, `{ questions: [...] }`)
 * 2. Teks bernomor standar ChatGPT / Gemini:
 *    1. Nilai dari \( 2\sqrt{3} + \sqrt{12} \) adalah...
 *    A. 3√3
 *    B. 4√3
 *    C. 5√3
 *    D. 6√3
 *    E. 7√3
 *    Kunci: B
 *
 *    2. [ISIAN] Berapakah hasil dari √2,25?
 *    Kunci: 1,5
 *
 *    3. [MENJODOHKAN] Pasangkan besaran berikut dengan satuannya!
 *    Gaya => Newton
 *    Energi => Joule
 */
export function parseAIQuestionsFromTextOrJson(rawInput: string): NormalizedSoalPayload[] {
  if (!rawInput || !rawInput.trim()) return [];
  const trimmed = rawInput.trim();

  // 1. Coba deteksi JSON (baik langsung maupun di dalam blok ```json ... ```)
  const codeBlockMatch = trimmed.match(/^```(?:json|javascript|js)?\s*([\s\S]*?)```$/i);
  const jsonCandidate = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;

  if (jsonCandidate.startsWith('[') || jsonCandidate.startsWith('{')) {
    try {
      const parsed = JSON.parse(jsonCandidate);
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.soalItems)
          ? parsed.soalItems
          : Array.isArray(parsed.soal)
            ? parsed.soal
            : Array.isArray(parsed.questions)
              ? parsed.questions
              : Array.isArray(parsed.items)
                ? parsed.items
                : Array.isArray(parsed.data)
                  ? parsed.data
                  : [parsed];

      const normalized = arr
        .map((item: any) => normalizeIncomingSoalItem(item))
        .filter((x: NormalizedSoalPayload | null): x is NormalizedSoalPayload => Boolean(x));

      if (normalized.length > 0) return normalized;
    } catch {
      // Lanjut ke pemrosesan Markdown / Plain-Text bernomor jika bukan JSON valid
    }
  }

  // 2. Pemrosesan Teks / Markdown Soal dari ChatGPT / Gemini
  const cleanedText = trimmed.replace(/\r\n/g, '\n');

  // Pisahkan per blok soal berdasarkan baris penomoran soal: "1. ", "1) ", "Soal 1:", "No. 1", "### 1."
  const lines = cleanedText.split('\n');
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  const questionStartRegex =
    /^(?:#{1,4}\s*)?(?:\*\*)?(?:(?:SOAL|PERTANYAAN|NO\.?|NOMOR|QUESTION|Q)\s*#?\s*(\d+)\s*[:.\)\-]|(\d+)\s*[\.\)])(?:\*\*)?\s+(.*)$/i;

  for (const line of lines) {
    const trimmedLine = line.trim();
    // Abaikan garis pemisah markdown "---" antar soal
    if (/^[-*_]{3,}$/.test(trimmedLine)) {
      continue;
    }

    const qMatch = trimmedLine.match(questionStartRegex);
    if (qMatch) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
      }
      currentBlock = [qMatch[3]];
    } else {
      if (currentBlock.length === 0 && !trimmedLine) continue;
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  const results: NormalizedSoalPayload[] = [];

  for (const blockLines of blocks) {
    if (blockLines.length === 0) continue;

    let explicitType: CanonicalTipeSoal | undefined;
    const stemLines: string[] = [];
    const rawOptions: { label: string; konten: string; isBenar?: boolean }[] = [];
    const rawPairs: { left: string; right: string }[] = [];
    let rawAnswerLine = '';
    let bobot = 1.0;

    // Cek tag tipe di awal soal: misal "[PG_KOMPLEKS]", "(ISIAN)", "[ESAI]", "[MENJODOHKAN]", "[BENAR_SALAH]"
    let firstLine = blockLines[0].trim();
    const typeTagMatch = firstLine.match(/^[\[\(]\s*([A-Za-z_\-\s/]+?)\s*[\]\)]\s*([\s\S]*)$/);
    if (typeTagMatch) {
      const candidateType = normalizeTipeSoalAI(typeTagMatch[1], 'PG');
      if (
        /PG|PILIHAN|KOMPLEKS|ISIAN|SHORT|ESAI|ESSAY|URAIAN|BENAR|TRUE|JODOH|MATCH/i.test(
          typeTagMatch[1]
        )
      ) {
        explicitType = candidateType;
        firstLine = typeTagMatch[2].trim();
      }
    }

    const allLines = [firstLine, ...blockLines.slice(1)];
    const optionRegex = /^(?:[-*•]\s*)?(?:\*\*)?([A-H])(?:\*\*)?[\.\)\-:]\s+([\s\S]+)$/;
    const keyLineRegex =
      /^(?:\*\*)?(?:KUNCI(?:\s*JAWABAN)?|JAWABAN(?:\s*BENAR)?|ANSWER(?:\s*KEY)?|CORRECT(?:\s*ANSWER)?|KEY)(?:\*\*)?\s*[:=-]\s*([\s\S]+)$/i;
    const bobotLineRegex = /^(?:\*\*)?(?:BOBOT|POIN|SKOR|WEIGHT|POINTS?)(?:\*\*)?\s*[:=-]\s*(\d+(?:[.,]\d+)?)/i;
    const pairLineRegex = /^(?:[-*•]\s*)?(.+?)\s*(?:=>|->|↔|::)\s*(.+)$/;
    const pembahasanStartRegex = /^(?:\*\*)?(?:PEMBAHASAN|PENJELASAN|EXPLANATION|CATATAN)(?:\*\*)?\s*[:=-]/i;

    let inOptions = false;
    let skipExplanation = false;

    for (const rawL of allLines) {
      const l = rawL.trim();
      if (!l) {
        if (!inOptions && stemLines.length > 0) stemLines.push('');
        continue;
      }

      if (pembahasanStartRegex.test(l)) {
        skipExplanation = true;
        continue;
      }

      const keyM = l.match(keyLineRegex);
      if (keyM) {
        rawAnswerLine = keyM[1].replace(/\*\*/g, '').trim();
        skipExplanation = false;
        continue;
      }

      const bobotM = l.match(bobotLineRegex);
      if (bobotM) {
        bobot = parseFloat(bobotM[1].replace(',', '.')) || 1.0;
        continue;
      }

      if (skipExplanation) continue;

      const optM = l.match(optionRegex);
      if (optM) {
        inOptions = true;
        let optText = optM[2].trim();
        let markedCorrect = false;
        // Deteksi penanda jawaban benar langsung di ujung opsi: "(Benar)", "[Benar]", "✓", "✅"
        if (/(?:\(\s*(?:benar|correct|kunci)\s*\)|\[\s*(?:benar|correct|kunci)\s*\]|[✓✔✅])\s*$/i.test(optText)) {
          markedCorrect = true;
          optText = optText
            .replace(/(?:\(\s*(?:benar|correct|kunci)\s*\)|\[\s*(?:benar|correct|kunci)\s*\]|[✓✔✅])\s*$/i, '')
            .trim();
        }
        rawOptions.push({
          label: optM[1].toUpperCase(),
          konten: optText,
          isBenar: markedCorrect || undefined,
        });
        continue;
      }

      const pairM = l.match(pairLineRegex);
      if (pairM && (explicitType === 'MENJODOHKAN' || rawPairs.length > 0 || !inOptions)) {
        // Pastikan bukan panah reaksi kimia/implikasi matematika di kalimat soal tunggal kecuali bertipe MENJODOHKAN atau ada minimal 2 baris pasangan
        if (explicitType === 'MENJODOHKAN' || (!l.includes('$') && !l.includes('\\('))) {
          rawPairs.push({ left: pairM[1].trim(), right: pairM[2].trim() });
          continue;
        }
      }

      if (inOptions && rawOptions.length > 0) {
        // Lanjutan teks opsi multi-baris
        rawOptions[rawOptions.length - 1].konten += ` ${l}`;
      } else {
        stemLines.push(rawL);
      }
    }

    // Jika rawPairs hanya 1 dan tipe bukan MENJODOHKAN eksplisit, kembalikan ke stemLines agar tidak salah deteksi
    if (rawPairs.length === 1 && explicitType !== 'MENJODOHKAN') {
      stemLines.push(`${rawPairs[0].left} -> ${rawPairs[0].right}`);
      rawPairs.length = 0;
    }

    const stemText = stemLines.join('\n').trim();
    if (!stemText) continue;

    // Tentukan tipe soal otomatis bila tidak ada tag eksplisit
    let detectedType: CanonicalTipeSoal = explicitType || 'PG';
    if (!explicitType) {
      if (rawPairs.length >= 2) {
        detectedType = 'MENJODOHKAN';
      } else if (rawOptions.length >= 2) {
        const answerTokens = parseAnswerKeyTokens(rawAnswerLine);
        const markedCount = rawOptions.filter((o) => o.isBenar).length;
        if (
          rawOptions.length === 2 &&
          rawOptions.every((o) => /^(?:benar|salah|true|false)$/i.test(o.konten.trim()))
        ) {
          detectedType = 'BENAR_SALAH';
        } else if (answerTokens.length > 1 || markedCount > 1) {
          detectedType = 'PG_KOMPLEKS';
        } else {
          detectedType = 'PG';
        }
      } else if (rawAnswerLine) {
        if (/^(?:benar|salah|true|false)$/i.test(rawAnswerLine)) {
          detectedType = 'BENAR_SALAH';
        } else {
          detectedType = rawAnswerLine.length > 80 ? 'ESAI' : 'ISIAN';
        }
      } else {
        detectedType = 'ESAI';
      }
    }

    const item = normalizeIncomingSoalItem({
      tipeSoal: detectedType,
      pertanyaan: stemText,
      bobot,
      opsiJawaban: rawOptions.length > 0 ? rawOptions : undefined,
      matchingData: rawPairs.length > 0 ? rawPairs : undefined,
      kunciJawaban: rawAnswerLine || undefined,
    });

    if (item) {
      results.push(item);
    }
  }

  return results;
}

