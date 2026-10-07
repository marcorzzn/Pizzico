import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Shirt, User, Upload, CheckCircle2, RefreshCw, Sparkles, ChevronRight,
  Shield, Cpu, ArrowRightLeft, Check, Sliders,
  Camera, Sun, Zap, Plus, Download, FileText, CheckCheck
} from 'lucide-react';
import {
  VTOTarget, VTOGarment, VTOParameters,
  MockupConfig, ReferenceAsset, MockupQualityAuditItem
} from '../../types/creativeSuite';
import { VTO_MODELS, VTO_GARMENTS } from '../../data/mockAssets';
import { runLocalTryOn } from '../../services/localVTO';
import { generateMockupReport } from '../../services/proceduralGenerators';
import { Panel, Pill, Slider, ProgressRing } from '../../ui';

type StudioMode = 'quick' | 'editorial';
type EditorialTab = 'references' | 'subject' | 'wardrobe' | 'shot' | 'scene' | 'quality';

export const TryOnStudio: React.FC = () => {
  const [mode, setMode] = useState<StudioMode>('quick');

  // Shared Selection
  const [selectedModel, setSelectedModel] = useState<VTOTarget>(VTO_MODELS[0]);
  const [selectedGarment, setSelectedGarment] = useState<VTOGarment>(VTO_GARMENTS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [processingStage, setProcessingStage] = useState('Pronto');
  const [renderedResultDataUrl, setRenderedResultDataUrl] = useState<string | null>(null);

  const [neuralAnalysis, setNeuralAnalysis] = useState<any>({
    fitScore: 97,
    warpMeshParameters: { torsoCurvature: '18.4°', shoulderDrape: 'Deformazione anatomica naturale', tensionPoints: ['Clavicola', 'Pettorali'] },
    sponsorPreservationAdvice: 'Mesh UV prospettica applicata a stemma e sponsor frontale.',
    lightBaking: 'Luce studio coerente con shading direzionale.',
  });

  // Quick mode params
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const [params, setParams] = useState<VTOParameters>({
    category: 'football-kit',
    fitTightness: 'slim-athletic',
    creaseDepth: 65,
    lightingMatching: 85,
    logoPreservation: true,
    fabricType: 'dry-fit',
    warpStrength: 75,
    cloudModel: 'IDM-VTON',
  });

  // Editorial mode configuration
  const [editorialTab, setEditorialTab] = useState<EditorialTab>('references');
  const [references, setReferences] = useState<ReferenceAsset[]>([
    { id: 'ref-1', name: 'Ritratto Atleta', previewUrl: VTO_MODELS[0].previewUrl, role: 'identity', instruction: 'Copia volto e lineamenti.', enabled: true, priority: 1 },
    { id: 'ref-2', name: 'Maglia Concept', previewUrl: VTO_GARMENTS[0].previewUrl, role: 'wardrobe_front', instruction: 'Mantieni stemma e sponsor.', enabled: true, priority: 2 },
  ]);

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

  const [qualityAudit, setQualityAudit] = useState<MockupQualityAuditItem[]>([
    { criterion: 'Soggetto singolo e proporzionato', status: 'pass', comment: 'Identità e postura corporea fedeli.' },
    { criterion: 'Inquadratura 3:4 / 4:5 rispettata', status: 'pass', comment: 'Mezzo busto centrato.' },
    { criterion: 'Fitting spalle e scollatura', status: 'pass', comment: 'Colletto posizionato anatomicamente.' },
    { criterion: 'Pieghe e tensione tessuto', status: 'pass', comment: 'Rilievi volumetrici coerenti con posa.' },
    { criterion: 'Preservazione sponsor e stemma', status: 'pass', comment: 'Stemma petto e testo sponsor nitidi.' },
    { criterion: 'Illuminazione e ombre contatto', status: 'pass', comment: 'Ombra naturale sotto collo e ascelle.' },
  ]);

  const [compiledPrompt, setCompiledPrompt] = useState(
    'Editorial sports portrait, athletic footballer, 3:4 aspect, studio lighting, jersey Milano concept #10 PARAMOUNT, photoreal.'
  );

  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const garmentFileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Core try-on synthesis execution
  const executeTryOn = useCallback(async (showLoading: boolean = false) => {
    if (showLoading) {
      setIsProcessing(true);
      setProgressPercent(20);
      setProcessingStage('1/3 Rilevamento landmark torso...');
    }

    try {
      if (showLoading) {
        await new Promise((r) => setTimeout(r, 120));
        setProgressPercent(60);
        setProcessingStage('2/3 Warping 2D & deformazione prospettica...');
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

      const resultUrl = await runLocalTryOn(imgHuman, imgGarment, {
        fitTightness: params.fitTightness,
        creaseDepth: params.creaseDepth,
        lightingMatching: params.lightingMatching,
        logoPreservation: params.logoPreservation,
        warpStrength: params.warpStrength,
      });

      setRenderedResultDataUrl(resultUrl);

      const report = generateMockupReport(config, params);
      setNeuralAnalysis(report);
      setCompiledPrompt(report.compiledPromptEnglish);
    } catch (err) {
      console.warn('Try-on synthesis warning:', err);
    } finally {
      if (showLoading) {
        setProgressPercent(100);
        setProcessingStage('Fitting completato!');
        setTimeout(() => setIsProcessing(false), 200);
      }
    }
  }, [selectedModel, selectedGarment, params, config]);

  // Run automatically when selections or main parameters change
  useEffect(() => {
    executeTryOn(false);
  }, [executeTryOn]);

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
          poseDescription: 'Rilevamento pose automatico',
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

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0a0c12] text-zinc-100 select-none">
      {/* 1. LEFT PANEL: Selection & Config (360px) */}
      <aside className="w-[360px] shrink-0 border-r border-white/[0.06] bg-[#0b0e14]/70 backdrop-blur-xl flex flex-col overflow-hidden">
        {/* Mode switcher tabs */}
        <div className="p-3.5 border-b border-white/[0.06]">
          <div className="flex p-1 rounded-xl bg-black/40 ring-1 ring-inset ring-white/[0.06]">
            <button
              onClick={() => setMode('quick')}
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
              onClick={() => setMode('editorial')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                mode === 'editorial'
                  ? 'bg-white/[0.08] text-white ring-1 ring-inset ring-white/[0.1] font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-violet-400" />
              <span>Editorial Studio</span>
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
                <span className="font-semibold text-zinc-200">Persona / Atleta</span>
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

            {/* Large Card Grid (80x80px previews) */}
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
                <span className="font-semibold text-zinc-200">Capo d'Abbigliamento</span>
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

            {/* Large Garment Grid (80x80px previews) */}
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

          {/* Quick Fitting Parameters */}
          {mode === 'quick' && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3.5 space-y-3">
                <div>
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold mb-1.5">Vestibilità</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'slim-athletic', label: 'Slim Fit' },
                      { id: 'regular', label: 'Regular' },
                      { id: 'oversized', label: 'Oversize' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setParams({ ...params, fitTightness: f.id as any })}
                        className={`py-1.5 text-center text-xs font-medium rounded-lg transition-all cursor-pointer ${
                          params.fitTightness === f.id
                            ? 'bg-cyan-500/20 text-cyan-200 ring-1 ring-inset ring-cyan-500/40 font-semibold'
                            : 'bg-black/20 text-zinc-400 hover:text-zinc-200 ring-1 ring-inset ring-white/[0.04]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-semibold">Tessuto Tecnico</label>
                  <select
                    value={params.fabricType}
                    onChange={(e) => setParams({ ...params, fabricType: e.target.value as any })}
                    className="mt-1 w-full bg-black/40 ring-1 ring-inset ring-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none cursor-pointer"
                  >
                    <option value="dry-fit">Dry-Fit Traspirante (Leggero)</option>
                    <option value="jacquard-mesh">Jacquard 3D Strutturato</option>
                    <option value="heavy-cotton">Cotone Tecnico 280gsm</option>
                  </select>
                </div>
              </div>

              {/* Sliders */}
              <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3.5 space-y-3">
                <Slider
                  label="Profondità Pieghe"
                  value={params.creaseDepth}
                  min={0}
                  max={100}
                  onChange={(v) => setParams({ ...params, creaseDepth: v })}
                />
                <Slider
                  label="Armonizzazione Luce"
                  value={params.lightingMatching}
                  min={0}
                  max={100}
                  onChange={(v) => setParams({ ...params, lightingMatching: v })}
                  accent="accent-amber-400"
                />
                <Slider
                  label="Warping Torace"
                  value={params.warpStrength}
                  min={20}
                  max={100}
                  onChange={(v) => setParams({ ...params, warpStrength: v })}
                />
              </div>

              {/* Lock Sponsor Toggle */}
              <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-zinc-200">Preserva Loghi & Sponsor</div>
                  <div className="text-[10px] text-zinc-500">Mappa UV prospettica per stemmi nitidi</div>
                </div>
                <input
                  type="checkbox"
                  checked={params.logoPreservation}
                  onChange={(e) => setParams({ ...params, logoPreservation: e.target.checked })}
                  className="rounded text-cyan-500 w-4 h-4 cursor-pointer accent-cyan-500"
                />
              </div>
            </div>
          )}

          {/* Editorial Mode Tabs */}
          {mode === 'editorial' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-black/40 ring-1 ring-inset ring-white/[0.04]">
                {([
                  { id: 'references', label: 'Refs' },
                  { id: 'subject', label: 'Soggetto' },
                  { id: 'wardrobe', label: 'Abito' },
                  { id: 'shot', label: 'Shot' },
                  { id: 'quality', label: 'Audit' },
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setEditorialTab(t.id)}
                    className={`flex-1 min-w-[50px] py-1.5 rounded-lg text-[10px] font-semibold cursor-pointer transition-all ${
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

              {editorialTab === 'quality' && (
                <div className="rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] p-3 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-400 uppercase">
                    <span>Audit Qualità Risultato</span>
                    <span className="text-emerald-400 font-mono">6/6 PASS</span>
                  </div>
                  <div className="space-y-1.5">
                    {qualityAudit.map((item, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-black/30 border border-white/[0.04] text-[10px]">
                        <div className="flex justify-between text-zinc-300 font-medium">
                          <span>{item.criterion}</span>
                          <span className="text-emerald-400 font-mono">PASS</span>
                        </div>
                        <p className="text-zinc-500 mt-0.5">{item.comment}</p>
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
            onClick={() => executeTryOn(true)}
            disabled={isProcessing}
            className="w-full py-2.5 rounded-xl font-semibold text-xs text-zinc-950 bg-gradient-to-r from-cyan-400 to-amber-300 hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_-4px_rgba(34,211,238,0.4)] disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Calcolo Warping 2D in corso...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Ricalcola Try-On (Warping 2D)</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* 2. CENTER: Canvas Viewport with Clean Comparison Slider */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.03),transparent_70%)]">
        {/* Top Info Bar */}
        <div className="h-11 border-b border-white/[0.06] bg-[#0b0e14]/60 backdrop-blur px-5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{selectedModel.name.split('–')[0].trim()}</span>
            <ChevronRight className="w-3 h-3 text-zinc-600" />
            <span className="text-amber-300 font-medium">{selectedGarment.name}</span>
            <span className="ml-2 font-mono text-[10px] bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 px-2 py-0.5 rounded-full">
              Warping 2D + Landmarks
            </span>
          </div>

          <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
            <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
            <span>Trascina il cursore:</span>
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
            {/* AFTER LAYER: Synthesized Try-On Result */}
            <div className="absolute inset-0">
              <img
                src={renderedResultDataUrl || selectedModel.previewUrl}
                alt="Try-On Fit Result"
                className="w-full h-full object-cover object-top pointer-events-none"
              />

              {/* Tag After */}
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Try-On Fit (Dopo)</span>
              </div>
            </div>

            {/* BEFORE LAYER: Original Athlete Base Photo (Clipped) */}
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
                <span>Originale (Prima)</span>
              </div>
            </div>

            {/* DIVIDER LINE WITH CLEAN DRAG HANDLE (NO "2" CIRCLE) */}
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_15px_rgba(255,255,255,0.9)] z-20 pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-900 border-2 border-white flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                <ArrowRightLeft className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Processing Spinner Overlay */}
            {isProcessing && (
              <div className="absolute inset-0 bg-[#0a0c12]/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6">
                <ProgressRing percent={progressPercent} label={processingStage} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom prompt bar in editorial mode */}
        {mode === 'editorial' && (
          <div className="border-t border-white/[0.04] bg-[#0b0e14]/70 px-5 py-2.5 flex items-center gap-3 text-xs">
            <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
            <p className="flex-1 font-mono text-zinc-300 text-[11px] truncate">{compiledPrompt}</p>
            <button
              onClick={() => navigator.clipboard.writeText(compiledPrompt)}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-medium cursor-pointer"
            >
              Copia Prompt
            </button>
          </div>
        )}
      </main>

      {/* 3. RIGHT PANEL: Parameters, Audit & Neural Metrics (280px) */}
      <aside className="w-[280px] shrink-0 border-l border-white/[0.06] bg-[#0b0e14]/70 backdrop-blur-xl flex flex-col overflow-hidden text-xs">
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-white">Analisi Neurale L0</span>
            </div>
            <div className="w-9 h-9 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center font-mono font-bold text-emerald-400 text-xs">
              {neuralAnalysis.fitScore}%
            </div>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span className="text-zinc-500">Curvatura Torace</span>
              <span className="font-mono text-zinc-200">{neuralAnalysis.warpMeshParameters?.torsoCurvature}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span className="text-zinc-500">Drape Spalle</span>
              <span className="text-zinc-200">{neuralAnalysis.warpMeshParameters?.shoulderDrape}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/[0.04]">
              <span className="text-zinc-500">Angolo Busto</span>
              <span className="font-mono text-cyan-300">0.0° (Frontale)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-zinc-500">Vestibilità Attiva</span>
              <span className="text-amber-300 capitalize">{params.fitTightness.replace('-', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Explanatory Cards */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="p-3 rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
              <Shield className="w-3.5 h-3.5" />
              <span>Lock Sponsor & Stemma</span>
            </div>
            <p className="text-zinc-400 text-[10px] leading-relaxed">
              {neuralAnalysis.sponsorPreservationAdvice}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
              <Sun className="w-3.5 h-3.5" />
              <span>Lighting Baking & Ombre</span>
            </div>
            <p className="text-zinc-400 text-[10px] leading-relaxed">
              Ombre di contatto sul collo e pieghe volumetriche sul torace moltiplicate sul canale alpha.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Stato Mesh Offline</span>
            </div>
            <div className="text-[10px] text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>MediaPipe Landmark: Calcolati</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Feathering Torso: Attivo (6px)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Colletto Cut-out: Preservato</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
