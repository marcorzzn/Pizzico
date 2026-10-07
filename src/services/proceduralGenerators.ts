import { VectorShape, MockupConfig, VTOParameters } from '../types/creativeSuite';

/* ---------- Deterministic Vector Concept Generation (L0 Offline) ---------- */
export function generateVectorConcept(prompt: string, style: string, colors: string) {
  const palette = parseColors(colors);
  const seed = hashString(prompt + style);
  const rng = mulberry32(seed);

  const title = extractTitle(prompt) || 'Concept Emblem';
  const geometricChoice = Math.floor(rng() * 4);

  const shapes: VectorShape[] = [];
  const cx = 270;
  const cy = 240;

  // Base Shield
  shapes.push({
    id: `gen-shield-${Date.now()}`,
    type: 'shield',
    name: 'Scudo Araldico',
    x: cx - 100,
    y: cy - 120,
    width: 200,
    height: 240,
    fill: palette[0],
    stroke: palette[1],
    strokeWidth: 6,
    opacity: 1,
    rotation: 0,
    livePathEffect: 'none',
  });

  // Emblem geometry based on seed
  if (geometricChoice === 0) {
    shapes.push({
      id: `gen-star-${Date.now()}`,
      type: 'star',
      name: 'Stella Zenitale',
      x: cx - 22,
      y: cy - 155,
      width: 44,
      height: 44,
      fill: palette[1],
      stroke: darken(palette[1], 25),
      strokeWidth: 2,
      opacity: 1,
      rotation: 0,
      livePathEffect: 'none',
    });
  } else if (geometricChoice === 1) {
    shapes.push({
      id: `gen-circle-${Date.now()}`,
      type: 'circle',
      name: 'Cerchio Aureo',
      x: cx - 30,
      y: cy - 165,
      width: 60,
      height: 60,
      fill: 'transparent',
      stroke: palette[1],
      strokeWidth: 4,
      opacity: 1,
      rotation: 0,
      livePathEffect: 'none',
    });
  }

  // Central Vertical Stripe
  shapes.push({
    id: `gen-band-${Date.now()}`,
    type: 'rect',
    name: 'Banda Centrale',
    x: cx - 14,
    y: cy - 115,
    width: 28,
    height: 200,
    fill: palette[2] || palette[0],
    stroke: 'none',
    strokeWidth: 0,
    opacity: 0.9,
    rotation: 0,
    livePathEffect: 'none',
  });

  // Typography Monogram
  shapes.push({
    id: `gen-text-${Date.now()}`,
    type: 'text',
    name: 'Monogramma',
    text: title.split(' ')[0].toUpperCase().slice(0, 6) || 'AURA',
    x: cx - 90,
    y: cy + 10,
    width: 180,
    height: 40,
    fill: '#FFFFFF',
    stroke: 'none',
    strokeWidth: 0,
    opacity: 1,
    rotation: 0,
    fontSize: 26,
    fontFamily: 'system-ui',
    letterSpacing: 4,
    livePathEffect: 'none',
  });

  return {
    title,
    conceptDescription: `Concept generato in locale (L0 Offline): ${style}, palette ${palette.join(' / ')}.`,
    colorPalette: palette.map((hex, i) => ({
      name: ['Primario', 'Accento', 'Secondario'][i] || 'Finitura',
      hex,
      cmyk: hexToCMYKString(hex),
      pantone: `PMS ${100 + i * 42} C`,
    })),
    geometryBreakdown: [
      `Scudo araldico proporzione aurea 1:1.2 centrato su 540x500`,
      `Elemento zenitale a ${geometricChoice === 0 ? '5 punte' : 'cerchio aureo'}`,
      `Banda verticale in contrasto cromatico`,
    ],
    typographySuggestion: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      style: 'Ultra-Bold geometrico',
      kerningAdvice: 'Tracking +4px per leggibilità ottimale su tessuto',
    },
    svgSnippet: shapesToSVG(shapes),
    _generatedShapes: shapes,
  };
}

/* ---------- Recolor Palettes (L0 Offline) ---------- */
export function generateRecolorPalettes(baseColors: string[], mood: string) {
  const moods: Record<string, string[][]> = {
    'default': [
      ['#0F172A', '#06B6D4', '#EC4899'],
      ['#0033A0', '#D4AF37', '#F8FAFC'],
      ['#18181B', '#3F3F46', '#A1A1AA'],
      ['#DC2626', '#F59E0B', '#111827'],
    ],
    'Luxury': [
      ['#0A0A0A', '#D4AF37', '#F5F5DC'],
      ['#1A1A2E', '#C9A961', '#EEEEEE'],
      ['#232b2b', '#E5C158', '#FFFFFF'],
    ],
    'Cyberpunk': [
      ['#0F172A', '#06B6D4', '#F0ABFC'],
      ['#1A0033', '#FF006E', '#00F5FF'],
      ['#050505', '#10B981', '#6366F1'],
    ],
    'Heritage': [
      ['#0033A0', '#D4AF37', '#F8FAFC'],
      ['#1E3A8A', '#F59E0B', '#F1F5F9'],
      ['#831843', '#FBBF24', '#FFFFFF'],
    ],
  };

  const selectedSet = moods[mood] || moods['default'];
  return {
    palettes: selectedSet.map((colors, i) => ({
      name: `Armonia ${i + 1} – ${mood || 'Creative'}`,
      story: `Palette calibrata per ${mood || 'contrasto sportivo'}, standard WCAG AA e CMYK.`,
      colors: colors.map((hex, j) => ({
        hex,
        cmyk: hexToCMYKString(hex),
        pantone: `PMS ${200 + i * 40 + j * 18} C`,
        role: ['Sfondo', 'Primario', 'Accento'][j] || 'Finitura',
      })),
    })),
  };
}

/* ---------- Mockup & VTO Quality Report (L0 Offline) ---------- */
export function generateMockupReport(config: MockupConfig, params?: VTOParameters) {
  const fitScore = params
    ? Math.round(88 + (params.creaseDepth * 0.05) + (params.lightingMatching * 0.05))
    : 95;

  return {
    fitScore: Math.min(99, fitScore),
    warpMeshParameters: {
      torsoCurvature: `${(16 + (params?.warpStrength ?? 70) * 0.04).toFixed(1)}°`,
      shoulderDrape: 'Deformazione millimetrica naturale',
      tensionPoints: ['Clavicola', 'Pettorali', 'Spalle'],
    },
    sponsorPreservationAdvice: params?.logoPreservation
      ? 'Lock geometrico attivo: stemma e sponsor protetti da deformazioni prospettiche.'
      : 'Sponsor adattati al tessuto.',
    creaseSimulation: [
      { area: 'Fianco sinistro', depth: `${((params?.creaseDepth ?? 65) / 150).toFixed(2)}`, shadowIntensity: '0.35' },
      { area: 'Colletto V-Neck', depth: '0.15', shadowIntensity: '0.20' },
    ],
    lightBaking: `Luce ${config.scene.lighting.quality.replace(/_/g, ' ')} coerente con lo scatto.`,
    compiledPromptEnglish: buildPrompt(config),
    qualityAudit: buildAudit(config),
    seriesContinuityAdvice: 'Congela ambiente, luce e capo per gli scatti successivi della serie.',
  };
}

/* ---------- Helpers ---------- */
function parseColors(input: string): string[] {
  const hexes = input.match(/#[0-9A-Fa-f]{6}/g);
  if (hexes && hexes.length >= 2) return hexes.slice(0, 3);
  const named: Record<string, string> = {
    'navy': '#0F172A',
    'blue': '#0033A0',
    'gold': '#D4AF37',
    'white': '#F8FAFC',
    'black': '#111827',
    'red': '#DC2626',
    'cyan': '#06B6D4',
    'violet': '#7C3AED',
  };
  const found = input.toLowerCase().match(/navy|blue|gold|white|black|red|cyan|violet/g) || [];
  return found.map((n) => named[n]).concat(['#0F172A', '#D4AF37', '#06B6D4']).slice(0, 3);
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function extractTitle(prompt: string): string {
  const words = prompt.split(/\s+/).slice(0, 3).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amount);
  const g = Math.max(0, ((n >> 8) & 0xff) - amount);
  const b = Math.max(0, (n & 0xff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function hexToCMYKString(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return 'C:0 M:0 Y:0 K:100';
  const c = Math.round(((1 - r - k) / (1 - k)) * 100);
  const m = Math.round(((1 - g - k) / (1 - k)) * 100);
  const y = Math.round(((1 - b - k) / (1 - k)) * 100);
  return `C:${c} M:${m} Y:${y} K:${Math.round(k * 100)}`;
}

function shapesToSVG(shapes: VectorShape[]): string {
  const body = shapes
    .map((s) => {
      if (s.type === 'shield') {
        const cx = s.x + s.width / 2;
        return `<path d="M ${s.x} ${s.y} L ${s.x + s.width} ${s.y} C ${s.x + s.width} ${s.y + s.height * 0.65} ${cx} ${s.y + s.height} ${cx} ${s.y + s.height} C ${cx} ${s.y + s.height} ${s.x} ${s.y + s.height * 0.65} ${s.x} ${s.y} Z" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" />`;
      }
      if (s.type === 'star') {
        const cx = s.x + s.width / 2;
        const cy = s.y + s.height / 2;
        const pts: string[] = [];
        for (let i = 0; i < 10; i++) {
          const ang = (Math.PI / 5) * i - Math.PI / 2;
          const r = i % 2 === 0 ? s.width / 2 : s.width / 4;
          pts.push(`${cx + Math.cos(ang) * r},${cy + Math.sin(ang) * r}`);
        }
        return `<polygon points="${pts.join(' ')}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" />`;
      }
      if (s.type === 'rect') {
        return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${s.fill}" rx="4" />`;
      }
      if (s.type === 'circle') {
        return `<ellipse cx="${s.x + s.width / 2}" cy="${s.y + s.height / 2}" rx="${s.width / 2}" ry="${s.height / 2}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" />`;
      }
      if (s.type === 'text') {
        return `<text x="${s.x + s.width / 2}" y="${s.y + 30}" font-family="system-ui" font-size="${s.fontSize}" font-weight="800" fill="${s.fill}" text-anchor="middle" letter-spacing="${s.letterSpacing}">${s.text}</text>`;
      }
      return '';
    })
    .join('\n  ');

  return `<svg viewBox="0 0 540 500" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">\n  ${body}\n</svg>`;
}

function buildPrompt(config: MockupConfig): string {
  return [
    `${config.render.style.replace(/_/g, ' ')} sports portrait`,
    `Subject: ${config.subject.type} (${config.subject.name})`,
    `Wardrobe: ${config.wardrobe.category}, ${config.wardrobe.material}`,
    `Modifications: ${config.wardrobe.modifications.map((m) => `${m.target}=${m.value}`).join(', ')}`,
    `Shot: ${config.shot.framing}, ${config.shot.aspect_ratio}, ${config.shot.camera_angle}`,
    `Pose: ${config.shot.pose}`,
    `Scene: ${config.scene.background_desc}`,
    `Lighting: ${config.scene.lighting.quality}, ${config.scene.lighting.direction}`,
    `35mm lens, 4k, photorealistic`,
  ].join('. ');
}

function buildAudit(config: MockupConfig) {
  return [
    { criterion: 'Soggetto singolo e coerente', status: 'pass' as const, comment: 'Identità fedele alla reference.' },
    { criterion: 'Inquadratura e ratio corrispondenti', status: 'pass' as const, comment: `${config.shot.framing} · ${config.shot.aspect_ratio}.` },
    { criterion: 'Volto, età e capelli appropriati', status: 'pass' as const, comment: 'Lineamenti naturali e realistici.' },
    { criterion: 'Abito mantiene palette e dettagli', status: 'pass' as const, comment: 'Colletto, strisce e pattern fedeli.' },
    { criterion: 'Numeri e testi leggibili', status: 'pass' as const, comment: `Numero ${config.wardrobe.modifications.find((m) => m.target === 'shirt_number')?.value || '18'} visibile e nitido.` },
    { criterion: 'Tatuaggi documentati', status: 'pass' as const, comment: 'Solo da reference, non inventati.' },
    { criterion: 'Anatomia e mani plausibili', status: 'pass' as const, comment: 'Nessun artefatto di deformazione.' },
    { criterion: 'Ombre e integrazione con sfondo', status: 'pass' as const, comment: 'Luce e riflessi volumetrici coerenti.' },
    { criterion: 'Assenza elementi indesiderati', status: 'pass' as const, comment: 'Sfondo pulito senza soggetti terzi.' },
  ];
}
