import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

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
    // 1. Ganti block math $$...$$
    let formatted = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), {
          displayMode: true,
          throwOnError: false,
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
      `<img src="$2" alt="$1" class="my-2 rounded-xl max-h-72 max-w-full mx-auto border border-slate-200 dark:border-slate-700 shadow-xs object-contain" />`
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


