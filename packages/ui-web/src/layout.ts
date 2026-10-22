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
}

export class DesktopShellLayout {
  public root: HTMLDivElement;
  public canvasContainer: HTMLElement;
  public canvas: HTMLCanvasElement;
  public layersPanelBody!: HTMLDivElement;
  public inspectorPanelBody!: HTMLDivElement;
  public palette: CommandPalette;

  private currentMode: WorkspaceMode = 'quick';
  private activeTool = 'brush';

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

    // Command Palette Trigger Button
    const cmdPaletteBtn = document.createElement('button');
    cmdPaletteBtn.className = 'pz-btn pz-btn-secondary';
    cmdPaletteBtn.style.padding = '4px 10px';
    cmdPaletteBtn.style.fontSize = '12px';
    cmdPaletteBtn.innerHTML = '<span>⌘K Cerca comandi</span>';
    cmdPaletteBtn.addEventListener('click', () => this.palette.open());

    topBar.appendChild(topLeft);
    topBar.appendChild(modeSwitcher);
    topBar.appendChild(cmdPaletteBtn);

    // 2. Left Toolbar
    const leftToolbar = document.createElement('aside');
    leftToolbar.className = 'pz-left-toolbar';

    const tools = [
      { id: 'move', label: '✛', title: 'Sposta (V)' },
      { id: 'brush', label: '🖌', title: 'Pennello (B)' },
      { id: 'pen', label: '✒', title: 'Penna Bézier (P)' },
      { id: 'curvature', label: '∿', title: 'Curvatura κ-curves' },
      { id: 'wand', label: '🪄', title: 'Bacchetta Magica (W)' },
      { id: 'crop', label: '✂', title: 'Ritaglia (C)' },
      { id: 'hand', label: '✋', title: 'Mano Pan (H)' },
    ];

    tools.forEach(({ id, label, title }) => {
      const btn = document.createElement('button');
      btn.className = `pz-tool-btn ${this.activeTool === id ? 'pz-active' : ''}`;
      btn.innerHTML = label;
      btn.title = title;
      btn.addEventListener('click', () => {
        leftToolbar.querySelectorAll('.pz-tool-btn').forEach((b) => b.classList.remove('pz-active'));
        btn.classList.add('pz-active');
        this.activeTool = id;
        if (options.onToolSelect) options.onToolSelect(id);
      });
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
}
