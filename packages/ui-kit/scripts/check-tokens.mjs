// Pizzico — packages/ui-kit/scripts/check-tokens.mjs
// Licenza: MIT OR Apache-2.0
//
// Gate della Fase 6a. Verifica, senza dipendenze:
//   1. pizzart.ts e pizzart.css dichiarano gli stessi token con gli stessi valori
//   2. nessun custom property dichiarato due volte nello stesso blocco
//   3. ogni var(--pz-*) usato nel codice risolve a un token dichiarato
//   4. zero emoji in packages/ui-kit e packages/ui-web (docs/ui/design-decisions.md §7)
//
// Uso: node packages/ui-kit/scripts/check-tokens.mjs

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname, extname, relative } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = join(HERE, '..', '..', '..');

const TS_TOKENS = join(HERE, '..', 'src', 'tokens', 'pizzart.ts');
const CSS_TOKENS = [
  join(HERE, '..', 'src', 'tokens', 'tokens.css'),
  join(HERE, '..', 'src', 'tokens', 'pizzart.css'),
];
const SCAN_DIRS = [
  join(ROOT, 'packages', 'ui-kit', 'src'),
  join(ROOT, 'packages', 'ui-web', 'src'),
];

const problems = [];
const notes = [];

const normalize = (value) => value.trim().replace(/\s+/g, ' ');

// ── 1. token TS ───────────────────────────────────────────────────────────────

const tsSource = await readFile(TS_TOKENS, 'utf8');
const tsTokens = new Map();
for (const match of tsSource.matchAll(/^\s*'(--pz-[a-z0-9-]+)':\s*'([^']*)',/gm)) {
  tsTokens.set(match[1], normalize(match[2]));
}
if (tsTokens.size === 0) problems.push('pizzart.ts: nessun token trovato');
console.log(`pizzart.ts      : ${tsTokens.size} token`);

// ── 2. token CSS, per blocco, con rilevamento duplicati ───────────────────────

const cssBlocks = [];
for (const file of CSS_TOKENS) {
  const css = await readFile(file, 'utf8');
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const match of noComments.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selector = normalize(match[1]);
    const seen = new Map();
    for (const decl of match[2].matchAll(/(--pz-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
      const name = decl[1];
      if (seen.has(name)) {
        problems.push(`${relative(ROOT, file)} → blocco "${selector}": "${name}" dichiarato due volte`);
      }
      seen.set(name, normalize(decl[2]));
    }
    cssBlocks.push({ file, selector, tokens: seen });
  }
}

const allCssNames = new Set(cssBlocks.flatMap((b) => [...b.tokens.keys()]));
console.log(`CSS             : ${allCssNames.size} token distinti su ${cssBlocks.length} blocchi`);

const pizzartBlock = cssBlocks.find((b) => b.selector === '[data-theme="pizzart"]');
if (!pizzartBlock) {
  problems.push('pizzart.css: blocco [data-theme="pizzart"] non trovato');
} else {
  console.log(`pizzart.css     : ${pizzartBlock.tokens.size} token nel blocco tema`);

  // ── 1b. specularità TS ↔ CSS ───────────────────────────────────────────────
  for (const [name, value] of tsTokens) {
    if (!pizzartBlock.tokens.has(name)) {
      problems.push(`"${name}" è in pizzart.ts ma non in pizzart.css`);
    } else if (pizzartBlock.tokens.get(name) !== value) {
      problems.push(
        `"${name}" diverge → ts: "${value}" | css: "${pizzartBlock.tokens.get(name)}"`
      );
    }
  }
  for (const name of pizzartBlock.tokens.keys()) {
    if (!tsTokens.has(name)) problems.push(`"${name}" è in pizzart.css ma non in pizzart.ts`);
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
for (const [name, files] of usedNames) {
  if (!allCssNames.has(name)) {
    problems.push(`var(${name}) usato ma mai dichiarato — in ${[...files].join(', ')}`);
  }
}
console.log(`var(--pz-*)     : ${usedNames.size} distinte usate, tutte dichiarate? ${problems.length === 0 ? 'sì' : 'vedi errori'}`);

// ── 4. zero emoji (ratchet) ───────────────────────────────────────────────────
//
// docs/ui/design-decisions.md §7 impone zero emoji, ma i componenti attuali ne
// contengono ancora: sono debito che va estinto in 6c/6d riscrivendo i
// componenti, e la 6a ha il divieto esplicito di toccarli. Il controllo quindi
// è un ratchet: fallisce se compare un'emoji in un file non a baseline, o se un
// file a baseline ne aggiunge altre. Non chiede di rieditare ciò che è fuori
// perimetro, ma impedisce di peggiorare.

const BASELINE_FILE = join(HERE, 'emoji-baseline.json');
const updateBaseline = process.argv.includes('--update-baseline');

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{1F000}-\u{1F2FF}\u{2600}-\u{27BF}\u{FE0F}]/u;

/** Conta le righe che contengono almeno un'emoji, per file relativo alla root. */
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
  console.log(`baseline emoji aggiornata: ${inScope.size} file, ${[...inScope.values()].reduce((a, b) => a + b, 0)} righe`);
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
console.log(`emoji           : ${baselineTotal} righe in ${inScope.size} file a baseline (in 6c/6d vanno a zero)`);

// apps/web/src è fuori dal perimetro della 6a: solo segnalazione.
const webApp = await walk(join(ROOT, 'apps', 'web', 'src'));
const appsEmoji = await countEmoji(webApp);
const appsTotal = [...appsEmoji.values()].reduce((a, b) => a + b, 0);
if (appsTotal) {
  notes.push(
    `apps/web/src contiene ${appsTotal} righe con emoji: fuori perimetro 6a, va rimosso in 6c/6d.`
  );
}

// ── esito ─────────────────────────────────────────────────────────────────────

console.log('');
for (const note of notes) console.log(`NOTA  ${note}`);
if (problems.length === 0) {
  console.log(
    'OK — token coerenti TS↔CSS, nessun duplicato, nessuna variabile orfana, nessuna emoji nuova.'
  );
  process.exit(0);
}
for (const problem of problems) console.error(`ERRORE  ${problem}`);
console.error(`\n${problems.length} problema/i.`);
process.exit(1);
