import React from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { useOfflineStatus } from '../hooks/useOfflineStatus';

export const OfflineBanner: React.FC = () => {
  const { isOffline } = useOfflineStatus();

  if (!isOffline) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 flex items-center justify-between text-xs text-amber-200 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-medium">
          Modalità Offline Attiva: Tutta la suite (Vector, Raster, VTO e Mockup) funziona al 100% in locale.
        </span>
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-300">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        <span>L0 Procedurale + Canvas 2D</span>
      </div>
    </div>
  );
};
