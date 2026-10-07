import React from 'react';
import { 
  PenTool, 
  Image as ImageIcon, 
  Shirt, 
  Sparkles, 
  FileCode2, 
  Download, 
  RotateCcw, 
  RotateCw, 
  HardDrive
} from 'lucide-react';
import { WorkspaceMode, ColorSpace } from '../types/creativeSuite';

interface HeaderProps {
  currentMode: WorkspaceMode;
  onSelectMode: (mode: WorkspaceMode) => void;
  colorSpace: ColorSpace;
  onChangeColorSpace: (cs: ColorSpace) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenExport: () => void;
  onOpenModelManager: () => void;
  activeLayersCount: number;
}

const TABS: { id: WorkspaceMode; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'vector', label: 'Vector & Loghi', icon: PenTool },
  { id: 'raster', label: 'Raster & Foto', icon: ImageIcon },
  { id: 'vto', label: 'Try-On Studio', icon: Shirt },
  { id: 'generative', label: 'AI Generativa', icon: Sparkles },
  { id: 'blueprint', label: 'Blueprint', icon: FileCode2 },
];

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  colorSpace,
  onChangeColorSpace,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenExport,
  onOpenModelManager,
}) => {
  return (
    <header className="h-14 border-b border-white/[0.06] bg-[#0b0e14]/80 backdrop-blur-xl px-4 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 ring-1 ring-inset ring-white/10 flex items-center justify-center">
          <span className="text-xs font-bold text-cyan-300 font-mono">CS</span>
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white leading-none">Creative Suite</h1>
          <p className="text-[10px] text-zinc-500 mt-0.5">Vector · Raster · Try-On · AI</p>
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center gap-1 p-1 rounded-xl bg-black/30 ring-1 ring-inset ring-white/[0.04]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectMode(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-white/[0.08] text-white ring-1 ring-inset ring-white/[0.1] font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-zinc-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right: model manager, history, color space, export */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenModelManager}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.03] hover:bg-white/[0.07] ring-1 ring-inset ring-white/[0.06] rounded-lg text-xs text-zinc-300 transition-colors cursor-pointer"
          title="Gestione Modelli AI Locali"
        >
          <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline text-[11px]">Modelli</span>
        </button>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 ring-1 ring-inset ring-white/[0.06] rounded-lg p-0.5 bg-black/20">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-25 rounded transition-colors cursor-pointer"
            title="Annulla (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 text-zinc-400 hover:text-white disabled:opacity-25 rounded transition-colors cursor-pointer"
            title="Ripristina (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Color Space */}
        <select
          value={colorSpace}
          onChange={(e) => onChangeColorSpace(e.target.value as ColorSpace)}
          className="bg-black/30 ring-1 ring-inset ring-white/[0.06] rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 font-medium focus:outline-none cursor-pointer"
        >
          <option value="sRGB" className="bg-zinc-900 text-white">sRGB</option>
          <option value="Display-P3" className="bg-zinc-900 text-white">Display P3</option>
          <option value="CMYK-FOGRA39" className="bg-zinc-900 text-white">CMYK FOGRA39</option>
          <option value="Pantone-PMS" className="bg-zinc-900 text-white">Pantone PMS</option>
        </select>

        {/* Export CTA */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-[0_0_15px_-4px_rgba(6,182,212,0.5)]"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Esporta</span>
        </button>
      </div>
    </header>
  );
};
