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

/**
 * Komponen untuk merender teks campuran Formula KaTeX ($...$ / $$...$$),
 * teks Bahasa Arab (dengan tata letak & harakat optimal), Aksara Jawa (Hanacaraka),
 * serta media embed (gambar, audio, video, dan YouTube iframe).
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const hasArabic = ARABIC_REGEX.test(content);
  const hasJavanese = JAVANESE_REGEX.test(content);

  const renderContentWithMathAndMedia = (text: string) => {
    // 0. Auto-convert format LaTeX mentah tanpa pembungkus $ (misal: \frac{a}{b}, \sqrt{14}) atau simbol akar Unicode √14
    let processed = text;

    // Decode entitas HTML matematika yang sering terbawa dari copy-paste / editor web / Word
    processed = processed.replace(/&radic;/gi, '√');
    processed = processed.replace(/&#8730;/g, '√');
    processed = processed.replace(/&plusmn;/gi, '±');
    processed = processed.replace(/&#177;/g, '±');
    processed = processed.replace(/&times;/gi, '×');
    processed = processed.replace(/&divide;/gi, '÷');
    processed = processed.replace(/&le;/gi, '≤');
    processed = processed.replace(/&ge;/gi, '≥');
    processed = processed.replace(/&ne;/gi, '≠');
    processed = processed.replace(/&deg;/gi, '°');

    // Bersihkan spasi rusak pada KaTeX escape
    processed = processed.replace(/\\\s+sqrt/g, '\\sqrt');
    processed = processed.replace(/\\\s+frac/g, '\\frac');

    // Ubah akar pangkat n: misal 3√8, 3√(x), ∛x, ∜x, √[3]{8}
    processed = processed.replace(/(?<![\$\w])([0-9a-zA-Z]+)√\s*\{([^}]+)\}/g, (_, n, val) => `$\\sqrt[${n}]{${val}}$`);
    processed = processed.replace(/(?<![\$\w])([0-9a-zA-Z]+)√\s*\(([^)]+)\)/g, (_, n, val) => `$\\sqrt[${n}]{${val}}$`);
    processed = processed.replace(/(?<![\$\w])([0-9a-zA-Z]+)√\s*([0-9a-zA-Z]+)/g, (_, n, val) => `$\\sqrt[${n}]{${val}}$`);
    processed = processed.replace(/∛\s*\{([^}]+)\}/g, (_, val) => `$\\sqrt[3]{${val}}$`);
    processed = processed.replace(/∛\s*\(([^)]+)\)/g, (_, val) => `$\\sqrt[3]{${val}}$`);
    processed = processed.replace(/∛\s*([0-9a-zA-Z]+)/g, (_, val) => `$\\sqrt[3]{${val}}$`);
    processed = processed.replace(/∜\s*\{([^}]+)\}/g, (_, val) => `$\\sqrt[4]{${val}}$`);
    processed = processed.replace(/∜\s*\(([^)]+)\)/g, (_, val) => `$\\sqrt[4]{${val}}$`);
    processed = processed.replace(/∜\s*([0-9a-zA-Z]+)/g, (_, val) => `$\\sqrt[4]{${val}}$`);

    // Ubah simbol akar kuadrat Unicode mentah di luar tag HTML: √14 -> $\sqrt{14}$, √(x+y) -> $\sqrt{x+y}$
    processed = processed.replace(/(?<![\$\w])√\s*\{([^}]+)\}/g, (_, val) => `$\\sqrt{${val}}$`);
    processed = processed.replace(/(?<![\$\w])√\s*\(([^)]+)\)/g, (_, val) => `$\\sqrt{${val}}$`);
    processed = processed.replace(/(?<![\$\w])√\s*([0-9a-zA-Z]+)/g, (_, val) => `$\\sqrt{${val}}$`);

    // Format pecahan biasa yang berdampingan dengan akar: 1/4 √14 -> $\frac{1}{4}\sqrt{14}$
    processed = processed.replace(/(\d+)\/(\d+)\s*(\$\sqrt\{[^}]+\}\$|\sqrt\{[^}]+\})/g, (_, a, b, c) => `$\\frac{${a}}{${b}}${c.replace(/\$/g, '')}$`);

    // Segmented LaTeX Auto-Wrapper: Proses bagian di luar tanda $...$ agar ekspresi majemuk seperti \frac{1}{4}\sqrt{14} otomatis dibungkus utuh
    const mathSegments = processed.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
    for (let i = 0; i < mathSegments.length; i += 2) {
      let segment = mathSegments[i];
      if (!segment) continue;

      // Rapikan \sqrt 14 -> \sqrt{14}
      segment = segment.replace(/\\sqrt\s+([0-9a-zA-Z]+)/g, (_, val) => `\\sqrt{${val}}`);

      // Tangani ekspresi LaTeX majemuk atau tunggal (misal: \frac{1}{4}\sqrt{14}, \sqrt{14}, \frac{a}{b})
      segment = segment.replace(/(\\(?:frac|sqrt|sum|int|lim|prod|pm|times|div|le|ge|neq|approx|alpha|beta|gamma|delta|theta|pi|sigma|omega)(?:\[[^\[\]]*\]|\{[^{}]*\}|[a-zA-Z0-9\+\-\*/\=\(\)\,\s\\])*)/g, (match) => {
        return '$' + match.trim() + '$';
      });

      mathSegments[i] = segment;
    }
    processed = mathSegments.join('');

    // 1. Ganti block math $$...$$
    let formatted = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), {
          displayMode: true,
          throwOnError: false,
          output: 'html',
          trust: true,
        });
      } catch (err) {
        return `$$${math}$$`;
      }
    });

    // 2. Ganti inline math $...$
    formatted = formatted.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
          output: 'html',
          trust: true,
        });
      } catch (err) {
        return `$${math}$`;
      }
    });

    // 3. Format Video URL langsung (mp4, webm, ogg) jika berupa URL teks
    formatted = formatted.replace(
      /(https?:\/\/[^\s<>"']+\.(?:mp4|webm|ogg)|\/uploads\/[^\s<>"']+\.(?:mp4|webm|ogg))/gi,
      `<video controls class="my-2 rounded-2xl max-w-lg w-full mx-auto shadow-sm"><source src="$1" /></video>`
    );

    // 4. Format YouTube URL embed: [video](https://www.youtube.com/watch?v=XXX) atau URL youtube langsung
    formatted = formatted.replace(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/g,
      `<div class="my-2 rounded-2xl overflow-hidden shadow-sm aspect-video max-w-lg mx-auto"><iframe class="w-full h-full" src="https://www.youtube-nocookie.com/embed/$1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    );

    // 5. Format Audio URL langsung (mp3, wav, ogg, m4a) jika berupa URL teks
    formatted = formatted.replace(
      /(https?:\/\/[^\s<>"']+\.(?:mp3|wav|m4a|aac|ogg)|\/uploads\/[^\s<>"']+\.(?:mp3|wav|m4a|aac|ogg))/gi,
      `<audio controls class="my-2 w-full max-w-lg mx-auto block"><source src="$1" /></audio>`
    );

    // 6. Format Markdown Image ![alt](url)
    formatted = formatted.replace(
      /!\[([^\]]*)\]\(([^)]+)\)/gi,
      `<img src="$2" alt="$1" class="my-2 max-h-72 max-w-full mx-auto object-contain" />`
    );

    // 7. Auto-wrap raw Aksara Jawa yang belum dibungkus tag HTML
    formatted = formatted.replace(
      /(?<!<[^>]*)([\uA980-\uA9DF][\uA980-\uA9DF\s\uA9C0-\uA9CF]*[\uA980-\uA9DF]|[\uA980-\uA9DF])/g,
      `<span class="font-javanese-inline">$1</span>`
    );

    // 8. Auto-wrap raw Teks Arab yang belum dibungkus tag HTML agar harakat dan arah RTL sempurna
    formatted = formatted.replace(
      /(?<!<[^>]*)([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u060C\u061B\u061F\u0640]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]|[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF])/g,
      `<bdi class="font-arabic-inline dir-rtl" dir="rtl">$1</bdi>`
    );

    // 9. Dukung line breaks (spasi ke bawah / baris baru)
    formatted = formatted.replace(/\n/g, '<br />');

    return formatted;
  };

  // Tentukan class penyesuaian untuk Arab / Aksara Jawa jika terdapat aksara
  const extraClasses = [
    hasArabic ? 'font-arabic-support' : '',
    hasJavanese ? 'font-javanese-support' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      dir="auto"
      className={`prose max-w-none text-slate-800 dark:text-slate-100 leading-relaxed font-sans ${extraClasses} ${className}`}
      dangerouslySetInnerHTML={{ __html: renderContentWithMathAndMedia(content) }}
    />
  );
};
