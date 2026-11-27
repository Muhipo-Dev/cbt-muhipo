'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-900 p-4 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-300 rounded-xl p-6 shadow-lg text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            Tampilan WebView Perlu Dimuat Ulang
          </h2>
          <p className="text-sm text-slate-600">
            Terjadi gangguan sementara saat memuat halaman di aplikasi Exambro/WebView.
          </p>
          {error?.message ? (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 break-words">
              {error.message}
            </p>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold min-h-[44px]"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 rounded-lg bg-slate-200 text-slate-900 text-sm font-semibold min-h-[44px]"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
