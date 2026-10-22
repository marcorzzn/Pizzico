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
  onOpacityChange?: (id: number, opacity: number) => void;
  onDelete?: (id: number) => void;
}

export class LayerRow {
  public element: HTMLDivElement;

  constructor(options: LayerRowOptions) {
    this.element = document.createElement('div');
    this.element.className = `pz-layer-row ${options.selected ? 'pz-layer-selected' : ''}`;
    this.element.dataset.layerId = String(options.layer.id);

    // Visibility Eye
    const visBtn = document.createElement('button');
    visBtn.className = 'pz-layer-vis-btn';
    visBtn.textContent = options.layer.visible ? '👁️' : '🕶️';
    visBtn.title = options.layer.visible ? 'Nascondi livello' : 'Mostra livello';
    visBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (options.onToggleVisibility) options.onToggleVisibility(options.layer.id);
    });

    // Layer Icon (Raster / Vector / Text / Group)
    const icon = document.createElement('span');
    icon.className = 'pz-layer-type-icon';
    icon.textContent =
      options.layer.kind === 'Raster'
        ? '🖼'
        : options.layer.kind === 'Vector'
        ? '✒'
        : options.layer.kind === 'Group'
        ? '📁'
        : 'T';

    // Layer Name
    const nameSpan = document.createElement('span');
    nameSpan.className = 'pz-layer-name';
    nameSpan.textContent = options.layer.name;
    nameSpan.title = options.layer.name;

    // Opacity Slider Control (0 - 100%)
    const opacityBox = document.createElement('div');
    opacityBox.className = 'pz-layer-opacity-control';
    const opacityPct = Math.round((options.layer.opacity ?? 1.0) * 100);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(opacityPct);
    slider.className = 'pz-layer-opacity-slider';
    slider.title = `Opacità: ${opacityPct}%`;

    const valSpan = document.createElement('span');
    valSpan.className = 'pz-layer-opacity-val';
    valSpan.textContent = `${opacityPct}%`;

    slider.addEventListener('click', (e) => e.stopPropagation());
    slider.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = Number((e.target as HTMLInputElement).value);
      valSpan.textContent = `${val}%`;
      slider.title = `Opacità: ${val}%`;
      if (options.onOpacityChange) {
        options.onOpacityChange(options.layer.id, val / 100.0);
      }
    });

    opacityBox.appendChild(slider);
    opacityBox.appendChild(valSpan);

    this.element.appendChild(visBtn);
    this.element.appendChild(icon);
    this.element.appendChild(nameSpan);
    this.element.appendChild(opacityBox);

    // Delete Button
    if (options.onDelete) {
      const delBtn = document.createElement('button');
      delBtn.className = 'pz-layer-del-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Elimina livello';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (options.onDelete) options.onDelete(options.layer.id);
      });
      this.element.appendChild(delBtn);
    }

    this.element.addEventListener('click', () => {
      if (options.onSelect) options.onSelect(options.layer.id);
    });
  }
}
