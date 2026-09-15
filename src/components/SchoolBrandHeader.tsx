import React from 'react';

interface SchoolBrandHeaderProps {
  subtitle?: string;
  className?: string;
  showBadge?: boolean;
  logoUrl?: string | null;
  appTitle?: string;
}

export const SchoolBrandHeader: React.FC<SchoolBrandHeaderProps> = ({
  subtitle = 'Portal Ujian',
  className = '',
  showBadge = false,
  logoUrl = '/pic_logo.png',
  appTitle = 'CBT SMA MUHIPO',
}) => {
  const activeLogo = logoUrl || '/pic_logo.png';
  const displayTitle = appTitle && appTitle !== 'CBT' && appTitle !== 'CBT MUHIPO' ? appTitle : 'CBT SMA MUHIPO';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Resmi */}
      <div className="relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-50/90 dark:bg-slate-900/90 p-2 shadow-2xs border border-blue-200/90 dark:border-blue-900/50 shrink-0 overflow-hidden">
        <img
          src={activeLogo}
          alt="Logo CBT MUHIPO"
          className="w-full h-full object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/pic_logo.png';
          }}
        />
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">
            <span>{displayTitle}</span>{' '}
            <span className="text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm font-sans tracking-normal">
              (Computer based test)
            </span>
          </h1>
          {showBadge && (
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20 ml-1">
              PORTAL RESMI
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs font-normal text-slate-500 dark:text-slate-400 truncate mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

