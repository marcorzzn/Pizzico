// Pizzico — apps/web/src/main.ts
// Riferimento manifesto: §3.1, §5.3, §5.4, §5.5, §6.1, §6.2, §6.5, §11 Step 8
// Licenza: MIT OR Apache-2.0
//
// Nota architetturale (§3, §12):
// Il TypeScript si limita a:
//   1. Costruire la shell UI (DesktopShellLayout)
//   2. Inizializzare il modulo WASM (initWasm)
//   3. Gestire l'I/O file (pulsante "Apri PSD" e Drag & Drop con spinner e toast)
//   4. Passare il buffer binario al parser Rust via load_psd_bytes()
//   5. Renderizzare dinamicamente il pannello livelli leggendoli da get_layers_metadata()
//   6. Delegare TUTTO il rendering WebGPU al core Rust via init_webgpu()
//
// NESSUN codice WebGPU è presente in questo file.
// Tutta la logica GPU (adapter, device, surface, shader WGSL, render loop)
// vive in crates/wasm-bindings/src/gpu/render.rs

import '@pizzico/ui-web/src/styles.css';
import { DesktopShellLayout } from '@pizzico/ui-web';
import { Slider, ColorPicker, LayerRow, Button } from '@pizzico/ui-kit';
import { LayerMetadata } from '@pizzico/shared';
import {
  initWasm,
  add,
  pizzico_version,
  init_webgpu,
  create_document,
  add_raster_layer,
  get_layer_count,
  get_layers_metadata,
  set_layer_opacity,
  set_layer_visibility,
  select_layer,
  remove_layer,
  get_active_layer_id,
  load_psd_bytes,
  get_document_metadata,
} from '@pizzico/worker-core';

console.log('🍕 Pizzico Engine initializing…');

// ── 1. Costruzione Shell UI ───────────────────────────────────────────────────

const appContainer = document.getElementById('app')!;
const shell = new DesktopShellLayout({
  onModeChange: (mode) => console.log(`[Workspace] Modalità attiva: ${mode}`),
  onToolSelect: (tool) => console.log(`[Toolbar] Strumento selezionato: ${tool}`),
  onCommand: (cmdId) => console.log(`[Command] Esecuzione: ${cmdId}`),
  onOpenPsd: () => fileInput.click(),
});
appContainer.appendChild(shell.root);

// ── 2. Toast Notification System (§5.6) ───────────────────────────────────────

const toastContainer = document.createElement('div');
toastContainer.className = 'pz-toast-container';
document.body.appendChild(toastContainer);

function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
  const toast = document.createElement('div');
  toast.className = `pz-toast pz-toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── 3. Loading Spinner Overlay (§5.6) ─────────────────────────────────────────

let spinnerOverlay: HTMLDivElement | null = null;

function showLoadingSpinner(label = 'Elaborazione in corso…') {
  if (spinnerOverlay) return;
  spinnerOverlay = document.createElement('div');
  spinnerOverlay.className = 'pz-loading-overlay';
  spinnerOverlay.innerHTML = `
    <div class="pz-spinner"></div>
    <div style="font-weight: 500;">${label}</div>
  `;
  document.body.appendChild(spinnerOverlay);
}

function hideLoadingSpinner() {
  if (spinnerOverlay) {
    spinnerOverlay.remove();
    spinnerOverlay = null;
  }
}

// ── 4. Inizializzazione WASM Bridge ───────────────────────────────────────────

let wasmReady = false;

async function setupWasm(): Promise<void> {
  try {
    await initWasm();
    wasmReady = true;
    const v = pizzico_version();
    console.log(
      `[WASM Bridge] ✅ Modulo Rust inizializzato — version: ${v}, add(2,3) = ${add(2, 3)}`
    );
    updateWasmStatusBadge(`WASM Rust v${v} pronto`, '#38bdf8');
    renderLayersPanel();
    updateInspector();
  } catch (err) {
    console.error('[WASM Bridge] ❌ Inizializzazione WASM fallita:', err);
    updateWasmStatusBadge('Errore caricamento WASM', '#ef4444');
  }
}

function updateWasmStatusBadge(text: string, color: string) {
  const badge = document.getElementById('wasm-result');
  if (badge) {
    badge.textContent = text;
    badge.style.color = color;
  }
}

// ── 5. I/O File PSD: Input & Drag-and-Drop (§6.5) ──────────────────────────────

// File Input nascosto per apertura file tramite esplora risorse
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.psd,.psb';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  await handlePsdFile(file);
  fileInput.value = ''; // Reset per consentire ricaricamento stesso file
});

/**
 * Gestisce il caricamento completo del file PSD:
 * 1. Warning per file grandi (> 20 MB)
 * 2. Lettura buffer ArrayBuffer -> Uint8Array
 * 3. Chiamata WASM a load_psd_bytes()
 * 4. Aggiornamento automatico del pannello livelli e dell'inspector
 */
async function handlePsdFile(file: File): Promise<void> {
  if (!wasmReady) {
    showToast('⚠️ Engine grafico WASM non ancora pronto', 'warning');
    return;
  }

  const isPsd = file.name.toLowerCase().endsWith('.psd') || file.name.toLowerCase().endsWith('.psb');
  if (!isPsd) {
    showToast(`❌ Il file "${file.name}" non è un file PSD/PSB supportato`, 'error');
    return;
  }

  // Warning per file superiori a 20 MB (§11 Step E)
  if (file.size > 20 * 1024 * 1024) {
    showToast('⚠️ File grande (> 20 MB), il parsing potrebbe richiedere qualche secondo…', 'warning');
  }

  showLoadingSpinner(`Parsing Adobe PSD: "${file.name}"…`);

  // Timeout per dare respiro al thread UI e mostrare lo spinner
  await new Promise((resolve) => setTimeout(resolve, 30));

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    load_psd_bytes(bytes);

    const docMeta = get_document_metadata();
    console.log('[PSD Import] ✅ Documento importato:', docMeta);

    renderLayersPanel();
    updateInspector();
    hideLoadingSpinner();

    showToast(
      `✅ Caricato: ${file.name} (${docMeta?.width ?? 800}×${docMeta?.height ?? 600} px, ${docMeta?.layerCount ?? 0} livelli)`,
      'success'
    );
  } catch (err) {
    hideLoadingSpinner();
    console.error('[PSD Import] ❌ Errore durante il parsing PSD:', err);
    showToast(`❌ Errore parsing PSD: ${err}`, 'error');
  }
}

// ── 6. Drag & Drop sul Canvas e sulla Finestra (§6.5) ─────────────────────────

let dragOverlay: HTMLDivElement | null = null;

function showDragOverlay() {
  if (dragOverlay) return;
  dragOverlay = document.createElement('div');
  dragOverlay.className = 'pz-drag-overlay';
  dragOverlay.innerHTML = `
    <div style="font-size: 36px;">📂</div>
    <div class="pz-drag-overlay-text">Rilascia il file Photoshop (.PSD / .PSB) qui</div>
  `;
  shell.canvasContainer.style.position = 'relative';
  shell.canvasContainer.appendChild(dragOverlay);
}

function hideDragOverlay() {
  if (dragOverlay) {
    dragOverlay.remove();
    dragOverlay = null;
  }
}

['dragenter', 'dragover'].forEach((eventName) => {
  window.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    showDragOverlay();
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  window.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
    const dragEvent = e as DragEvent;
    if (e.type === 'dragleave' && dragEvent.clientX > 0 && dragEvent.clientY > 0) return;
    hideDragOverlay();
  });
});

window.addEventListener('drop', async (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  hideDragOverlay();

  const file = e.dataTransfer?.files?.[0];
  if (file) {
    await handlePsdFile(file);
  }
});

// Helper esposto per test automatizzati e verifica rapida browser
(window as any).__loadSamplePsd = async () => {
  const res = await fetch('/sample-01.psd');
  const blob = await res.blob();
  const file = new File([blob], 'sample-01.psd', { type: 'image/vnd.adobe.photoshop' });
  await handlePsdFile(file);
};

// ── 7. Gestione e Render Dinamico del Pannello Livelli (§5.3, §5.4) ───────────

const layersHeaderContainer = document.createElement('div');
layersHeaderContainer.className = 'pz-layers-toolbar';
layersHeaderContainer.style.cssText = `
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--pz-border-muted, rgba(255,255,255,0.08));
  margin-bottom: 8px;
`;

// Pulsante principale "+ Aggiungi Livello Vuoto"
const addEmptyBtn = new Button({
  label: '➕ Aggiungi Livello Vuoto',
  variant: 'primary',
  onClick: () => {
    if (!wasmReady) return;
    const count = get_layer_count();
    const id = add_raster_layer(`Livello ${count + 1}`, 800, 600, new Uint8Array([0, 0, 0, 0]));
    console.log(`[Layers] Aggiunto livello vuoto (trasparente) ID: ${id}`);
    renderLayersPanel();
    updateInspector();
  },
});
layersHeaderContainer.appendChild(addEmptyBtn.element);

// Quick buttons per test rapido del compositing multi-livello (Rosso & Blu)
const quickBtnsRow = document.createElement('div');
quickBtnsRow.style.cssText = `display: flex; gap: 6px;`;

const addRedBtn = document.createElement('button');
addRedBtn.className = 'pz-btn pz-btn-secondary';
addRedBtn.style.cssText = `flex: 1; font-size: 11px; padding: 5px 8px; cursor: pointer;`;
addRedBtn.innerHTML = '🔴 + Rosso';
addRedBtn.title = 'Aggiungi livello rosso opaco (800x600)';
addRedBtn.addEventListener('click', () => {
  if (!wasmReady) return;
  const id = add_raster_layer('Layer Rosso', 800, 600, new Uint8Array([255, 0, 0, 255]));
  console.log(`[Layers] Aggiunto Layer Rosso: id = ${id}`);
  renderLayersPanel();
  updateInspector();
});

const addBlueBtn = document.createElement('button');
addBlueBtn.className = 'pz-btn pz-btn-secondary';
addBlueBtn.style.cssText = `flex: 1; font-size: 11px; padding: 5px 8px; cursor: pointer;`;
addBlueBtn.innerHTML = '🔵 + Blu';
addBlueBtn.title = 'Aggiungi livello blu con 50% trasparenza (alpha 128)';
addBlueBtn.addEventListener('click', () => {
  if (!wasmReady) return;
  const id = add_raster_layer('Layer Blu', 800, 600, new Uint8Array([0, 0, 255, 128]));
  console.log(`[Layers] Aggiunto Layer Blu: id = ${id}`);
  renderLayersPanel();
  updateInspector();
});

const resetBtn = document.createElement('button');
resetBtn.className = 'pz-btn pz-btn-secondary';
resetBtn.style.cssText = `font-size: 11px; padding: 5px 8px; cursor: pointer;`;
resetBtn.innerHTML = '⚪ Reset';
resetBtn.title = 'Resetta documento vuoto';
resetBtn.addEventListener('click', () => {
  if (!wasmReady) return;
  create_document(800, 600);
  console.log('[Layers] Documento resettato');
  renderLayersPanel();
  updateInspector();
});

quickBtnsRow.appendChild(addRedBtn);
quickBtnsRow.appendChild(addBlueBtn);
quickBtnsRow.appendChild(resetBtn);
layersHeaderContainer.appendChild(quickBtnsRow);

const layersListContainer = document.createElement('div');
layersListContainer.className = 'pz-layers-list';
layersListContainer.style.cssText = `
  display: flex;
  flex-direction: column-reverse; /* I livelli in cima allo stack sono in alto */
  gap: 4px;
  overflow-y: auto;
  max-height: 400px;
`;

shell.layersPanelBody.innerHTML = '';
shell.layersPanelBody.appendChild(layersHeaderContainer);
shell.layersPanelBody.appendChild(layersListContainer);

/**
 * Legge i metadati dal core Rust tramite `get_layers_metadata()` e ripopola il DOM.
 */
function renderLayersPanel() {
  if (!wasmReady) return;

  const metadataList: LayerMetadata[] = get_layers_metadata() || [];
  const activeId = get_active_layer_id();

  layersListContainer.innerHTML = '';

  if (metadataList.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.style.cssText = `
      padding: 16px;
      text-align: center;
      color: var(--pz-text-muted);
      font-size: 12px;
    `;
    emptyNotice.textContent = 'Nessun livello presente. Apri un PSD o crea un livello.';
    layersListContainer.appendChild(emptyNotice);
    return;
  }

  for (const meta of metadataList) {
    const isSelected = activeId !== undefined && activeId === meta.id;

    const row = new LayerRow({
      layer: meta,
      selected: isSelected,
      onSelect: (id) => {
        select_layer(id);
        renderLayersPanel();
        updateInspector();
      },
      onToggleVisibility: (id) => {
        set_layer_visibility(id, !meta.visible);
        renderLayersPanel();
        updateInspector();
      },
      onOpacityChange: (id, opacity) => {
        set_layer_opacity(id, opacity);
        syncInspectorOpacity(opacity);
      },
      onDelete: (id) => {
        remove_layer(id);
        renderLayersPanel();
        updateInspector();
      },
    });

    layersListContainer.appendChild(row.element);
  }
}

// ── 8. Inspector Panel (§5.3 Context-Aware Surface) ───────────────────────────

shell.inspectorPanelBody.innerHTML = '';

// Status Card Rust ↔ WASM & Document Metadata
const wasmStatusBox = document.createElement('div');
wasmStatusBox.id = 'wasm-bridge-status';
wasmStatusBox.style.cssText = `
  margin-bottom: 12px;
  padding: 10px 12px;
  background: rgba(79, 70, 229, 0.12);
  border: 1px solid rgba(79, 70, 229, 0.35);
  border-radius: 8px;
  font-size: 12px;
  color: #c7d2fe;
`;
wasmStatusBox.innerHTML = `<strong>Rust Core Engine</strong><br><span id="wasm-result">In attesa WASM…</span>`;
shell.inspectorPanelBody.appendChild(wasmStatusBox);

// Scheda Metadati Documento Attivo
const docMetaBox = document.createElement('div');
docMetaBox.id = 'doc-meta-status';
docMetaBox.style.cssText = `
  margin-bottom: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--pz-border-muted, rgba(255,255,255,0.08));
  border-radius: 8px;
  font-size: 12px;
  color: var(--pz-text-secondary);
`;
docMetaBox.innerHTML = `<strong>Documento</strong>: 800 × 600 px · 1 livello`;
shell.inspectorPanelBody.appendChild(docMetaBox);

// Sezione contestuale: Proprietà del livello attivo
const layerPropsSection = document.createElement('div');
layerPropsSection.id = 'active-layer-inspector';
layerPropsSection.style.cssText = `
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--pz-border-muted, rgba(255,255,255,0.08));
  border-radius: 8px;
  margin-bottom: 16px;
`;
shell.inspectorPanelBody.appendChild(layerPropsSection);

function syncInspectorOpacity(opacity: number) {
  const inspectorSlider = document.getElementById('inspector-opacity-input') as HTMLInputElement;
  const inspectorVal = document.getElementById('inspector-opacity-val');
  const pct = Math.round(opacity * 100);
  if (inspectorSlider) inspectorSlider.value = String(pct);
  if (inspectorVal) inspectorVal.textContent = `${pct}%`;
}

function updateInspector() {
  if (!wasmReady) return;

  const docMeta = get_document_metadata();
  if (docMeta) {
    docMetaBox.innerHTML = `
      <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">${docMeta.title}</div>
      <div style="font-size: 11px; color: var(--pz-text-muted);">
        📐 ${docMeta.width} × ${docMeta.height} px · 🗂️ ${docMeta.layerCount} livelli
      </div>
    `;
  }

  const metadataList: LayerMetadata[] = get_layers_metadata() || [];
  const activeId = get_active_layer_id();
  const activeLayer = metadataList.find((l) => l.id === activeId);

  layerPropsSection.innerHTML = '';

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--pz-text-secondary);
  `;
  header.textContent = 'Proprietà Livello';
  layerPropsSection.appendChild(header);

  if (!activeLayer) {
    const noneText = document.createElement('div');
    noneText.style.cssText = `font-size: 12px; color: var(--pz-text-muted);`;
    noneText.textContent = 'Nessun livello selezionato.';
    layerPropsSection.appendChild(noneText);
    return;
  }

  // Nome e tipo livello
  const nameBox = document.createElement('div');
  nameBox.style.cssText = `display: flex; justify-content: space-between; align-items: center; font-size: 13px;`;
  nameBox.innerHTML = `
    <span style="font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${activeLayer.name}">${activeLayer.name}</span>
    <span style="font-size: 11px; padding: 2px 6px; background: rgba(99,102,241,0.2); border-radius: 4px; color: #a5b4fc;">${activeLayer.kind} · ${activeLayer.blendMode}</span>
  `;
  layerPropsSection.appendChild(nameBox);

  // Controllo Opacità sincronizzato
  const opacityPct = Math.round(activeLayer.opacity * 100);
  const opacityRow = document.createElement('div');
  opacityRow.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
  opacityRow.innerHTML = `
    <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--pz-text-secondary);">
      <span>Opacità</span>
      <span id="inspector-opacity-val" style="font-variant-numeric: tabular-nums;">${opacityPct}%</span>
    </div>
  `;

  const slider = document.createElement('input');
  slider.id = 'inspector-opacity-input';
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(opacityPct);
  slider.className = 'pz-slider-input';
  slider.style.cssText = `width: 100%; accent-color: var(--pz-accent-primary); cursor: pointer;`;
  slider.addEventListener('input', (e) => {
    const val = Number((e.target as HTMLInputElement).value);
    const valSpan = document.getElementById('inspector-opacity-val');
    if (valSpan) valSpan.textContent = `${val}%`;

    set_layer_opacity(activeLayer.id, val / 100.0);

    const rowEl = document.querySelector(`.pz-layer-row[data-layer-id="${activeLayer.id}"]`);
    if (rowEl) {
      const rowSlider = rowEl.querySelector('.pz-layer-opacity-slider') as HTMLInputElement;
      const rowVal = rowEl.querySelector('.pz-layer-opacity-val');
      if (rowSlider) rowSlider.value = String(val);
      if (rowVal) rowVal.textContent = `${val}%`;
    }
  });

  opacityRow.appendChild(slider);
  layerPropsSection.appendChild(opacityRow);

  // Toggle visibilità ed eliminazione
  const actionsRow = document.createElement('div');
  actionsRow.style.cssText = `display: flex; gap: 8px; margin-top: 4px;`;

  const visBtn = document.createElement('button');
  visBtn.className = 'pz-btn pz-btn-secondary';
  visBtn.style.cssText = `flex: 1; font-size: 11px; padding: 6px 10px; cursor: pointer;`;
  visBtn.textContent = activeLayer.visible ? '👁️ Visibile' : '🕶️ Nascosto';
  visBtn.addEventListener('click', () => {
    set_layer_visibility(activeLayer.id, !activeLayer.visible);
    renderLayersPanel();
    updateInspector();
  });
  actionsRow.appendChild(visBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'pz-btn pz-btn-secondary';
  delBtn.style.cssText = `font-size: 11px; padding: 6px 10px; color: #f87171; cursor: pointer;`;
  delBtn.textContent = '🗑️ Elimina';
  delBtn.addEventListener('click', () => {
    remove_layer(activeLayer.id);
    renderLayersPanel();
    updateInspector();
  });
  actionsRow.appendChild(delBtn);

  layerPropsSection.appendChild(actionsRow);
}

// Controlli standard pennello/colore
shell.inspectorPanelBody.appendChild(
  new Slider({
    label: 'Dimensione Tratto',
    min: 1,
    max: 200,
    value: 24,
    unit: 'px',
    onChange: (v) => console.log(`Pennello: ${v}px`),
  }).element
);
shell.inspectorPanelBody.appendChild(
  new ColorPicker({
    color: '#4f46e5',
    onChange: (c) => console.log(`Colore: ${c}`),
  }).element
);

// ── 9. Boot asincrono: WASM + WebGPU (tutto gestito in Rust) ──────────────────

(async () => {
  await setupWasm();

  if (wasmReady) {
    try {
      await init_webgpu('pizzico-canvas');
      console.log('[WebGPU] ✅ Render loop Rust attivo — 60 FPS via RAF con dirty checking');
    } catch (err) {
      console.warn('[WebGPU] ⚠️ Fallback a Canvas2D — WebGPU non disponibile:', err);
      const ctx = shell.canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#121316';
        ctx.fillRect(0, 0, shell.canvas.width, shell.canvas.height);
      }
    }
  }
})();
