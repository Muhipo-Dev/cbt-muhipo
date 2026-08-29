'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  RefreshCw,
} from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationModalProps {
  isOpen: boolean;
  type?: NotificationType;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function NotificationModal({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = 'Tutup',
  cancelText,
  onConfirm,
  onCancel,
  isLoading = false,
}: NotificationModalProps) {
  if (!isOpen) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-500" />,
          bgIcon: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
          btnConfirm:
            'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20',
          headerBorder: 'border-emerald-500/20',
        };
      case 'error':
        return {
          icon: <XCircle className="w-8 h-8 text-rose-500" />,
          bgIcon: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
          btnConfirm:
            'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20',
          headerBorder: 'border-rose-500/20',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-8 h-8 text-amber-500" />,
          bgIcon: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
          btnConfirm:
            'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20',
          headerBorder: 'border-amber-500/20',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-8 h-8 text-blue-500" />,
          bgIcon: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
          btnConfirm:
            'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20',
          headerBorder: 'border-blue-500/20',
        };
    }
  };

  const config = getIconAndColors();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl transition-all scale-100 space-y-5">
        {/* Tombol Close silang */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-2xl border ${config.bgIcon} flex-shrink-0`}
          >
            {config.icon}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h3>
            <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words whitespace-pre-line">
              {message}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
          {cancelText && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold text-xs transition disabled:opacity-50 cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-5 py-2 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer ${config.btnConfirm}`}
            >
              {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmText}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
