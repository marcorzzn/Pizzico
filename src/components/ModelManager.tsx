import React, { useEffect, useState } from 'react';
import { Download, Wifi, WifiOff, CheckCircle2, Cpu, X, HardDrive } from 'lucide-react';
import { localAI } from '../services/localAI';
import { Panel } from '../ui';

interface ModelManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ModelManager: React.FC<ModelManagerProps> = ({ isOpen, onClose }) => {
  const [state, setState] = useState({ loaded: false, progress: 0, message: 'Nessun modello pesante scaricato' });
  const [webgpu, setWebgpu] = useState<boolean | null>(null);

  useEffect(() => {
    localAI.checkWebGPU().then(setWebgpu);
    return localAI.subscribe(setState);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#121317] border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-xs text-zinc-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-xl"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Gestione Modelli AI Locali</h3>
            <p className="text-zinc-400 text-xs">Inferenza on-device tramite WebGPU & WASM</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06]">
            <div className="flex items-center gap-2">
              {navigator.onLine ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
              <span className="font-medium text-zinc-300">Stato Rete Browser</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-400">
              {navigator.onLine ? 'Connesso' : 'Disconnesso (Offline)'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-zinc-200">Accelerazione WebGPU</span>
              </div>
              <span
                className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                  webgpu ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}
              >
                {webgpu === null ? 'RILEVAMENTO...' : webgpu ? 'ATTIVA' : 'NON DISPONIBILE'}
              </span>
            </div>
            {!webgpu && webgpu !== null && (
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Il tuo browser non espone WebGPU. La suite utilizza i generatori procedurali L0 deterministici a costo computazionale zero.
              </p>
            )}
          </div>

          {webgpu && (
            <div className="space-y-2">
              <button
                onClick={() => localAI.loadLLM('gemma-2b')}
                disabled={state.loaded || state.progress > 0}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-400/30 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                {state.loaded ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                <span>{state.loaded ? 'Modello Locale Attivo' : 'Scarica Gemma 2B Locale (~1.5 GB)'}</span>
              </button>
            </div>
          )}

          {state.progress > 0 && !state.loaded && (
            <div className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-zinc-800">
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-all duration-300"
                  style={{ width: `${state.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">{state.message} ({state.progress}%)</p>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-emerald-500/[0.05] border border-emerald-400/20 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-200/90 leading-tight">
              Tutti i moduli (Vector Studio, Raster Canvas, Virtual Try-On e Mockup) sono 100% operativi anche senza scaricare alcun modello pesante.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
