import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Komponen untuk merender teks campuran HTML biasa dan Rumus LaTeX/KaTeX:
 * Format inline: $...$ atau \(...\)
 * Format block/display: $$...$$ atau \[...\]
 */
export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const renderContentWithMath = (text: string) => {
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

    return formatted;
  };

  return (
    <div
      className={`prose max-w-none text-slate-800 dark:text-slate-100 leading-relaxed font-sans ${className}`}
      dangerouslySetInnerHTML={{ __html: renderContentWithMath(content) }}
    />
  );
};
