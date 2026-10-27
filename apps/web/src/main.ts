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
import {
  LayerRow,
  Button,
  Slider,
  createSlider,
  createColorPicker,
  AlertCircleIcon,
  BrushIcon,
  CheckIcon,
  EraserIcon,
  EyeIcon,
  EyeOffIcon,
  FolderOpenIcon,
  InfoIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from '@pizzico/ui-kit';
import { LayerMetadata } from '@pizzico/shared';
import {
  initWasm,
  add,
  pizzico_version,
  init_webgpu,
  create_document,
  add_raster_layer,
  get_composite_buffer,
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
  begin_move_layer,
  move_active_layer,
  translate_active_layer,
  end_move_layer,
  get_active_layer_offset,
  set_selection,
  clear_selection,
  has_active_selection,
  get_selection,
  save_project,
  load_project,
  export_as_png,
  export_as_jpeg,
  export_as_webp,
  export_as_psd,
} from '@pizzico/worker-core';
import { saveAutosave, loadAutosave, clearAutosave } from './storage';

console.log('Pizzico Engine initializing…');

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
    updateCanvasCursor();
    updateInspector();
  },
  onCommand: (cmdId) => console.log(`[Command] Esecuzione: ${cmdId}`),
  onOpenPsd: () => fileInput.click(),
  onSaveProject: () => handleSaveProject(),
  onOpenProject: () => projectFileInput.click(),
  onExportPng: () => handleExportPng(),
  onExportJpeg: (q) => handleExportJpeg(q),
  onExportWebp: (q) => handleExportWebp(q),
  onExportPsd: () => handleExportPsd(),
  onUndo: () => handleUndo(),
  onRedo: () => handleRedo(),
  onDeselect: () => handleDeselect(),
});
appContainer.appendChild(shell.root);

// ── 2. Toast Notification System (§5.6) ───────────────────────────────────────

const toastContainer = document.createElement('div');
toastContainer.className = 'pz-toast-container';
document.body.appendChild(toastContainer);

function showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') {
  const toast = document.createElement('div');
  toast.className = `pz-toast pz-toast-${type}`;

  // L'icona dipende dal tipo: il colore del bordo da solo non basta come segnale.
  const toastIcon =
    type === 'success'
      ? CheckIcon(16)
      : type === 'info'
        ? InfoIcon(16)
        : AlertCircleIcon(16);

  const iconWrap = document.createElement('span');
  iconWrap.className = 'pz-toast-icon';
  iconWrap.innerHTML = toastIcon;

  const textWrap = document.createElement('span');
  textWrap.textContent = message;

  toast.append(iconWrap, textWrap);
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
      `[WASM Bridge] Modulo Rust inizializzato — version: ${v}, add(2,3) = ${add(2, 3)}`
    );
    updateWasmStatusBadge(`WASM Rust v${v} pronto`, 'var(--pz-accent)');
    syncHistoryUi();
    renderLayersPanel();
    updateInspector();
  } catch (err) {
    console.error('[WASM Bridge] Inizializzazione WASM fallita:', err);
    updateWasmStatusBadge('Errore caricamento WASM', 'var(--pz-error)');
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
    syncSelectionUi();
    renderLayersPanel();
    updateInspector();
    scheduleAutosave();
    showToast('Azione annullata (Undo)', 'success');
  } else {
    showToast('Nessuna azione da annullare', 'warning');
  }
}

function handleRedo() {
  if (!wasmReady) return;
  const success = redo();
  if (success) {
    syncHistoryUi();
    syncSelectionUi();
    renderLayersPanel();
    updateInspector();
    scheduleAutosave();
    showToast('Azione ripristinata (Redo)', 'success');
  } else {
    showToast('Nessuna azione da ripristinare', 'warning');
  }
}

// ── Sistema di Autosave con Debounce 2s (OPFS / IndexedDB) (§3.1, §10 Step H) ──

let autosaveTimer: any = null;

function scheduleAutosave() {
  if (!wasmReady) return;
  if (autosaveTimer) clearTimeout(autosaveTimer);

  autosaveTimer = setTimeout(async () => {
    try {
      const bytes = save_project();
      if (!bytes || bytes.length === 0) return;
      const target = await saveAutosave(bytes);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      shell.updateAutosaveIndicator(`Salvato automaticamente ${timeStr} (${target.toUpperCase()})`, 'var(--pz-accent)');
      console.log(`[Autosave] Progetto salvato in ${target.toUpperCase()} (${bytes.length} bytes, ${timeStr})`);
    } catch (err) {
      console.warn('[Autosave] Errore salvataggio automatico:', err);
      shell.updateAutosaveIndicator('Autosave fallito', 'var(--pz-error)');
    }
  }, 2000);
}

// ── Salvataggio & Apertura File Progetto .pizzico (§10 Step H) ─────────────────

function handleSaveProject() {
  if (!wasmReady) {
    showToast('Engine WASM non ancora pronto', 'warning');
    return;
  }
  try {
    const bytes = save_project();
    const docMeta = get_document_metadata();
    const rawTitle = docMeta?.title ? docMeta.title.trim().replace(/[^a-zA-Z0-9_\-]/g, '_') : 'progetto';
    const fileName = `${rawTitle}.pizzico`;

    const blob = new Blob([bytes as any], { type: 'application/x-pizzico' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const sizeKb = (bytes.length / 1024).toFixed(1);
    showToast(`Progetto salvato su disco: "${fileName}" (${sizeKb} KB)`, 'success');
    scheduleAutosave();
  } catch (err) {
    console.error('[Save Project] Errore salvataggio file .pizzico:', err);
    showToast(`Errore salvataggio progetto: ${err}`, 'error');
  }
}

async function handleOpenProjectFile(file: File): Promise<void> {
  if (!wasmReady) {
    showToast('Engine grafico WASM non ancora pronto', 'warning');
    return;
  }

  showLoadingSpinner(`Apertura progetto Pizzico: "${file.name}"…`);
  await new Promise((resolve) => setTimeout(resolve, 30));

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    load_project(bytes);

    syncHistoryUi();
    syncSelectionUi();
    renderLayersPanel();
    updateInspector();
    hideLoadingSpinner();

    const docMeta = get_document_metadata();
    showToast(
      `Progetto aperto: ${file.name} (${docMeta?.width ?? 800}×${docMeta?.height ?? 600} px, ${docMeta?.layerCount ?? 0} livelli)`,
      'success'
    );
    scheduleAutosave();
  } catch (err) {
    hideLoadingSpinner();
    console.error('[Open Project] Errore apertura file .pizzico:', err);
    showToast(`Errore apertura progetto: ${err}`, 'error');
  }
}

// ── Export Immagini Raster (§9 Export/Interop, §10 Fase 1 Step I) ─────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getSanitizedDocTitle(): string {
  try {
    const meta = get_document_metadata();
    if (meta && meta.title && meta.title.trim()) {
      return meta.title.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    }
  } catch (e) {}
  return 'pizzico_export';
}

function handleExportPng() {
  if (!wasmReady) {
    showToast('Engine WASM non ancora pronto', 'warning');
    return;
  }
  showLoadingSpinner('Generazione immagine PNG…');
  setTimeout(() => {
    try {
      const bytes = export_as_png();
      const title = getSanitizedDocTitle();
      const filename = `${title}.png`;
      const blob = new Blob([bytes as any], { type: 'image/png' });
      downloadBlob(blob, filename);
      hideLoadingSpinner();
      showToast(`Esportato: ${filename} (${formatBytes(bytes.length)})`, 'success');
    } catch (err) {
      hideLoadingSpinner();
      console.error('[Export PNG] Errore:', err);
      showToast('Errore durante l\'esportazione PNG', 'error');
    }
  }, 30);
}

function handleExportJpeg(quality: number = 90) {
  if (!wasmReady) {
    showToast('Engine WASM non ancora pronto', 'warning');
    return;
  }
  showLoadingSpinner(`Generazione immagine JPEG (q=${quality})…`);
  setTimeout(() => {
    try {
      const bytes = export_as_jpeg(quality);
      const title = getSanitizedDocTitle();
      const filename = `${title}.jpg`;
      const blob = new Blob([bytes as any], { type: 'image/jpeg' });
      downloadBlob(blob, filename);
      hideLoadingSpinner();
      showToast(`Esportato: ${filename} (${formatBytes(bytes.length)})`, 'success');
    } catch (err) {
      hideLoadingSpinner();
      console.error('[Export JPEG] Errore:', err);
      showToast('Errore durante l\'esportazione JPEG', 'error');
    }
  }, 30);
}

function handleExportWebp(quality: number = 90) {
  if (!wasmReady) {
    showToast('Engine WASM non ancora pronto', 'warning');
    return;
  }
  showLoadingSpinner(`Generazione immagine WebP (q=${quality})…`);
  setTimeout(() => {
    try {
      const bytes = export_as_webp(quality);
      const title = getSanitizedDocTitle();
      const filename = `${title}.webp`;
      const blob = new Blob([bytes as any], { type: 'image/webp' });
      downloadBlob(blob, filename);
      hideLoadingSpinner();
      showToast(`Esportato: ${filename} (${formatBytes(bytes.length)})`, 'success');
    } catch (err) {
      hideLoadingSpinner();
      console.error('[Export WebP] Errore:', err);
      showToast('Errore durante l\'esportazione WebP', 'error');
    }
  }, 30);
}

function handleExportPsd() {
  if (!wasmReady) {
    showToast('Engine WASM non ancora pronto', 'warning');
    return;
  }
  showLoadingSpinner('Generazione file Adobe PSD multilivello…');
  setTimeout(() => {
    try {
      const bytes = export_as_psd();
      const title = getSanitizedDocTitle();
      const filename = `${title}.psd`;
      const blob = new Blob([bytes as any], { type: 'image/vnd.adobe.photoshop' });
      downloadBlob(blob, filename);
      hideLoadingSpinner();
      showToast(`Esportato: ${filename} (${formatBytes(bytes.length)})`, 'success');
    } catch (err) {
      hideLoadingSpinner();
      console.error('[Export PSD] Errore:', err);
      showToast('Errore durante l\'esportazione PSD: ' + err, 'error');
    }
  }, 30);
}


// Banner interattivo per il ripristino all'avvio (§10 Step H)
function showRestorePrompt(onRestore: () => void, onDiscard: () => void) {
  const banner = document.createElement('div');
  banner.id = 'pz-restore-banner';
  banner.style.cssText = `
    position: fixed;
    top: 54px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--pz-bg-elevated);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--pz-accent);
    box-shadow: var(--pz-shadow-popover);
    border-radius: 8px;
    padding: 10px 18px;
    display: flex;
    align-items: center;
    gap: 16px;
    z-index: 1000;
    color: var(--pz-text-primary);
    font-size: 13px;
    animation: pz-fade-in 0.25s ease-out;
  `;
  banner.innerHTML = `
    <span style="color: var(--pz-text-primary);">${SaveIcon(20)}</span>
    <div>
      <div style="font-weight: 600; color: var(--pz-text-primary);">Progetto precedente trovato</div>
      <div style="font-size: 11px; color: var(--pz-text-muted, var(--pz-text-muted));">È presente una sessione di lavoro salvata localmente. Vuoi ripristinarla?</div>
    </div>
    <div style="display: flex; gap: 8px; margin-left: 8px;">
      <button id="restore-confirm-btn" class="pz-btn pz-btn-primary" style="padding: 5px 12px; font-size: 12px;">Sì, Ripristina</button>
      <button id="restore-discard-btn" class="pz-btn pz-btn-secondary" style="padding: 5px 10px; font-size: 12px;">No</button>
    </div>
  `;
  document.body.appendChild(banner);

  banner.querySelector('#restore-confirm-btn')?.addEventListener('click', () => {
    banner.remove();
    onRestore();
  });
  banner.querySelector('#restore-discard-btn')?.addEventListener('click', () => {
    banner.remove();
    onDiscard();
  });
}

// Scorciatoie da tastiera (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z, Ctrl+D, Ctrl+S, Ctrl+O, V, M, B, E)
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
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    handleDeselect();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    handleSaveProject();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
    e.preventDefault();
    projectFileInput.click();
  } else if (!e.ctrlKey && !e.metaKey && !e.altKey) {
    if (e.key.toLowerCase() === 'v') {
      shell.setActiveTool('move');
      currentTool = 'move';
      updateCanvasCursor();
      updateInspector();
    } else if (e.key.toLowerCase() === 'm') {
      shell.setActiveTool('marquee');
      currentTool = 'marquee';
      updateCanvasCursor();
      updateInspector();
    } else if (e.key.toLowerCase() === 'b') {
      shell.setActiveTool('brush');
      currentTool = 'brush';
      updateCanvasCursor();
      updateInspector();
    } else if (e.key.toLowerCase() === 'e') {
      shell.setActiveTool('eraser');
      currentTool = 'eraser';
      updateCanvasCursor();
      updateInspector();
    }
  }
});

// ── 6. I/O File: Progetti .pizzico e PSD/PSB (§6.5, §10 Step H) ────────────────

const projectFileInput = document.createElement('input');
projectFileInput.type = 'file';
projectFileInput.accept = '.pizzico';
projectFileInput.style.display = 'none';
document.body.appendChild(projectFileInput);

projectFileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  await handleOpenProjectFile(file);
  projectFileInput.value = '';
});

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
    showToast('Engine grafico WASM non ancora pronto', 'warning');
    return;
  }

  const isPsd = file.name.toLowerCase().endsWith('.psd') || file.name.toLowerCase().endsWith('.psb');
  if (!isPsd) {
    showToast(`Il file "${file.name}" non è un file PSD/PSB supportato`, 'error');
    return;
  }

  if (file.size > 20 * 1024 * 1024) {
    showToast('File grande (> 20 MB), il parsing potrebbe richiedere qualche secondo…', 'warning');
  }

  showLoadingSpinner(`Parsing Adobe PSD: "${file.name}"…`);
  await new Promise((resolve) => setTimeout(resolve, 30));

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    load_psd_bytes(bytes);

    const docMeta = get_document_metadata();
    console.log('[PSD Import] Documento importato:', docMeta);

    syncHistoryUi();
    renderLayersPanel();
    updateInspector();
    hideLoadingSpinner();

    showToast(
      `Caricato: ${file.name} (${docMeta?.width ?? 800}×${docMeta?.height ?? 600} px, ${docMeta?.layerCount ?? 0} livelli)`,
      'success'
    );
  } catch (err) {
    hideLoadingSpinner();
    console.error('[PSD Import] Errore durante il parsing PSD:', err);
    showToast(`Errore parsing PSD: ${err}`, 'error');
  }
}

// Drag & Drop sul Canvas e sulla Finestra
let dragOverlay: HTMLDivElement | null = null;

function showDragOverlay() {
  if (dragOverlay) return;
  dragOverlay = document.createElement('div');
  dragOverlay.className = 'pz-drag-overlay';
  dragOverlay.innerHTML = `
    <div style="color: var(--pz-text-secondary);">${FolderOpenIcon(32)}</div>
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

// URL del PSD di esempio risolto rispetto al documento. In una WebView
// (Tauri/Android) il path assoluto "/sample-01.psd" può non risolvere come nel
// browser; document.baseURI è la base corretta in entrambi i casi.
const SAMPLE_PSD_URL = new URL('sample-01.psd', document.baseURI).toString();

/**
 * Ultima rete di sicurezza del boot: se il PSD di esempio non si può caricare
 * (404, protocollo della WebView, WASM non pronto) si apre un documento vuoto
 * invece di lasciare l'editor inerte.
 *
 * Il motivo viene mostrato a schermo di proposito: su un dispositivo non c'è
 * una console a portata di mano, e un editor vuoto senza spiegazione è
 * indistinguibile da un'app rotta.
 */
function bootBlankDocument(reason: string) {
  hideLoadingSpinner();

  if (!wasmReady) {
    shell.updateAutosaveIndicator('WASM non pronto', 'var(--pz-error)');
    showToast(`Documento non caricato (${reason}) e engine WASM non pronto.`, 'error');
    return;
  }

  try {
    create_document(800, 600);
    add_raster_layer('Sfondo', 800, 600, new Uint8Array([255, 255, 255, 255]));
    syncSelectionUi();
    renderLayersPanel();
    updateInspector();
    showToast(`Documento demo non disponibile (${reason}). Aperto un documento vuoto.`, 'warning');
    console.warn('[Boot] Documento vuoto creato come riserva:', reason);
  } catch (err) {
    showToast(`Impossibile creare un documento di riserva: ${err}`, 'error');
    console.error('[Boot] Creazione documento di riserva fallita:', err);
  }
}

// Helper esposto per test automatizzati e verifica rapida browser
(window as any).__loadSamplePsd = async () => {
  try {
    let res: Response;
    try {
      res = await fetch(SAMPLE_PSD_URL, { cache: 'no-store' });
    } catch (err) {
      throw new Error(
        `fetch fallita su ${SAMPLE_PSD_URL}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (!res.ok) {
      throw new Error(`fetch ${SAMPLE_PSD_URL} ha risposto ${res.status} ${res.statusText}`);
    }
    const blob = await res.blob();
    if (blob.size < 1024) {
      throw new Error(`risposta di soli ${blob.size} byte: il file non è stato servito`);
    }
    const file = new File([blob], 'sample-01.psd', { type: 'image/vnd.adobe.photoshop' });
    await handlePsdFile(file);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error('[Boot] PSD di esempio non caricato:', reason);
    bootBlankDocument(reason);
    throw err;
  }
};

// ── 7. Tool Engine: Sposta, Selezione e Pennello (§10 Fase 1) ────────────

let isDrawing = false;
let isMovingLayer = false;
let isSelecting = false;

let lastDocPoint: { x: number; y: number } | null = null;
let moveStartDoc: { x: number; y: number } | null = null;
let moveInitialOffset: [number, number] = [0, 0];
let selStartDoc: { x: number; y: number } | null = null;

function updateCanvasCursor() {
  if (currentTool === 'move') {
    shell.canvas.style.cursor = isMovingLayer ? 'grabbing' : 'grab';
  } else if (currentTool === 'marquee') {
    shell.canvas.style.cursor = 'crosshair';
  } else if (currentTool === 'brush' || currentTool === 'eraser') {
    shell.canvas.style.cursor = 'crosshair';
  } else {
    shell.canvas.style.cursor = 'default';
  }
}

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

function updateSelectionOverlayRect(docX: number, docY: number, docW: number, docH: number) {
  const rect = shell.canvas.getBoundingClientRect();
  const docMeta = get_document_metadata();
  const metaW = docMeta?.width ?? 800;
  const metaH = docMeta?.height ?? 600;
  const scaleX = rect.width / metaW;
  const scaleY = rect.height / metaH;

  shell.selectionOverlay.style.left = `${docX * scaleX}px`;
  shell.selectionOverlay.style.top = `${docY * scaleY}px`;
  shell.selectionOverlay.style.width = `${docW * scaleX}px`;
  shell.selectionOverlay.style.height = `${docH * scaleY}px`;
  shell.selectionOverlay.style.display = docW > 0 || docH > 0 ? 'block' : 'none';
}

function syncSelectionUi() {
  if (!wasmReady) return;
  const active = has_active_selection();
  if (active) {
    shell.deselectBtn.style.display = 'inline-flex';
    const sel = get_selection();
    if (sel && sel.active) {
      updateSelectionOverlayRect(sel.x, sel.y, sel.width, sel.height);
    }
  } else {
    shell.deselectBtn.style.display = 'none';
    shell.selectionOverlay.style.display = 'none';
  }
}

function handleDeselect() {
  if (!wasmReady) return;
  clear_selection();
  syncSelectionUi();
  updateInspector();
  showToast('Selezione rimossa', 'success');
}

shell.canvas.style.touchAction = 'none';
updateCanvasCursor();

shell.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  if (e.button !== 0 || !wasmReady) return;
  e.preventDefault();
  try {
    shell.canvas.setPointerCapture(e.pointerId);
  } catch (_) {}

  const pt = getDocCoordinates(e);

  if (currentTool === 'move') {
    isMovingLayer = true;
    moveStartDoc = pt;
    begin_move_layer();
    const offset = get_active_layer_offset();
    moveInitialOffset = offset && Array.isArray(offset) && offset.length >= 2 ? [offset[0], offset[1]] : [0, 0];
    updateCanvasCursor();
  } else if (currentTool === 'marquee') {
    isSelecting = true;
    selStartDoc = pt;
    updateSelectionOverlayRect(pt.x, pt.y, 0, 0);
  } else if (currentTool === 'brush' || currentTool === 'eraser') {
    isDrawing = true;
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
  }
});

shell.canvas.addEventListener('pointermove', (e: PointerEvent) => {
  if (!wasmReady) return;
  const pt = getDocCoordinates(e);

  if (isMovingLayer && moveStartDoc) {
    e.preventDefault();
    const dx = Math.round(pt.x - moveStartDoc.x);
    const dy = Math.round(pt.y - moveStartDoc.y);
    move_active_layer(moveInitialOffset[0] + dx, moveInitialOffset[1] + dy);
  } else if (isSelecting && selStartDoc) {
    e.preventDefault();
    const minX = Math.min(selStartDoc.x, pt.x);
    const minY = Math.min(selStartDoc.y, pt.y);
    const w = Math.abs(pt.x - selStartDoc.x);
    const h = Math.abs(pt.y - selStartDoc.y);
    updateSelectionOverlayRect(minX, minY, w, h);
  } else if (isDrawing && lastDocPoint) {
    e.preventDefault();
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
  }
});

const handlePointerUp = (e: PointerEvent) => {
  try {
    shell.canvas.releasePointerCapture(e.pointerId);
  } catch (_) {}

  if (isMovingLayer) {
    isMovingLayer = false;
    moveStartDoc = null;
    const moved = end_move_layer();
    if (moved) {
      syncHistoryUi();
      renderLayersPanel();
      updateInspector();
      scheduleAutosave();
    }
    updateCanvasCursor();
  } else if (isSelecting && selStartDoc) {
    isSelecting = false;
    const pt = getDocCoordinates(e);
    const minX = Math.min(selStartDoc.x, pt.x);
    const minY = Math.min(selStartDoc.y, pt.y);
    const w = Math.abs(pt.x - selStartDoc.x);
    const h = Math.abs(pt.y - selStartDoc.y);
    selStartDoc = null;

    if (w > 2 && h > 2) {
      set_selection(Math.round(minX), Math.round(minY), Math.round(w), Math.round(h));
      syncSelectionUi();
      showToast(`Selezione attiva: ${Math.round(w)}×${Math.round(h)} px`, 'success');
    } else {
      clear_selection();
      syncSelectionUi();
    }
    updateInspector();
    scheduleAutosave();
  } else if (isDrawing) {
    isDrawing = false;
    lastDocPoint = null;
    end_stroke();
    syncHistoryUi();
    scheduleAutosave();
  }
};

shell.canvas.addEventListener('pointerup', handlePointerUp);
shell.canvas.addEventListener('pointercancel', handlePointerUp);
window.addEventListener('resize', () => syncSelectionUi());

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
  scheduleAutosave();
};
(window as any).__moveActiveLayer = (dx: number, dy: number) => {
  begin_move_layer();
  translate_active_layer(dx, dy);
  end_move_layer();
  syncHistoryUi();
  renderLayersPanel();
  updateInspector();
  scheduleAutosave();
};
(window as any).__setSelection = (x: number, y: number, w: number, h: number) => {
  set_selection(x, y, w, h);
  syncSelectionUi();
  updateInspector();
  scheduleAutosave();
};
(window as any).__clearSelection = () => handleDeselect();
(window as any).__getSelection = () => get_selection();
(window as any).__undo = () => handleUndo();
(window as any).__redo = () => handleRedo();
(window as any).__getHistory = () => get_history_info();
(window as any).__getCompositeBuffer = () => get_composite_buffer();
(window as any).__saveProject = () => save_project();
(window as any).__loadProject = (bytes: Uint8Array) => {
  load_project(bytes);
  syncHistoryUi();
  syncSelectionUi();
  renderLayersPanel();
  updateInspector();
};
(window as any).__getAutosave = () => loadAutosave();
(window as any).__saveAutosaveNow = async () => {
  const bytes = save_project();
  return await saveAutosave(bytes);
};
(window as any).__clearAutosave = () => clearAutosave();
(window as any).__exportPng = () => handleExportPng();
(window as any).__exportJpeg = (q?: number) => handleExportJpeg(q);
(window as any).__exportWebp = (q?: number) => handleExportWebp(q);
(window as any).__exportPsd = () => handleExportPsd();
(window as any).__exportPngBytes = () => export_as_png();
(window as any).__exportJpegBytes = (q: number = 90) => export_as_jpeg(q);
(window as any).__exportWebpBytes = (q: number = 90) => export_as_webp(q);
(window as any).__exportPsdBytes = () => export_as_psd();

// ── 8. Gestione e Render Dinamico del Pannello Livelli (§5.3, §5.4) ───────────

const layersHeaderContainer = document.createElement('div');
layersHeaderContainer.className = 'pz-layers-toolbar';
layersHeaderContainer.style.cssText = `
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--pz-border);
  margin-bottom: 8px;
`;

const addEmptyBtn = new Button({
  label: 'Aggiungi Livello Vuoto',
  icon: PlusIcon(16),
  variant: 'primary',
  onClick: () => {
    if (!wasmReady) return;
    const count = get_layer_count();
    const id = add_raster_layer(`Livello ${count + 1}`, 800, 600, new Uint8Array([0, 0, 0, 0]));
    console.log(`[Layers] Aggiunto livello vuoto ID: ${id}`);
    syncHistoryUi();
    renderLayersPanel();
    updateInspector();
    scheduleAutosave();
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
  scheduleAutosave();
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
  scheduleAutosave();
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
  scheduleAutosave();
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
        scheduleAutosave();
      },
      onOpacityChange: (id, opacity) => {
        set_layer_opacity(id, opacity);
        syncHistoryUi();
        syncInspectorOpacity(opacity);
        scheduleAutosave();
      },
      onDelete: (id) => {
        remove_layer(id);
        syncHistoryUi();
        renderLayersPanel();
        updateInspector();
        scheduleAutosave();
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
wasmStatusBox.className = 'pz-card pz-card-accent';
wasmStatusBox.innerHTML = `<strong>Rust Core Engine</strong><br><span id="wasm-result">In attesa WASM…</span>`;
shell.inspectorPanelBody.appendChild(wasmStatusBox);

// Scheda Metadati Documento Attivo
const docMetaBox = document.createElement('div');
docMetaBox.id = 'doc-meta-status';
docMetaBox.className = 'pz-card';
docMetaBox.innerHTML = `<strong>Documento</strong>: 800 × 600 px · 1 livello`;
shell.inspectorPanelBody.appendChild(docMetaBox);

// Scheda Proprietà Pennello / Strumento Attivo (§10 Fase 1)
const brushPropsSection = document.createElement('div');
brushPropsSection.id = 'brush-inspector';
brushPropsSection.className = 'pz-card';
shell.inspectorPanelBody.appendChild(brushPropsSection);

// Sezione contestuale: Proprietà del livello attivo
const layerPropsSection = document.createElement('div');
layerPropsSection.id = 'active-layer-inspector';
layerPropsSection.className = 'pz-card';
shell.inspectorPanelBody.appendChild(layerPropsSection);

// Riferimento allo slider di opacità dell'inspector. updateInspector() ricostruisce
// il proprio DOM a ogni chiamata, quindi il riferimento va riassegnato lì; serve a
// syncInspectorOpacity(), che deve aggiornare input ed etichetta insieme.
let inspectorOpacitySlider: Slider | null = null;

function syncInspectorOpacity(opacity: number) {
  inspectorOpacitySlider?.setValue(Math.round(opacity * 100));
}

function updateInspector() {
  if (!wasmReady) return;

  const metadataList: LayerMetadata[] = get_layers_metadata() || [];
  const activeId = get_active_layer_id();
  const activeLayer = metadataList.find((l) => l.id === activeId);

  // 1. Metadati Documento
  const docMeta = get_document_metadata();
  if (docMeta) {
    docMetaBox.innerHTML = `
      <div style="font-weight: 600; color: var(--pz-text-primary); margin-bottom: 4px;">${docMeta.title}</div>
      <div style="font-size: 11px; color: var(--pz-text-muted);">
        ${docMeta.width} × ${docMeta.height} px · ${docMeta.layerCount} livelli
      </div>
    `;
    // La barra di stato mostra il documento reale, non un valore fisso.
    // Lo zoom resta 100% finché non esiste un controllo zoom (6d).
    shell.updateStatusBar(`${docMeta.width} × ${docMeta.height} px`, '100%');
  }

  // 2. Proprietà Strumento Attivo
  if (currentTool === 'move') {
    brushPropsSection.innerHTML = `
      <div class="pz-card-header">
        <span>Strumento: Sposta</span>
        <span style="font-size: 11px; color: var(--pz-accent);">Move Tool (V)</span>
      </div>
      <div style="font-size: 12px; color: var(--pz-text-secondary); line-height: 1.4;">
        Trascina con il cursore sul canvas per riposizionare il livello attivo nel documento. Ogni spostamento genera un'azione Undo/Redo atomica.
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 6px 10px; background: var(--pz-accent-tint); border: 1px solid var(--pz-accent-border); border-radius: 6px; color: var(--pz-accent-hover);">
        <span>Coordinate offset:</span>
        <span style="font-weight: 600;">X: ${activeLayer?.offsetX ?? 0} px, Y: ${activeLayer?.offsetY ?? 0} px</span>
      </div>
    `;
  } else if (currentTool === 'marquee') {
    const hasSel = has_active_selection();
    const sel = hasSel ? get_selection() : null;
    brushPropsSection.innerHTML = `
      <div class="pz-card-header">
        <span>Strumento: Selezione</span>
        <span style="font-size: 11px; color: var(--pz-accent);">Marquee (M)</span>
      </div>
      <div style="font-size: 12px; color: var(--pz-text-secondary); line-height: 1.4;">
        Trascina sul canvas per definire la selezione rettangolare. Il pennello disegna rigorosamente entro i bordi della selezione attiva.
      </div>
      ${hasSel && sel ? `
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; padding: 6px 10px; background: var(--pz-accent-tint); border: 1px solid var(--pz-accent-border); border-radius: 6px; color: var(--pz-accent-hover);">
          <div style="display: flex; justify-content: space-between;">
            <span>Dimensioni:</span>
            <span style="font-weight: 600;">${sel.width} × ${sel.height} px</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Offset:</span>
            <span style="font-weight: 600;">X: ${sel.x}, Y: ${sel.y}</span>
          </div>
        </div>
        <button id="inspector-deselect-btn" class="pz-btn pz-btn-secondary" style="font-size: 11px; padding: 5px 8px; width: 100%; gap: 6px;">
          ${XIcon(16)} Rimuovi Selezione (Ctrl+D)
        </button>
      ` : `
        <div style="font-size: 11px; color: var(--pz-text-muted);">
          Nessuna selezione attiva al momento.
        </div>
      `}
    `;
    const deselBtn = document.getElementById('inspector-deselect-btn');
    deselBtn?.addEventListener('click', handleDeselect);
  } else {
    brushPropsSection.innerHTML = `
      <div class="pz-card-header">
        <span style="display: inline-flex; align-items: center; gap: 6px;">${currentTool === 'eraser' ? EraserIcon(16) : BrushIcon(16)}<span>Strumento: ${currentTool === 'eraser' ? 'Gomma' : 'Pennello'}</span></span>
        <span style="font-size: 11px; color: var(--pz-accent);">${currentTool === 'eraser' ? 'Eraser Mode (E)' : 'Brush Mode (B)'}</span>
      </div>

    `;

    // Controlli costruiti con i componenti di ui-kit: gli ID restano quelli che
    // il resto del file interroga, e gli effetti su brushRadius/Hardness/Opacity
    // e brushColorRgba sono identici a prima.
    brushPropsSection.appendChild(
      createSlider({
        id: 'brush-radius-input',
        label: 'Dimensione (Raggio)',
        min: 1,
        max: 100,
        value: brushRadius,
        unit: ' px',
        onInput: (v) => {
          brushRadius = v;
        },
      })
    );

    brushPropsSection.appendChild(
      createSlider({
        id: 'brush-hardness-input',
        label: 'Durezza (Hardness)',
        min: 0,
        max: 100,
        value: Math.round(brushHardness * 100),
        unit: '%',
        onInput: (v) => {
          brushHardness = v / 100.0;
        },
      })
    );

    brushPropsSection.appendChild(
      createSlider({
        id: 'brush-opacity-input',
        label: 'Opacità Tratto',
        min: 1,
        max: 100,
        value: Math.round(brushOpacity * 100),
        unit: '%',
        onInput: (v) => {
          brushOpacity = v / 100.0;
          brushColorRgba[3] = Math.round(brushOpacity * 255);
        },
      })
    );

    const colorRow = document.createElement('div');
    colorRow.style.cssText =
      'display: flex; align-items: center; justify-content: space-between; padding-top: 4px; border-top: 1px solid var(--pz-surface-hover);';

    const colorLabel = document.createElement('span');
    colorLabel.className = 'pz-slider-title';
    colorLabel.textContent = 'Colore Tratto';

    colorRow.append(
      colorLabel,
      createColorPicker({
        id: 'brush-color-picker',
        label: 'Colore tratto',
        value: brushColorHex,
        onChange: (hex) => {
          brushColorHex = hex;
          brushColorRgba = hexToRgba(brushColorHex, brushOpacity);
        },
      })
    );

    brushPropsSection.appendChild(colorRow);
  }

  // 3. Proprietà Livello Attivo
  layerPropsSection.innerHTML = '';
  // Il DOM è appena stato svuotato: il riferimento precedente punterebbe a un
  // nodo staccato. Va riazzerato prima di ricostruire, e riassegnato più sotto.
  inspectorOpacitySlider = null;

  const header = document.createElement('div');
  header.className = 'pz-card-header';
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
    <span style="font-weight: 600; color: var(--pz-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${activeLayer.name}">${activeLayer.name}</span>
    <span style="font-size: 11px; padding: 2px 6px; background: var(--pz-accent-subtle); border-radius: 4px; color: var(--pz-accent-hover);">${activeLayer.kind} · ${activeLayer.blendMode}</span>
  `;
  layerPropsSection.appendChild(nameBox);

  // Posizione / Offset Livello
  const posBox = document.createElement('div');
  posBox.style.cssText = `display: flex; justify-content: space-between; font-size: 12px; color: var(--pz-text-secondary);`;
  posBox.innerHTML = `
    <span>Posizione (Offset)</span>
    <span style="font-variant-numeric: tabular-nums; color: var(--pz-text-primary); font-weight: 500;">X: ${activeLayer.offsetX ?? 0} px, Y: ${activeLayer.offsetY ?? 0} px</span>
  `;
  layerPropsSection.appendChild(posBox);

  // Controllo Opacità sincronizzato
  const opacityPct = Math.round(activeLayer.opacity * 100);
  inspectorOpacitySlider = new Slider({
    id: 'inspector-opacity-input',
    label: 'Opacità Livello',
    min: 0,
    max: 100,
    value: opacityPct,
    unit: '%',
    onInput: (val) => {
      set_layer_opacity(activeLayer.id, val / 100.0);
      syncHistoryUi();

      const rowEl = document.querySelector(`.pz-layer-row[data-layer-id="${activeLayer.id}"]`);
      if (rowEl) {
        const rowSlider = rowEl.querySelector('.pz-layer-opacity-slider') as HTMLInputElement;
        const rowVal = rowEl.querySelector('.pz-layer-opacity-val');
        if (rowSlider) rowSlider.value = String(val);
        if (rowVal) rowVal.textContent = `${val}%`;
      }
    },
  });
  layerPropsSection.appendChild(inspectorOpacitySlider.element);

  // Toggle visibilità ed eliminazione
  const actionsRow = document.createElement('div');
  actionsRow.style.cssText = `display: flex; gap: 8px; margin-top: 4px;`;

  const visBtn = document.createElement('button');
  visBtn.className = 'pz-btn pz-btn-secondary';
  visBtn.style.cssText = `flex: 1; font-size: 11px; padding: 6px 10px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 5px;`;
  visBtn.innerHTML = `${activeLayer.visible ? EyeIcon(16) : EyeOffIcon(16)}${activeLayer.visible ? 'Visibile' : 'Nascosto'}`;
  visBtn.addEventListener('click', () => {
    set_layer_visibility(activeLayer.id, !activeLayer.visible);
    syncHistoryUi();
    renderLayersPanel();
    updateInspector();
    scheduleAutosave();
  });
  actionsRow.appendChild(visBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'pz-btn pz-btn-secondary';
  delBtn.style.cssText = `font-size: 11px; padding: 6px 10px; color: var(--pz-error); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 5px;`;
  delBtn.innerHTML = `${Trash2Icon(16)}Elimina`;
  delBtn.addEventListener('click', () => {
    remove_layer(activeLayer.id);
    syncHistoryUi();
    renderLayersPanel();
    updateInspector();
    scheduleAutosave();
  });
  actionsRow.appendChild(delBtn);

  layerPropsSection.appendChild(actionsRow);
}

// ── 10. Boot asincrono: WASM + WebGPU (tutto gestito in Rust) ─────────────────

(async () => {
  await setupWasm();

  if (wasmReady) {
    // 1. Verifica se esiste un salvataggio automatico precedente in OPFS o IndexedDB (§10 Step H)
    try {
      const autosaveData = await loadAutosave();
      if (autosaveData && autosaveData.bytes.length > 0) {
        showRestorePrompt(
          () => {
            try {
              load_project(autosaveData.bytes);
              syncHistoryUi();
              syncSelectionUi();
              renderLayersPanel();
              updateInspector();
              showToast(`Progetto ripristinato da ${autosaveData.source.toUpperCase()}`, 'success');
              shell.updateAutosaveIndicator(`Ripristinato (${autosaveData.source.toUpperCase()})`, 'var(--pz-accent)');
            } catch (err) {
              console.error('[Boot] Errore ripristino autosave:', err);
              showToast('Errore nel ripristino del salvataggio automatico', 'error');
            }
          },
          async () => {
            await clearAutosave();
            try {
              await (window as any).__loadSamplePsd();
              console.log('[Boot] sample-01.psd precaricato dopo aver scartato autosave');
            } catch (e) {
              console.warn('[Boot] Precaricamento sample PSD non riuscito:', e);
            }
            showToast('Nuovo progetto demo avviato', 'info');
          }
        );
      } else {
        // Nessun autosave presente: carica sample-01.psd come progetto iniziale
        try {
          await (window as any).__loadSamplePsd();
          console.log('[Boot] sample-01.psd precaricato automaticamente');
        } catch (e) {
          console.warn('[Boot] Precaricamento sample PSD non riuscito:', e);
        }
      }
    } catch (e) {
      console.warn('[Boot] Verifica autosave non riuscita:', e);
    }

    try {
      await init_webgpu('pizzico-canvas');
      console.log('[WebGPU] Render loop Rust attivo — 60 FPS via RAF con dirty checking');
    } catch (err) {
      console.warn('[WebGPU] Fallback a Canvas2D — WebGPU non disponibile:', err);
      const ctx = shell.canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#121316';
        ctx.fillRect(0, 0, shell.canvas.width, shell.canvas.height);
      }
    }
  }
})();


