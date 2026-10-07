import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Palette, 
  Wand2, 
  Maximize2, 
  Check, 
  Copy, 
  RefreshCw, 
  Layers, 
  Shield, 
  ArrowRight,
  Sliders,
  Type
} from 'lucide-react';
import { VectorShape } from '../../types/creativeSuite';
import { localAI } from '../../services/localAI';
import { generateVectorConcept, generateRecolorPalettes } from '../../services/proceduralGenerators';

interface AIGenerativeStudioProps {
  onImportGeneratedVector: (shapes: VectorShape[]) => void;
}

export const AIGenerativeStudio: React.FC<AIGenerativeStudioProps> = ({
  onImportGeneratedVector,
}) => {
  const [activeTab, setActiveTab] = useState<'textToVector' | 'recolor' | 'upscale' | 'inpaint'>('textToVector');
  const [prompt, setPrompt] = useState('Scudo araldico moderno per club calcistico con ali dorate e monogramma');
  const [style, setStyle] = useState('Geometrico Moderno');
  const [colors, setColors] = useState('Navy Blue, Gold PMS 871 C, White');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(() => generateVectorConcept(
    'Scudo araldico moderno per club calcistico con ali dorate e monogramma',
    'Geometrico Moderno',
    'Navy Blue, Gold PMS 871 C, White'
  ));

  const [copiedCode, setCopiedCode] = useState(false);
  const [recolorPalettes, setRecolorPalettes] = useState<any[]>([]);

  // Generate Vector Concept via Local AI or Deterministic L0 Procedural Engine
  const handleGenerateVector = async () => {
    setIsLoading(true);
    try {
      const result = await localAI.generateJSON(
        `Crea un logo vettoriale per: "${prompt}". Stile: ${style}. Colori: ${colors}.
Rispondi con JSON: { "title": string, "conceptDescription": string, "colorPalette": array, "geometryBreakdown": array, "typographySuggestion": object, "svgSnippet": string }`,
        '{ "title": string, "conceptDescription": string, "colorPalette": array, "geometryBreakdown": array, "typographySuggestion": object, "svgSnippet": string }',
        () => generateVectorConcept(prompt, style, colors)
      );
      setGeneratedResult(result);
    } catch (err) {
      console.warn('Vector generation fallback:', err);
      setGeneratedResult(generateVectorConcept(prompt, style, colors));
    } finally {
      setIsLoading(false);
    }
  };

  // Recolor palette generation via Local AI / L0 Procedural Engine
  const handleGenerateRecolor = async () => {
    setIsLoading(true);
    try {
      const result = await localAI.generateJSON(
        `Genera 4 armonie cromatiche professionali per mood: Luxury Sports Heritage.`,
        '{ "palettes": array }',
        () => generateRecolorPalettes(['#0A192F', '#D4AF37', '#06B6D4'], 'Luxury')
      );
      if (result.palettes) {
        setRecolorPalettes(result.palettes);
      }
    } catch (err) {
      setRecolorPalettes(generateRecolorPalettes(['#0A192F', '#D4AF37', '#06B6D4'], 'Luxury').palettes);
    } finally {
      setIsLoading(false);
    }
  };

  // Send generated concept directly to Vector Studio
  const handlePushToVectorStudio = () => {
    const newShapes: VectorShape[] = [
      {
        id: `gen-shield-${Date.now()}`,
        type: 'shield',
        name: generatedResult.title || 'Scudo AI Generato',
        x: 170,
        y: 110,
        width: 200,
        height: 240,
        fill: generatedResult.colorPalette?.[0]?.hex || '#0A192F',
        stroke: generatedResult.colorPalette?.[1]?.hex || '#D4AF37',
        strokeWidth: 6,
        opacity: 1,
        rotation: 0,
        livePathEffect: 'none',
      },
      {
        id: `gen-star-${Date.now()}`,
        type: 'star',
        name: 'Stella Vittoria AI',
        x: 270,
        y: 70,
        width: 36,
        height: 36,
        fill: generatedResult.colorPalette?.[1]?.hex || '#D4AF37',
        stroke: '#B45309',
        strokeWidth: 2,
        opacity: 1,
        rotation: 0,
        livePathEffect: 'none',
      },
      {
        id: `gen-text-${Date.now()}`,
        type: 'text',
        name: 'Monogramma AI',
        text: generatedResult.title?.split(' ')[0] || 'CLUB',
        x: 270,
        y: 220,
        width: 180,
        height: 36,
        fill: '#FFFFFF',
        stroke: 'none',
        strokeWidth: 0,
        opacity: 1,
        rotation: 0,
        fontSize: 26,
        fontFamily: generatedResult.typographySuggestion?.fontFamily || 'Plus Jakarta Sans',
        letterSpacing: 4,
        livePathEffect: 'none',
      },
    ];

    onImportGeneratedVector(newShapes);
  };

  const copySvg = () => {
    if (generatedResult?.svgSnippet) {
      navigator.clipboard.writeText(generatedResult.svgSnippet);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-200">
      {/* Left AI Tool Navigation */}
      <div className="w-16 border-r border-slate-800 bg-slate-900/60 p-2 flex flex-col items-center gap-2 shrink-0 select-none">
        <button
          onClick={() => setActiveTab('textToVector')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTab === 'textToVector'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Text to Vector Graphic (Logo & Badge SVG)"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
        </button>

        <button
          onClick={() => setActiveTab('recolor')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTab === 'recolor'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Generative Recolor (Palette Armoniche)"
        >
          <Palette className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTab('upscale')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTab === 'upscale'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="AI Upscale & Super-Resolution (2x / 4x)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => setActiveTab('inpaint')}
          className={`p-2.5 rounded-xl transition-all ${
            activeTab === 'inpaint'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="AI Replace & Inpainting con Maschera"
        >
          <Wand2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Workspace based on Tab */}
      <div className="flex-1 flex overflow-hidden">
        {/* TAB 1: TEXT TO VECTOR */}
        {activeTab === 'textToVector' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Input Form Column */}
            <div className="w-96 border-r border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-4 overflow-y-auto shrink-0 text-xs">
              <div>
                <h3 className="font-semibold text-white tracking-tight text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Text to Vector Graphic
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Generazione parametrica di loghi vettoriali e stemmi SVG con Gemini 3.8 Flash
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Prompt Descrittivo</label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Descrivi il logo (es. Scudo geometrico minimale con testa di leone e linee cinetiche)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-indigo-500 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Stile Geometrico</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                >
                  <option value="Geometrico Moderno">Geometrico Moderno (Linee Pulite)</option>
                  <option value="Araldico Heritage">Araldico Heritage (Calcio Vintage & Scudetti)</option>
                  <option value="Cyberpunk Tech">Cyberpunk Tech (Neon & Angoli Tagliati)</option>
                  <option value="Monogramma Tipografico">Monogramma Tipografico Astratto</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-semibold">Colori e Palette Guida</label>
                <input
                  type="text"
                  value={colors}
                  onChange={(e) => setColors(e.target.value)}
                  placeholder="es. Midnight Blue, Oro Metallico, Bianco"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs"
                />
              </div>

              <button
                onClick={handleGenerateVector}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-amber-600 hover:from-indigo-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Elaborazione Vettoriale con Gemini...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-amber-300" />
                    <span>Genera Concept Vettoriale</span>
                  </>
                )}
              </button>

              {/* Sample Prompts */}
              <div className="pt-2">
                <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1.5">
                  Idee Veloci (Preset)
                </label>
                <div className="space-y-1.5">
                  {[
                    'Stemma minimale con aquila e cerchio aureo',
                    'Logo scudo calcio con strisce e corona tricolore',
                    'Monogramma cyberpunk "X" per techwear brand',
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPrompt(preset)}
                      className="w-full text-left p-2 bg-slate-950/70 border border-slate-800 hover:border-indigo-500 rounded-lg text-slate-300 hover:text-white transition-colors"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated SVG & Concept Preview Center */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 p-6">
              {generatedResult ? (
                <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full gap-5">
                  {/* Result Header & Actions */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base">{generatedResult.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{generatedResult.conceptDescription}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={copySvg}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copiato!' : 'Copia SVG'}</span>
                      </button>

                      <button
                        onClick={handlePushToVectorStudio}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                      >
                        <span>Invia a Vector Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* SVG Render Box */}
                  <div className="h-96 rounded-2xl bg-slate-900/80 border border-slate-800 p-8 flex items-center justify-center shadow-2xl relative overflow-hidden">
                    <div className="w-72 h-72 flex items-center justify-center">
                      <div
                        dangerouslySetInnerHTML={{ __html: generatedResult.svgSnippet || '' }}
                        className="w-full h-full flex items-center justify-center"
                      />
                    </div>
                  </div>

                  {/* Metadata: Palette & Typography */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Palette */}
                    <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-2">
                      <span className="font-semibold text-slate-300 text-xs block uppercase tracking-wider">
                        Palette Armonica Estratta (Pantone / CMYK)
                      </span>
                      <div className="space-y-1.5">
                        {generatedResult.colorPalette?.map((c: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs p-1.5 bg-slate-950 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded" style={{ backgroundColor: c.hex }} />
                              <span className="font-medium text-white">{c.name}</span>
                            </div>
                            <span className="font-mono text-slate-400 text-[11px]">{c.pantone}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Typography Advice */}
                    <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-2">
                      <span className="font-semibold text-slate-300 text-xs block uppercase tracking-wider flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-indigo-400" />
                        Consigli Tipografici OpenType
                      </span>
                      <div className="text-xs text-slate-300 space-y-1">
                        <div>
                          <span className="text-slate-400">Font Consigliato:</span>{' '}
                          <span className="font-bold text-white">{generatedResult.typographySuggestion?.fontFamily}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Stile:</span> {generatedResult.typographySuggestion?.style}
                        </div>
                        <div className="text-[11px] text-amber-400/90 pt-1">
                          {generatedResult.typographySuggestion?.kerningAdvice}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  Nessun concept generato. Inserisci un prompt a sinistra per iniziare.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GENERATIVE RECOLOR */}
        {activeTab === 'recolor' && (
          <div className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-400" />
                  Generative Recolor (Adobe Firefly Style)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Genera istantaneamente combinazioni cromatiche alternative basate su mood e trend di mercato.
                </p>
              </div>

              <button
                onClick={handleGenerateRecolor}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Genera Nuove Armonie</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {(recolorPalettes.length > 0 ? recolorPalettes : [
                {
                  name: 'Cyberpunk Neon Velocity',
                  story: 'Contrasto elettrico per merchandising giovanile e streaming',
                  colors: [
                    { hex: '#0F172A', role: 'Sfondo', pantone: 'PMS Black 6 C' },
                    { hex: '#06B6D4', role: 'Primario', pantone: 'PMS 306 C' },
                    { hex: '#EC4899', role: 'Accento', pantone: 'PMS 806 C' },
                  ],
                },
                {
                  name: 'Heritage Azzurro Rinascimento',
                  story: 'Tonalità classiche nobili per maglie celebrative',
                  colors: [
                    { hex: '#0033A0', role: 'Primario', pantone: 'PMS 286 C' },
                    { hex: '#D4AF37', role: 'Accento Oro', pantone: 'PMS 871 C' },
                    { hex: '#F8FAFC', role: 'Testi', pantone: 'PMS White' },
                  ],
                },
                {
                  name: 'Monochrome Stealth Techwear',
                  story: 'Nero profondo opaco e grafite per kit da trasferta notturni',
                  colors: [
                    { hex: '#18181B', role: 'Base', pantone: 'PMS Neutral Black' },
                    { hex: '#3F3F46', role: 'Secondario', pantone: 'PMS 446 C' },
                    { hex: '#A1A1AA', role: 'Finitura', pantone: 'PMS Cool Gray 6 C' },
                  ],
                },
                {
                  name: 'Solar Sunset Racing',
                  story: 'Gradiente caldo ad alta visibilità per kit sportivi dinamici',
                  colors: [
                    { hex: '#DC2626', role: 'Rosso Corsa', pantone: 'PMS 186 C' },
                    { hex: '#F59E0B', role: 'Ambra Solare', pantone: 'PMS 137 C' },
                    { hex: '#111827', role: 'Contrasto', pantone: 'PMS Black' },
                  ],
                },
              ]).map((palette: any, idx: number) => (
                <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{palette.name}</span>
                    <span className="text-[10px] text-indigo-400 font-mono">Palette #{idx + 1}</span>
                  </div>
                  <p className="text-xs text-slate-400">{palette.story}</p>

                  <div className="flex h-12 rounded-xl overflow-hidden border border-slate-700/60">
                    {palette.colors?.map((col: any, cIdx: number) => (
                      <div
                        key={cIdx}
                        className="flex-1 flex items-end p-1.5"
                        style={{ backgroundColor: col.hex }}
                        title={`${col.role}: ${col.hex} (${col.pantone})`}
                      >
                        <span className="text-[9px] font-mono bg-black/60 text-white px-1 rounded backdrop-blur-sm">
                          {col.hex}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3 & 4: UPSCALE & INPAINTING */}
        {(activeTab === 'upscale' || activeTab === 'inpaint') && (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div className="max-w-md bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/40 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <h4 className="font-bold text-white text-base">
                {activeTab === 'upscale' ? 'AI Super-Resolution Upscaling (4K)' : 'AI Generative Fill & Inpaint'}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {activeTab === 'upscale'
                  ? 'Ricostruzione dettagli trame ad alta risoluzione con modelli Real-ESRGAN e Gemini Multimodal per stampe tipografiche 300 DPI.'
                  : 'Sostituzione selettiva di elementi su maschera (sponsor, colletti, grafiche) con coerenza volumetrica.'}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('textToVector')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                >
                  Ritorna a Text to Vector
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
