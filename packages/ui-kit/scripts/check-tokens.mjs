// Pizzico — packages/ui-kit/scripts/check-tokens.mjs
// Licenza: MIT OR Apache-2.0
//
// Gate dei token. Verifica, senza dipendenze:
//   1. ogni token canonico di pizzart.ts esiste in tokens.css :root con lo stesso
//      valore (tokens.css può avere token in più: derivati e alias v1)
//   2. nessun custom property dichiarato due volte nello stesso blocco
//   3. ogni var(--pz-*) usato nel codice risolve a un token dichiarato
//   4. zero emoji nuove (ratchet su baseline, docs/ui/design-decisions.md §7)
//
// Uso: node packages/ui-kit/scripts/check-tokens.mjs [--update-baseline]

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname, extname, relative } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = join(HERE, '..', '..', '..');

const TS_TOKENS = join(HERE, '..', 'src', 'tokens', 'pizzart.ts');
const CSS_TOKENS = join(HERE, '..', 'src', 'tokens', 'tokens.css');
const SCAN_DIRS = [
  join(ROOT, 'packages', 'ui-kit', 'src'),
  join(ROOT, 'packages', 'ui-web', 'src'),
];

const problems = [];
const notes = [];

const normalize = (value) => value.trim().replace(/\s+/g, ' ');

// ── 1. token canonici (TypeScript) ────────────────────────────────────────────

const tsSource = await readFile(TS_TOKENS, 'utf8');
const tsTokens = new Map();
for (const match of tsSource.matchAll(/^\s*'(--pz-[a-z0-9-]+)':\s*'([^']*)',/gm)) {
  tsTokens.set(match[1], normalize(match[2]));
}
if (tsTokens.size === 0) problems.push('pizzart.ts: nessun token trovato');
console.log(`pizzart.ts      : ${tsTokens.size} token canonici`);

// ── 2. CSS: blocchi, duplicati, valori ───────────────────────────────────────

const css = await readFile(CSS_TOKENS, 'utf8');
const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
const blocks = [];
for (const match of noComments.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
  const selector = normalize(match[1]);
  const seen = new Map();
  for (const decl of match[2].matchAll(/(--pz-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    const name = decl[1];
    if (seen.has(name)) {
      problems.push(`tokens.css → blocco "${selector}": "${name}" dichiarato due volte`);
    }
    seen.set(name, normalize(decl[2]));
  }
  blocks.push({ selector, tokens: seen });
}

const rootBlock = blocks.find((b) => b.selector === ':root');
const allCssNames = new Set(blocks.flatMap((b) => [...b.tokens.keys()]));

if (!rootBlock) {
  problems.push('tokens.css: blocco :root non trovato');
} else {
  console.log(`tokens.css      : ${allCssNames.size} token dichiarati (${rootBlock.tokens.size} in :root)`);

  // ── 1b. i canonici devono essere presenti e identici ─────────────────────
  for (const [name, value] of tsTokens) {
    if (!rootBlock.tokens.has(name)) {
      problems.push(`"${name}" è in pizzart.ts ma non in tokens.css :root`);
    } else if (rootBlock.tokens.get(name) !== value) {
      problems.push(
        `"${name}" diverge → ts: "${value}" | css: "${rootBlock.tokens.get(name)}"`
      );
    }
  }

  const extra = [...rootBlock.tokens.keys()].filter((name) => !tsTokens.has(name));
  if (extra.length) {
    notes.push(
      `${extra.length} token in :root non canonici (derivati o alias v1): ${extra.join(', ')}`
    );
  }
}

// ── 3. variabili usate ma non dichiarate ─────────────────────────────────────

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (['.css', '.ts'].includes(extname(entry.name))) out.push(full);
  }
  return out;
}

const scanned = (await Promise.all(SCAN_DIRS.map(walk))).flat();
const usedNames = new Map();
for (const file of scanned) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/var\((--pz-[a-z0-9-]+)/g)) {
    if (!usedNames.has(match[1])) usedNames.set(match[1], new Set());
    usedNames.get(match[1]).add(relative(ROOT, file));
  }
}
let orphans = 0;
for (const [name, files] of usedNames) {
  if (!allCssNames.has(name)) {
    orphans += 1;
    problems.push(`var(${name}) usato ma mai dichiarato — in ${[...files].join(', ')}`);
  }
}
console.log(`var(--pz-*)     : ${usedNames.size} distinte usate, ${orphans} orfane`);

// ── 4. zero emoji (ratchet) ─────────────────────────────────────────────────
//
// docs/ui/design-decisions.md §7 impone zero emoji. La 6b ha azzerato quelle di
// layout.ts; LayerRow.ts e le stringhe di main.ts restano, perché sono fuori dal
// perimetro delle fasi di sola shell. Il controllo fallisce se compare un'emoji
// in un file non a baseline o se un file a baseline ne aggiunge.

const BASELINE_FILE = join(HERE, 'emoji-baseline.json');
const updateBaseline = process.argv.includes('--update-baseline');

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{FE0F}]/u;

async function countEmoji(files) {
  const counts = new Map();
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const lines = text.split(/\r?\n/).filter((line) => EMOJI.test(line)).length;
    if (lines > 0) counts.set(relative(ROOT, file).split('\\').join('/'), lines);
  }
  return counts;
}

const inScope = await countEmoji(scanned);

if (updateBaseline) {
  const ordered = Object.fromEntries([...inScope.entries()].sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(BASELINE_FILE, JSON.stringify(ordered, null, 2) + '\n', 'utf8');
  const total = [...inScope.values()].reduce((a, b) => a + b, 0);
  console.log(`baseline emoji aggiornata: ${inScope.size} file, ${total} righe`);
  process.exit(0);
}

let baseline = {};
try {
  baseline = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
} catch {
  problems.push('emoji-baseline.json assente o illeggibile: eseguire con --update-baseline');
}

let baselineTotal = 0;
for (const [file, count] of inScope) {
  const expected = baseline[file];
  baselineTotal += count;
  if (expected === undefined) {
    problems.push(`emoji in un file non a baseline: ${file} (${count} righe)`);
  } else if (count > expected) {
    problems.push(`emoji aumentate in ${file}: ${count} righe, baseline ${expected}`);
  } else if (count < expected) {
    notes.push(`${file}: emoji scese a ${count} (baseline ${expected}) — si può abbassare la baseline.`);
  }
}
for (const file of Object.keys(baseline)) {
  if (!inScope.has(file)) notes.push(`${file}: non contiene più emoji, rimuovibile dalla baseline.`);
}
console.log(`emoji           : ${baselineTotal} righe in ${inScope.size} file a baseline`);

const webApp = await walk(join(ROOT, 'apps', 'web', 'src'));
const appsEmoji = await countEmoji(webApp);
const appsTotal = [...appsEmoji.values()].reduce((a, b) => a + b, 0);
if (appsTotal) {
  notes.push(`apps/web/src contiene ${appsTotal} righe con emoji: fuori perimetro, va rimosso in 6c/6d.`);
}

// ── esito ─────────────────────────────────────────────────────────────────────

console.log('');
for (const note of notes) console.log(`NOTA  ${note}`);
if (problems.length === 0) {
  console.log(
    'OK — canonici allineati TS↔CSS, nessun duplicato, nessuna variabile orfana, nessuna emoji nuova.'
  );
  process.exit(0);
}
for (const problem of problems) console.error(`ERRORE  ${problem}`);
console.error(`\n${problems.length} problema/i.`);
process.exit(1);
