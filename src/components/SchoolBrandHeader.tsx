import React from 'react';

interface SchoolBrandHeaderProps {
  subtitle?: string;
  className?: string;
  showBadge?: boolean;
}

export const SchoolBrandHeader: React.FC<SchoolBrandHeaderProps> = ({
  subtitle = 'Computer Based Test System',
  className = '',
  showBadge = true,
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Resmi */}
      <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 dark:bg-white/10 p-1.5 shadow-xs border border-blue-200 dark:border-white/15 backdrop-blur-md shrink-0">
        <img
          src="/pic_logo.png"
          alt="Logo CBT"
          className="w-full h-full object-contain"
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white truncate">
            CBT <span className="text-blue-600 dark:text-blue-400 font-extrabold text-xs sm:text-sm font-sans tracking-normal">(Computer Based Test)</span>
          </h1>
          {showBadge && (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
              PORTAL RESMI
            </span>
          )}
        </div>
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
