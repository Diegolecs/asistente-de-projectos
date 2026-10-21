import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-indicator"
      className="fixed bottom-16 sm:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-zinc-900/95 text-white px-3.5 py-2 text-xs font-medium shadow-lg border border-zinc-700/60 backdrop-blur-xs animate-in fade-in"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>Modo sin conexión — Tus datos locales están seguros y disponibles.</span>
    </div>
  );
};
