import React, { useState } from 'react';
import { Download, CheckCircle2, Share, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'header';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div id="pwa-installed-badge" className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Aplicación instalada como PWA</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          id="btn-install-pwa"
          onClick={install}
          className={
            variant === 'header'
              ? 'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg border border-zinc-200 transition-colors'
              : variant === 'full'
              ? 'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-sm transition-all'
              : 'flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60 rounded-xl transition-colors'
          }
        >
          <Download className="w-4 h-4 shrink-0 text-blue-600" />
          <span className="whitespace-nowrap">Instalar Project OS</span>
        </button>
      )}

      {isIOS && (
        <button
          id="btn-install-ios-pwa"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg border border-zinc-200 transition-colors"
        >
          <Share className="w-3.5 h-3.5 shrink-0" />
          <span>Instalar en iOS</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-semibold text-zinc-900">Instalar en iPhone o iPad</h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-zinc-600">
              <p className="flex items-start gap-2">
                <span className="font-bold text-blue-600">1.</span>
                <span>Toca el botón <strong>Compartir</strong> en la barra inferior de Safari.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-blue-600">2.</span>
                <span>Desliza hacia abajo y pulsa en <strong>Añadir a pantalla de inicio</strong>.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-bold text-blue-600">3.</span>
                <span>Pulsa <strong>Añadir</strong> en la esquina superior derecha.</span>
              </p>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
