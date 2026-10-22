// Pizzico — apps/web/src/main.ts
// Riferimento manifesto: §3.1, §5.3, §5.4, §5.5, §6.1, §6.2, §6.5, §10 Fase 1, §11 Step 8
// Licenza: MIT OR Apache-2.0
//
// Nota architetturale (§3, §12):
// Il TypeScript si limita a:
//   1. Costruire la shell UI (DesktopShellLayout)
//   2. Inizializzare il modulo WASM (initWasm)
//   3. Gestire l'I/O file (pulsante "Apri PSD" e Drag & Drop con spinner e toast)
//   4. Catturare eventi mouse/touch per il Brush Tool e inoltrarli a Rust via WASM
//   5. Gestire Undo/Redo sincronizzando pulsanti e scorciatoie (Ctrl+Z / Ctrl+Y)
//   6. Renderizzare dinamicamente il pannello livelli e l'inspector
//   7. Delegare TUTTO il rendering WebGPU al core Rust via init_webgpu()
//
// NESSUN codice WebGPU è presente in questo file.
// Tutta la logica GPU (adapter, device, surface, shader WGSL, render loop)
// vive in crates/wasm-bindings/src/gpu/render.rs

import '@pizzico/ui-web/src/styles.css';
import { DesktopShellLayout } from '@pizzico/ui-web';
import { LayerRow, Button } from '@pizzico/ui-kit';
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
  begin_stroke,
  brush_stroke,
  eraser_stroke,
  end_stroke,
  undo,
  redo,
  can_undo,
  can_redo,
  get_history_info,
} from '@pizzico/worker-core';

console.log('🍕 Pizzico Engine initializing…');

// ── Stato Brush Tool e Disegno (§10 Fase 1) ──────────────────────────────────

let currentTool = 'brush'; // 'brush' | 'eraser' | etc.
let brushRadius = 20;
let brushHardness = 0.8;
let brushOpacity = 1.0;
let brushColorHex = '#22c55e'; // default verde vibrante come da istruzioni
let brushColorRgba = [34, 197, 94, 255]; // [R, G, B, A]

function hexToRgba(hex: string, opacity: number): [number, number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  return [
    (num >> 16) & 255,
    (num >> 8) & 255,
    num & 255,
    Math.round(opacity * 255),
  ];
}

// ── 1. Costruzione Shell UI ───────────────────────────────────────────────────

const appContainer = document.getElementById('app')!;
const shell = new DesktopShellLayout({
  onModeChange: (mode) => console.log(`[Workspace] Modalità attiva: ${mode}`),
  onToolSelect: (tool) => {
    currentTool = tool;
    console.log(`[Toolbar] Strumento selezionato: ${tool}`);
    updateInspector();
  },
  onCommand: (cmdId) => console.log(`[Command] Esecuzione: ${cmdId}`),
  onOpenPsd: () => fileInput.click(),
  onUndo: () => handleUndo(),
  onRedo: () => handleRedo(),
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
    syncHistoryUi();
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

// ── 5. Undo / Redo System (§10 Fase 1) ─────────────────────────────────────────

function syncHistoryUi() {
  if (!wasmReady) return;
  const cu = can_undo();
  const cr = can_redo();
  if (shell?.undoBtn) shell.undoBtn.disabled = !cu;
  if (shell?.redoBtn) shell.redoBtn.disabled = !cr;

  const info = get_history_info();
  if (info) {
    if (shell?.undoBtn) {
      shell.undoBtn.title = cu
        ? `Annulla (Ctrl+Z) · ${info.undoCount} azioni`
        : 'Nessuna azione da annullare';
    }
    if (shell?.redoBtn) {
      shell.redoBtn.title = cr
        ? `Ripristina (Ctrl+Y / Ctrl+Shift+Z) · ${info.redoCount} azioni`
        : 'Nessuna azione da ripristinare';
    }
  }
}

function handleUndo() {
  if (!wasmReady) return;
  const success = undo();
  if (success) {
    syncHistoryUi();
    renderLayersPanel();
    updateInspector();
    showToast('↶ Azione annullata (Undo)', 'success');
  } else {
    showToast('Nessuna azione da annullare', 'warning');
  }
}

function handleRedo() {
  if (!wasmReady) return;
  const success = redo();
  if (success) {
    syncHistoryUi();
    renderLayersPanel();
    updateInspector();
    showToast('↷ Azione ripristinata (Redo)', 'success');
  } else {
    showToast('Nessuna azione da ripristinare', 'warning');
  }
}

// Scorciatoie da tastiera (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, B, E)
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      handleRedo();
    } else {
      handleUndo();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    handleRedo();
  } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    if (e.key.toLowerCase() === 'b') {
      shell.setActiveTool('brush');
      currentTool = 'brush';
      updateInspector();
    } else if (e.key.toLowerCase() === 'e') {
      shell.setActiveTool('eraser');
      currentTool = 'eraser';
      updateInspector();
    }
  }
});

// ── 6. I/O File PSD: Input & Drag-and-Drop (§6.5) ──────────────────────────────

const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.psd,.psb';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  await handlePsdFile(file);
  fileInput.value = '';
});

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

  if (file.size > 20 * 1024 * 1024) {
    showToast('⚠️ File grande (> 20 MB), il parsing potrebbe richiedere qualche secondo…', 'warning');
  }

  showLoadingSpinner(`Parsing Adobe PSD: "${file.name}"…`);
  await new Promise((resolve) => setTimeout(resolve, 30));

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    load_psd_bytes(bytes);

    const docMeta = get_document_metadata();
    console.log('[PSD Import] ✅ Documento importato:', docMeta);

    syncHistoryUi();
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

// Drag & Drop sul Canvas e sulla Finestra
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

// ── 7. Brush Tool: Gestione Eventi Pointer sul Canvas (§10 Fase 1) ────────────

let isDrawing = false;
let lastDocPoint: { x: number; y: number } | null = null;

/**
 * Converte le coordinate dell'evento Pointer nelle coordinate pixel logiche del documento.
 */
function getDocCoordinates(e: PointerEvent): { x: number; y: number } {
  const canvas = shell.canvas;
  const rect = canvas.getBoundingClientRect();
  const docMeta = get_document_metadata();
  const docW = docMeta?.width ?? 800;
  const docH = docMeta?.height ?? 600;

  const clientX = e.clientX - rect.left;
  const clientY = e.clientY - rect.top;

  const scaleX = docW / rect.width;
  const scaleY = docH / rect.height;

  return {
    x: Math.max(0, Math.min(docW - 1, clientX * scaleX)),
    y: Math.max(0, Math.min(docH - 1, clientY * scaleY)),
  };
}

shell.canvas.style.touchAction = 'none';
shell.canvas.style.cursor = 'crosshair';

shell.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  if (e.button !== 0 || !wasmReady) return;
  if (currentTool !== 'brush' && currentTool !== 'eraser') return;

  e.preventDefault();
  try {
    shell.canvas.setPointerCapture(e.pointerId);
  } catch (_) {}

  isDrawing = true;
  const pt = getDocCoordinates(e);
  lastDocPoint = pt;

  begin_stroke();

  if (currentTool === 'eraser') {
    eraser_stroke(pt.x, pt.y, pt.x, pt.y, brushRadius, brushHardness, brushOpacity);
  } else {
    brush_stroke(
      pt.x,
      pt.y,
      pt.x,
      pt.y,
      brushRadius,
      brushHardness,
      new Uint8Array(brushColorRgba),
      brushOpacity
    );
  }
});

shell.canvas.addEventListener('pointermove', (e: PointerEvent) => {
  if (!isDrawing || !lastDocPoint || !wasmReady) return;
  e.preventDefault();

  const pt = getDocCoordinates(e);

  if (currentTool === 'eraser') {
    eraser_stroke(lastDocPoint.x, lastDocPoint.y, pt.x, pt.y, brushRadius, brushHardness, brushOpacity);
  } else {
    brush_stroke(
      lastDocPoint.x,
      lastDocPoint.y,
      pt.x,
      pt.y,
      brushRadius,
      brushHardness,
      new Uint8Array(brushColorRgba),
      brushOpacity
    );
  }

  lastDocPoint = pt;
});

const handlePointerUp = (e: PointerEvent) => {
  if (!isDrawing) return;
  isDrawing = false;
  lastDocPoint = null;
  end_stroke();
  syncHistoryUi();
  try {
    shell.canvas.releasePointerCapture(e.pointerId);
  } catch (_) {}
};

shell.canvas.addEventListener('pointerup', handlePointerUp);
shell.canvas.addEventListener('pointercancel', handlePointerUp);

// Helper di automazione esposti su window per verifica browser e test
(window as any).__testStroke = (x0 = 100, y0 = 100, x1 = 300, y1 = 200) => {
  begin_stroke();
  brush_stroke(
    x0,
    y0,
    x1,
    y1,
    brushRadius,
    brushHardness,
    new Uint8Array(brushColorRgba),
    brushOpacity
  );
  end_stroke();
  syncHistoryUi();
};
(window as any).__undo = () => handleUndo();
(window as any).__redo = () => handleRedo();
(window as any).__getHistory = () => get_history_info();

// ── 8. Gestione e Render Dinamico del Pannello Livelli (§5.3, §5.4) ───────────

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

const addEmptyBtn = new Button({
  label: '➕ Aggiungi Livello Vuoto',
  variant: 'primary',
  onClick: () => {
    if (!wasmReady) return;
    const count = get_layer_count();
    const id = add_raster_layer(`Livello ${count + 1}`, 800, 600, new Uint8Array([0, 0, 0, 0]));
    console.log(`[Layers] Aggiunto livello vuoto ID: ${id}`);
    syncHistoryUi();
    renderLayersPanel();
    updateInspector();
  },
});
layersHeaderContainer.appendChild(addEmptyBtn.element);

const quickBtnsRow = document.createElement('div');
quickBtnsRow.style.cssText = `display: flex; gap: 4px;`;

const addRedBtn = document.createElement('button');
addRedBtn.className = 'pz-btn pz-btn-secondary';
addRedBtn.style.cssText = 'flex: 1; font-size: 11px; padding: 4px 6px;';
addRedBtn.textContent = '+ Rosso';
addRedBtn.addEventListener('click', () => {
  if (!wasmReady) return;
  add_raster_layer('Rettangolo Rosso', 800, 600, new Uint8Array([239, 68, 68, 255]));
  syncHistoryUi();
  renderLayersPanel();
  updateInspector();
});

const addBlueBtn = document.createElement('button');
addBlueBtn.className = 'pz-btn pz-btn-secondary';
addBlueBtn.style.cssText = 'flex: 1; font-size: 11px; padding: 4px 6px;';
addBlueBtn.textContent = '+ Blu 50%';
addBlueBtn.addEventListener('click', () => {
  if (!wasmReady) return;
  const id = add_raster_layer('Overlay Blu', 800, 600, new Uint8Array([59, 130, 246, 255]));
  set_layer_opacity(Number(id), 0.5);
  syncHistoryUi();
  renderLayersPanel();
  updateInspector();
});

const resetBtn = document.createElement('button');
resetBtn.className = 'pz-btn pz-btn-secondary';
resetBtn.style.cssText = 'font-size: 11px; padding: 4px 6px;';
resetBtn.textContent = '↺ Reset';
resetBtn.addEventListener('click', () => {
  if (!wasmReady) return;
  create_document(800, 600);
  add_raster_layer('Sfondo', 800, 600, new Uint8Array([255, 255, 255, 255]));
  syncHistoryUi();
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
  flex-direction: column-reverse;
  gap: 4px;
  overflow-y: auto;
  max-height: 400px;
`;

shell.layersPanelBody.innerHTML = '';
shell.layersPanelBody.appendChild(layersHeaderContainer);
shell.layersPanelBody.appendChild(layersListContainer);

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
        syncHistoryUi();
        renderLayersPanel();
        updateInspector();
      },
      onOpacityChange: (id, opacity) => {
        set_layer_opacity(id, opacity);
        syncHistoryUi();
        syncInspectorOpacity(opacity);
      },
      onDelete: (id) => {
        remove_layer(id);
        syncHistoryUi();
        renderLayersPanel();
        updateInspector();
      },
    });

    layersListContainer.appendChild(row.element);
  }
}

// ── 9. Inspector Panel (§5.3 Context-Aware Surface) ───────────────────────────

shell.inspectorPanelBody.innerHTML = '';

// Scheda Stato Engine WASM
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

// Scheda Proprietà Pennello / Strumento Attivo (§10 Fase 1)
const brushPropsSection = document.createElement('div');
brushPropsSection.id = 'brush-inspector';
brushPropsSection.style.cssText = `
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--pz-border-muted, rgba(255,255,255,0.1));
  border-radius: 8px;
  margin-bottom: 14px;
`;
shell.inspectorPanelBody.appendChild(brushPropsSection);

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

  // 1. Metadati Documento
  const docMeta = get_document_metadata();
  if (docMeta) {
    docMetaBox.innerHTML = `
      <div style="font-weight: 600; color: #fff; margin-bottom: 4px;">${docMeta.title}</div>
      <div style="font-size: 11px; color: var(--pz-text-muted);">
        📐 ${docMeta.width} × ${docMeta.height} px · 🗂️ ${docMeta.layerCount} livelli
      </div>
    `;
  }

  // 2. Proprietà Pennello / Strumento Attivo
  brushPropsSection.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pz-text-secondary);">
      <span>Strumento: ${currentTool === 'eraser' ? '🧹 Gomma' : '🖌️ Pennello'}</span>
      <span style="font-size: 11px; color: #38bdf8;">${currentTool === 'eraser' ? 'Eraser Mode' : 'Brush Mode'}</span>
    </div>

    <!-- Raggio -->
    <div style="display: flex; flex-direction: column; gap: 3px;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--pz-text-secondary);">
        <span>Dimensione (Raggio)</span>
        <span id="brush-radius-val">${brushRadius} px</span>
      </div>
      <input type="range" min="1" max="100" value="${brushRadius}" class="pz-slider-input" style="width: 100%; accent-color: var(--pz-accent-primary); cursor: pointer;" id="brush-radius-input">
    </div>

    <!-- Durezza -->
    <div style="display: flex; flex-direction: column; gap: 3px;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--pz-text-secondary);">
        <span>Durezza (Hardness)</span>
        <span id="brush-hardness-val">${Math.round(brushHardness * 100)}%</span>
      </div>
      <input type="range" min="0" max="100" value="${Math.round(brushHardness * 100)}" class="pz-slider-input" style="width: 100%; accent-color: var(--pz-accent-primary); cursor: pointer;" id="brush-hardness-input">
    </div>

    <!-- Opacità Tratto -->
    <div style="display: flex; flex-direction: column; gap: 3px;">
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--pz-text-secondary);">
        <span>Opacità Tratto</span>
        <span id="brush-opacity-val">${Math.round(brushOpacity * 100)}%</span>
      </div>
      <input type="range" min="1" max="100" value="${Math.round(brushOpacity * 100)}" class="pz-slider-input" style="width: 100%; accent-color: var(--pz-accent-primary); cursor: pointer;" id="brush-opacity-input">
    </div>

    <!-- Color Picker (attivo solo in modalità Pennello) -->
    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.06);">
      <span style="font-size: 11px; color: var(--pz-text-secondary);">Colore Tratto</span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <input type="color" value="${brushColorHex}" id="brush-color-picker" style="border: none; width: 28px; height: 26px; border-radius: 4px; cursor: pointer; background: transparent;">
        <span id="brush-color-hex" style="font-family: monospace; font-size: 11px; color: #fff;">${brushColorHex}</span>
      </div>
    </div>
  `;

  // Listener controlli pennello
  const rInput = document.getElementById('brush-radius-input') as HTMLInputElement;
  const rVal = document.getElementById('brush-radius-val');
  rInput?.addEventListener('input', (e) => {
    brushRadius = Number((e.target as HTMLInputElement).value);
    if (rVal) rVal.textContent = `${brushRadius} px`;
  });

  const hInput = document.getElementById('brush-hardness-input') as HTMLInputElement;
  const hVal = document.getElementById('brush-hardness-val');
  hInput?.addEventListener('input', (e) => {
    const v = Number((e.target as HTMLInputElement).value);
    brushHardness = v / 100.0;
    if (hVal) hVal.textContent = `${v}%`;
  });

  const oInput = document.getElementById('brush-opacity-input') as HTMLInputElement;
  const oVal = document.getElementById('brush-opacity-val');
  oInput?.addEventListener('input', (e) => {
    const v = Number((e.target as HTMLInputElement).value);
    brushOpacity = v / 100.0;
    brushColorRgba[3] = Math.round(brushOpacity * 255);
    if (oVal) oVal.textContent = `${v}%`;
  });

  const cInput = document.getElementById('brush-color-picker') as HTMLInputElement;
  const cHex = document.getElementById('brush-color-hex');
  cInput?.addEventListener('input', (e) => {
    brushColorHex = (e.target as HTMLInputElement).value;
    brushColorRgba = hexToRgba(brushColorHex, brushOpacity);
    if (cHex) cHex.textContent = brushColorHex;
  });

  // 3. Proprietà Livello Attivo
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
      <span>Opacità Livello</span>
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
    syncHistoryUi();

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
    syncHistoryUi();
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
    syncHistoryUi();
    renderLayersPanel();
    updateInspector();
  });
  actionsRow.appendChild(delBtn);

  layerPropsSection.appendChild(actionsRow);
}

// ── 10. Boot asincrono: WASM + WebGPU (tutto gestito in Rust) ─────────────────

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
