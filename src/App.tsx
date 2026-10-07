import React, { useState } from 'react';
import { 
  WorkspaceMode, 
  ColorSpace, 
  VectorShape, 
  RasterLayer, 
  PhotoAdjustments, 
  UnifiedDocument 
} from './types/creativeSuite';
import { INITIAL_VECTOR_SHAPES, SVG_ATHLETE_STRIKER } from './data/mockAssets';
import { Header } from './components/Header';
import { ModelManager } from './components/ModelManager';
import { VectorStudio } from './components/vector/VectorStudio';
import { RasterStudio } from './components/raster/RasterStudio';
import { TryOnStudio } from './components/vto/TryOnStudio';
import { AIGenerativeStudio } from './components/ai/AIGenerativeStudio';
import { BlueprintExplorer } from './components/blueprint/BlueprintExplorer';
import { ExportModal } from './components/ExportModal';
import { usePersistedState } from './hooks/usePersistedState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useOfflineStatus } from './hooks/useOfflineStatus';

export default function App() {
  const { isOffline } = useOfflineStatus();
  const [currentMode, setCurrentMode] = useState<WorkspaceMode>('vto');
  const [colorSpace, setColorSpace] = useState<ColorSpace>('sRGB');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);

  // Initial Document Template
  const initialDoc: UnifiedDocument = {
    id: 'doc-aura-2026',
    name: 'Kit & Logo Studio 2026',
    version: '2.4.0',
    format: 'Unified Creative Schema (.ucs / SQLite)',
    canvasWidth: 1920,
    canvasHeight: 1080,
    dpi: 300,
    colorSpace: 'sRGB',
    vectorLayers: INITIAL_VECTOR_SHAPES,
    rasterLayers: [
      {
        id: 'bg-photo',
        name: 'Atleta Calcio Base (Offline SVG)',
        type: 'image',
        imageUrl: SVG_ATHLETE_STRIKER,
        opacity: 1,
        visible: true,
        blendMode: 'normal',
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        rotation: 0,
      },
    ],
    adjustments: {
      exposure: 6,
      contrast: 14,
      saturation: 8,
      warmth: 4,
      highlights: -8,
      shadows: 12,
      vignette: 16,
      blur: 0,
      tint: 0,
      curveHighlights: 8,
      curveMidtones: 0,
      curveShadows: -4,
    },
    historyLength: 1,
  };

  // IndexedDB Auto-Persisted State
  const { doc, setDoc } = usePersistedState(initialDoc);

  // In-Memory Undo / Redo History Stack
  const [history, setHistory] = useState<VectorShape[][]>([initialDoc.vectorLayers]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const handleUpdateVectorShapes = (newShapes: VectorShape[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push(newShapes);
    setHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setDoc({
      ...doc,
      vectorLayers: newShapes,
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const prevShapes = history[historyIndex - 1];
      setDoc({ ...doc, vectorLayers: prevShapes });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const nextShapes = history[historyIndex + 1];
      setDoc({ ...doc, vectorLayers: nextShapes });
    }
  };

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onSave: () => setIsExportOpen(true),
  });

  // Bridge: AI Generative Studio sends shapes to Vector Studio
  const handleImportGeneratedVector = (generatedShapes: VectorShape[]) => {
    handleUpdateVectorShapes(generatedShapes);
    setCurrentMode('vector');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0c12] font-sans text-zinc-100 select-none">
      {/* Top Application Header */}
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        colorSpace={colorSpace}
        onChangeColorSpace={setColorSpace}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenModelManager={() => setIsModelManagerOpen(true)}
        activeLayersCount={doc.vectorLayers.length + doc.rasterLayers.length}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 flex overflow-hidden relative">
        {currentMode === 'vector' && (
          <VectorStudio
            shapes={doc.vectorLayers}
            onUpdateShapes={handleUpdateVectorShapes}
            colorSpace={colorSpace}
          />
        )}

        {currentMode === 'raster' && (
          <RasterStudio
            layers={doc.rasterLayers}
            onUpdateLayers={(layers) => setDoc({ ...doc, rasterLayers: layers })}
            adjustments={doc.adjustments}
            onUpdateAdjustments={(adj) => setDoc({ ...doc, adjustments: adj })}
          />
        )}

        {/* Unified Try-On Studio (VTO + Mockup Studio) */}
        {currentMode === 'vto' && (
          <TryOnStudio />
        )}

        {currentMode === 'generative' && (
          <AIGenerativeStudio
            onImportGeneratedVector={handleImportGeneratedVector}
          />
        )}

        {currentMode === 'blueprint' && (
          <BlueprintExplorer />
        )}
      </main>

      {/* Clean Bottom Status Bar */}
      <footer className="h-6 border-t border-white/[0.04] bg-[#0b0e14]/80 backdrop-blur px-4 flex items-center justify-between text-[10px] text-zinc-400 shrink-0 select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-medium">
            <span className={`w-1.5 h-1.5 rounded-full ${!isOffline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {!isOffline ? 'Online · Motore Ibrido Pronto' : 'Offline · Motore L0 Attivo'}
          </span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-400">Canvas: {doc.canvasWidth}×{doc.canvasHeight} · {colorSpace}</span>
          <span className="text-zinc-700">|</span>
          <span className="text-zinc-400">{doc.vectorLayers.length + doc.rasterLayers.length} Livelli</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <span>Creative Suite</span>
          <span className="font-mono text-zinc-600">v2.4.0</span>
        </div>
      </footer>

      {/* Model Manager Drawer */}
      <ModelManager
        isOpen={isModelManagerOpen}
        onClose={() => setIsModelManagerOpen(false)}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        documentData={doc}
        colorSpace={colorSpace}
      />
    </div>
  );
}
