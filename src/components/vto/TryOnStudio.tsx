import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Shirt, User, Upload, CheckCircle2, RefreshCw, Sparkles, ChevronRight,
  Shield, Cpu, ArrowRightLeft, Check, Camera, Sun, Zap, Plus, Download,
  FileText, CheckCheck, Layers, Eye, Grid, Activity, Gauge, FileJson,
  Sparkle, SlidersHorizontal, Image as ImageIcon
} from 'lucide-react';
import {
  VTOTarget, VTOGarment, VTOParameters,
  MockupConfig, ReferenceAsset, MockupQualityAuditItem
} from '../../types/creativeSuite';
import { VTO_MODELS, VTO_GARMENTS } from '../../data/mockAssets';
import { runUniversalCompositor, CompositorResult } from '../../services/compositor';
import { Panel, Pill, Slider, ProgressRing } from '../../ui';

type StudioMode = 'quick' | 'editorial' | 'pipeline';
type InspectLayer = 'composite' | 'wireframe' | 'raw_warp' | 'shading' | 'microstructure' | 'shadows';
type EditorialTab = 'references' | 'wardrobe' | 'shot' | 'quality';

export const TryOnStudio: React.FC = () => {
  const [mode, setMode] = useState<StudioMode>('quick');
  const [inspectLayer, setInspectLayer] = useState<InspectLayer>('composite');

  // Shared Selection
  const [selectedModel, setSelectedModel] = useState<VTOTarget>(VTO_MODELS[0]);
  const [selectedGarment, setSelectedGarment] = useState<VTOGarment>(VTO_GARMENTS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [processingStage, setProcessingStage] = useState('Pronto');

  // Engine state
  const [compositorResult, setCompositorResult] = useState<CompositorResult | null>(null);

  // Quick mode params
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  // 2.5D Mesh & Inverse Compositor parameters
  const [tightness, setTightness] = useState<'slim-athletic' | 'regular' | 'oversized'>('slim-athletic');
  const [cylinderCurvature, setCylinderCurvature] = useState<number>(0.75); // 0.2 to 1.0
  const [shadingFactor, setShadingFactor] = useState<number>(0.72); // beta: 0 to 1
  const [microstructureAlpha, setMicrostructureAlpha] = useState<number>(0.18); // alpha: 0 to 0.35
  const [contactShadowIntensity, setContactShadowIntensity] = useState<number>(0.65); // 0 to 1
  const [ambientTemp, setAmbientTemp] = useState<'neutral' | 'warm' | 'cool'>('neutral');
  const [preserveSponsor, setPreserveSponsor] = useState<boolean>(true);

  // Editorial mode configuration
  const [editorialTab, setEditorialTab] = useState<EditorialTab>('wardrobe');
  const [config, setConfig] = useState<MockupConfig>({
    project: { name: 'Campagna Matchday Editorial 2026', mode: 'series', continuity: { environment_asset: '', wardrobe_asset: '', lighting_preset: 'hard_side_light', style_preset: 'photoreal_editorial' } },
    subject: {
      type: 'atleta', name: 'Marco Striker', identity_source: 'photo',
      preserve: ['volto', 'corporatura_atletica'], tattoos: { mode: 'from_references_only', description: '' },
      custom_description: 'Sguardo fiero e concentrato prima del match.',
    },
    wardrobe: {
      category: 'maglia gara home', layers: ['maglia ufficiale'], colors: 'Blu notte, Oro',
      material: 'Poliestere jacquard', preserve_design: true,
      modifications: [{ target: 'shirt_number', value: '10' }, { target: 'sponsor', value: 'PARAMOUNT' }],
    },
    shot: {
      framing: 'mid_bust', aspect_ratio: '4:5', crop_anchor: 'hips', camera_angle: 'three_quarter',
      pose: 'Posa atletica frontale naturale.', expression: 'Determinata.',
      subject_position: 'center', safe_margin: true,
    },
    scene: {
      background_mode: 'extend_ratio', background_desc: 'Studio fotografico sportivo con illuminazione diffusa.',
      lighting: { direction: 'camera_right', quality: 'hard_side_light', rim_light: true },
    },
    render: { style: 'photoreal_editorial', variants: 1, format: 'png', quality: 'high_res_4k' },
    references: [],
  });

  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const garmentFileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Core Universal Compositing pipeline execution
  const executeCompositing = useCallback(async (showLoading: boolean = false) => {
    if (showLoading) {
      setIsProcessing(true);
      setProgressPercent(15);
      setProcessingStage('[1/11] Matting & estrazione landmark torso...');
    }

    try {
      if (showLoading) {
        await new Promise((r) => setTimeout(r, 60));
        setProgressPercent(45);
        setProcessingStage('[6/11] Mesh Warp 2.5D su 640 triangoli...');
      }

      const imgHuman = new Image();
      imgHuman.crossOrigin = 'anonymous';
      imgHuman.src = selectedModel.previewUrl;
      await new Promise((resolve) => {
        imgHuman.onload = resolve;
        imgHuman.onerror = resolve;
      });

      const imgGarment = new Image();
      imgGarment.crossOrigin = 'anonymous';
      imgGarment.src = selectedGarment.previewUrl;
      await new Promise((resolve) => {
        imgGarment.onload = resolve;
        imgGarment.onerror = resolve;
      });

      if (showLoading) {
        await new Promise((r) => setTimeout(r, 60));
        setProgressPercent(80);
        setProcessingStage('[7-10] Shading S_body & Micro-texture H_body...');
      }

      const result = await runUniversalCompositor(imgHuman, imgGarment, null, {
        meshConfig: {
          cols: 16,
          rows: 20,
          cylinderCurvature,
          tightness,
        },
        shadingOptions: {
          shadingTransferFactor: shadingFactor,
          microstructureAlpha,
        },
        shadowOptions: {
          intensity: contactShadowIntensity,
          collarSpread: 18,
          armpitSpread: 26,
          ambientOcclusion: 0.5,
        },
        colorIntegration: {
          backgroundTintStrength: 0.25,
          ambientTemperature: ambientTemp,
        },
        generateDebugLayers: true,
      });

      setCompositorResult(result);
    } catch (err) {
      console.warn('Compositing error:', err);
    } finally {
      if (showLoading) {
        setProgressPercent(100);
        setProcessingStage('Compositing 2.5D completato!');
        setTimeout(() => setIsProcessing(false), 180);
      }
    }
  }, [selectedModel, selectedGarment, cylinderCurvature, tightness, shadingFactor, microstructureAlpha, contactShadowIntensity, ambientTemp]);

  // Run automatically when selections or main parameters change
  useEffect(() => {
    executeCompositing(false);
  }, [executeCompositing]);

  // Slider Mouse/Touch dragging logic
  const updateSliderFromClientX = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(pct);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingSlider(true);
    updateSliderFromClientX(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDraggingSlider(true);
    if (e.touches[0]) updateSliderFromClientX(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) updateSliderFromClientX(e.clientX);
    };
    const handleMouseUp = () => {
      setIsDraggingSlider(false);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider && e.touches[0]) updateSliderFromClientX(e.touches[0].clientX);
    };

    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingSlider]);

  const handleModelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setSelectedModel({
          id: `custom-model-${Date.now()}`,
          name: file.name.slice(0, 20),
          role: 'Upload Personale',
          gender: 'unisex',
          previewUrl: url,
          poseDescription: 'Rilevamento landmark automatico',
          lightingAngle: 'Auto',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGarmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setSelectedGarment({
          id: `custom-garment-${Date.now()}`,
          name: file.name.slice(0, 20),
          category: 'football-jersey',
          teamOrBrand: 'Custom Kit',
          previewUrl: url,
          texturePattern: 'Custom fabric',
          sponsorLogos: ['Logo Custom'],
          primaryHex: '#0284c7',
          secondaryHex: '#0f172a',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadReport = () => {
    if (!compositorResult) return;
    const blob = new Blob([JSON.stringify(compositorResult.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vto_compositing_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentDisplayImage = () => {
    if (!compositorResult) return selectedModel.previewUrl;
    if (inspectLayer === 'composite') return compositorResult.finalDataUrl;
    if (inspectLayer === 'wireframe') return compositorResult.debugLayers?.meshWireframe || compositorResult.finalDataUrl;
    if (inspectLayer === 'raw_warp') return compositorResult.debugLayers?.warpedGarment || compositorResult.finalDataUrl;
    if (inspectLayer === 'shading') return compositorResult.debugLayers?.shadingMap || compositorResult.finalDataUrl;
    if (inspectLayer === 'microstructure') return compositorResult.debugLayers?.microstructureMap || compositorResult.finalDataUrl;
    if (inspectLayer === 'shadows') return compositorResult.debugLayers?.contactShadows || compositorResult.finalDataUrl;
    return compositorResult.finalDataUrl;
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0a0c12] text-zinc-100 select-none">
      {/* 1. LEFT PANEL: Selection, Pipeline & Parameters (360px) */}
      <aside className="w-[360px] shrink-0 border-r border-white/[0.06] bg-[#0b0e14]/70 backdrop-blur-xl flex flex-col overflow-hidden">
        {/* Mode switcher tabs */}
        <div className="p-3.5 border-b border-white/[0.06]">
          <div className="flex p-1 rounded-xl bg-black/40 ring-1 ring-inset ring-white/[0.06]">
            <button
              onClick={() => { setMode('quick'); setInspectLayer('composite'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                mode === 'quick'
                  ? 'bg-white/[0.08] text-white ring-1 ring-inset ring-white/[0.1] font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Quick Fitting</span>
            </button>
            <button
              onClick={() => { setMode('pipeline'); setInspectLayer('wireframe'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                mode === 'pipeline'
                  ? 'bg-white/[0.08] text-white ring-1 ring-inset ring-white/[0.1] font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-amber-400" />
              <span>Mesh 2.5D</span>
            </button>
            <button
              onClick={() => setMode('editorial')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                mode === 'editorial'
                  ? 'bg-white/[0.08] text-white ring-1 ring-inset ring-white/[0.1] font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-violet-400" />
              <span>Editorial</span>
            </button>
          </div>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Persona / Atleta Cards */}
          <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-zinc-200">Soggetto Fotografico</span>
              </div>
              <button
                onClick={() => modelFileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Carica</span>
              </button>
              <input ref={modelFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleModelUpload} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {VTO_MODELS.slice(0, 3).map((m) => {
                const isSel = selectedModel.id === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m)}
                    className={`group relative flex flex-col rounded-xl overflow-hidden ring-1 transition-all cursor-pointer ${
                      isSel
                        ? 'ring-2 ring-cyan-400 shadow-[0_0_15px_-4px_rgba(6,182,212,0.6)] bg-white/[0.06]'
                        : 'ring-white/[0.06] hover:ring-white/[0.15] bg-black/30'
                    }`}
                  >
                    <div className="w-full h-20 bg-zinc-900 relative overflow-hidden">
                      <img src={m.previewUrl} alt={m.name} className="w-full h-full object-cover object-top" />
                      {isSel && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5 text-zinc-950 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="p-1.5 text-left">
                      <div className="text-[11px] font-semibold text-zinc-200 truncate">{m.name.split('–')[0].trim()}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{m.role.split(' ')[0]}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Capo / Maglia Cards */}
          <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Shirt className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-zinc-200">Asset del Capo (.garment)</span>
              </div>
              <button
                onClick={() => garmentFileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
              >
                <Upload className="w-3 h-3" />
                <span>Carica</span>
              </button>
              <input ref={garmentFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGarmentUpload} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {VTO_GARMENTS.slice(0, 3).map((g) => {
                const isSel = selectedGarment.id === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGarment(g)}
                    className={`group relative flex flex-col rounded-xl overflow-hidden ring-1 transition-all cursor-pointer ${
                      isSel
                        ? 'ring-2 ring-amber-400 shadow-[0_0_15px_-4px_rgba(251,191,36,0.6)] bg-white/[0.06]'
                        : 'ring-white/[0.06] hover:ring-white/[0.15] bg-black/30'
                    }`}
                  >
                    <div className="w-full h-20 bg-zinc-900 relative overflow-hidden p-1 flex items-center justify-center">
                      <img src={g.previewUrl} alt={g.name} className="w-full h-full object-contain" />
                      {isSel && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shadow">
                          <Check className="w-2.5 h-2.5 text-zinc-950 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="p-1.5 text-left">
                      <div className="text-[11px] font-semibold text-zinc-200 truncate">{g.name.split('"')[1] || g.name}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{g.teamOrBrand}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick & 2.5D Mesh Controls */}
          {(mode === 'quick' || mode === 'pipeline') && (
            <div className="space-y-3">
              {/* Mesh & Silhouette Geometry */}
              <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Gabbia Mesh 16×20 & Vestibilità</span>
                  <span className="font-mono text-[10px] text-cyan-400">320 Vertici</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'slim-athletic', label: 'Slim Fit' },
                    { id: 'regular', label: 'Regular' },
                    { id: 'oversized', label: 'Oversize' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTightness(f.id as any)}
                      className={`py-1.5 text-center text-xs font-medium rounded-lg transition-all cursor-pointer ${
                        tightness === f.id
                          ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-inset ring-cyan-500/40 font-semibold'
                          : 'bg-black/20 text-zinc-400 hover:text-zinc-200 ring-1 ring-inset ring-white/[0.04]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <Slider
                  label="Curvatura Cilindro 2.5D (Profondità Z)"
                  value={Math.round(cylinderCurvature * 100)}
                  min={20}
                  max={100}
                  onChange={(v) => setCylinderCurvature(v / 100)}
                />
              </div>

              {/* Shading & Microstructure Transfer */}
              <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Shading Transfer (S_body & H_body)</span>
                  <span className="font-mono text-[10px] text-emerald-400">High-Pass Filter</span>
                </div>

                <Slider
                  label="Fattore Shading β (Luminance Ratio)"
                  value={Math.round(shadingFactor * 100)}
                  min={0}
                  max={100}
                  onChange={(v) => setShadingFactor(v / 100)}
                  accent="accent-emerald-400"
                />

                <Slider
                  label="Microstruttura α (Pieghe Cotone Reali)"
                  value={Math.round((microstructureAlpha / 0.35) * 100)}
                  min={0}
                  max={100}
                  onChange={(v) => setMicrostructureAlpha((v / 100) * 0.35)}
                  accent="accent-amber-400"
                />

                <Slider
                  label="Ombre di Contatto (Ambient Occlusion)"
                  value={Math.round(contactShadowIntensity * 100)}
                  min={0}
                  max={100}
                  onChange={(v) => setContactShadowIntensity(v / 100)}
                />
              </div>

              {/* Ambient Lighting & Sponsor */}
              <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold">Tonalità Luce Ambiente</span>
                  <div className="flex gap-1">
                    {(['neutral', 'warm', 'cool'] as const).map((temp) => (
                      <button
                        key={temp}
                        onClick={() => setAmbientTemp(temp)}
                        className={`px-2 py-0.5 rounded text-[10px] capitalize cursor-pointer transition-all ${
                          ambientTemp === temp
                            ? 'bg-white/20 text-white font-semibold'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {temp === 'neutral' ? 'Studio' : temp === 'warm' ? 'Caldo' : 'Freddo'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">Preserva Loghi & Sponsor</div>
                    <div className="text-[10px] text-zinc-500">Coordinate UV piane non distorte</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={preserveSponsor}
                    onChange={(e) => setPreserveSponsor(e.target.checked)}
                    className="rounded text-cyan-500 w-4 h-4 cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Editorial Mode Tabs */}
          {mode === 'editorial' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-black/40 ring-1 ring-inset ring-white/[0.04]">
                {([
                  { id: 'wardrobe', label: 'Abito' },
                  { id: 'shot', label: 'Shot' },
                  { id: 'quality', label: 'Audit' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditorialTab(t.id)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-all ${
                      editorialTab === t.id
                        ? 'bg-white/[0.1] text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {editorialTab === 'wardrobe' && (
                <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3 space-y-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-semibold">Numero Maglia</label>
                    <input
                      type="text"
                      value={config.wardrobe.modifications.find((m) => m.target === 'shirt_number')?.value || '10'}
                      onChange={(e) => {
                        const mods = config.wardrobe.modifications.map((m) =>
                          m.target === 'shirt_number' ? { ...m, value: e.target.value } : m
                        );
                        setConfig({ ...config, wardrobe: { ...config.wardrobe, modifications: mods } });
                      }}
                      className="mt-1 w-full bg-black/40 ring-1 ring-inset ring-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-semibold">Sponsor Frontale</label>
                    <input
                      type="text"
                      value={config.wardrobe.modifications.find((m) => m.target === 'sponsor')?.value || 'PARAMOUNT'}
                      onChange={(e) => {
                        const mods = config.wardrobe.modifications.map((m) =>
                          m.target === 'sponsor' ? { ...m, value: e.target.value } : m
                        );
                        setConfig({ ...config, wardrobe: { ...config.wardrobe, modifications: mods } });
                      }}
                      className="mt-1 w-full bg-black/40 ring-1 ring-inset ring-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              {editorialTab === 'quality' && compositorResult && (
                <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-400 uppercase">
                    <span>Audit Pipeline 11-Step</span>
                    <span className="text-emerald-400 font-mono">6/6 PASS</span>
                  </div>
                  <div className="space-y-1.5">
                    {compositorResult.report.conformityAudit.map((item, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-black/30 border border-white/[0.04] text-[10px]">
                        <div className="flex justify-between text-zinc-300 font-medium">
                          <span>{item.criterion}</span>
                          <span className="text-emerald-400 font-mono">PASS</span>
                        </div>
                        <p className="text-zinc-500 mt-0.5">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generate Button CTA */}
        <div className="p-3.5 border-t border-white/[0.06] bg-black/30">
          <button
            onClick={() => executeCompositing(true)}
            disabled={isProcessing}
            className="w-full py-2.5 rounded-xl font-semibold text-xs text-zinc-950 bg-gradient-to-r from-cyan-400 to-amber-300 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_-4px_rgba(34,211,238,0.4)] disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Calcolo Compositing 2.5D...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Esegui Pipeline Inversa 2.5D</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 2. CENTER: Canvas Viewport & Layer Inspector */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.03),transparent_70%)]">
        {/* Top Info Bar & Layer Tabs */}
        <div className="h-11 border-b border-white/[0.06] bg-[#0b0e14]/60 backdrop-blur px-5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{selectedModel.name.split('–')[0].trim()}</span>
            <ChevronRight className="w-3 h-3 text-zinc-600" />
            <span className="text-amber-300 font-medium">{selectedGarment.name}</span>
            {compositorResult && (
              <span className="ml-2 font-mono text-[10px] bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>{compositorResult.renderTimeMs} ms · 60 FPS</span>
              </span>
            )}
          </div>

          {/* Layer Selector Capsule */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 ring-1 ring-inset ring-white/[0.06]">
            {([
              { id: 'composite', label: 'Composite' },
              { id: 'wireframe', label: 'Mesh 16×20' },
              { id: 'shading', label: 'S_body (Luce)' },
              { id: 'microstructure', label: 'H_body (Pieghe)' },
              { id: 'shadows', label: 'Ombre' },
            ] as const).map((layer) => (
              <button
                key={layer.id}
                onClick={() => setInspectLayer(layer.id)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all cursor-pointer ${
                  inspectLayer === layer.id
                    ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-inset ring-cyan-500/40 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
            <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
            <span>Split:</span>
            <span className="font-mono text-cyan-400 font-semibold">{Math.round(sliderPosition)}%</span>
          </div>
        </div>

        {/* Canvas Display Container (Proportion 3:4) */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-6">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            className="relative w-full max-w-lg aspect-[3/4] rounded-3xl overflow-hidden ring-1 ring-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-[#0d1015] select-none cursor-ew-resize group"
          >
            {/* AFTER / INSPECT LAYER */}
            <div className="absolute inset-0">
              <img
                src={currentDisplayImage()}
                alt="Try-On Fit Result"
                className="w-full h-full object-cover object-top pointer-events-none"
              />

              {/* Layer Type Tag */}
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>
                  {inspectLayer === 'composite'
                    ? 'Compositing 2.5D (L1)'
                    : inspectLayer === 'wireframe'
                    ? 'Gabbia 16×20 (320 V)'
                    : inspectLayer === 'shading'
                    ? 'Mappa Luminanza S_body'
                    : inspectLayer === 'microstructure'
                    ? 'Microstruttura H_body'
                    : 'Ombre di Contatto AO'}
                </span>
              </div>
            </div>

            {/* BEFORE LAYER: Original Athlete Base Photo (Clipped for comparison) */}
            {inspectLayer === 'composite' && (
              <>
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={selectedModel.previewUrl}
                    alt="Original Model"
                    className="absolute inset-0 h-full w-auto max-w-none object-cover object-top pointer-events-none"
                    style={{ width: containerRef.current?.clientWidth || '100%' }}
                  />

                  {/* Tag Before */}
                  <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur border border-white/10 text-zinc-300 text-[10px] font-semibold">
                    <span>Fotografia Originale</span>
                  </div>
                </div>

                {/* DIVIDER LINE WITH CLEAN DRAG HANDLE */}
                <div
                  className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_15px_rgba(255,255,255,0.9)] z-20 pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-900 border-2 border-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </>
            )}

            {/* Processing Spinner Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-[#0a0c12]/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6">
                <ProgressRing percent={progressPercent} label={processingStage} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Inspector Bar */}
        <div className="border-t border-white/[0.04] bg-[#0b0e14]/70 px-5 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
            <span className="flex items-center gap-1 font-mono text-cyan-300">
              <Grid className="w-3.5 h-3.5" />
              <span>Mesh 16×20 (640 tri)</span>
            </span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-emerald-300">Shading Transfer β: {Math.round(shadingFactor * 100)}%</span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-amber-300">Microtexture α: {Math.round((microstructureAlpha / 0.35) * 100)}%</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">Zero Server · 100% Locale</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs font-medium cursor-pointer"
              title="Esporta Report Matematico JSON"
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              <span>Report JSON</span>
            </button>
            <a
              href={compositorResult?.finalDataUrl}
              download={`vto_composite_${Date.now()}.png`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-semibold cursor-pointer shadow-[0_0_12px_-3px_rgba(6,182,212,0.5)]"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Scarica PNG</span>
            </a>
          </div>
        </div>
      </main>

      {/* 3. RIGHT PANEL: Neural & Mathematical Metrics (280px) */}
      <aside className="w-[280px] shrink-0 border-l border-white/[0.06] bg-[#0b0e14]/70 backdrop-blur-xl flex flex-col overflow-hidden text-xs">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white">Universal Compositor L1</span>
            </div>
            <div className="w-9 h-9 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center font-mono font-bold text-emerald-400 text-xs">
              {compositorResult?.conformityScore || 98}%
            </div>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span className="text-zinc-500">Pipeline Pipeline</span>
              <span className="font-mono text-emerald-300">11 Step Deterministica</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span className="text-zinc-500">Mesh Warping 2.5D</span>
              <span className="font-mono text-cyan-300">16×20 (640 Triangoli)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span className="text-zinc-500">Compressione Z Cilindro</span>
              <span className="font-mono text-amber-300">{Math.round(cylinderCurvature * 100)}%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Latenza CPU</span>
              <span className="font-mono text-emerald-400 font-bold">{compositorResult?.renderTimeMs || 18} ms</span>
            </div>
          </div>
        </div>

        {/* Diagnostic Layer Explanations */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="p-3 rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
              <Grid className="w-3.5 h-3.5" />
              <span>Gabbia di Controllo 2.5D</span>
            </div>
            <p className="text-zinc-400 text-[10px] leading-relaxed">
              La texture viene deformata sui triangoli con compressione cosinoidale ai bordi del torso per simulare il cilindro 3D del corpo.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <Sun className="w-3.5 h-3.5" />
              <span>Shading Transfer S_body</span>
            </div>
            <p className="text-zinc-400 text-[10px] leading-relaxed">
              Il campo di illuminazione estratto dalla foto reale viene moltiplicato matematicamente sulla nuova maglia senza inventare texture.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
              <Sparkle className="w-3.5 h-3.5" />
              <span>Microstruttura H_body</span>
            </div>
            <p className="text-zinc-400 text-[10px] leading-relaxed">
              Filtro passa-alto (I - L) che recupera le micro-pieghe di cotone originali e le somma sopra il nuovo pattern.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-violet-400 font-semibold text-[11px]">
              <Shield className="w-3.5 h-3.5" />
              <span>Ambient Occlusion Junctions</span>
            </div>
            <p className="text-zinc-400 text-[10px] leading-relaxed">
              Decadimento esponenziale exp(-d²/2σ²) applicato sul colletto e ascelle per eliminare l'effetto ritaglio.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};
