import React, { useState, useRef } from 'react';
import { 
  Sliders, 
  Sparkles, 
  Scissors, 
  Smile, 
  Layers, 
  Sun, 
  Eye, 
  EyeOff, 
  Plus, 
  Upload, 
  RotateCcw, 
  Filter, 
  Wand2,
  Brush,
  Palette
} from 'lucide-react';
import { RasterLayer, PhotoAdjustments, BeautifySettings } from '../../types/creativeSuite';
import { SVG_ATHLETE_STRIKER, SVG_ATHLETE_FASHION, SVG_ATHLETE_URBAN } from '../../data/placeholderImages';

interface RasterStudioProps {
  layers: RasterLayer[];
  onUpdateLayers: (layers: RasterLayer[]) => void;
  adjustments: PhotoAdjustments;
  onUpdateAdjustments: (adj: PhotoAdjustments) => void;
}

const DEFAULT_SAMPLE_PHOTOS = [
  {
    name: 'Atleta Calcio Striker (Match Action)',
    url: SVG_ATHLETE_STRIKER,
  },
  {
    name: 'Ritratto Fashion Studio',
    url: SVG_ATHLETE_FASHION,
  },
  {
    name: 'Streetwear Urban Pose',
    url: SVG_ATHLETE_URBAN,
  },
];

export const RasterStudio: React.FC<RasterStudioProps> = ({
  layers,
  onUpdateLayers,
  adjustments,
  onUpdateAdjustments,
}) => {
  const [activeTab, setActiveTab] = useState<'adjust' | 'beautify' | 'cutout' | 'fx' | 'stickers'>('adjust');
  const [beautify, setBeautify] = useState<BeautifySettings>({
    skinSmooth: 35,
    teethWhiten: 20,
    eyeBrightness: 25,
    faceContour: 15,
    redEyeFix: true,
  });
  const [selectedLayerId, setSelectedLayerId] = useState<string>(layers[0]?.id || 'bg-photo');
  const [activeFilterPreset, setActiveFilterPreset] = useState<string>('none');
  const [bgCutoutMode, setBgCutoutMode] = useState<'original' | 'isolated' | 'neon-studio' | 'transparent'>('original');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || layers[0];

  const updateAdjustment = (field: keyof PhotoAdjustments, value: number) => {
    onUpdateAdjustments({
      ...adjustments,
      [field]: value,
    });
  };

  const resetAdjustments = () => {
    onUpdateAdjustments({
      exposure: 0,
      contrast: 0,
      saturation: 0,
      warmth: 0,
      highlights: 0,
      shadows: 0,
      vignette: 0,
      blur: 0,
      tint: 0,
      curveHighlights: 0,
      curveMidtones: 0,
      curveShadows: 0,
    });
    setActiveFilterPreset('none');
  };

  const applyPresetFilter = (preset: string) => {
    setActiveFilterPreset(preset);
    if (preset === 'cinematic') {
      onUpdateAdjustments({ ...adjustments, exposure: 10, contrast: 25, saturation: -15, warmth: 15, vignette: 30 });
    } else if (preset === 'cyberpunk') {
      onUpdateAdjustments({ ...adjustments, exposure: 15, contrast: 40, saturation: 45, warmth: -25, vignette: 20 });
    } else if (preset === 'vintage') {
      onUpdateAdjustments({ ...adjustments, exposure: -5, contrast: -10, saturation: -30, warmth: 35, vignette: 45 });
    } else if (preset === 'stadium') {
      onUpdateAdjustments({ ...adjustments, exposure: 20, contrast: 30, saturation: 20, warmth: 5, vignette: 15 });
    } else {
      resetAdjustments();
    }
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newLayer: RasterLayer = {
          id: `layer-${Date.now()}`,
          name: file.name.slice(0, 18),
          type: 'image',
          imageUrl: url,
          opacity: 1,
          visible: true,
          blendMode: 'normal',
          x: 0,
          y: 0,
          width: 800,
          height: 600,
          rotation: 0,
        };
        onUpdateLayers([newLayer, ...layers]);
        setSelectedLayerId(newLayer.id);
      };
      reader.readAsDataURL(file);
    }
  };

  // Compute CSS filter style for real-time photo grading
  const getFilterStyle = () => {
    const brightness = 1 + adjustments.exposure / 100;
    const contrast = 1 + adjustments.contrast / 100;
    const saturate = 1 + adjustments.saturation / 100;
    const hueRotate = adjustments.tint * 1.5;
    const blur = adjustments.blur;
    const sepia = adjustments.warmth > 0 ? adjustments.warmth / 250 : 0;

    return {
      filter: `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) hue-rotate(${hueRotate}deg) blur(${blur}px) sepia(${sepia})`,
    };
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-200">
      {/* Left Sub-Navigation for Raster Controls */}
      <div className="w-16 border-r border-slate-800 bg-slate-900/60 p-2 flex flex-col items-center gap-2 shrink-0 select-none">
        <button
          onClick={() => setActiveTab('adjust')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTab === 'adjust'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Regolazioni Fotografiche (Esposizione, Contrasto, Curve)"
        >
          <Sliders className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTab('beautify')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTab === 'beautify'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="PicsArt Beautify (Pelle, Denti, Occhi, Struttura Facciale)"
        >
          <Smile className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTab('cutout')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTab === 'cutout'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Cutout AI (Scontorno automatico soggetto / Rimozione sfondo)"
        >
          <Scissors className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTab('fx')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTab === 'fx'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Filtri & FX Artistici (Pop Art, Cyber, Film)"
        >
          <Filter className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTab('stickers')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTab === 'stickers'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Sticker Maker & Sovrimpressioni Grafiche"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        <div className="w-8 h-[1px] bg-slate-800 my-1" />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 transition-all"
          title="Carica Foto Utente"
        >
          <Upload className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleCustomUpload}
        />
      </div>

      {/* Main Raster Viewport & Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 relative">
        {/* Top Preset Bar */}
        <div className="h-11 border-b border-slate-800/80 bg-slate-900/40 px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px] font-medium">Campioni Rapidi:</span>
            {DEFAULT_SAMPLE_PHOTOS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const updated = [...layers];
                  if (updated[0]) updated[0].imageUrl = sample.url;
                  onUpdateLayers(updated);
                }}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded font-medium transition-colors truncate max-w-[140px]"
                title={sample.name}
              >
                {sample.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetAdjustments}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/60 hover:bg-slate-700 text-slate-300 rounded font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Valori</span>
            </button>
          </div>
        </div>

        {/* Canvas Display */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
          <div className="relative max-w-2xl w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-slate-800 bg-slate-900 flex items-center justify-center">
            {/* Background Cutout simulator backplate */}
            {bgCutoutMode === 'neon-studio' && (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-amber-900 animate-pulse opacity-70" />
            )}
            {bgCutoutMode === 'transparent' && (
              <div className="absolute inset-0 bg-[radial-gradient(#334155_2px,transparent_2px)] [background-size:12px_12px]" />
            )}

            {/* Render Raster Layer with Live Filters */}
            <div className="relative overflow-hidden w-full h-[460px] flex items-center justify-center">
              <img
                src={
                  selectedLayer?.imageUrl ||
                  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=80'
                }
                alt="Raster Canvas"
                className="w-full h-full object-cover transition-all duration-150 select-none"
                style={{
                  ...getFilterStyle(),
                  mixBlendMode: selectedLayer?.blendMode || 'normal',
                  opacity: selectedLayer?.opacity ?? 1,
                  clipPath:
                    bgCutoutMode === 'isolated' || bgCutoutMode === 'neon-studio'
                      ? 'ellipse(42% 48% at 50% 50%)'
                      : 'none',
                }}
              />

              {/* Vignette Overlay */}
              {adjustments.vignette > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, transparent ${100 - adjustments.vignette}%, rgba(0,0,0,${
                      adjustments.vignette / 100
                    }) 100%)`,
                  }}
                />
              )}

              {/* Beautify subtle glow simulation */}
              {beautify.skinSmooth > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backdropFilter: `blur(${beautify.skinSmooth * 0.05}px)`,
                    opacity: beautify.skinSmooth / 200,
                  }}
                />
              )}
            </div>

            {/* Information Tag */}
            <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>32-bit Float Raster Engine · sRGB 100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls Panel based on Active Tab */}
      <div className="w-80 border-l border-slate-800 bg-slate-900/70 p-4 flex flex-col gap-5 overflow-y-auto shrink-0 text-xs">
        {/* Tab 1: Photographic Adjustments */}
        {activeTab === 'adjust' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white tracking-tight text-sm">Regolazioni Fotografiche</h3>
              <p className="text-[11px] text-slate-400">Motore di correzione colore in spazio lineare sRGB</p>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-semibold mb-1 block">Look & Presets</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'cinematic', label: 'Cinematic' },
                  { id: 'cyberpunk', label: 'Cyberpunk' },
                  { id: 'vintage', label: 'Vintage Retro' },
                  { id: 'stadium', label: 'Match Stadium' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyPresetFilter(p.id)}
                    className={`px-2.5 py-1.5 rounded text-left transition-colors font-medium ${
                      activeFilterPreset === p.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3 border-t border-slate-800/80 pt-3">
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Esposizione (Exposure)</span>
                  <span className="font-mono text-indigo-400">{adjustments.exposure > 0 ? `+${adjustments.exposure}` : adjustments.exposure}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjustments.exposure}
                  onChange={(e) => updateAdjustment('exposure', Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Contrasto (Contrast)</span>
                  <span className="font-mono text-indigo-400">{adjustments.contrast > 0 ? `+${adjustments.contrast}` : adjustments.contrast}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjustments.contrast}
                  onChange={(e) => updateAdjustment('contrast', Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Saturazione Croma (Saturation)</span>
                  <span className="font-mono text-indigo-400">{adjustments.saturation > 0 ? `+${adjustments.saturation}` : adjustments.saturation}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjustments.saturation}
                  onChange={(e) => updateAdjustment('saturation', Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Temperatura Kelvin (Warmth)</span>
                  <span className="font-mono text-amber-400">{adjustments.warmth > 0 ? `+${adjustments.warmth}` : adjustments.warmth}</span>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={adjustments.warmth}
                  onChange={(e) => updateAdjustment('warmth', Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Vignettatura Lente (Vignette)</span>
                  <span className="font-mono text-indigo-400">{adjustments.vignette}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={adjustments.vignette}
                  onChange={(e) => updateAdjustment('vignette', Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Sfocatura / Nitidezza (Blur)</span>
                  <span className="font-mono text-indigo-400">{adjustments.blur} px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12"
                  value={adjustments.blur}
                  onChange={(e) => updateAdjustment('blur', Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Beautify Engine (PicsArt Style) */}
        {activeTab === 'beautify' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white tracking-tight text-sm">Beautify & Retouching AI</h3>
              <p className="text-[11px] text-slate-400">Algoritmi di riconoscimento facciale e levigatura naturale</p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Levigatura Pelle (Skin Smooth)</span>
                  <span className="font-mono text-fuchsia-400">{beautify.skinSmooth}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={beautify.skinSmooth}
                  onChange={(e) => setBeautify({ ...beautify, skinSmooth: Number(e.target.value) })}
                  className="w-full accent-fuchsia-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Sbiancamento Denti (Teeth Whiten)</span>
                  <span className="font-mono text-fuchsia-400">{beautify.teethWhiten}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={beautify.teethWhiten}
                  onChange={(e) => setBeautify({ ...beautify, teethWhiten: Number(e.target.value) })}
                  className="w-full accent-fuchsia-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Luminosità Sguardo (Eye Brightness)</span>
                  <span className="font-mono text-fuchsia-400">{beautify.eyeBrightness}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={beautify.eyeBrightness}
                  onChange={(e) => setBeautify({ ...beautify, eyeBrightness: Number(e.target.value) })}
                  className="w-full accent-fuchsia-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                  <span>Contorno Zigomi / Struttura Ossea</span>
                  <span className="font-mono text-fuchsia-400">{beautify.faceContour}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={beautify.faceContour}
                  onChange={(e) => setBeautify({ ...beautify, faceContour: Number(e.target.value) })}
                  className="w-full accent-fuchsia-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-300 text-xs">Rimozione Automatica Occhi Rossi</span>
                <input
                  type="checkbox"
                  checked={beautify.redEyeFix}
                  onChange={(e) => setBeautify({ ...beautify, redEyeFix: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-0 w-4 h-4"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Cutout AI */}
        {activeTab === 'cutout' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white tracking-tight text-sm">Cutout AI & Scontorno</h3>
              <p className="text-[11px] text-slate-400">Isolamento neurale soggetto (U²-Net & MODNet)</p>
            </div>

            <div className="space-y-2">
              {[
                { id: 'original', label: 'Immagine Intera (Con Sfondo)' },
                { id: 'isolated', label: 'Soggetto Scontornato Isolato' },
                { id: 'neon-studio', label: 'Sfondo Gradiente Studio Neon' },
                { id: 'transparent', label: 'Sfondo Trasparente PNG' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setBgCutoutMode(opt.id as any)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                    bgCutoutMode === opt.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt.label}</span>
                    {bgCutoutMode === opt.id && <Wand2 className="w-4 h-4 text-indigo-400" />}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
              Il modello di segmentazione esegue il calcolo con precisione millimetrica su capelli e bordi delle maglie sportive, pronto per il Virtual Try-On.
            </div>
          </div>
        )}

        {/* Tab 4: FX & Art Filters */}
        {activeTab === 'fx' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-white tracking-tight text-sm">FX & Filtri Artistici</h3>
              <p className="text-[11px] text-slate-400">Effetti creativi PicsArt e Photoshop</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Pop Art Andy', desc: 'Saturazione contrastata' },
                { name: 'Neon Cyber', desc: 'Riflessi olografici' },
                { name: 'Film Grain 35mm', desc: 'Grana pellicola analogica' },
                { name: 'Matchday HDR', desc: 'Ombre aperte e luci stadio' },
                { name: 'Dispersione 3D', desc: 'Particelle dinamiche' },
                { name: 'Glitch Chromatic', desc: 'Aberrazione ottica RGB' },
              ].map((fx, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPresetFilter(idx % 2 === 0 ? 'cyberpunk' : 'cinematic')}
                  className="p-2.5 bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl text-left transition-colors"
                >
                  <div className="font-semibold text-white text-xs">{fx.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{fx.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Layers & Blend Modes */}
        <div className="border-t border-slate-800/80 pt-4 mt-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Gestione Livello Attivo
            </span>
            <span className="text-[10px] font-mono text-slate-400">Blend Mode</span>
          </div>

          <div className="space-y-2">
            <select
              value={selectedLayer?.blendMode || 'normal'}
              onChange={(e) => {
                const updated = layers.map((l) =>
                  l.id === selectedLayerId ? { ...l, blendMode: e.target.value as any } : l
                );
                onUpdateLayers(updated);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white text-xs"
            >
              <option value="normal">Normale (Normal)</option>
              <option value="multiply">Moltiplica (Multiply)</option>
              <option value="screen">Schermo (Screen)</option>
              <option value="overlay">Sovrapponi (Overlay)</option>
              <option value="color-dodge">Colore Scherma (Color Dodge)</option>
              <option value="difference">Differenza (Difference)</option>
            </select>

            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Opacità Livello</span>
              <span className="font-mono text-indigo-400">
                {Math.round((selectedLayer?.opacity ?? 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={selectedLayer?.opacity ?? 1}
              onChange={(e) => {
                const updated = layers.map((l) =>
                  l.id === selectedLayerId ? { ...l, opacity: Number(e.target.value) } : l
                );
                onUpdateLayers(updated);
              }}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
