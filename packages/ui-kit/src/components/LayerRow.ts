// Pizzico — packages/ui-kit/src/components/LayerRow.ts
// Riferimento manifesto: §5.1, §5.4, §11 Step 3
// Riferimento design: docs/ui/design-decisions.md §4 (icone, zero emoji), §5 (riga 32px)
// Licenza: MIT OR Apache-2.0
//
// API e contratto DOM invariati: main.ts crea le righe con `new LayerRow(...)` e
// poi le interroga per `.pz-layer-row[data-layer-id]`, `.pz-layer-opacity-slider`
// e `.pz-layer-opacity-val`. Quei nomi non cambiano qui.
//
// Cambia solo il contenuto delle icone: SVG Lucide al posto delle emoji.

import { LayerKind, LayerMetadata } from '@pizzico/shared';
import {
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  LayersIcon,
  PenIcon,
  SlidersIcon,
  TypeIcon,
  XIcon,
} from '../icons';

export interface LayerRowOptions {
  layer: LayerMetadata;
  selected?: boolean;
  onSelect?: (id: number) => void;
  onToggleVisibility?: (id: number) => void;
  onToggleLock?: (id: number) => void;
  onOpacityChange?: (id: number, opacity: number) => void;
  onDelete?: (id: number) => void;
}

/** Icona del tipo di livello. */
function layerKindIcon(kind: LayerKind): string {
  switch (kind) {
    case 'Raster':
      return ImageIcon(16);
    case 'Vector':
      return PenIcon(16);
    case 'Group':
      return LayersIcon(16);
    case 'Adjustment':
      return SlidersIcon(16);
    case 'Text':
    default:
      return TypeIcon(16);
  }
}

export class LayerRow {
  public element: HTMLDivElement;

  constructor(options: LayerRowOptions) {
    const { layer } = options;

    this.element = document.createElement('div');
    this.element.className = `pz-layer-row ${options.selected ? 'pz-layer-selected' : ''}`;
    this.element.dataset.layerId = String(layer.id);

    // Visibilità: il pulsante è l'unico stato binario della riga, quindi espone
    // anche aria-pressed oltre al nome accessibile.
    const visBtn = document.createElement('button');
    visBtn.type = 'button';
    visBtn.className = 'pz-layer-vis-btn';
    visBtn.innerHTML = layer.visible ? EyeIcon(16) : EyeOffIcon(16);
    visBtn.title = layer.visible ? 'Nascondi livello' : 'Mostra livello';
    visBtn.setAttribute('aria-label', visBtn.title);
    visBtn.setAttribute('aria-pressed', String(layer.visible));
    visBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onToggleVisibility?.(layer.id);
    });

    // Tipo di livello
    const icon = document.createElement('span');
    icon.className = 'pz-layer-type-icon';
    icon.innerHTML = layerKindIcon(layer.kind);
    icon.title = layer.kind;
    icon.setAttribute('aria-hidden', 'true');

    // Nome
    const nameSpan = document.createElement('span');
    nameSpan.className = 'pz-layer-name';
    nameSpan.textContent = layer.name;
    nameSpan.title = layer.name;

    // Opacità (0-100%)
    const opacityBox = document.createElement('div');
    opacityBox.className = 'pz-layer-opacity-control';
    const opacityPct = Math.round((layer.opacity ?? 1.0) * 100);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(opacityPct);
    slider.className = 'pz-layer-opacity-slider';
    slider.title = `Opacità: ${opacityPct}%`;
    slider.setAttribute('aria-label', `Opacità di ${layer.name}`);

    const valSpan = document.createElement('span');
    valSpan.className = 'pz-layer-opacity-val';
    valSpan.textContent = `${opacityPct}%`;

    slider.addEventListener('click', (e) => e.stopPropagation());
    slider.addEventListener('input', (e) => {
      e.stopPropagation();
      const val = Number((e.target as HTMLInputElement).value);
      valSpan.textContent = `${val}%`;
      slider.title = `Opacità: ${val}%`;
      options.onOpacityChange?.(layer.id, val / 100.0);
    });

    opacityBox.appendChild(slider);
    opacityBox.appendChild(valSpan);

    this.element.appendChild(visBtn);
    this.element.appendChild(icon);
    this.element.appendChild(nameSpan);
    this.element.appendChild(opacityBox);

    if (options.onDelete) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'pz-layer-del-btn';
      delBtn.innerHTML = XIcon(16);
      delBtn.title = 'Elimina livello';
      delBtn.setAttribute('aria-label', `Elimina ${layer.name}`);
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        options.onDelete?.(layer.id);
      });
      this.element.appendChild(delBtn);
    }

    this.element.addEventListener('click', () => {
      options.onSelect?.(layer.id);
    });
  }
}

/** Elemento pronto da inserire nel DOM. */
export function createLayerRow(options: LayerRowOptions): HTMLElement {
  return new LayerRow(options).element;
}
