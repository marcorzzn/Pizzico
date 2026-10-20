// Pizzico — packages/shared/src/types.ts
// Riferimento manifesto: §3.1, §4, §5.2
// Licenza: MIT OR Apache-2.0

export type WorkspaceMode = 'quick' | 'vector' | 'photo';

export type BlendMode =
  | 'Normal'
  | 'Multiply'
  | 'Screen'
  | 'Overlay'
  | 'Darken'
  | 'Lighten'
  | 'ColorDodge'
  | 'ColorBurn'
  | 'HardLight'
  | 'SoftLight'
  | 'Difference'
  | 'Exclusion';

export type LayerKind = 'Raster' | 'Vector' | 'Text' | 'Adjustment' | 'Group';

export interface LayerMetadata {
  id: number;
  name: string;
  kind: LayerKind;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
}

export interface DocumentInfo {
  width: number;
  height: number;
  title: string;
  layers: LayerMetadata[];
  activeLayerId: number | null;
}

export interface Command {
  id: string;
  title: string;
  category: 'file' | 'edit' | 'layer' | 'select' | 'filter' | 'view' | 'color' | 'vector';
  shortcut?: string;
  description: string;
}
