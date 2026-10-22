// Pizzico — apps/web/src/main.ts
// Riferimento manifesto: §3.1, §5.5, §11 Step 8
// Licenza: MIT OR Apache-2.0
//
// Nota architetturale (§3, §12):
// Il TypeScript si limita a:
//   1. Costruire la shell UI (DesktopShellLayout)
//   2. Inizializzare il modulo WASM (initWasm)
//   3. Delegare TUTTO il rendering WebGPU al core Rust via init_webgpu()
//
// NESSUN codice WebGPU è presente in questo file.
// Tutta la logica GPU (adapter, device, surface, shader WGSL, render loop)
// vive in crates/wasm-bindings/src/gpu/render.rs

import '@pizzico/ui-web/src/styles.css';
import { DesktopShellLayout } from '@pizzico/ui-web';
import { Slider, ColorPicker, LayerRow, Button } from '@pizzico/ui-kit';
import { initWasm, add, pizzico_version, init_webgpu } from '@pizzico/worker-core';

console.log('🍕 Pizzico Engine initializing…');

// ── 1. Inizializzazione del modulo WASM ───────────────────────────────────────
// Carichiamo il .wasm generato da wasm-pack; tutte le chiamate successive a
// add() / init_webgpu() ecc. eseguono codice Rust compilato.

let wasmReady = false;

async function setupWasm(): Promise<void> {
  try {
    await initWasm();
    wasmReady = true;
    const v = pizzico_version();
    console.log(
      `[WASM Bridge] ✅ Modulo Rust inizializzato — version: ${v}, add(2,3) = ${add(2, 3)}`
    );
    // Aggiorna badge in Inspector se già presente nel DOM
    const badge = document.getElementById('wasm-result');
    if (badge) {
      badge.textContent = `WASM Rust v${v} caricato`;
      badge.style.color = '#38bdf8';
    }
  } catch (err) {
    console.error('[WASM Bridge] ❌ Inizializzazione WASM fallita:', err);
  }
}

// ── 2. Costruzione Shell UI ───────────────────────────────────────────────────

const appContainer = document.getElementById('app')!;
const shell = new DesktopShellLayout({
  onModeChange: (mode) => console.log(`[Workspace] Modalità attiva: ${mode}`),
  onToolSelect: (tool) => console.log(`[Toolbar] Strumento selezionato: ${tool}`),
  onCommand: (cmdId) => console.log(`[Command] Esecuzione: ${cmdId}`),
});
appContainer.appendChild(shell.root);

// ── 3. Pannello Livelli ───────────────────────────────────────────────────────

const bgLayerRow = new LayerRow({
  layer: {
    id: 1,
    name: 'Sfondo — WebGPU (Rust)',
    kind: 'Raster',
    visible: true,
    locked: false,
    opacity: 1.0,
    blendMode: 'Normal',
  },
  selected: true,
  onSelect: (id) => console.log(`Livello selezionato: ${id}`),
});
shell.layersPanelBody.appendChild(bgLayerRow.element);

const addLayerBtn = new Button({
  label: '+ Nuovo Livello',
  variant: 'secondary',
  onClick: () => {
    const newId = Date.now();
    const newRow = new LayerRow({
      layer: {
        id: newId,
        name: `Livello ${shell.layersPanelBody.children.length}`,
        kind: 'Raster',
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'Normal',
      },
      onSelect: (id) => console.log(`Livello selezionato: ${id}`),
    });
    shell.layersPanelBody.insertBefore(newRow.element, addLayerBtn.element);
  },
});
shell.layersPanelBody.appendChild(addLayerBtn.element);

// ── 4. Inspector – Badge WASM Bridge ─────────────────────────────────────────

const wasmStatusBox = document.createElement('div');
wasmStatusBox.id = 'wasm-bridge-status';
wasmStatusBox.style.cssText = `
  margin: 12px 0;
  padding: 10px 12px;
  background: rgba(79, 70, 229, 0.12);
  border: 1px solid rgba(79, 70, 229, 0.35);
  border-radius: 8px;
  font-size: 12px;
  color: #c7d2fe;
`;
wasmStatusBox.innerHTML = `<strong>Rust ↔ WASM Bridge</strong><br><span id="wasm-result">In attesa WASM…</span>`;
shell.inspectorPanelBody.appendChild(wasmStatusBox);

// Pulsante di verifica: chiama add() Rust
const testWasmBtn = new Button({
  label: '⚡ Esegui add(2, 3) via WASM',
  variant: 'primary',
  onClick: () => {
    const res = wasmReady ? add(2, 3) : 2 + 3;
    const resultSpan = document.getElementById('wasm-result');
    if (resultSpan) {
      resultSpan.textContent = `add(2, 3) = ${res} (${wasmReady ? 'Rust WASM' : 'JS fallback'})`;
      resultSpan.style.color = '#34d399';
    }
    console.log(`[WASM Bridge Click] add(2, 3) = ${res}`);
  },
});
shell.inspectorPanelBody.appendChild(testWasmBtn.element);

// ── 5. Inspector – Controlli ──────────────────────────────────────────────────

shell.inspectorPanelBody.appendChild(
  new Slider({ label: 'Opacità Livello', min: 0, max: 100, value: 100, unit: '%',
    onChange: (v) => console.log(`Opacità: ${v}%`) }).element
);
shell.inspectorPanelBody.appendChild(
  new Slider({ label: 'Dimensione Tratto', min: 1, max: 200, value: 24, unit: 'px',
    onChange: (v) => console.log(`Pennello: ${v}px`) }).element
);
shell.inspectorPanelBody.appendChild(
  new ColorPicker({ color: '#4f46e5',
    onChange: (c) => console.log(`Colore: ${c}`) }).element
);

// ── 6. Boot asincrono: prima WASM, poi WebGPU (tutto in Rust) ─────────────────
// Il rendering WebGPU è delegato INTERAMENTE al core Rust.
// Il canvas deve già essere nel DOM prima che init_webgpu() lo cerchi.

(async () => {
  await setupWasm();

  if (wasmReady) {
    // Rust prende il controllo del canvas e avvia il loop di rendering
    try {
      await init_webgpu('pizzico-canvas');
      console.log('[WebGPU] ✅ Render loop Rust attivo — 60 FPS via RAF');
    } catch (err) {
      console.warn('[WebGPU] ⚠️ Fallback a Canvas2D — WebGPU non disponibile:', err);
      // Fallback Canvas2D minimale
      const ctx = shell.canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#121316';
        ctx.fillRect(0, 0, shell.canvas.width, shell.canvas.height);
        const grad = ctx.createLinearGradient(0, 0, shell.canvas.width, shell.canvas.height);
        grad.addColorStop(0, '#4f46e5');
        grad.addColorStop(1, '#06b6d4');
        ctx.fillStyle = grad;
        ctx.roundRect(
          shell.canvas.width * 0.1,
          shell.canvas.height * 0.2,
          shell.canvas.width * 0.8,
          shell.canvas.height * 0.6,
          16
        );
        ctx.fill();
      }
    }
  } else {
    console.warn('[Boot] WASM non pronto — init_webgpu() non chiamata');
  }
})();
