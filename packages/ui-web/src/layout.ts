// Pizzico — packages/ui-web/src/layout.ts
// Riferimento manifesto: §5.1, §5.5, §11 Step 3
// Riferimento design: docs/ui/design-decisions.md §1-§6, docs/design-pizzart/layout.md
// Licenza: MIT OR Apache-2.0
//
// Struttura della shell (Fase 6b), fedele al riferimento reale:
//   top bar     → marchio, menu File/Modifica/Vista, suggerimento, strumenti
//   canvas      → area flessibile, sfondo --pz-bg-canvas
//   pannello    → 280px: Strumento, Layer, Effetti, Maschere
//   bottom bar  → dimensioni, zoom, profilo colore, motore, nome documento
//
// Contratto pubblico invariato: main.ts dipende da root, canvas, canvasContainer,
// canvasWrapper, selectionOverlay, inspectorPanelBody, layersPanelBody, undoBtn,
// redoBtn, deselectBtn, autosaveIndicator, setActiveTool, updateAutosaveIndicator.
// Gli ID sono quelli di prima: undo-btn, redo-btn, save-project-btn,
// open-project-btn, export-btn, export-dropdown, open-psd-btn, deselect-btn,
// pizzico-canvas, pizzico-selection-overlay, autosave-indicator.
//
// Nota: le azioni (Salva, Esporta, Annulla…) vivono dentro i menu, come nel
// riferimento, ma restano le UNICHE istanze degli elementi: undoBtn è davvero il
// pulsante che main.ts disabilita, non una copia.

import { WorkspaceMode } from '@pizzico/shared';
import {
  BrushIcon,
  CheckIcon,
  ChevronDownIcon,
  CommandIcon,
  CropIcon,
  DownloadIcon,
  EraserIcon,
  FloatingActionBar,
  FolderOpenIcon,
  HandIcon,
  MoveIcon,
  Panel,
  PenIcon,
  PlusIcon,
  RedoIcon,
  SaveIcon,
  SparklesIcon,
  SplineIcon,
  SquareDashedIcon,
  SunIcon,
  UndoIcon,
  WandSparklesIcon,
  XIcon,
} from '@pizzico/ui-kit';
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
  onExportPsd?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDeselect?: () => void;
}

type IconFn = (size?: number) => string;
type MenuEntry = HTMLButtonElement | 'separator';

interface ToolDefinition {
  id: string;
  title: string;
  icon: IconFn;
  /** Suggerimento contestuale mostrato al centro della top bar. */
  hint: string;
}

/**
 * Colori che main.ts passa ancora inline a updateAutosaveIndicator.
 * La mappatura sparisce quando main.ts verrà rifattorizzato (Fase 6c/6d).
 */
const LEGACY_COLOR_TO_TOKEN: Record<string, string> = {
  '#38bdf8': 'var(--pz-accent)',
  '#f87171': 'var(--pz-error)',
  '#ef4444': 'var(--pz-error)',
};

const TOOLS: ToolDefinition[] = [
  { id: 'move', title: 'Sposta livello (V)', icon: MoveIcon, hint: 'trascina per spostare il livello' },
  {
    id: 'marquee',
    title: 'Selezione rettangolare (M)',
    icon: SquareDashedIcon,
    hint: 'trascina per selezionare un rettangolo',
  },
  { id: 'brush', title: 'Pennello (B)', icon: BrushIcon, hint: 'trascina per disegnare' },
  { id: 'eraser', title: 'Gomma (E)', icon: EraserIcon, hint: 'trascina per cancellare' },
  { id: 'pen', title: 'Penna Bézier (P)', icon: PenIcon, hint: 'traccia un percorso vettoriale' },
  { id: 'curvature', title: 'Curvature κ-curves', icon: SplineIcon, hint: 'curva continua κ-curves' },
  {
    id: 'wand',
    title: 'Bacchetta magica (W)',
    icon: WandSparklesIcon,
    hint: 'seleziona per similarità di colore',
  },
  { id: 'crop', title: 'Ritaglia (C)', icon: CropIcon, hint: 'definisci l’area di ritaglio' },
  { id: 'hand', title: 'Mano / pan (H)', icon: HandIcon, hint: 'trascina per spostare la vista' },
];

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

  private activeTool = 'brush';
  private currentMode: WorkspaceMode = 'quick';
  private toolButtons = new Map<string, HTMLButtonElement>();
  private toolHint!: HTMLSpanElement;
  private menus: HTMLDivElement[] = [];
  private openMenuList: HTMLElement | null = null;

  constructor(options: LayoutOptions = {}) {
    this.root = document.createElement('div');
    this.root.className = 'pz-app-shell';

    // ── Export dropdown (aperto dal menu File) ───────────────────────────────

    this.exportDropdown = this.buildExportDropdown(options);

    // ── Azioni: uniche istanze, inserite nei menu ────────────────────────────

    this.openPsdBtn = this.buildMenuButton('open-psd-btn', 'Apri PSD…', 'Ctrl+Shift+O', FolderOpenIcon, () =>
      options.onOpenPsd?.()
    );
    this.openProjectBtn = this.buildMenuButton(
      'open-project-btn',
      'Apri progetto…',
      'Ctrl+O',
      FolderOpenIcon,
      () => options.onOpenProject?.()
    );
    this.saveBtn = this.buildMenuButton('save-project-btn', 'Salva progetto', 'Ctrl+S', SaveIcon, () =>
      options.onSaveProject?.()
    );
    this.exportBtn = this.buildMenuButton('export-btn', 'Esporta immagine…', '', DownloadIcon, () => {
      this.exportDropdown.style.display = this.exportDropdown.style.display === 'none' ? 'flex' : 'none';
    });
    this.undoBtn = this.buildMenuButton('undo-btn', 'Annulla', 'Ctrl+Z', UndoIcon, () => options.onUndo?.());
    this.redoBtn = this.buildMenuButton('redo-btn', 'Ripristina', 'Ctrl+Y', RedoIcon, () => options.onRedo?.());
    this.deselectBtn = this.buildMenuButton('deselect-btn', 'Deseleziona', 'Ctrl+D', XIcon, () =>
      options.onDeselect?.()
    );
    this.deselectBtn.style.display = 'none';
    this.undoBtn.disabled = true;
    this.redoBtn.disabled = true;

    const newDocBtn = this.buildMenuButton('new-document-btn', 'Nuovo documento', 'Ctrl+N', PlusIcon, () =>
      options.onCommand?.('file.new')
    );
    const paletteItem = this.buildMenuButton('open-palette-btn', 'Cerca comandi', 'Ctrl+K', CommandIcon, () =>
      this.palette.open()
    );

    // Modalità workspace (§5.5): prima era uno switcher nella top bar, ora vive
    // in Vista, perché la top bar resta a menu, suggerimento e strumenti.
    const modeButtons = new Map<WorkspaceMode, HTMLButtonElement>();
    const renderModes = () => {
      modeButtons.forEach((btn, id) => {
        const iconSpan = btn.querySelector('.pz-menu-item-icon');
        if (iconSpan) iconSpan.innerHTML = id === this.currentMode ? CheckIcon(16) : '';
        btn.setAttribute('aria-checked', String(id === this.currentMode));
      });
    };
    const modeEntries: MenuEntry[] = [];
    const modes: { id: WorkspaceMode; label: string }[] = [
      { id: 'quick', label: 'Quick Edit' },
      { id: 'vector', label: 'Vector Illustration' },
      { id: 'photo', label: 'Deep Retouching' },
    ];
    modes.forEach(({ id, label }) => {
      const btn = this.buildMenuButton(null, label, '', CheckIcon, () => {
        this.currentMode = id;
        renderModes();
        options.onModeChange?.(id);
      });
      btn.setAttribute('role', 'menuitemradio');
      modeButtons.set(id, btn);
      modeEntries.push(btn);
    });
    renderModes();

    const fileMenu = this.buildMenu('File', [
      newDocBtn,
      'separator',
      this.openPsdBtn,
      this.openProjectBtn,
      'separator',
      this.saveBtn,
      this.exportBtn,
    ]);
    const editMenu = this.buildMenu('Modifica', [this.undoBtn, this.redoBtn, 'separator', this.deselectBtn]);
    const viewMenu = this.buildMenu('Vista', [...modeEntries, 'separator', paletteItem]);

    // ── 1. Top bar ───────────────────────────────────────────────────────────

    const topBar = document.createElement('header');
    topBar.className = 'pz-top-bar';

    const topLeft = document.createElement('div');
    topLeft.className = 'pz-top-left';

    const brand = document.createElement('div');
    brand.className = 'pz-brand';
    brand.innerHTML = `
      <svg class="pz-brand-logo" viewBox="0 0 128 128" aria-hidden="true" focusable="false">
        <circle class="pz-brand-mark" cx="64" cy="64" r="42" fill="none" stroke-width="12" />
        <path class="pz-brand-shape" d="M44 64 L64 36 L84 64 L64 92 Z" />
      </svg>
      <span>Pizzico</span>
    `;
    topLeft.appendChild(brand);
    topLeft.appendChild(fileMenu);
    topLeft.appendChild(editMenu);
    topLeft.appendChild(viewMenu);

    const topCenter = document.createElement('div');
    topCenter.className = 'pz-top-center';
    this.toolHint = document.createElement('span');
    this.toolHint.className = 'pz-tool-hint';
    topCenter.appendChild(this.toolHint);

    const topRight = document.createElement('div');
    topRight.className = 'pz-top-right';

    const toolGroup = document.createElement('div');
    toolGroup.className = 'pz-tool-group';

    TOOLS.forEach(({ id, title, icon, hint }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pz-tool-btn ${this.activeTool === id ? 'pz-active' : ''}`;
      btn.dataset.tool = id;
      btn.dataset.hint = hint;
      btn.innerHTML = icon(16);
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.setAttribute('aria-pressed', String(this.activeTool === id));
      btn.addEventListener('click', () => {
        this.setActiveTool(id);
        options.onToolSelect?.(id);
      });
      this.toolButtons.set(id, btn);
      toolGroup.appendChild(btn);
    });

    const toolbarSeparator = document.createElement('span');
    toolbarSeparator.className = 'pz-toolbar-separator';

    const paletteBtn = document.createElement('button');
    paletteBtn.type = 'button';
    paletteBtn.className = 'pz-tool-btn';
    paletteBtn.innerHTML = CommandIcon(16);
    paletteBtn.title = 'Cerca comandi (Ctrl+K)';
    paletteBtn.setAttribute('aria-label', 'Cerca comandi');
    paletteBtn.addEventListener('click', () => this.palette.open());

    topRight.appendChild(toolGroup);
    topRight.appendChild(toolbarSeparator);
    topRight.appendChild(paletteBtn);

    topBar.appendChild(topLeft);
    topBar.appendChild(topCenter);
    topBar.appendChild(topRight);

    this.root.appendChild(this.exportDropdown);

    // ── 2. Canvas ────────────────────────────────────────────────────────────

    this.canvasContainer = document.createElement('main');
    this.canvasContainer.className = 'pz-canvas-viewport';

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'pizzico-canvas';
    this.canvas.className = 'pz-canvas-element';
    this.canvas.width = 1200;
    this.canvas.height = 800;
    this.canvas.style.width = '600px';
    this.canvas.style.height = '400px';

    const hud = new FloatingActionBar([
      { id: 'bg-remove', label: 'Rimuovi sfondo', icon: SparklesIcon(16), variant: 'primary' },
      { id: 'auto-light', label: 'Auto luce', icon: SunIcon(16) },
      { id: 'crop', label: 'Ritaglia', icon: CropIcon(16) },
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

    // ── 3. Pannello destro (§6: Strumento, Layer, Effetti, Maschere) ─────────

    const rightSidebar = document.createElement('aside');
    rightSidebar.className = 'pz-right-sidebar';

    const inspectorPanel = new Panel({ title: 'Strumento' });
    this.inspectorPanelBody = inspectorPanel.body;

    const layersPanel = new Panel({ title: 'Layer' });
    this.layersPanelBody = layersPanel.body;

    const effectsPanel = new Panel({ title: 'Effetti' });
    const effectsNote = document.createElement('p');
    effectsNote.className = 'pz-panel-empty';
    effectsNote.textContent = 'Sezione presente nello scheletro: viene collegata al motore nella Fase 6d.';
    effectsPanel.body.appendChild(effectsNote);

    const masksPanel = new Panel({ title: 'Maschere' });
    const masksNote = document.createElement('p');
    masksNote.className = 'pz-panel-empty';
    masksNote.textContent = 'Sezione presente nello scheletro: viene collegata al motore nella Fase 6d.';
    masksPanel.body.appendChild(masksNote);

    rightSidebar.appendChild(inspectorPanel.element);
    rightSidebar.appendChild(layersPanel.element);
    rightSidebar.appendChild(effectsPanel.element);
    rightSidebar.appendChild(masksPanel.element);

    // ── 4. Barra di stato ────────────────────────────────────────────────────

    const statusBar = document.createElement('footer');
    statusBar.className = 'pz-bottom-status-bar';

    const statusLeft = document.createElement('div');
    statusLeft.className = 'pz-status-group';
    statusLeft.innerHTML = `
      <span class="pz-status-item">1200 × 800 px</span>
      <span class="pz-status-sep">·</span>
      <span class="pz-status-item">100%</span>
      <span class="pz-status-sep">·</span>
      <span class="pz-status-item">sRGB</span>
      <span class="pz-status-sep">·</span>
      <span class="pz-status-item">WebGPU attivo</span>
    `;

    const statusRight = document.createElement('div');
    statusRight.className = 'pz-status-group';

    const docName = document.createElement('span');
    docName.className = 'pz-status-doc';
    docName.textContent = 'documento nuovo';

    const statusSep = document.createElement('span');
    statusSep.className = 'pz-status-sep';
    statusSep.textContent = '·';

    this.autosaveIndicator = document.createElement('span');
    this.autosaveIndicator.id = 'autosave-indicator';
    this.autosaveIndicator.className = 'pz-status-item';
    this.autosaveIndicator.textContent = 'Autosave attivo';

    statusRight.appendChild(docName);
    statusRight.appendChild(statusSep);
    statusRight.appendChild(this.autosaveIndicator);

    statusBar.appendChild(statusLeft);
    statusBar.appendChild(statusRight);

    // ── 5. Assemblaggio ──────────────────────────────────────────────────────

    this.root.appendChild(topBar);
    this.root.appendChild(this.canvasContainer);
    this.root.appendChild(rightSidebar);
    this.root.appendChild(statusBar);

    // ── 6. Command palette ───────────────────────────────────────────────────

    this.palette = new CommandPalette({
      commands: [
        { id: 'file.new', title: 'Nuovo Documento', category: 'file', shortcut: 'Ctrl+N', description: 'Crea un nuovo canvas' },
        { id: 'filter.blur', title: 'Sfocatura Box Blur O(1)', category: 'filter', description: 'Sfocatura ricorsiva a tempo costante' },
        { id: 'filter.median', title: 'Filtro Mediano O(1)', category: 'filter', description: 'Riduzione del rumore con istogrammi' },
        { id: 'vector.kappa', title: 'Curvature Tool (κ-Curves)', category: 'vector', description: 'Interpolazione continua' },
        { id: 'layer.new', title: 'Nuovo Livello', category: 'layer', shortcut: 'Ctrl+Shift+N', description: 'Aggiunge un livello vuoto' },
      ],
      onExecute: (cmdId) => {
        options.onCommand?.(cmdId);
      },
    });

    this.syncToolHint();

    // Un solo listener per chiudere menu e dropdown al click esterno.
    document.addEventListener('click', (e) => {
      const target = e.target as Node;
      if (this.openMenuList && !this.menus.some((menu) => menu.contains(target))) {
        this.closeMenus();
      }
      if (!this.exportDropdown.contains(target) && !this.exportBtn.contains(target)) {
        this.exportDropdown.style.display = 'none';
      }
    });
  }

  // ── API pubblica ───────────────────────────────────────────────────────────

  public getActiveTool(): string {
    return this.activeTool;
  }

  public setActiveTool(toolId: string) {
    this.activeTool = toolId;
    this.toolButtons.forEach((btn, id) => {
      const isActive = id === toolId;
      btn.classList.toggle('pz-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
    this.syncToolHint();
  }

  public updateAutosaveIndicator(text: string, color?: string) {
    if (!this.autosaveIndicator) return;
    this.autosaveIndicator.textContent = text;
    if (!color) return;
    this.autosaveIndicator.style.color = LEGACY_COLOR_TO_TOKEN[color.toLowerCase()] ?? color;
  }

  // ── Costruzione: elementi e menu ───────────────────────────────────────────

  private buildMenuButton(
    id: string | null,
    label: string,
    shortcut: string,
    icon: IconFn,
    onClick: () => void
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    if (id) btn.id = id;
    btn.className = 'pz-menu-item';
    btn.setAttribute('role', 'menuitem');
    btn.innerHTML = `
      <span class="pz-menu-item-icon">${icon(16)}</span>
      <span class="pz-menu-item-label">${label}</span>
      ${shortcut ? `<span class="pz-menu-item-shortcut">${shortcut}</span>` : ''}
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeMenus();
      onClick();
    });
    return btn;
  }

  private buildMenu(label: string, entries: MenuEntry[]): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'pz-menu';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'pz-menu-btn';
    trigger.innerHTML = `<span>${label}</span>${ChevronDownIcon(14)}`;
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');

    const list = document.createElement('div');
    list.className = 'pz-menu-list';
    list.setAttribute('role', 'menu');

    entries.forEach((entry) => {
      if (entry === 'separator') {
        const sep = document.createElement('div');
        sep.className = 'pz-menu-separator';
        sep.setAttribute('role', 'separator');
        list.appendChild(sep);
        return;
      }
      list.appendChild(entry);
    });

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const wasOpen = list.classList.contains('pz-menu-list-open');
      this.closeMenus();
      if (!wasOpen) {
        list.classList.add('pz-menu-list-open');
        trigger.classList.add('pz-menu-open');
        trigger.setAttribute('aria-expanded', 'true');
        this.openMenuList = list;
      }
    });

    container.appendChild(trigger);
    container.appendChild(list);
    this.menus.push(container);
    return container;
  }

  private closeMenus() {
    this.menus.forEach((menu) => {
      menu.querySelector('.pz-menu-list')?.classList.remove('pz-menu-list-open');
      const trigger = menu.querySelector('.pz-menu-btn');
      trigger?.classList.remove('pz-menu-open');
      trigger?.setAttribute('aria-expanded', 'false');
    });
    this.openMenuList = null;
  }

  private syncToolHint() {
    const active = this.toolButtons.get(this.activeTool);
    if (!active || !this.toolHint) return;
    const name = (active.title || '').replace(/\s*\(.*\)$/, '');
    const hint = active.dataset.hint;
    this.toolHint.innerHTML = `<span class="pz-hint-tool">${name}</span>${hint ? ` — ${hint}` : ''}`;
  }

  // ── Costruzione: dropdown export ───────────────────────────────────────────

  private buildExportDropdown(options: LayoutOptions): HTMLDivElement {
    const dropdown = document.createElement('div');
    dropdown.id = 'export-dropdown';
    dropdown.className = 'pz-export-dropdown';
    dropdown.style.display = 'none';

    dropdown.innerHTML = `
      <div class="pz-export-header">
        <span class="pz-export-title">Esporta immagine</span>
        <button type="button" id="export-close-btn" class="pz-export-close" aria-label="Chiudi">${XIcon(16)}</button>
      </div>

      <div class="pz-export-item">
        <div class="pz-export-item-title">
          <span>PNG</span>
          <span class="pz-export-badge">lossless · alpha</span>
        </div>
        <div class="pz-export-item-desc">Grafica raster a 32 bit con canale alpha trasparente.</div>
        <button type="button" id="export-png-btn" class="pz-btn pz-btn-primary">Scarica PNG</button>
      </div>

      <div class="pz-export-item">
        <div class="pz-export-item-title">
          <span>JPEG</span>
          <span class="pz-export-badge">compresso</span>
        </div>
        <div class="pz-export-item-desc">Formato standard per fotografie. Le aree trasparenti diventano bianche.</div>
        <div class="pz-export-quality">
          <span>Qualità</span>
          <span id="export-jpeg-quality-val" class="pz-export-quality-value">90%</span>
        </div>
        <input type="range" id="export-jpeg-quality" class="pz-slider-range" min="1" max="100" value="90" />
        <button type="button" id="export-jpeg-btn" class="pz-btn pz-btn-secondary">Scarica JPEG</button>
      </div>

      <div class="pz-export-item">
        <div class="pz-export-item-title">
          <span>WebP</span>
          <span class="pz-export-badge">moderno · leggero</span>
        </div>
        <div class="pz-export-item-desc">Lossless in puro Rust, con trasparenza.</div>
        <div class="pz-export-quality">
          <span>Qualità</span>
          <span id="export-webp-quality-val" class="pz-export-quality-value">90%</span>
        </div>
        <input type="range" id="export-webp-quality" class="pz-slider-range" min="1" max="100" value="90" />
        <button type="button" id="export-webp-btn" class="pz-btn pz-btn-secondary">Scarica WebP</button>
      </div>

      <div class="pz-export-item">
        <div class="pz-export-item-title">
          <span>PSD</span>
          <span class="pz-export-badge">multilivello</span>
        </div>
        <div class="pz-export-item-desc">Adobe PSD multilivello con canali RLE e composito.</div>
        <button type="button" id="export-psd-btn" class="pz-btn pz-btn-secondary">Scarica PSD</button>
      </div>
    `;

    dropdown.querySelector('#export-close-btn')?.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });

    const jpegSlider = dropdown.querySelector('#export-jpeg-quality') as HTMLInputElement;
    const jpegVal = dropdown.querySelector('#export-jpeg-quality-val') as HTMLSpanElement;
    jpegSlider?.addEventListener('input', () => {
      if (jpegVal) jpegVal.textContent = `${jpegSlider.value}%`;
    });

    const webpSlider = dropdown.querySelector('#export-webp-quality') as HTMLInputElement;
    const webpVal = dropdown.querySelector('#export-webp-quality-val') as HTMLSpanElement;
    webpSlider?.addEventListener('input', () => {
      if (webpVal) webpVal.textContent = `${webpSlider.value}%`;
    });

    dropdown.querySelector('#export-png-btn')?.addEventListener('click', () => {
      dropdown.style.display = 'none';
      options.onExportPng?.();
    });

    dropdown.querySelector('#export-jpeg-btn')?.addEventListener('click', () => {
      dropdown.style.display = 'none';
      options.onExportJpeg?.(parseInt(jpegSlider?.value || '90', 10));
    });

    dropdown.querySelector('#export-webp-btn')?.addEventListener('click', () => {
      dropdown.style.display = 'none';
      options.onExportWebp?.(parseInt(webpSlider?.value || '90', 10));
    });

    dropdown.querySelector('#export-psd-btn')?.addEventListener('click', () => {
      dropdown.style.display = 'none';
      options.onExportPsd?.();
    });

    return dropdown;
  }
}
