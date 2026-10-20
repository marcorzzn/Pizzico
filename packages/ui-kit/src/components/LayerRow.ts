// Pizzico — packages/ui-kit/src/components/LayerRow.ts
// Riferimento manifesto: §5.1, §5.4, §11 Step 3
// Licenza: MIT OR Apache-2.0

import { LayerMetadata } from '@pizzico/shared';

export interface LayerRowOptions {
  layer: LayerMetadata;
  selected?: boolean;
  onSelect?: (id: number) => void;
  onToggleVisibility?: (id: number) => void;
  onToggleLock?: (id: number) => void;
}

export class LayerRow {
  public element: HTMLDivElement;

  constructor(options: LayerRowOptions) {
    this.element = document.createElement('div');
    this.element.className = `pz-layer-row ${options.selected ? 'pz-layer-selected' : ''}`;

    // Visibility Eye
    const visBtn = document.createElement('button');
    visBtn.className = 'pz-layer-vis-btn';
    visBtn.textContent = options.layer.visible ? '👁' : '─';
    visBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (options.onToggleVisibility) options.onToggleVisibility(options.layer.id);
    });

    // Layer Icon (Raster / Vector / Text)
    const icon = document.createElement('span');
    icon.className = 'pz-layer-type-icon';
    icon.textContent = options.layer.kind === 'Raster' ? '🖼' : options.layer.kind === 'Vector' ? '✒' : 'T';

    // Layer Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'pz-layer-name';
    nameSpan.textContent = options.layer.name;

    // Lock Indicator
    const lockBtn = document.createElement('button');
    lockBtn.className = 'pz-layer-lock-btn';
    lockBtn.textContent = options.layer.locked ? '🔒' : '';
    lockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (options.onToggleLock) options.onToggleLock(options.layer.id);
    });

    this.element.appendChild(visBtn);
    this.element.appendChild(icon);
    this.element.appendChild(nameSpan);
    this.element.appendChild(lockBtn);

    this.element.addEventListener('click', () => {
      if (options.onSelect) options.onSelect(options.layer.id);
    });
  }
}
