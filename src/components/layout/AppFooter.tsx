import React from 'react';

interface AppFooterProps {
  variant?: 'minimal' | 'full';
  className?: string;
}

export function AppFooter({ variant = 'minimal', className = '' }: AppFooterProps) {
  return (
    <footer
      className={`w-full py-2.5 sm:py-3 border-t border-slate-200/70 dark:border-white/5 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 flex flex-row items-center justify-center text-center gap-2 shadow-2xs transition-colors duration-200 z-10 shrink-0 select-none px-4 ${className}`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
      </span>
      <span className="tracking-wide text-center truncate">
        &copy; 2026 CBT SMA MUHIPO (Computer Based Test)
      </span>
    </footer>
  );
}

