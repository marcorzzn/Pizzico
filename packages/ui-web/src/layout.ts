// Pizzico — packages/ui-web/src/layout.ts
// Riferimento manifesto: §5.1, §5.5, §11 Step 3
// Licenza: MIT OR Apache-2.0

import { WorkspaceMode } from '@pizzico/shared';
import { Panel, FloatingActionBar } from '@pizzico/ui-kit';
import { CommandPalette } from '@pizzico/command-palette';

export interface LayoutOptions {
  onModeChange?: (mode: WorkspaceMode) => void;
  onToolSelect?: (tool: string) => void;
  onCommand?: (commandId: string) => void;
  onOpenPsd?: () => void;
  onSaveProject?: () => void;
  onOpenProject?: () => void;
  onExportPng?: () => void;
  onExportJpeg?: (quality: number) => void;
  onExportWebp?: (quality: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDeselect?: () => void;
}

export class DesktopShellLayout {
  public root: HTMLDivElement;
  public canvasContainer: HTMLElement;
  public canvasWrapper!: HTMLDivElement;
  public canvas: HTMLCanvasElement;
  public selectionOverlay!: HTMLDivElement;
  public layersPanelBody!: HTMLDivElement;
  public inspectorPanelBody!: HTMLDivElement;
  public palette: CommandPalette;
  public saveBtn: HTMLButtonElement;
  public openProjectBtn: HTMLButtonElement;
  public exportBtn: HTMLButtonElement;
  public exportDropdown: HTMLDivElement;
  public openPsdBtn: HTMLButtonElement;
  public undoBtn: HTMLButtonElement;
  public redoBtn: HTMLButtonElement;
  public deselectBtn: HTMLButtonElement;
  public autosaveIndicator: HTMLSpanElement;

  private currentMode: WorkspaceMode = 'quick';
  private activeTool = 'brush';
  private toolButtons = new Map<string, HTMLButtonElement>();

  constructor(options: LayoutOptions = {}) {
    this.root = document.createElement('div');
    this.root.className = 'pz-app-shell';

    // 1. Top Bar
    const topBar = document.createElement('header');
    topBar.className = 'pz-top-bar';

    const topLeft = document.createElement('div');
    topLeft.className = 'pz-top-left';

    const brand = document.createElement('div');
    brand.className = 'pz-brand';
    brand.innerHTML = `
      <svg class="pz-brand-logo" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r="42" fill="none" stroke="#4f46e5" stroke-width="12" />
        <path d="M44 64 L64 36 L84 64 L64 92 Z" fill="#06b6d4" />
      </svg>
      <span>Pizzico</span>
    `;

    topLeft.appendChild(brand);

    // Workspace Mode Switcher (§5.5)
    const modeSwitcher = document.createElement('div');
    modeSwitcher.className = 'pz-mode-switcher';

    const modes: { id: WorkspaceMode; label: string }[] = [
      { id: 'quick', label: 'Quick Edit' },
      { id: 'vector', label: 'Vector Illustration' },
      { id: 'photo', label: 'Deep Retouching' },
    ];

    modes.forEach(({ id, label }) => {
      const btn = document.createElement('button');
      btn.className = `pz-mode-btn ${this.currentMode === id ? 'pz-active' : ''}`;
      btn.textContent = label;
      btn.addEventListener('click', () => {
        modeSwitcher.querySelectorAll('.pz-mode-btn').forEach((b) => b.classList.remove('pz-active'));
        btn.classList.add('pz-active');
        this.currentMode = id;
        if (options.onModeChange) options.onModeChange(id);
      });
      modeSwitcher.appendChild(btn);
    });

    // Top Right: Undo/Redo + Apri PSD + Command Palette Trigger Button
    const topRight = document.createElement('div');
    topRight.style.cssText = 'display: flex; gap: 8px; align-items: center;';

    this.undoBtn = document.createElement('button');
    this.undoBtn.id = 'undo-btn';
    this.undoBtn.className = 'pz-btn pz-btn-secondary';
    this.undoBtn.style.padding = '5px 10px';
    this.undoBtn.style.fontSize = '12px';
    this.undoBtn.innerHTML = '<span>↶ Undo</span>';
    this.undoBtn.title = 'Annulla (Ctrl+Z)';
    this.undoBtn.disabled = true;
    this.undoBtn.addEventListener('click', () => {
      if (options.onUndo) options.onUndo();
    });

    this.redoBtn = document.createElement('button');
    this.redoBtn.id = 'redo-btn';
    this.redoBtn.className = 'pz-btn pz-btn-secondary';
    this.redoBtn.style.padding = '5px 10px';
    this.redoBtn.style.fontSize = '12px';
    this.redoBtn.innerHTML = '<span>↷ Redo</span>';
    this.redoBtn.title = 'Ripristina (Ctrl+Y / Ctrl+Shift+Z)';
    this.redoBtn.disabled = true;
    this.redoBtn.addEventListener('click', () => {
      if (options.onRedo) options.onRedo();
    });

    this.saveBtn = document.createElement('button');
    this.saveBtn.id = 'save-project-btn';
    this.saveBtn.className = 'pz-btn pz-btn-primary';
    this.saveBtn.style.padding = '5px 12px';
    this.saveBtn.style.fontSize = '12px';
    this.saveBtn.innerHTML = '<span>💾 Salva</span>';
    this.saveBtn.title = 'Salva Progetto .pizzico (Ctrl+S)';
    this.saveBtn.addEventListener('click', () => {
      if (options.onSaveProject) options.onSaveProject();
    });

    this.openProjectBtn = document.createElement('button');
    this.openProjectBtn.id = 'open-project-btn';
    this.openProjectBtn.className = 'pz-btn pz-btn-secondary';
    this.openProjectBtn.style.padding = '5px 12px';
    this.openProjectBtn.style.fontSize = '12px';
    this.openProjectBtn.innerHTML = '<span>📁 Apri Progetto</span>';
    this.openProjectBtn.title = 'Apri Progetto .pizzico (Ctrl+O)';
    this.openProjectBtn.addEventListener('click', () => {
      if (options.onOpenProject) options.onOpenProject();
    });

    this.exportBtn = document.createElement('button');
    this.exportBtn.id = 'export-btn';
    this.exportBtn.className = 'pz-btn pz-btn-secondary';
    this.exportBtn.style.padding = '5px 12px';
    this.exportBtn.style.fontSize = '12px';
    this.exportBtn.innerHTML = '<span>📤 Esporta ▾</span>';
    this.exportBtn.title = 'Esporta immagine renderizzata (PNG, JPEG, WebP)';

    this.exportDropdown = document.createElement('div');
    this.exportDropdown.id = 'export-dropdown';
    this.exportDropdown.className = 'pz-export-dropdown';
    this.exportDropdown.style.display = 'none';

    this.exportDropdown.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px;">
        <span style="font-weight: 600; font-size: 13px; color: #f8fafc;">📤 Esporta Immagine</span>
        <button id="export-close-btn" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px;">✕</button>
      </div>

      <!-- PNG Item -->
      <div class="pz-export-item">
        <div class="pz-export-item-title">
          <span>PNG</span>
          <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(56,189,248,0.15); color: #38bdf8;">Lossless · Alpha</span>
        </div>
        <div class="pz-export-item-desc">Grafica raster a 32-bit con canale alpha trasparente.</div>
        <button id="export-png-btn" class="pz-btn pz-btn-primary" style="margin-top: 4px; padding: 4px 8px; font-size: 11px; justify-content: center;">Scarica PNG</button>
      </div>

      <!-- JPEG Item -->
      <div class="pz-export-item">
        <div class="pz-export-item-title">
          <span>JPEG</span>
          <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(251,191,36,0.15); color: #fbbf24;">Compresso</span>
        </div>
        <div class="pz-export-item-desc">Formato standard per fotografie. Aree trasparenti rese bianche.</div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; margin-top: 2px;">
          <span>Qualità:</span>
          <span id="export-jpeg-quality-val" style="font-weight: 600; color: #e2e8f0;">90%</span>
        </div>
        <input type="range" id="export-jpeg-quality" min="1" max="100" value="90" style="width: 100%; accent-color: #38bdf8; cursor: pointer;" />
        <button id="export-jpeg-btn" class="pz-btn pz-btn-secondary" style="margin-top: 4px; padding: 4px 8px; font-size: 11px; justify-content: center;">Scarica JPEG</button>
      </div>

      <!-- WebP Item -->
      <div class="pz-export-item">
        <div class="pz-export-item-title">
          <span>WebP</span>
          <span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(52,211,153,0.15); color: #34d399;">Moderno · Leggero</span>
        </div>
        <div class="pz-export-item-desc">Pure-Rust lossless ad altissima efficienza con trasparenza.</div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; margin-top: 2px;">
          <span>Qualità:</span>
          <span id="export-webp-quality-val" style="font-weight: 600; color: #e2e8f0;">90%</span>
        </div>
        <input type="range" id="export-webp-quality" min="1" max="100" value="90" style="width: 100%; accent-color: #34d399; cursor: pointer;" />
        <button id="export-webp-btn" class="pz-btn pz-btn-secondary" style="margin-top: 4px; padding: 4px 8px; font-size: 11px; justify-content: center;">Scarica WebP</button>
      </div>
    `;

    this.root.appendChild(this.exportDropdown);

    this.exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = this.exportDropdown.style.display === 'none';
      this.exportDropdown.style.display = isHidden ? 'flex' : 'none';
    });

    this.exportDropdown.querySelector('#export-close-btn')?.addEventListener('click', () => {
      this.exportDropdown.style.display = 'none';
    });

    document.addEventListener('click', (e) => {
      if (!this.exportDropdown.contains(e.target as Node) && e.target !== this.exportBtn && !this.exportBtn.contains(e.target as Node)) {
        this.exportDropdown.style.display = 'none';
      }
    });

    const jpegSlider = this.exportDropdown.querySelector('#export-jpeg-quality') as HTMLInputElement;
    const jpegVal = this.exportDropdown.querySelector('#export-jpeg-quality-val') as HTMLSpanElement;
    jpegSlider?.addEventListener('input', () => {
      if (jpegVal) jpegVal.textContent = `${jpegSlider.value}%`;
    });

    const webpSlider = this.exportDropdown.querySelector('#export-webp-quality') as HTMLInputElement;
    const webpVal = this.exportDropdown.querySelector('#export-webp-quality-val') as HTMLSpanElement;
    webpSlider?.addEventListener('input', () => {
      if (webpVal) webpVal.textContent = `${webpSlider.value}%`;
    });

    this.exportDropdown.querySelector('#export-png-btn')?.addEventListener('click', () => {
      this.exportDropdown.style.display = 'none';
      if (options.onExportPng) options.onExportPng();
    });

    this.exportDropdown.querySelector('#export-jpeg-btn')?.addEventListener('click', () => {
      this.exportDropdown.style.display = 'none';
      const q = parseInt(jpegSlider?.value || '90', 10);
      if (options.onExportJpeg) options.onExportJpeg(q);
    });

    this.exportDropdown.querySelector('#export-webp-btn')?.addEventListener('click', () => {
      this.exportDropdown.style.display = 'none';
      const q = parseInt(webpSlider?.value || '90', 10);
      if (options.onExportWebp) options.onExportWebp(q);
    });

    this.openPsdBtn = document.createElement('button');
    this.openPsdBtn.id = 'open-psd-btn';
    this.openPsdBtn.className = 'pz-btn pz-btn-secondary';
    this.openPsdBtn.style.padding = '5px 12px';
    this.openPsdBtn.style.fontSize = '12px';
    this.openPsdBtn.innerHTML = '<span>📂 Apri PSD</span>';
    this.openPsdBtn.title = 'Apri file Adobe Photoshop PSD/PSB';
    this.openPsdBtn.addEventListener('click', () => {
      if (options.onOpenPsd) options.onOpenPsd();
    });

    this.deselectBtn = document.createElement('button');
    this.deselectBtn.id = 'deselect-btn';
    this.deselectBtn.className = 'pz-btn pz-btn-secondary';
    this.deselectBtn.style.padding = '5px 10px';
    this.deselectBtn.style.fontSize = '12px';
    this.deselectBtn.innerHTML = '<span>✕ Deseleziona</span>';
    this.deselectBtn.title = 'Deseleziona (Ctrl+D)';
    this.deselectBtn.style.display = 'none';
    this.deselectBtn.addEventListener('click', () => {
      if (options.onDeselect) options.onDeselect();
    });

    const cmdPaletteBtn = document.createElement('button');
    cmdPaletteBtn.className = 'pz-btn pz-btn-secondary';
    cmdPaletteBtn.style.padding = '4px 10px';
    cmdPaletteBtn.style.fontSize = '12px';
    cmdPaletteBtn.innerHTML = '<span>⌘K Cerca comandi</span>';
    cmdPaletteBtn.addEventListener('click', () => this.palette.open());

    topRight.appendChild(this.undoBtn);
    topRight.appendChild(this.redoBtn);
    topRight.appendChild(this.deselectBtn);
    topRight.appendChild(this.saveBtn);
    topRight.appendChild(this.openProjectBtn);
    topRight.appendChild(this.exportBtn);
    topRight.appendChild(this.openPsdBtn);
    topRight.appendChild(cmdPaletteBtn);

    topBar.appendChild(topLeft);
    topBar.appendChild(modeSwitcher);
    topBar.appendChild(topRight);

    // 2. Left Toolbar
    const leftToolbar = document.createElement('aside');
    leftToolbar.className = 'pz-left-toolbar';

    const tools = [
      { id: 'move', label: '✥', title: 'Sposta Livello (V)' },
      { id: 'marquee', label: '⬚', title: 'Selezione Rettangolare (M)' },
      { id: 'brush', label: '🖌', title: 'Pennello (B)' },
      { id: 'eraser', label: '🧹', title: 'Gomma (E)' },
      { id: 'pen', label: '✒', title: 'Penna Bézier (P)' },
      { id: 'curvature', label: '∿', title: 'Curvatura κ-curves' },
      { id: 'wand', label: '🪄', title: 'Bacchetta Magica (W)' },
      { id: 'crop', label: '✂', title: 'Ritaglia (C)' },
      { id: 'hand', label: '✋', title: 'Mano Pan (H)' },
    ];

    tools.forEach(({ id, label, title }) => {
      const btn = document.createElement('button');
      btn.className = `pz-tool-btn ${this.activeTool === id ? 'pz-active' : ''}`;
      btn.dataset.tool = id;
      btn.innerHTML = label;
      btn.title = title;
      btn.addEventListener('click', () => {
        this.setActiveTool(id);
        if (options.onToolSelect) options.onToolSelect(id);
      });
      this.toolButtons.set(id, btn);
      leftToolbar.appendChild(btn);
    });

    // 3. Central Canvas Viewport
    this.canvasContainer = document.createElement('main');
    this.canvasContainer.className = 'pz-canvas-viewport';

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'pizzico-canvas';
    this.canvas.className = 'pz-canvas-element';
    this.canvas.width = 1200;
    this.canvas.height = 800;
    this.canvas.style.width = '600px';
    this.canvas.style.height = '400px';

    // HUD Quick Actions
    const hud = new FloatingActionBar([
      { id: 'bg-remove', label: 'Rimuovi Sfondo', icon: '✨', variant: 'primary' },
      { id: 'auto-light', label: 'Auto Luce', icon: '☀️' },
      { id: 'crop', label: 'Ritaglia', icon: '📐' },
    ]);

    this.canvasWrapper = document.createElement('div');
    this.canvasWrapper.className = 'pz-canvas-wrapper';

    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.id = 'pizzico-selection-overlay';
    this.selectionOverlay.className = 'pz-selection-marquee';
    this.selectionOverlay.style.display = 'none';

    this.canvasWrapper.appendChild(this.canvas);
    this.canvasWrapper.appendChild(this.selectionOverlay);

    this.canvasContainer.appendChild(this.canvasWrapper);
    this.canvasContainer.appendChild(hud.element);

    // 4. Right Sidebar (Inspector + Layers)
    const rightSidebar = document.createElement('aside');
    rightSidebar.className = 'pz-right-sidebar';

    const inspectorPanel = new Panel({ title: 'Proprietà / Ispettore' });
    this.inspectorPanelBody = inspectorPanel.body;

    const layersPanel = new Panel({ title: 'Livelli Ibridi' });
    this.layersPanelBody = layersPanel.body;

    rightSidebar.appendChild(inspectorPanel.element);
    rightSidebar.appendChild(layersPanel.element);

    // 5. Status Bar
    const statusBar = document.createElement('footer');
    statusBar.className = 'pz-bottom-status-bar';

    const statusLeft = document.createElement('div');
    statusLeft.textContent = '1200 × 800 px · 100% · sRGB · WebGPU Attivo';

    const statusRight = document.createElement('div');
    statusRight.style.cssText = 'display: flex; gap: 16px; align-items: center;';

    this.autosaveIndicator = document.createElement('span');
    this.autosaveIndicator.id = 'autosave-indicator';
    this.autosaveIndicator.style.cssText = 'color: #38bdf8; font-size: 11px;';
    this.autosaveIndicator.textContent = 'Autosave attivo';

    const brandSpan = document.createElement('span');
    brandSpan.textContent = 'Pizzico v0.1.0 · Offline-First · Zero IA v1';

    statusRight.appendChild(this.autosaveIndicator);
    statusRight.appendChild(brandSpan);

    statusBar.appendChild(statusLeft);
    statusBar.appendChild(statusRight);

    // 6. Assemble
    this.root.appendChild(topBar);
    this.root.appendChild(leftToolbar);
    this.root.appendChild(this.canvasContainer);
    this.root.appendChild(rightSidebar);
    this.root.appendChild(statusBar);

    // Command palette setup
    this.palette = new CommandPalette({
      commands: [
        { id: 'file.new', title: 'Nuovo Documento', category: 'file', shortcut: 'Ctrl+N', description: 'Crea un nuovo canvas' },
        { id: 'filter.blur', title: 'Sfocatura Box Blur O(1)', category: 'filter', description: 'Sfocatura ricorsiva a tempo costante' },
        { id: 'filter.median', title: 'Filtro Mediano O(1)', category: 'filter', description: 'Riduzione del rumore con istogrammi' },
        { id: 'vector.kappa', title: 'Curvature Tool (κ-Curves)', category: 'vector', description: 'Interpolazione continua' },
        { id: 'layer.new', title: 'Nuovo Livello', category: 'layer', shortcut: 'Ctrl+Shift+N', description: 'Aggiunge un livello vuoto' },
      ],
      onExecute: (cmdId) => {
        if (options.onCommand) options.onCommand(cmdId);
      },
    });
  }

  public getActiveTool(): string {
    return this.activeTool;
  }

  public setActiveTool(toolId: string) {
    this.activeTool = toolId;
    this.toolButtons.forEach((btn, id) => {
      if (id === toolId) {
        btn.classList.add('pz-active');
      } else {
        btn.classList.remove('pz-active');
      }
    });
  }

  public updateAutosaveIndicator(text: string, color = '#38bdf8') {
    if (this.autosaveIndicator) {
      this.autosaveIndicator.textContent = text;
      this.autosaveIndicator.style.color = color;
    }
  }
}
