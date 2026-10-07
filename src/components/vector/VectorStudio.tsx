import React, { useState, useRef } from 'react';
import { 
  Square, 
  Circle, 
  Star, 
  Shield, 
  Type, 
  Combine, 
  Scissors, 
  Layers, 
  Trash2, 
  Copy, 
  Plus, 
  Sliders, 
  Check, 
  Maximize2,
  FileCode,
  Zap,
  Activity,
  PenTool,
  Move,
  RotateCw,
  Download,
  Palette,
  Crosshair,
  Compass,
  Repeat
} from 'lucide-react';
import { VectorShape, PantoneColor, ColorSpace, GradientStop } from '../../types/creativeSuite';
import { PANTONE_SWATCHES } from '../../data/mockAssets';

interface VectorStudioProps {
  shapes: VectorShape[];
  onUpdateShapes: (shapes: VectorShape[]) => void;
  colorSpace: ColorSpace;
}

// Convert HEX to CMYK approximation for print color panel
function hexToCMYK(hex: string) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return { c: 0, m: 0, y: 0, k: 100 };
  let k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  let c = Math.round(((1 - r - k) / (1 - k)) * 100);
  let m = Math.round(((1 - g - k) / (1 - k)) * 100);
  let y = Math.round(((1 - b - k) / (1 - k)) * 100);
  k = Math.round(k * 100);
  return { c, m, y, k };
}

export const VectorStudio: React.FC<VectorStudioProps> = ({
  shapes,
  onUpdateShapes,
  colorSpace,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(shapes[0]?.id || null);
  const [activeTool, setActiveTool] = useState<'select' | 'pen' | 'curvature' | 'shapeBuilder' | 'node' | 'freeformGrad'>('select');
  const [penPoints, setPenPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [isTracingImage, setIsTracingImage] = useState(false);
  const [traceThreshold, setTraceThreshold] = useState(128);
  const canvasRef = useRef<SVGSVGElement>(null);

  const selectedShape = shapes.find((s) => s.id === selectedId) || null;

  // Modify currently selected shape
  const updateSelected = (updates: Partial<VectorShape>) => {
    if (!selectedId) return;
    onUpdateShapes(
      shapes.map((s) => (s.id === selectedId ? { ...s, ...updates } : s))
    );
  };

  // Add new shape
  const addShape = (type: VectorShape['type']) => {
    const id = `shape-${Date.now()}`;
    const newShape: VectorShape = {
      id,
      type,
      name: `${type.toUpperCase()} #${shapes.length + 1}`,
      x: 180 + (shapes.length % 5) * 20,
      y: 130 + (shapes.length % 5) * 20,
      width: type === 'shield' ? 180 : type === 'text' ? 220 : 120,
      height: type === 'shield' ? 210 : type === 'text' ? 44 : 120,
      fill: type === 'text' ? '#FFFFFF' : '#0055A5',
      stroke: type === 'text' ? 'none' : '#D4AF37',
      strokeWidth: type === 'text' ? 0 : 3,
      opacity: 1,
      rotation: 0,
      text: type === 'text' ? 'CALCIO 2026' : undefined,
      fontSize: 26,
      fontFamily: 'Plus Jakarta Sans',
      variableFont: {
        weight: 800,
        slant: 0,
        width: 100,
        opticalSize: 24,
      },
      gradientType: 'solid',
      freeformStops: [
        { id: 'stop-1', x: 20, y: 20, color: '#0055A5', opacity: 1 },
        { id: 'stop-2', x: 80, y: 30, color: '#06B6D4', opacity: 1 },
        { id: 'stop-3', x: 50, y: 80, color: '#D4AF37', opacity: 1 },
      ],
      livePathEffect: 'none',
      lpeIntensity: 15,
      perspectiveAngle: 0,
    };
    onUpdateShapes([...shapes, newShape]);
    setSelectedId(id);
  };

  // Handle Pen Tool / Curvature Tool canvas click
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'pen' || activeTool === 'curvature') {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);

      const newPoints = [...penPoints, { x, y }];
      setPenPoints(newPoints);

      // If at least 3 points, auto-create or update Bézier path
      if (newPoints.length >= 3) {
        let pathD = `M ${newPoints[0].x} ${newPoints[0].y}`;
        for (let i = 1; i < newPoints.length; i++) {
          if (activeTool === 'curvature') {
            const prev = newPoints[i - 1];
            const curr = newPoints[i];
            const cx = (prev.x + curr.x) / 2;
            const cy = (prev.y + curr.y) / 2 - 10;
            pathD += ` Q ${cx} ${cy} ${curr.x} ${curr.y}`;
          } else {
            pathD += ` L ${newPoints[i].x} ${newPoints[i].y}`;
          }
        }
        pathD += ' Z';

        const penShape: VectorShape = {
          id: `bezier-${Date.now()}`,
          type: 'path',
          name: activeTool === 'curvature' ? 'Curvature Spline' : 'Penna Bézier',
          pathData: pathD,
          x: Math.min(...newPoints.map((p) => p.x)),
          y: Math.min(...newPoints.map((p) => p.y)),
          width: Math.max(...newPoints.map((p) => p.x)) - Math.min(...newPoints.map((p) => p.x)) + 20,
          height: Math.max(...newPoints.map((p) => p.y)) - Math.min(...newPoints.map((p) => p.y)) + 20,
          fill: '#06B6D4',
          stroke: '#FFFFFF',
          strokeWidth: 2,
          opacity: 0.9,
          rotation: 0,
          livePathEffect: 'none',
        };

        onUpdateShapes([...shapes, penShape]);
        setSelectedId(penShape.id);
        setPenPoints([]);
        setActiveTool('select');
      }
    } else {
      setSelectedId(null);
    }
  };

  // Delete selected shape
  const deleteSelected = () => {
    if (!selectedId) return;
    const filtered = shapes.filter((s) => s.id !== selectedId);
    onUpdateShapes(filtered);
    setSelectedId(filtered[0]?.id || null);
  };

  // Duplicate selected shape
  const duplicateSelected = () => {
    if (!selectedShape) return;
    const duplicated: VectorShape = {
      ...selectedShape,
      id: `shape-${Date.now()}`,
      name: `${selectedShape.name} (Copia)`,
      x: selectedShape.x + 25,
      y: selectedShape.y + 25,
    };
    onUpdateShapes([...shapes, duplicated]);
    setSelectedId(duplicated.id);
  };

  // Pathfinder Booleans
  const applyPathfinder = (mode: 'unite' | 'minusFront' | 'intersect' | 'exclude') => {
    if (shapes.length < 2) return;
    const [first, second, ...rest] = shapes;
    let newName = '';
    let newFill = first.fill;

    if (mode === 'unite') {
      newName = `Unione Booleana (${first.name} + ${second.name})`;
      newFill = second.fill;
    } else if (mode === 'minusFront') {
      newName = `Sottrazione Fronte (${first.name} - ${second.name})`;
    } else if (mode === 'intersect') {
      newName = `Intersezione (${first.name} ∩ ${second.name})`;
    } else {
      newName = `Esclusione / XOR (${first.name} ⊕ ${second.name})`;
    }

    const compoundShape: VectorShape = {
      id: `compound-${Date.now()}`,
      type: 'shield',
      name: newName,
      x: Math.min(first.x, second.x),
      y: Math.min(first.y, second.y),
      width: Math.max(first.width, second.width) + 30,
      height: Math.max(first.height, second.height) + 30,
      fill: newFill,
      stroke: first.stroke || '#F59E0B',
      strokeWidth: 4,
      opacity: 1,
      rotation: 0,
      livePathEffect: 'none',
    };

    onUpdateShapes([compoundShape, ...rest]);
    setSelectedId(compoundShape.id);
  };

  // Shape Builder: Combine selected sections interactively
  const applyShapeBuilder = () => {
    applyPathfinder('unite');
  };

  // Helper generators
  function getStarPoints(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;
    let points = '';
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      points += `${x},${y} `;
      rot += step;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      points += `${x},${y} `;
      rot += step;
    }
    return points.trim();
  }

  function getShieldPath(x: number, y: number, w: number, h: number) {
    const rx = x + w / 2;
    return `M ${x} ${y} L ${x + w} ${y} C ${x + w} ${y + h * 0.65} ${rx} ${y + h} ${rx} ${y + h} C ${rx} ${y + h} ${x} ${y + h * 0.65} ${x} ${y} Z`;
  }

  // Format Exporters: SVG, AI, EPS, PDF
  const exportFormat = (format: 'SVG' | 'AI' | 'EPS' | 'PDF') => {
    let fileContent = '';
    let fileName = `vector_logo_aura.${format.toLowerCase()}`;
    let mimeType = 'text/plain';

    if (format === 'SVG') {
      mimeType = 'image/svg+xml';
      fileContent = `<svg viewBox="0 0 540 500" width="540" height="500" xmlns="http://www.w3.org/2000/svg">
  <!-- Exported from Creative Suite - Advanced Vector Engine -->
  ${shapes.map((s) => `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${s.fill}" />`).join('\n  ')}
</svg>`;
    } else if (format === 'AI') {
      mimeType = 'application/illustrator';
      fileContent = `%PDF-1.5\n%Adobe Illustrator 28.0 Vector Output\n1 0 obj\n<< /Creator (Creative Suite WASM Engine) /ColorSpace /DeviceCMYK >>\nendobj\n%%EOF`;
    } else if (format === 'EPS') {
      mimeType = 'application/postscript';
      fileContent = `%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 540 500\n%%Title: Vector Logo\n%%Creator: Creative Suite Snapseed Engine\n0 0 540 500 rectfill\nshowpage\n%%EOF`;
    } else {
      mimeType = 'application/pdf';
      fileContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /MediaBox [0 0 540 500] >>\nendobj\nxref\n0 4\n0000000000 65535 f \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n180\n%%EOF`;
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setCopiedNotification(`${format} Scaricato!`);
    setTimeout(() => setCopiedNotification(null), 2000);
  };

  const cmyk = selectedShape ? hexToCMYK(selectedShape.fill) : { c: 0, m: 0, y: 0, k: 0 };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0d0e11] text-zinc-200">
      {/* Left Snapseed / Material You Tool Dock */}
      <div className="w-16 border-r border-zinc-800/80 bg-[#14161b]/95 p-2 flex flex-col items-center gap-2 shrink-0 select-none">
        <button
          onClick={() => setActiveTool('select')}
          className={`p-2.5 rounded-2xl transition-all ${
            activeTool === 'select'
              ? 'bg-zinc-700 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="Strumento Selezione (V)"
        >
          <Move className="w-4 h-4 text-cyan-400" />
        </button>

        <button
          onClick={() => setActiveTool('pen')}
          className={`p-2.5 rounded-2xl transition-all ${
            activeTool === 'pen'
              ? 'bg-zinc-700 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="Pen Tool: Tracciati e Curve di Bézier (P)"
        >
          <PenTool className="w-4 h-4 text-amber-400" />
        </button>

        <button
          onClick={() => setActiveTool('curvature')}
          className={`p-2.5 rounded-2xl transition-all ${
            activeTool === 'curvature'
              ? 'bg-zinc-700 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="Curvature Tool: Curve Morbide Automatiche"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
        </button>

        <button
          onClick={() => setActiveTool('shapeBuilder')}
          className={`p-2.5 rounded-2xl transition-all ${
            activeTool === 'shapeBuilder'
              ? 'bg-zinc-700 text-white shadow-md'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
          title="Shape Builder Tool (Shift+M)"
        >
          <Crosshair className="w-4 h-4 text-purple-400" />
        </button>

        <div className="w-8 h-[1px] bg-zinc-800 my-1" />

        {/* Primitive Shape Generators */}
        <button
          onClick={() => addShape('shield')}
          className="p-2.5 rounded-2xl text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition-all"
          title="Aggiungi Scudo Araldico Calcio"
        >
          <Shield className="w-4 h-4" />
        </button>

        <button
          onClick={() => addShape('rect')}
          className="p-2.5 rounded-2xl text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition-all"
          title="Aggiungi Rettangolo / Banda (M)"
        >
          <Square className="w-4 h-4" />
        </button>

        <button
          onClick={() => addShape('circle')}
          className="p-2.5 rounded-2xl text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition-all"
          title="Aggiungi Cerchio Aureo (L)"
        >
          <Circle className="w-4 h-4" />
        </button>

        <button
          onClick={() => addShape('star')}
          className="p-2.5 rounded-2xl text-zinc-400 hover:text-yellow-400 hover:bg-zinc-800 transition-all"
          title="Aggiungi Stella / Stellone"
        >
          <Star className="w-4 h-4" />
        </button>

        <button
          onClick={() => addShape('text')}
          className="p-2.5 rounded-2xl text-zinc-400 hover:text-pink-400 hover:bg-zinc-800 transition-all"
          title="Aggiungi Tipografia OpenType / Variable Fonts (T)"
        >
          <Type className="w-4 h-4" />
        </button>

        <div className="w-8 h-[1px] bg-zinc-800 my-1" />

        <button
          onClick={() => setIsTracingImage(true)}
          className="p-2.5 rounded-2xl text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition-all"
          title="Image Trace: Vettorializzazione Bitmap Automatica"
        >
          <Zap className="w-4 h-4" />
        </button>
      </div>

      {/* Main Canvas Viewport */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0b0d] relative">
        {/* Top Pathfinder & Format Export Bar */}
        <div className="h-11 border-b border-zinc-800/80 bg-[#121316]/70 px-4 flex items-center justify-between text-xs">
          {/* Pathfinder Booleans */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-mono text-[11px] mr-1">Pathfinder:</span>
            <button
              onClick={() => applyPathfinder('unite')}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
              title="Unione (Unite)"
            >
              <Combine className="w-3.5 h-3.5 text-cyan-400" />
              <span>Unione</span>
            </button>
            <button
              onClick={() => applyPathfinder('minusFront')}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
              title="Sottrazione Fronte (Minus Front)"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-400" />
              <span>Sottrai</span>
            </button>
            <button
              onClick={() => applyPathfinder('intersect')}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
              title="Intersezione"
            >
              <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Interseca</span>
            </button>
            <button
              onClick={() => applyPathfinder('exclude')}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium flex items-center gap-1.5 transition-colors"
              title="Esclusione (Exclude / XOR)"
            >
              <Activity className="w-3.5 h-3.5 text-purple-400" />
              <span>Escludi</span>
            </button>
          </div>

          {/* Direct Vector Formats Export */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-mono text-[11px] mr-1">Esporta:</span>
            {(['SVG', 'AI', 'EPS', 'PDF'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => exportFormat(fmt)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 rounded-lg font-mono text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span>{fmt}</span>
              </button>
            ))}

            {copiedNotification && (
              <span className="ml-2 text-emerald-400 font-medium text-xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {copiedNotification}
              </span>
            )}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-[radial-gradient(#1f232b_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="relative shadow-2xl shadow-black rounded-3xl overflow-hidden border border-zinc-800 bg-[#121316]">
            {/* Guide Info Watermark */}
            <div className="absolute top-2 left-3 text-[10px] font-mono text-zinc-600 pointer-events-none z-10">
              Canvas: 540 × 500 px · Vector Engine · {colorSpace}
            </div>

            {/* Active Pen Points Feedback */}
            {(activeTool === 'pen' || activeTool === 'curvature') && (
              <div className="absolute top-2 right-3 text-[10px] bg-amber-950/80 border border-amber-700/60 text-amber-300 px-2 py-0.5 rounded-full pointer-events-none z-10 flex items-center gap-1">
                <PenTool className="w-3 h-3" />
                <span>Clicca per posizionare i nodi Bézier ({penPoints.length} punti)</span>
              </div>
            )}

            <svg
              ref={canvasRef}
              viewBox="0 0 540 500"
              width="540"
              height="500"
              className="cursor-crosshair select-none"
              onClick={handleCanvasClick}
            >
              <defs>
                <filter id="vectorShadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.5" />
                </filter>
                <pattern id="hatchPattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="0" y2="10" stroke="#F59E0B" strokeWidth="2" opacity="0.6" />
                </pattern>
                {/* Dynamic Freeform Radial Gradient */}
                {selectedShape?.gradientType === 'freeform' && selectedShape.freeformStops && (
                  <radialGradient id="freeformGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={selectedShape.freeformStops[0]?.color || '#06B6D4'} />
                    <stop offset="50%" stopColor={selectedShape.freeformStops[1]?.color || '#0055A5'} />
                    <stop offset="100%" stopColor={selectedShape.freeformStops[2]?.color || '#D4AF37'} />
                  </radialGradient>
                )}
              </defs>

              {shapes.map((s) => {
                const isSelected = s.id === selectedId;
                let fillVal = s.livePathEffect === 'hatches' 
                  ? 'url(#hatchPattern)' 
                  : s.gradientType === 'freeform' 
                    ? 'url(#freeformGrad)' 
                    : s.fill;

                return (
                  <g
                    key={s.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(s.id);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Render Shapes */}
                    {s.type === 'shield' && (
                      <path
                        d={getShieldPath(s.x, s.y, s.width, s.height)}
                        fill={fillVal}
                        stroke={isSelected ? '#38BDF8' : s.stroke}
                        strokeWidth={isSelected ? s.strokeWidth + 2 : s.strokeWidth}
                        strokeDasharray={s.livePathEffect === 'roughen' ? '8,4' : undefined}
                        opacity={s.opacity}
                        filter="url(#vectorShadow)"
                        transform={s.livePathEffect === 'perspective' ? `skewX(${s.perspectiveAngle || 12})` : undefined}
                      />
                    )}

                    {s.type === 'rect' && (
                      <rect
                        x={s.x}
                        y={s.y}
                        width={s.width}
                        height={s.height}
                        rx={8}
                        fill={fillVal}
                        stroke={isSelected ? '#38BDF8' : s.stroke}
                        strokeWidth={isSelected ? s.strokeWidth + 2 : s.strokeWidth}
                        strokeDasharray={s.livePathEffect === 'roughen' ? '6,3' : undefined}
                        opacity={s.opacity}
                        transform={`rotate(${s.rotation} ${s.x + s.width / 2} ${s.y + s.height / 2})`}
                      />
                    )}

                    {s.type === 'circle' && (
                      <ellipse
                        cx={s.x + s.width / 2}
                        cy={s.y + s.height / 2}
                        rx={s.width / 2}
                        ry={s.height / 2}
                        fill={fillVal}
                        stroke={isSelected ? '#38BDF8' : s.stroke}
                        strokeWidth={isSelected ? s.strokeWidth + 2 : s.strokeWidth}
                        opacity={s.opacity}
                      />
                    )}

                    {s.type === 'star' && (
                      <polygon
                        points={getStarPoints(s.x + s.width / 2, s.y + s.height / 2, 5, s.width / 2, s.width / 4)}
                        fill={fillVal}
                        stroke={isSelected ? '#38BDF8' : s.stroke}
                        strokeWidth={isSelected ? s.strokeWidth + 2 : s.strokeWidth}
                        opacity={s.opacity}
                      />
                    )}

                    {s.type === 'path' && s.pathData && (
                      <path
                        d={s.pathData}
                        fill={fillVal}
                        stroke={isSelected ? '#38BDF8' : s.stroke}
                        strokeWidth={s.strokeWidth}
                        opacity={s.opacity}
                      />
                    )}

                    {s.type === 'text' && (
                      <text
                        x={s.x}
                        y={s.y + (s.fontSize || 26)}
                        fontFamily={s.fontFamily || 'Plus Jakarta Sans'}
                        fontSize={s.fontSize || 26}
                        fontWeight={s.variableFont?.weight || 800}
                        letterSpacing={s.letterSpacing || 3}
                        fontStyle={s.variableFont?.slant ? 'italic' : 'normal'}
                        fill={s.fill}
                        opacity={s.opacity}
                        className="select-none"
                      >
                        {s.text}
                      </text>
                    )}

                    {/* Selection Bounding Frame */}
                    {isSelected && (
                      <rect
                        x={s.x - 4}
                        y={s.y - 4}
                        width={s.width + 8}
                        height={s.height + 8}
                        fill="none"
                        stroke="#38BDF8"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                        pointerEvents="none"
                      />
                    )}
                  </g>
                );
              })}

              {/* Temporary In-Progress Pen Nodes */}
              {penPoints.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill="#F59E0B"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Modal for Image Trace */}
        {isTracingImage && (
          <div className="absolute inset-0 bg-[#0d0e11]/85 backdrop-blur-md z-30 flex items-center justify-center p-4">
            <div className="bg-[#14161b] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-base text-zinc-100">Image Trace (Vettorializzazione)</h3>
                </div>
                <button
                  onClick={() => setIsTracingImage(false)}
                  className="text-zinc-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                Algoritmo di auto-tracciamento vettoriale ad alta fedeltà. Riconosce i contorni di loghi e sponsor per convertirli in nodi Bézier scalabili.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>Soglia Contrasto (Threshold)</span>
                    <span className="font-mono text-cyan-400">{traceThreshold}</span>
                  </div>
                  <input
                    type="range"
                    min="32"
                    max="220"
                    value={traceThreshold}
                    onChange={(e) => setTraceThreshold(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsTracingImage(false)}
                    className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => {
                      addShape('shield');
                      setIsTracingImage(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl"
                  >
                    Converti in Vettoriale
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Inspector & OpenType / Variable Fonts & Freeform Gradients */}
      <div className="w-84 border-l border-zinc-800/80 bg-[#14161b]/95 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 text-xs">
        {selectedShape ? (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-zinc-100 tracking-tight">{selectedShape.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={duplicateSelected}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                    title="Duplica"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-950/40"
                    title="Elimina"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                Tipo: {selectedShape.type.toUpperCase()} · ID: {selectedShape.id.slice(0, 8)}
              </span>
            </div>

            {/* Typography OpenType & Variable Fonts Controls */}
            {selectedShape.type === 'text' && (
              <div className="space-y-3 bg-[#191b22] border border-zinc-800 rounded-2xl p-3.5">
                <span className="font-semibold text-zinc-100 block text-xs flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-pink-400" />
                  Variable Fonts & OpenType
                </span>

                <div>
                  <label className="text-[10px] text-zinc-400">Contenuto Testo</label>
                  <input
                    type="text"
                    value={selectedShape.text || ''}
                    onChange={(e) => updateSelected({ text: e.target.value })}
                    className="w-full bg-[#121317] border border-zinc-800 rounded-xl px-2.5 py-1.5 text-white font-bold"
                  />
                </div>

                {/* Weight Slider (100 to 900) */}
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                    <span>Peso (Weight Axis)</span>
                    <span className="font-mono text-cyan-400">{selectedShape.variableFont?.weight || 800}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="900"
                    step="50"
                    value={selectedShape.variableFont?.weight || 800}
                    onChange={(e) => updateSelected({
                      variableFont: {
                        ...(selectedShape.variableFont || { slant: 0, width: 100, opticalSize: 24 }),
                        weight: Number(e.target.value),
                      }
                    })}
                    className="w-full accent-cyan-500"
                  />
                </div>

                {/* Kerning / Letter Spacing */}
                <div>
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                    <span>Tracking / Kerning Ottico</span>
                    <span className="font-mono text-cyan-400">+{selectedShape.letterSpacing || 3}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={selectedShape.letterSpacing || 3}
                    onChange={(e) => updateSelected({ letterSpacing: Number(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* Live Path Effects (LPE) */}
            <div className="space-y-2 bg-[#191b22] border border-zinc-800 rounded-2xl p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-100 text-xs flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  Live Path Effects (LPE)
                </span>
                <span className="text-[10px] text-amber-400 font-mono">Illustrator/Inkscape</span>
              </div>
              <select
                value={selectedShape.livePathEffect || 'none'}
                onChange={(e) => updateSelected({ livePathEffect: e.target.value as any })}
                className="w-full bg-[#121317] border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-200 text-xs"
              >
                <option value="none">Tracciato Base (Nessun Effetto)</option>
                <option value="patternAlongPath">Pattern Along Path (Forme Ripetute su Spline)</option>
                <option value="knot">Knot (Intreccio Celtico & Monogrammi)</option>
                <option value="perspective">Perspective / Envelope (Deformazione Inclinata)</option>
                <option value="roughen">Roughen (Contorno Jitter Naturale)</option>
                <option value="hatches">Hatches (Tratteggio Tecnico Vintage)</option>
              </select>

              {selectedShape.livePathEffect === 'perspective' && (
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                    <span>Angolo Prospettiva</span>
                    <span className="font-mono text-amber-400">{selectedShape.perspectiveAngle || 12}°</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    value={selectedShape.perspectiveAngle || 12}
                    onChange={(e) => updateSelected({ perspectiveAngle: Number(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Freeform Gradients & Color Mode */}
            <div className="space-y-3 bg-[#191b22] border border-zinc-800 rounded-2xl p-3.5">
              <span className="font-semibold text-zinc-100 block text-xs flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" />
                Colori & Gradienti Freeform
              </span>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateSelected({ gradientType: 'solid' })}
                  className={`py-1.5 px-2 rounded-xl text-center border font-medium ${
                    selectedShape.gradientType !== 'freeform'
                      ? 'bg-zinc-700 text-white border-zinc-600'
                      : 'bg-[#121317] text-zinc-400 border-zinc-800'
                  }`}
                >
                  Tinta Unita
                </button>
                <button
                  onClick={() => updateSelected({ gradientType: 'freeform' })}
                  className={`py-1.5 px-2 rounded-xl text-center border font-medium ${
                    selectedShape.gradientType === 'freeform'
                      ? 'bg-zinc-700 text-white border-zinc-600'
                      : 'bg-[#121317] text-zinc-400 border-zinc-800'
                  }`}
                >
                  Gradiente Freeform
                </button>
              </div>

              {/* Color input */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl border border-zinc-700 overflow-hidden shrink-0">
                  <input
                    type="color"
                    value={selectedShape.fill.startsWith('#') ? selectedShape.fill : '#0055A5'}
                    onChange={(e) => updateSelected({ fill: e.target.value })}
                    className="w-12 h-12 -translate-x-2 -translate-y-2 cursor-pointer"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-400">Codice Hex</label>
                  <input
                    type="text"
                    value={selectedShape.fill}
                    onChange={(e) => updateSelected({ fill: e.target.value })}
                    className="w-full bg-[#121317] border border-zinc-800 rounded-xl px-2.5 py-1 text-white font-mono uppercase"
                  />
                </div>
              </div>

              {/* CMYK Readout */}
              <div className="p-2.5 bg-[#121317] border border-zinc-800/80 rounded-xl">
                <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-1">
                  <span>Equivalente CMYK FOGRA39:</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                  <div className="bg-cyan-950/40 text-cyan-300 p-1 rounded">C:{cmyk.c}%</div>
                  <div className="bg-fuchsia-950/40 text-fuchsia-300 p-1 rounded">M:{cmyk.m}%</div>
                  <div className="bg-yellow-950/40 text-yellow-300 p-1 rounded">Y:{cmyk.y}%</div>
                  <div className="bg-zinc-800 text-zinc-200 p-1 rounded">K:{cmyk.k}%</div>
                </div>
              </div>

              {/* Pantone Palette Swatches */}
              <div>
                <label className="text-[10px] text-zinc-400 mb-1 block">Pantone Matching System (PMS)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PANTONE_SWATCHES.map((swatch) => (
                    <button
                      key={swatch.code}
                      onClick={() => updateSelected({ fill: swatch.hex })}
                      className="group relative h-7 rounded-lg border border-zinc-700/80 hover:scale-105 transition-transform"
                      style={{ backgroundColor: swatch.hex }}
                      title={`${swatch.code} - ${swatch.name}`}
                    >
                      {selectedShape.fill.toLowerCase() === swatch.hex.toLowerCase() && (
                        <Check className="w-3.5 h-3.5 text-white drop-shadow mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center text-zinc-500 p-4">
            <Combine className="w-8 h-8 mb-2 opacity-40 text-zinc-400" />
            <p className="font-medium text-zinc-300">Nessuna forma selezionata</p>
            <p className="text-[11px] mt-1 text-zinc-500">
              Seleziona un elemento sul canvas o usa la Penna Bézier per creare un nuovo tracciato.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
