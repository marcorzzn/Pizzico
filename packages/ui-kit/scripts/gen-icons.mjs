// Pizzico — packages/ui-kit/scripts/gen-icons.mjs
// Licenza: MIT OR Apache-2.0
//
// Genera src/icons/index.ts dalle icone Lucide (licenza ISC).
//
// Perché un generatore invece di SVG scritti a mano: le geometrie dei path
// vengono dai file ufficiali, non dalla memoria di chi scrive. Il modulo
// prodotto è autoconsistente (nessuna dipendenza a runtime) e verificabile.
//
// Uso:  node packages/ui-kit/scripts/gen-icons.mjs
//
// Rigenerazione: aggiornare LUCIDE_VERSION e rilanciare. Il file
// src/icons/icons.lock.json registra versione e sha256 di ogni sorgente.

import { createHash } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const OUT_DIR = join(HERE, '..', 'src', 'icons');

const LUCIDE_VERSION = '1.61.0';
const BASE = `https://unpkg.com/lucide-static@${LUCIDE_VERSION}/icons`;

// [nome file lucide, nome export, fallback per icone rinominate a monte]
const ICONS = [
  // Toolbar
  ['pen', 'PenIcon'],
  ['square', 'SquareIcon'],
  ['circle', 'CircleIcon'],
  ['type', 'TypeIcon'],
  ['eraser', 'EraserIcon'],
  ['hand', 'HandIcon'],
  ['zoom-in', 'ZoomInIcon'],
  ['zoom-out', 'ZoomOutIcon'],
  ['pipette', 'PipetteIcon'],
  // Strumenti della shell (Fase 6b)
  ['move', 'MoveIcon'],
  ['square-dashed', 'SquareDashedIcon'],
  ['brush', 'BrushIcon'],
  ['spline', 'SplineIcon'],
  ['wand-sparkles', 'WandSparklesIcon'],
  ['crop', 'CropIcon'],
  // Azioni
  ['undo', 'UndoIcon'],
  ['redo', 'RedoIcon'],
  ['save', 'SaveIcon'],
  ['folder-open', 'FolderOpenIcon'],
  ['download', 'DownloadIcon'],
  ['upload', 'UploadIcon'],
  ['trash-2', 'Trash2Icon'],
  ['plus', 'PlusIcon'],
  ['eye', 'EyeIcon'],
  ['eye-off', 'EyeOffIcon'],
  ['layers', 'LayersIcon'],
  ['sliders', 'SlidersIcon'],
  ['palette', 'PaletteIcon'],
  ['chevron-down', 'ChevronDownIcon'],
  ['command', 'CommandIcon'],
  ['sun', 'SunIcon'],
  ['sparkles', 'SparklesIcon'],
  ['image', 'ImageIcon'],
  // Stato
  ['check', 'CheckIcon'],
  ['x', 'XIcon'],
  ['circle-alert', 'AlertCircleIcon', ['alert-circle']],
  ['info', 'InfoIcon'],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// unpkg a volte risponde 429/5xx su richieste ravvicinate: si ritenta con backoff.
async function fetchWithRetry(url, attempts = 4) {
  let lastError;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return { ok: true, text: await res.text() };
      lastError = `HTTP ${res.status} ${res.statusText}`;
      if (res.status < 500 && res.status !== 429) return { ok: false, error: lastError };
    } catch (err) {
      lastError = err.message;
    }
    if (i < attempts) await sleep(400 * i);
  }
  return { ok: false, error: lastError };
}

async function fetchIcon(name, fallbacks = []) {
  const detail = [];
  for (const candidate of [name, ...fallbacks]) {
    const res = await fetchWithRetry(`${BASE}/${candidate}.svg`);
    if (res.ok) return { sourceName: candidate, text: res.text };
    detail.push(`${candidate}: ${res.error}`);
    await sleep(120);
  }
  throw new Error(
    `icona non trovata: ${name} (tentativi: ${detail.join('; ') || 'nessuno'})`
  );
}

// Estrae il markup interno dell'<svg>, scartando commento di licenza e wrapper.
function innerMarkup(svg) {
  const openEnd = svg.indexOf('>', svg.indexOf('<svg'));
  const closeStart = svg.lastIndexOf('</svg>');
  if (openEnd === -1 || closeStart === -1) throw new Error('SVG senza wrapper <svg>');
  return svg
    .slice(openEnd + 1, closeStart)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');
}

const entries = [];
const lock = {};

for (const [name, exportName, fallbacks] of ICONS) {
  const { sourceName, text } = await fetchIcon(name, fallbacks);

  const checks = [
    ['<svg', text.includes('<svg')],
    ['viewBox 0 0 24 24', text.includes('viewBox="0 0 24 24"')],
    ['stroke currentColor', text.includes('stroke="currentColor"')],
    ['fill none', text.includes('fill="none"')],
    ['almeno un figlio', /<(path|circle|rect|line|polyline|ellipse)\b/.test(text)],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([label]) => label);
  if (failed.length) throw new Error(`${sourceName}.svg non valido: manca ${failed.join(', ')}`);

  const inner = innerMarkup(text);
  entries.push({ key: sourceName, exportName, inner });
  lock[sourceName] = {
    lucideVersion: LUCIDE_VERSION,
    source: `${BASE}/${sourceName}.svg`,
    sha256: createHash('sha256').update(text, 'utf8').digest('hex'),
  };
  console.log(`ok  ${sourceName.padEnd(14)} -> ${exportName.padEnd(16)} ${text.length} byte`);
}

entries.sort((a, b) => a.key.localeCompare(b.key));

const header = `// Pizzico — packages/ui-kit/src/icons/index.ts
// Licenza: MIT OR Apache-2.0
//
// FILE GENERATO — non modificare a mano.
//   node packages/ui-kit/scripts/gen-icons.mjs
//
// Icone: Lucide v${LUCIDE_VERSION} (ISC). Attribution in docs/ui/icons.md.
// Ogni icona usa stroke="currentColor": eredita il colore del testo e non ha
// colori cablati. Dichiarativa e decorativa: aria-hidden, il nome accessibile
// va sul controllo che la contiene.
`;

const body = entries
  .map((e) => `  ${JSON.stringify(e.key)}: ${JSON.stringify(e.inner)},`)
  .join('\n');

const named = entries
  .map((e) => `export const ${e.exportName} = (size: number = 16): string => icon('${e.key}', size);`)
  .join('\n');

const ts = `${header}
const PATHS = {
${body}
} as const;

export type PizzicoIconName = keyof typeof PATHS;

/**
 * Restituisce l'SVG come stringa, senza colori cablati.
 *
 * @param name nome dell'icona (vedi \`iconNames\`)
 * @param size lato in px; la scala ammessa è 16 (toolbar, righe elenco) o 20 (bottoni principali)
 * @param className classe CSS aggiuntiva sull'elemento svg
 */
export function icon(name: PizzicoIconName, size: number = 16, className?: string): string {
  const cls = className ? \`lucide lucide-\${name} \${className}\` : \`lucide lucide-\${name}\`;
  return (
    \`<svg class="\${cls}" xmlns="http://www.w3.org/2000/svg" width="\${size}" height="\${size}" \` +
    \`viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" \` +
    \`stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">\` +
    \`\${PATHS[name]}</svg>\`
  );
}

/** Nomi disponibili, in ordine alfabetico. */
export const iconNames = Object.keys(PATHS) as PizzicoIconName[];

${named}
`;

await mkdir(OUT_DIR, { recursive: true });
await writeFile(join(OUT_DIR, 'index.ts'), ts, 'utf8');
await writeFile(join(OUT_DIR, 'icons.lock.json'), JSON.stringify(lock, null, 2) + '\n', 'utf8');
console.log(`\nscritti ${entries.length} icone in src/icons/index.ts (+ icons.lock.json)`);
