import React, { useState } from 'react';
import { 
  FileCode2, 
  Layers, 
  Cpu, 
  Network, 
  Table, 
  Calendar, 
  Users, 
  TrendingUp, 
  Code, 
  Play, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  Server,
  Smartphone,
  Monitor,
  Flame,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { SOFTWARE_COMPARISON, BLUEPRINT_ROADMAP } from '../../data/mockAssets';

export const BlueprintExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'documentModel' | 'comparison' | 'roadmap' | 'teamKpi' | 'scripting'>('architecture');
  const [selectedArchNode, setSelectedArchNode] = useState<string>('core-engine');
  const [scriptSnippet, setScriptSnippet] = useState<string>(`# Estensione Python / Inkscape Scripting Engine
# Generatore di Ruote Dentate & Ingranaggi per Loghi Sportivi
import math

def generate_gear(teeth=12, outer_radius=100, inner_radius=70):
    points = []
    angle_step = (2 * math.pi) / teeth
    for i in range(teeth):
        angle = i * angle_step
        # Vertici dente
        p1 = (outer_radius * math.cos(angle), outer_radius * math.sin(angle))
        p2 = (inner_radius * math.cos(angle + angle_step * 0.5), inner_radius * math.sin(angle + angle_step * 0.5))
        points.extend([p1, p2])
    return f"M {points[0][0]} {points[0][1]} " + " ".join([f"L {x} {y}" for x, y in points[1:]]) + " Z"

# Esecuzione nel Core C++/WASM
svg_path = generate_gear(teeth=16)
print(f"Path Bézier generato: {svg_path[:45]}...")
`);
  const [scriptOutput, setScriptOutput] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Architecture Nodes Info
  const ARCH_DETAILS: Record<string, { title: string; subtitle: string; tech: string; details: string[] }> = {
    'cross-ui': {
      title: 'UI Multipiattaforma Reattiva',
      subtitle: 'Flutter (Desktop/Mobile) & React + WebAssembly (Web)',
      tech: 'Flutter 3.x, React 19, TypeScript, Tailwind CSS, Skia Canvas',
      details: [
        'Interfaccia unificata senza duplicazione logica di business',
        'Integrazione a 60/120 fps su schermi Retina e ProMotion',
        'Controlli touch-first per mobile (gesture zoom, fluidifica) e scorciatoie da tastiera desktop (V, P, M, L)',
        'Comunicazione zero-copy con il Core Engine via FFI / WebAssembly memory sharing',
      ],
    },
    'core-engine': {
      title: 'Core Engine C++ / Rust',
      subtitle: 'Motore di calcolo nativo ad altissime prestazioni',
      tech: 'C++20, Rust, Skia Graphics Library, Blend2D, OpenCV, libvips, ONNX Runtime',
      details: [
        'Rendering hardware GPU-accelerato (DirectX, Metal, Vulkan, WebGPU)',
        'Motore vettoriale con curve di Bézier cubiche, nodi Spiro e calcolo booleano rapido (Clipper2)',
        'Motore raster multithread a 32-bit floating point per correzione colore senza banding',
        'Inferenza AI locale on-device per rimozione sfondo (U²-Net) e upscaling leggero',
      ],
    },
    'doc-model': {
      title: 'Modello di Documento Unificato (.ucs)',
      subtitle: 'Storage compatto transazionale e undo/redo infinito',
      tech: 'SQLite compresso / FlatBuffers binario con snapshot differenziali',
      details: [
        'Supporta contemporaneamente livelli raster, vettoriali, testo OpenType e maschere AI',
        'Profilazione colore incorporata (sRGB, Display P3, CMYK FOGRA39, Pantone)',
        'Command Pattern per Undo/Redo istantaneo senza overhead di memoria RAM',
        'Import/Export multipiattaforma: SVG, PDF/X, PSD con livelli, AI, EPS, DXF e PNG',
      ],
    },
    'vto-backend': {
      title: 'Backend AI & Virtual Try-On Pipeline',
      subtitle: 'Microservizio serverless e code GPU per carichi pesanti',
      tech: 'Python FastAPI, PyTorch, IDM-VTON, OOTDiffusion, Gemini 3.8 Flash, Replicate API',
      details: [
        'IDM-VTON per preservare loghi squadra, sponsor, pattern geometrici e colletti',
        'OOTDiffusion per il controllo di fitting half-body e full-body in posa dinamica',
        'Gemini 3.8 Flash per prompt-to-vector, armonie cromatiche Pantone e analisi volumetrica',
        'Code asincrone con webhook per rendering di serie (es. 50 maglie squadra in 2 minuti)',
      ],
    },
  };

  const handleRunScript = () => {
    setScriptOutput(
      `[PySandbox Engine OK]\n` +
      `Tracciato Bézier calcolato con successo: 16 denti.\n` +
      `Coordinate generate: M 100.0 0.0 L 64.67 26.78 L 92.38 38.26 L 39.42 58.07...\n` +
      `Tempo di esecuzione WASM: 1.42 ms\n` +
      `Asset pronto per l'iniezione nel canvas vettoriale.`
    );
  };

  const currentArch = ARCH_DETAILS[selectedArchNode] || ARCH_DETAILS['core-engine'];

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-200">
      {/* Blueprint Sub-navigation */}
      <div className="w-64 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-2 shrink-0 select-none text-xs">
        <div className="mb-2">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">
            Blueprint Master
          </span>
          <h2 className="font-bold text-white text-sm">Architettura & Specifiche</h2>
        </div>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
            activeTab === 'architecture'
              ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
              : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Network className="w-4 h-4 text-indigo-400" />
          <span>Diagramma Architetturale</span>
        </button>

        <button
          onClick={() => setActiveTab('documentModel')}
          className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
            activeTab === 'documentModel'
              ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
              : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
          }`}
        >
          <FileCode2 className="w-4 h-4 text-amber-400" />
          <span>Modello Documento (.ucs)</span>
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
            activeTab === 'comparison'
              ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
              : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Table className="w-4 h-4 text-emerald-400" />
          <span>Matrice Funzionalità Software</span>
        </button>

        <button
          onClick={() => setActiveTab('roadmap')}
          className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
            activeTab === 'roadmap'
              ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
              : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4 text-cyan-400" />
          <span>Roadmap Fasi 1, 2, 3</span>
        </button>

        <button
          onClick={() => setActiveTab('teamKpi')}
          className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
            activeTab === 'teamKpi'
              ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
              : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4 text-fuchsia-400" />
          <span>Team, Costi & KPI</span>
        </button>

        <button
          onClick={() => setActiveTab('scripting')}
          className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
            activeTab === 'scripting'
              ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
              : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
          }`}
        >
          <Code className="w-4 h-4 text-purple-400" />
          <span>Sandbox Scripting Python/JS</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-950 text-xs">
        {/* TAB 1: ARCHITECTURE INTERACTIVE DIAGRAM */}
        {activeTab === 'architecture' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h3 className="font-bold text-white text-base">Architettura Ibrida a 3 Livelli</h3>
              <p className="text-slate-400 text-xs mt-1">
                Separazione netta tra UI reattiva, Core nativo C++/Rust per rendering e backend cloud GPU per Virtual Try-On e AI.
              </p>
            </div>

            {/* Interactive Architecture Flow Diagram */}
            <div className="grid grid-cols-4 gap-3 select-none">
              {[
                { id: 'cross-ui', title: '1. UI Cross-Platform', icon: Monitor, tech: 'Flutter / React / WASM' },
                { id: 'core-engine', title: '2. Core Engine C++/Rust', icon: Cpu, tech: 'Skia / OpenCV / Blend2D' },
                { id: 'doc-model', title: '3. Documento .ucs', icon: FileCode2, tech: 'SQLite / FlatBuffers' },
                { id: 'vto-backend', title: '4. AI & VTO Cloud', icon: Server, tech: 'IDM-VTON / FastAPI' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedArchNode(item.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedArchNode === item.id
                      ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-600/20 text-white scale-[1.02]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <item.icon className="w-5 h-5 mb-2 text-indigo-400" />
                  <div className="font-bold text-white text-xs">{item.title}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">{item.tech}</div>
                </button>
              ))}
            </div>

            {/* Selected Node In-Depth Inspection Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-white text-sm">{currentArch.title}</h4>
                  <p className="text-indigo-400 text-xs mt-0.5">{currentArch.subtitle}</p>
                </div>
                <span className="font-mono text-[10px] bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
                  {currentArch.tech}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {currentArch.details.map((detail, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300 leading-relaxed text-xs">{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VTO Code Snippet from Blueprint */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  Snippet VTO di Riferimento (Appendice 16 del Blueprint)
                </span>
                <span className="text-[10px] font-mono text-slate-400">IDM-VTON API Integration</span>
              </div>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-indigo-300 overflow-x-auto leading-relaxed">
{`async function generaTryOn(fotoPersona, fotoMaglia) {
  mostraLoading();

  const risposta = await fetch("https://api.creativesuite.cloud/v1/try-on", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer TOKEN_SEGRETO"
    },
    body: JSON.stringify({
      human_image: fotoPersona,   // base64 o URL foto atleta
      garment_image: fotoMaglia,  // base64 o URL concept jersey
      garment_category: "upper_body",
      preserve_sponsors: true
    })
  });

  const dati = await risposta.json();
  document.getElementById("risultato").src = dati.output_url;
}`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 2: UNIFIED DOCUMENT SCHEMA */}
        {activeTab === 'documentModel' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div>
              <h3 className="font-bold text-white text-base">Modello di Documento Unificato (.ucs / SQLite)</h3>
              <p className="text-slate-400 text-xs mt-1">
                Struttura dati che fonde livelli raster, tracciati vettoriali, metadati tipografici e parametri Virtual Try-On in un singolo file.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-emerald-400 font-semibold">unified_creative_schema.json</span>
                <span className="text-slate-400 font-mono">Formato v2.4.0 · Binary SQLite / FlatBuffers</span>
              </div>

              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300 overflow-x-auto max-h-[460px] leading-relaxed">
{`{
  "document": {
    "version": "2.4.0",
    "uuid": "8e3b5e40-9b43-4f9e-a892-creative-suite",
    "canvas": { "width": 1920, "height": 1080, "dpi": 300, "colorSpace": "CMYK-FOGRA39" },
    "layers": [
      {
        "id": "layer_01_raster",
        "type": "raster",
        "name": "Foto Atleta Frontale",
        "blendMode": "normal",
        "opacity": 1.0,
        "pixelDataRef": "blobs/raw_athlete_4k.webp",
        "adjustments": { "exposure": 12, "contrast": 25, "warmth": 10 }
      },
      {
        "id": "layer_02_vector",
        "type": "vector",
        "name": "Scudo Araldico & Crest",
        "paths": [
          { "d": "M 80 80 L 320 80 C 320 230 200 340 ... Z", "fill": "#0A192F", "stroke": "#F59E0B" }
        ],
        "livePathEffects": ["Knot", "CelticBorder"]
      },
      {
        "id": "layer_03_text",
        "type": "text",
        "name": "Monogramma Squadra",
        "content": "AURA FC 2026",
        "fontFamily": "Plus Jakarta Sans",
        "openTypeFeatures": { "liga": true, "kern": true, "tracking": 160 }
      },
      {
        "id": "layer_04_vto",
        "type": "virtual_try_on",
        "garmentRef": "kits/concept_milano_26.png",
        "meshParameters": { "torsoCurvature": "18.4deg", "creaseDepth": 0.65 },
        "sponsorLock": true
      }
    ],
    "history": {
      "undoLevels": 128,
      "storageEngine": "CommandPatternDifferentialSnapshots"
    }
  }
}`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: SOFTWARE COMPARISON MATRIX */}
        {activeTab === 'comparison' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div>
              <h3 className="font-bold text-white text-base">Matrice Comparativa: Illustrator vs Inkscape vs PicsArt vs Nostra Suite</h3>
              <p className="text-slate-400 text-xs mt-1">
                Integrazione sinergica dei punti di forza dei 3 software storici con l'aggiunta di VTO nativo e IA multimodale.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400">
                    <th className="p-3 font-semibold">Modulo / Feature</th>
                    <th className="p-3 font-semibold">Adobe Illustrator</th>
                    <th className="p-3 font-semibold">Inkscape</th>
                    <th className="p-3 font-semibold">PicsArt</th>
                    <th className="p-3 font-semibold text-indigo-400">Nostra Suite Creativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {SOFTWARE_COMPARISON.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-semibold text-white">{row.feature}</td>
                      <td className="p-3 text-slate-400">{row.illustrator}</td>
                      <td className="p-3 text-slate-400">{row.inkscape}</td>
                      <td className="p-3 text-slate-400">{row.picsart}</td>
                      <td className="p-3 text-emerald-300 font-medium bg-indigo-950/20">{row.ourSuite}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: ROADMAP */}
        {activeTab === 'roadmap' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h3 className="font-bold text-white text-base">Roadmap di Sviluppo in 3 Fasi</h3>
              <p className="text-slate-400 text-xs mt-1">
                Pianificazione temporale dal prototipo MVP fino all'ecosistema multipiattaforma completo.
              </p>
            </div>

            <div className="space-y-4">
              {BLUEPRINT_ROADMAP.map((phase, idx) => (
                <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <h4 className="font-bold text-white text-sm">{phase.phase}</h4>
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-indigo-300">
                      {phase.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {phase.deliverables.map((d, dIdx) => (
                      <div key={dIdx} className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="text-slate-300 text-[11px] leading-tight">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: TEAM, KPI & MONETIZATION */}
        {activeTab === 'teamKpi' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h3 className="font-bold text-white text-base">Organizzazione Team, Rischi e Modello di Business</h3>
              <p className="text-slate-400 text-xs mt-1">
                Dimensionamento dell'organico (Sezione 11), KPI di successo e mitigazione costi GPU.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Team Sizing */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Composizione Team Ideale (6 Figure)
                </span>
                <ul className="space-y-2 text-slate-300">
                  <li className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                    <span>1x Senior C++ / Rust (Core Skia & FFI)</span>
                    <span className="font-mono text-indigo-400 text-[10px]">Core Lead</span>
                  </li>
                  <li className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                    <span>1x AI/ML Engineer (IDM-VTON, ControlNet, ONNX)</span>
                    <span className="font-mono text-indigo-400 text-[10px]">AI Lead</span>
                  </li>
                  <li className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                    <span>1x Esperto Vettoriale (Algoritmi Bézier, Clipper2)</span>
                    <span className="font-mono text-indigo-400 text-[10px]">Vector Lead</span>
                  </li>
                  <li className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                    <span>1x UI/UX Designer Prosumer & Touch</span>
                    <span className="font-mono text-indigo-400 text-[10px]">Product Design</span>
                  </li>
                  <li className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                    <span>1x Backend / Cloud & DevOps GPU</span>
                    <span className="font-mono text-indigo-400 text-[10px]">Infra Lead</span>
                  </li>
                  <li className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                    <span>1x Product Manager & Sports Merchandising</span>
                    <span className="font-mono text-indigo-400 text-[10px]">PM Lead</span>
                  </li>
                </ul>
              </div>

              {/* Monetization & KPIs */}
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Monetizzazione & KPI Chiave
                </span>
                <div className="space-y-2">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="font-semibold text-white">SaaS Freemium + Crediti AI Cloud</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Editing vettoriale e raster illimitato gratis locale; token a consumo per VTO IDM-VTON e generazioni pesanti.
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="font-semibold text-white">Licenze E-Commerce B2B</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Widget VTO per club sportivi (Serie A, Premier League) e brand abbigliamento per camerino virtuale sui loro shop.
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="font-semibold text-white">Target KPI</div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                      Rendering &lt; 16ms (60 fps) · VTO inferenza &lt; 2.5s · Export fidelity 100% CMYK
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SCRIPTING SANDBOX */}
        {activeTab === 'scripting' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div>
              <h3 className="font-bold text-white text-base">Sandbox Estensioni e Scripting (Python / JS)</h3>
              <p className="text-slate-400 text-xs mt-1">
                Supporto estensioni in stile Inkscape e Illustrator: automazioni geometriche, Voronoi, codici a barre e generazione G-Code per taglio laser.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-indigo-400 font-semibold">gear_generator_extension.py</span>
                <button
                  onClick={handleRunScript}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Esegui Script nel Core WASM</span>
                </button>
              </div>

              <textarea
                rows={12}
                value={scriptSnippet}
                onChange={(e) => setScriptSnippet(e.target.value)}
                className="w-full bg-slate-950 font-mono text-[11px] text-slate-200 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-indigo-500"
              />

              {scriptOutput && (
                <div className="p-3 bg-slate-950 rounded-xl border border-emerald-900/40 font-mono text-[11px] text-emerald-400 whitespace-pre-wrap">
                  {scriptOutput}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
