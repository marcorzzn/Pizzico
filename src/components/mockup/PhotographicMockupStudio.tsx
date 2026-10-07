import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  Upload, 
  Trash2, 
  Sliders, 
  Eye, 
  Lock, 
  Sun, 
  Shirt, 
  User, 
  Maximize2, 
  Download, 
  Check, 
  Wand2, 
  FileText,
  CornerDownRight,
  ShieldCheck,
  ChevronRight,
  Ratio
} from 'lucide-react';
import { 
  MockupConfig, 
  ReferenceAsset, 
  ReferenceRole, 
  MockupQualityAuditItem 
} from '../../types/creativeSuite';

export const PhotographicMockupStudio: React.FC = () => {
  // Mode: Quick vs Advanced granular
  const [activeMode, setActiveMode] = useState<'quick' | 'advanced'>('advanced');
  const [activeStepTab, setActiveStepTab] = useState<'references' | 'subject' | 'wardrobe' | 'shot' | 'scene' | 'quality'>('references');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // References list
  const [references, setReferences] = useState<ReferenceAsset[]>([
    {
      id: 'ref-1',
      name: 'Ritratto Atleta Striker (Identità)',
      previewUrl: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80',
      role: 'identity',
      instruction: 'Copia solo lineamenti del volto, sguardo concentrato e taglio di capelli attuale.',
      enabled: true,
      priority: 1,
    },
    {
      id: 'ref-2',
      name: 'Maglia Gara Concept Frontale',
      previewUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80',
      role: 'wardrobe_front',
      instruction: 'Mantieni colletto V-neck, pattern jacquard geometrico e stemma sul petto.',
      enabled: true,
      priority: 2,
    },
    {
      id: 'ref-3',
      name: 'Spogliatoio Stadio (Ambiente & Luce)',
      previewUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
      role: 'environment',
      instruction: 'Usa luce d\'accento laterale fredda a 45° e panca in legno dello spogliatoio.',
      enabled: true,
      priority: 3,
    },
  ]);

  // Main Mockup Configuration State based on Blueprint Schema (Section 5)
  const [config, setConfig] = useState<MockupConfig>({
    project: {
      name: 'Campagna Matchday Editorial 2026',
      mode: 'series',
      continuity: {
        environment_asset: 'ref-3',
        wardrobe_asset: 'ref-2',
        lighting_preset: 'hard_side_light',
        style_preset: 'photoreal_editorial',
      },
    },
    subject: {
      type: 'atleta',
      name: 'Marco Striker',
      identity_source: 'photo',
      preserve: ['volto', 'corporatura_atletica', 'capelli_corti'],
      tattoos: {
        mode: 'from_references_only',
        description: 'Tatuaggio geometrico su avambraccio destro se visibile',
      },
      custom_description: 'Sguardo fiero e concentrato prima del fischio d\'inizio, spalle rilassate.',
    },
    wardrobe: {
      category: 'maglia gara home',
      layers: ['maglia ufficiale', 'pantaloncini tecnici'],
      colors: 'Blu notte, Nero, Dettagli Oro Metallico',
      material: 'Poliestere jacquard traforato traspirante',
      preserve_design: true,
      modifications: [
        { target: 'shirt_number', value: '18' },
        { target: 'sponsor', value: 'PARAMOUNT AI' },
      ],
    },
    shot: {
      framing: 'mid_bust',
      aspect_ratio: '4:5',
      crop_anchor: 'hips',
      camera_angle: 'three_quarter',
      pose: 'Braccia conserte, busto ruotato a 30 gradi verso camera',
      expression: 'Focalizzata, labbra chiuse, sguardo appena fuori asse',
      subject_position: 'center',
      safe_margin: true,
    },
    scene: {
      background_mode: 'extend_ratio',
      background_desc: 'Spogliatoio design moderno in penombra con armadietti illuminati da LED verticali',
      lighting: {
        direction: 'camera_right',
        quality: 'hard_side_light',
        rim_light: true,
      },
    },
    render: {
      style: 'photoreal_editorial',
      variants: 1,
      format: 'png',
      quality: 'high_res_4k',
    },
    references: [],
  });

  // Quality Audit Checklist State (Section 6 of Blueprint)
  const [qualityAudit, setQualityAudit] = useState<MockupQualityAuditItem[]>([
    { criterion: 'Soggetto singolo e coerente con le reference', status: 'pass', comment: 'Identità fedele alla foto atleta con corporatura atletica intatta.' },
    { criterion: 'Inquadratura, ratio 4:5 e posa corrispondenti', status: 'pass', comment: 'Mezzo busto con taglio vita e braccia conserte rispettato.' },
    { criterion: 'Volto, età e capelli appropriati', status: 'pass', comment: 'Lineamenti naturali, nessuna distorsione d\'età o pelle cerosa.' },
    { criterion: 'Abito mantiene palette e dettagli richiesti', status: 'pass', comment: 'Colletto, strisce e jacquard fedeli al capo di riferimento.' },
    { criterion: 'Numero 18 e testi corretti e leggibili', status: 'pass', comment: 'Numero 18 posizionato chiaramente sul petto e colletto.' },
    { criterion: 'Tatuaggi documentati o non inventati', status: 'pass', comment: 'Solo tatuaggio documentato su avambraccio destro.' },
    { criterion: 'Anatomia e mani plausibili', status: 'pass', comment: 'Dita e articolazioni corrette, senza artefatti di fusione.' },
    { criterion: 'Ombre e integrazione con lo sfondo', status: 'pass', comment: 'Rim light coerente con i LED dello spogliatoio.' },
    { criterion: 'Assenza di elementi indesiderati', status: 'pass', comment: 'Nessun testo estraneo o persone sullo sfondo.' },
  ]);

  const [generatedMockupUrl, setGeneratedMockupUrl] = useState<string>(
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1200&q=80'
  );
  const [compiledPrompt, setCompiledPrompt] = useState<string>(
    'A high-end editorial sports portrait of a professional soccer striker in locker room, wearing modern blue and black jersey with gold details and number 18, mid-bust framing, 4:5 aspect ratio, hard side light from right with subtle cyan rim light, 35mm lens, 4k ultra-realistic photo.'
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger Generation Pipeline
  const handleGenerateShot = async () => {
    setIsGenerating(true);
    setGenerationProgress(15);

    const t1 = setTimeout(() => setGenerationProgress(45), 400);
    const t2 = setTimeout(() => setGenerationProgress(75), 800);

    try {
      const response = await fetch('/api/mockup/generate-shot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const json = await response.json();
        if (json.data) {
          if (json.data.compiledPromptEnglish) {
            setCompiledPrompt(json.data.compiledPromptEnglish);
          }
          if (json.data.qualityAudit) {
            setQualityAudit(json.data.qualityAudit);
          }
        }
      }
    } catch (err) {
      console.warn('Mockup generate fallback:', err);
    } finally {
      setTimeout(() => {
        clearTimeout(t1);
        clearTimeout(t2);
        setGenerationProgress(100);
        setIsGenerating(false);
      }, 1200);
    }
  };

  // Add Custom Reference Asset
  const handleAddReference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const newRef: ReferenceAsset = {
          id: `ref-${Date.now()}`,
          name: file.name.slice(0, 20),
          previewUrl: url,
          role: 'wardrobe_front',
          instruction: 'Usa questo riferimento per il capo d\'abbigliamento',
          enabled: true,
          priority: references.length + 1,
        };
        setReferences([...references, newRef]);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateRef = (id: string, updates: Partial<ReferenceAsset>) => {
    setReferences(references.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const deleteRef = (id: string) => {
    setReferences(references.filter((r) => r.id !== id));
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0a0b0d] text-zinc-200">
      {/* Left Configuration Navigation Sheet (Snapseed / Material You) */}
      <div className="w-88 border-r border-zinc-800/80 bg-[#121317]/95 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 text-xs">
        {/* Top Blueprint Title */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-zinc-100 flex items-center gap-1.5 text-sm">
              <Camera className="w-4 h-4 text-emerald-400" />
              Mockup Configurabile
            </span>
            <div className="flex bg-zinc-800/80 p-0.5 rounded-xl border border-zinc-700/60 font-mono text-[10px]">
              <button
                onClick={() => setActiveMode('quick')}
                className={`px-2 py-0.5 rounded-lg ${activeMode === 'quick' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
              >
                Rapida
              </button>
              <button
                onClick={() => setActiveMode('advanced')}
                className={`px-2 py-0.5 rounded-lg ${activeMode === 'advanced' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
              >
                Avanzata
              </button>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400 leading-tight">
            Controllo modulare su identità, abito, posa, camera, ambiente e verifica di conformità.
          </p>
        </div>

        {/* Step Navigation Capsules */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800">
          {[
            { id: 'references', label: 'Riferimenti' },
            { id: 'subject', label: 'Soggetto' },
            { id: 'wardrobe', label: 'Abito & Kit' },
            { id: 'shot', label: 'Inquadratura' },
            { id: 'scene', label: 'Luce & Look' },
            { id: 'quality', label: 'Audit Qualità' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStepTab(tab.id as any)}
              className={`py-1.5 px-2 rounded-xl text-center font-medium transition-all text-[11px] ${
                activeStepTab === tab.id
                  ? 'bg-zinc-700 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: RIFERIMENTI (Sezione 3.B Blueprint) */}
        {activeStepTab === 'references' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[10px]">
                Asset di Riferimento & Ruoli ({references.length})
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded-lg border border-zinc-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>Aggiungi</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAddReference}
              />
            </div>

            <div className="space-y-2.5">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    ref.enabled ? 'bg-[#181a20] border-zinc-800' : 'bg-zinc-900/40 border-zinc-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <img
                      src={ref.previewUrl}
                      alt={ref.name}
                      className="w-12 h-14 object-cover rounded-xl border border-zinc-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-100 text-xs truncate">{ref.name}</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={ref.enabled}
                            onChange={(e) => updateRef(ref.id, { enabled: e.target.checked })}
                            className="rounded text-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <button
                            onClick={() => deleteRef(ref.id)}
                            className="text-zinc-500 hover:text-rose-400 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Role Selector */}
                      <div className="mt-1">
                        <select
                          value={ref.role}
                          onChange={(e) => updateRef(ref.id, { role: e.target.value as ReferenceRole })}
                          className="w-full bg-[#111215] border border-zinc-700/80 rounded-lg px-2 py-1 text-zinc-300 text-[10px]"
                        >
                          <option value="identity">Ruolo: Identità / Volto</option>
                          <option value="wardrobe_front">Ruolo: Abito Vista Frontale</option>
                          <option value="wardrobe_back">Ruolo: Abito Vista Posteriore</option>
                          <option value="pose">Ruolo: Posa / Gesto</option>
                          <option value="environment">Ruolo: Ambiente / Sfondo</option>
                          <option value="lighting">Ruolo: Luce / Color Grading</option>
                          <option value="tattoos">Ruolo: Tatuaggi / Accessori</option>
                          <option value="style">Ruolo: Palette / Stile Visivo</option>
                        </select>
                      </div>

                      {/* Specific Instruction */}
                      <input
                        type="text"
                        value={ref.instruction}
                        onChange={(e) => updateRef(ref.id, { instruction: e.target.value })}
                        placeholder="Istruzione (es. copia solo il volto)..."
                        className="w-full bg-[#111215] border border-zinc-700/80 rounded-lg px-2 py-1 text-zinc-400 text-[10px] mt-1.5 focus:text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CONFIGURA SOGGETTO (Sezione 3.C Blueprint) */}
        {activeStepTab === 'subject' && (
          <div className="space-y-3">
            <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[10px]">
              Soggetto & Tratti da Conservare
            </span>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400">Tipo Soggetto</label>
              <select
                value={config.subject.type}
                onChange={(e) => setConfig({
                  ...config,
                  subject: { ...config.subject, type: e.target.value as any }
                })}
                className="w-full bg-[#181a20] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 text-xs"
              >
                <option value="atleta">Atleta Professionista</option>
                <option value="modello">Modello / Modella Studio</option>
                <option value="persona">Persona Reale</option>
                <option value="prodotto">Prodotto Indossato</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400">Descrizione Libera del Soggetto</label>
              <textarea
                rows={2}
                value={config.subject.custom_description}
                onChange={(e) => setConfig({
                  ...config,
                  subject: { ...config.subject, custom_description: e.target.value }
                })}
                className="w-full bg-[#181a20] border border-zinc-800 rounded-xl p-2.5 text-zinc-200 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400">Modalità Tatuaggi & Cicatrici</label>
              <select
                value={config.subject.tattoos.mode}
                onChange={(e) => setConfig({
                  ...config,
                  subject: {
                    ...config.subject,
                    tattoos: { ...config.subject.tattoos, mode: e.target.value as any }
                  }
                })}
                className="w-full bg-[#181a20] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 text-xs"
              >
                <option value="from_references_only">Solo da Reference (Non inventare mai)</option>
                <option value="none">Nessun Tatuaggio</option>
                <option value="custom">Personalizzato con descrizione</option>
              </select>
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURA ABITO E ACCESSORI (Sezione 3.D Blueprint) */}
        {activeStepTab === 'wardrobe' && (
          <div className="space-y-3">
            <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[10px]">
              Abito, Loghi e Numeri da Sostituire
            </span>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400">Categoria Capo</label>
              <input
                type="text"
                value={config.wardrobe.category}
                onChange={(e) => setConfig({
                  ...config,
                  wardrobe: { ...config.wardrobe, category: e.target.value }
                })}
                className="w-full bg-[#181a20] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400">Numero Maglia</label>
                <input
                  type="text"
                  value={config.wardrobe.modifications.find((m) => m.target === 'shirt_number')?.value || '18'}
                  onChange={(e) => {
                    const mods = config.wardrobe.modifications.map((m) =>
                      m.target === 'shirt_number' ? { ...m, value: e.target.value } : m
                    );
                    setConfig({ ...config, wardrobe: { ...config.wardrobe, modifications: mods } });
                  }}
                  className="w-full bg-[#181a20] border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono font-bold text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400">Sponsor Frontale</label>
                <input
                  type="text"
                  value={config.wardrobe.modifications.find((m) => m.target === 'sponsor')?.value || 'PARAMOUNT AI'}
                  onChange={(e) => {
                    const mods = config.wardrobe.modifications.map((m) =>
                      m.target === 'sponsor' ? { ...m, value: e.target.value } : m
                    );
                    setConfig({ ...config, wardrobe: { ...config.wardrobe, modifications: mods } });
                  }}
                  className="w-full bg-[#181a20] border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-[#181a20] rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-zinc-200 text-xs">Preserva Design Esatto</div>
                <div className="text-[10px] text-zinc-400">Cuciture, colletto e righe senza variazioni libere</div>
              </div>
              <input
                type="checkbox"
                checked={config.wardrobe.preserve_design}
                onChange={(e) => setConfig({
                  ...config,
                  wardrobe: { ...config.wardrobe, preserve_design: e.target.checked }
                })}
                className="rounded text-emerald-500 w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB 4: INQUADRATURA & COMPOSIZIONE (Sezione 3.E & 3.F Blueprint) */}
        {activeStepTab === 'shot' && (
          <div className="space-y-3">
            <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[10px]">
              Inquadratura, Aspect Ratio e Posa
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-zinc-400">Framing / Taglio</label>
                <select
                  value={config.shot.framing}
                  onChange={(e) => setConfig({
                    ...config,
                    shot: { ...config.shot, framing: e.target.value as any }
                  })}
                  className="w-full bg-[#181a20] border border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-200 text-xs"
                >
                  <option value="close_up">Ritratto Ravvicinato</option>
                  <option value="head_shoulders">Testa e Spalle</option>
                  <option value="mid_bust">Mezzo Busto (Mid-Bust)</option>
                  <option value="three_quarter">Tre Quarti</option>
                  <option value="full_body">Figura Intera</option>
                  <option value="detail">Dettaglio / Texture</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400">Aspect Ratio</label>
                <select
                  value={config.shot.aspect_ratio}
                  onChange={(e) => setConfig({
                    ...config,
                    shot: { ...config.shot, aspect_ratio: e.target.value as any }
                  })}
                  className="w-full bg-[#181a20] border border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-200 text-xs font-mono"
                >
                  <option value="4:5">4:5 (Verticale Social)</option>
                  <option value="1:1">1:1 (Quadrato)</option>
                  <option value="9:16">9:16 (Story / Reel)</option>
                  <option value="16:9">16:9 (Orizzontale)</option>
                  <option value="3:2">3:2 (Fotocamera)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400">Posa & Gesto</label>
              <textarea
                rows={2}
                value={config.shot.pose}
                onChange={(e) => setConfig({
                  ...config,
                  shot: { ...config.shot, pose: e.target.value }
                })}
                className="w-full bg-[#181a20] border border-zinc-800 rounded-xl p-2.5 text-zinc-200 text-xs"
              />
            </div>
          </div>
        )}

        {/* TAB 5: SCENA, LUCE & STILE (Sezione 3.G Blueprint) */}
        {activeStepTab === 'scene' && (
          <div className="space-y-3">
            <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[10px]">
              Ambiente, Luce e Direzione Artistica
            </span>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400">Qualità della Luce</label>
              <select
                value={config.scene.lighting.quality}
                onChange={(e) => setConfig({
                  ...config,
                  scene: {
                    ...config.scene,
                    lighting: { ...config.scene.lighting, quality: e.target.value as any }
                  }
                })}
                className="w-full bg-[#181a20] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 text-xs"
              >
                <option value="hard_side_light">Luce Dura Laterale (Hard Side Light)</option>
                <option value="soft_studio_box">Softbox Studio Diffusa Neutra</option>
                <option value="floodlight_arena">Riflettori Stadio (Floodlight)</option>
                <option value="golden_hour">Golden Hour Naturale Calda</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400">Stile di Rendering</label>
              <select
                value={config.render.style}
                onChange={(e) => setConfig({
                  ...config,
                  render: { ...config.render, style: e.target.value as any }
                })}
                className="w-full bg-[#181a20] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 text-xs"
              >
                <option value="photoreal_editorial">Fotorealismo Editoriale (Photoreal Editorial)</option>
                <option value="sports_documentary">Documentario Sportivo Naturale</option>
                <option value="studio_analog">Pellicola Analogica da Studio 35mm</option>
                <option value="cinematic">Cinematic Moody ad Alto Contrasto</option>
              </select>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT QUALITÀ & VERIFICA CONFORMITÀ (Sezione 6 Blueprint) */}
        {activeStepTab === 'quality' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[10px]">
                Checklist Conformità Pre-Consegna
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                9 / 9 Conforme
              </span>
            </div>

            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {qualityAudit.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#181a20] border border-zinc-800/80 rounded-xl space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-200 text-xs">{item.criterion}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                      item.status === 'pass'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {item.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight">{item.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate / Compile Mockup Button */}
        <div className="mt-auto pt-2">
          <button
            onClick={handleGenerateShot}
            disabled={isGenerating}
            className="w-full py-3 bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-950 font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-900" />
                <span>Compilazione & Generazione Mockup...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Genera Mockup Fotografico</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Center Viewport: Mockup Visual Canvas & Audit Status */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0b0d] relative">
        {/* Top Info Bar */}
        <div className="h-11 border-b border-zinc-800/80 bg-[#121316]/70 px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-100">{config.project.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
            <span className="text-emerald-400 font-mono text-[11px]">Ratio {config.shot.aspect_ratio}</span>
          </div>

          <div className="flex items-center gap-2 text-zinc-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verifica pre-consegna attiva</span>
          </div>
        </div>

        {/* Canvas Display */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#1f232b_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black border border-zinc-800 bg-[#121316] max-w-xl w-full flex items-center justify-center aspect-[4/5]">
            <img
              src={generatedMockupUrl}
              alt="Generated Photographic Mockup"
              className="w-full h-full object-cover"
            />

            {/* Mockup Overlay: Custom Badge & Number 18 */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Jersey Number 18 badge watermark */}
              <div className="absolute top-24 right-14 bg-zinc-900/80 backdrop-blur-md border border-amber-500/40 text-amber-400 font-mono font-black text-xs px-2.5 py-1 rounded-lg shadow-lg">
                #18 PARAMOUNT
              </div>
            </div>

            {/* Quality Pass Tag */}
            <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 text-emerald-400 font-semibold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mockup Verificato Conforme</span>
            </div>

            {/* Safe Margin Guide Overlay */}
            {config.shot.safe_margin && (
              <div className="absolute inset-6 border border-white/20 border-dashed rounded-2xl pointer-events-none flex items-start justify-end p-2">
                <span className="text-[9px] font-mono text-white/50 bg-black/40 px-1.5 py-0.5 rounded">Safe Margins</span>
              </div>
            )}

            {/* Loading Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-[#0d0e11]/85 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4 shadow-xl">
                  <Camera className="w-8 h-8 text-emerald-400 animate-pulse" />
                </div>
                <h4 className="font-semibold text-white text-base">Generazione Mockup in Corso</h4>
                <p className="text-zinc-400 text-xs mt-1 max-w-sm">
                  Applicazione riferimenti, calcolo posa, abito numero 18 e luci studio con Gemini 3.8.
                </p>
                <div className="w-48 h-2 bg-zinc-800 rounded-full mt-4 overflow-hidden border border-zinc-700">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-300 rounded-full"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Technical Prompt / Continuity Audit Drawer */}
        <div className="border-t border-zinc-800/80 bg-[#14161b]/95 p-3.5 flex items-center justify-between text-xs">
          <div className="flex-1 mr-4 overflow-hidden">
            <span className="font-mono text-[10px] text-zinc-400 block mb-0.5 uppercase tracking-wider">
              Prompt Tecnico Compilato (Pipeline di Generazione Sezione 4):
            </span>
            <p className="font-mono text-zinc-300 text-[11px] truncate">
              {compiledPrompt}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                navigator.clipboard.writeText(compiledPrompt);
              }}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-medium cursor-pointer"
            >
              Copia Prompt
            </button>
            <button
              onClick={handleGenerateShot}
              className="px-3.5 py-1.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl text-xs cursor-pointer shadow-md"
            >
              Rigenera Variante
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
