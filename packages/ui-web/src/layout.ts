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
  onUndo?: () => void;
  onRedo?: () => void;
}

export class DesktopShellLayout {
  public root: HTMLDivElement;
  public canvasContainer: HTMLElement;
  public canvas: HTMLCanvasElement;
  public layersPanelBody!: HTMLDivElement;
  public inspectorPanelBody!: HTMLDivElement;
  public palette: CommandPalette;
  public openPsdBtn: HTMLButtonElement;
  public undoBtn: HTMLButtonElement;
  public redoBtn: HTMLButtonElement;

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

    this.openPsdBtn = document.createElement('button');
    this.openPsdBtn.id = 'open-psd-btn';
    this.openPsdBtn.className = 'pz-btn pz-btn-primary';
    this.openPsdBtn.style.padding = '5px 12px';
    this.openPsdBtn.style.fontSize = '12px';
    this.openPsdBtn.innerHTML = '<span>📂 Apri PSD</span>';
    this.openPsdBtn.addEventListener('click', () => {
      if (options.onOpenPsd) options.onOpenPsd();
    });

    const cmdPaletteBtn = document.createElement('button');
    cmdPaletteBtn.className = 'pz-btn pz-btn-secondary';
    cmdPaletteBtn.style.padding = '4px 10px';
    cmdPaletteBtn.style.fontSize = '12px';
    cmdPaletteBtn.innerHTML = '<span>⌘K Cerca comandi</span>';
    cmdPaletteBtn.addEventListener('click', () => this.palette.open());

    topRight.appendChild(this.undoBtn);
    topRight.appendChild(this.redoBtn);
    topRight.appendChild(this.openPsdBtn);
    topRight.appendChild(cmdPaletteBtn);

    topBar.appendChild(topLeft);
    topBar.appendChild(modeSwitcher);
    topBar.appendChild(topRight);

    // 2. Left Toolbar
    const leftToolbar = document.createElement('aside');
    leftToolbar.className = 'pz-left-toolbar';

    const tools = [
      { id: 'move', label: '✛', title: 'Sposta (V)' },
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

    this.canvasContainer.appendChild(this.canvas);
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
    statusBar.innerHTML = `
      <div>1200 × 800 px · 100% · sRGB · WebGPU Attivo</div>
      <div>Pizzico v0.1.0 · Offline-First · Zero IA v1</div>
    `;

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
}
