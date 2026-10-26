// Pizzico — packages/ui-kit/src/icons/index.ts
// Licenza: MIT OR Apache-2.0
//
// FILE GENERATO — non modificare a mano.
//   node packages/ui-kit/scripts/gen-icons.mjs
//
// Icone: Lucide v1.61.0 (ISC). Attribution in docs/ui/icons.md.
// Ogni icona usa stroke="currentColor": eredita il colore del testo e non ha
// colori cablati. Dichiarativa e decorativa: aria-hidden, il nome accessibile
// va sul controllo che la contiene.

const PATHS = {
  "brush": "<path d=\"m11 10 3 3\" /> <path d=\"M6.5 21A3.5 3.5 0 1 0 3 17.5a2.62 2.62 0 0 1-.708 1.792A1 1 0 0 0 3 21z\" /> <path d=\"M9.969 17.031 21.378 5.624a1 1 0 0 0-3.002-3.002L6.967 14.031\" />",
  "check": "<path d=\"M20 6 9 17l-5-5\" />",
  "chevron-down": "<path d=\"m6 9 6 6 6-6\" />",
  "circle": "<circle cx=\"12\" cy=\"12\" r=\"10\" />",
  "circle-alert": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\" /> <line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\" />",
  "command": "<path d=\"M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3\" />",
  "crop": "<path d=\"M6 2v14a2 2 0 0 0 2 2h14\" /> <path d=\"M18 22V8a2 2 0 0 0-2-2H2\" />",
  "download": "<path d=\"M12 15V3\" /> <path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <path d=\"m7 10 5 5 5-5\" />",
  "eraser": "<path d=\"M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21\" /> <path d=\"m5.082 11.09 8.828 8.828\" />",
  "eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />",
  "eye-off": "<path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\" /> <path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\" /> <path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\" /> <path d=\"m2 2 20 20\" />",
  "folder-open": "<path d=\"m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\" />",
  "hand": "<path d=\"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2\" /> <path d=\"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2\" /> <path d=\"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8\" /> <path d=\"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15\" />",
  "image": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\" /> <circle cx=\"9\" cy=\"9\" r=\"2\" /> <path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\" />",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 16v-4\" /> <path d=\"M12 8h.01\" />",
  "layers": "<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\" /> <path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\" /> <path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\" />",
  "move": "<path d=\"M12 2v20\" /> <path d=\"m15 19-3 3-3-3\" /> <path d=\"m19 9 3 3-3 3\" /> <path d=\"M2 12h20\" /> <path d=\"m5 9-3 3 3 3\" /> <path d=\"m9 5 3-3 3 3\" />",
  "palette": "<path d=\"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z\" /> <circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\" /> <circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" />",
  "pen": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\" />",
  "pipette": "<path d=\"m12 9-8.414 8.414A2 2 0 0 0 3 18.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 3.828 21h1.344a2 2 0 0 0 1.414-.586L15 12\" /> <path d=\"m18 9 .4.4a1 1 0 1 1-3 3l-3.8-3.8a1 1 0 1 1 3-3l.4.4 3.4-3.4a1 1 0 1 1 3 3z\" /> <path d=\"m2 22 .414-.414\" />",
  "plus": "<path d=\"M5 12h14\" /> <path d=\"M12 5v14\" />",
  "redo": "<path d=\"M21 7v6h-6\" /> <path d=\"M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7\" />",
  "save": "<path d=\"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z\" /> <path d=\"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7\" /> <path d=\"M7 3v4a1 1 0 0 0 1 1h7\" />",
  "sliders": "<path d=\"M10 8h4\" /> <path d=\"M12 21v-9\" /> <path d=\"M12 8V3\" /> <path d=\"M17 16h4\" /> <path d=\"M19 12V3\" /> <path d=\"M19 21v-5\" /> <path d=\"M3 14h4\" /> <path d=\"M5 10V3\" /> <path d=\"M5 21v-7\" />",
  "sparkles": "<path d=\"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z\" /> <path d=\"M20 2v4\" /> <path d=\"M22 4h-4\" /> <circle cx=\"4\" cy=\"20\" r=\"2\" />",
  "spline": "<circle cx=\"19\" cy=\"5\" r=\"2\" /> <circle cx=\"5\" cy=\"19\" r=\"2\" /> <path d=\"M5 17A12 12 0 0 1 17 5\" />",
  "square": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" />",
  "square-dashed": "<path d=\"M5 3a2 2 0 0 0-2 2\" /> <path d=\"M19 3a2 2 0 0 1 2 2\" /> <path d=\"M21 19a2 2 0 0 1-2 2\" /> <path d=\"M5 21a2 2 0 0 1-2-2\" /> <path d=\"M9 3h1\" /> <path d=\"M9 21h1\" /> <path d=\"M14 3h1\" /> <path d=\"M14 21h1\" /> <path d=\"M3 9v1\" /> <path d=\"M21 9v1\" /> <path d=\"M3 14v1\" /> <path d=\"M21 14v1\" />",
  "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\" /> <path d=\"M12 2v2\" /> <path d=\"M12 20v2\" /> <path d=\"m4.93 4.93 1.41 1.41\" /> <path d=\"m17.66 17.66 1.41 1.41\" /> <path d=\"M2 12h2\" /> <path d=\"M20 12h2\" /> <path d=\"m6.34 17.66-1.41 1.41\" /> <path d=\"m19.07 4.93-1.41 1.41\" />",
  "trash-2": "<path d=\"M10 11v6\" /> <path d=\"M14 11v6\" /> <path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\" /> <path d=\"M3 6h18\" /> <path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\" />",
  "type": "<path d=\"M12 4v16\" /> <path d=\"M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2\" /> <path d=\"M9 20h6\" />",
  "undo": "<path d=\"M3 7v6h6\" /> <path d=\"M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13\" />",
  "upload": "<path d=\"M12 3v12\" /> <path d=\"m17 8-5-5-5 5\" /> <path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" />",
  "wand-sparkles": "<path d=\"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72\" /> <path d=\"m14 7 3 3\" /> <path d=\"M5 6v4\" /> <path d=\"M19 14v4\" /> <path d=\"M10 2v2\" /> <path d=\"M7 8H3\" /> <path d=\"M21 16h-4\" /> <path d=\"M11 3H9\" />",
  "x": "<path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" />",
  "zoom-in": "<circle cx=\"11\" cy=\"11\" r=\"8\" /> <line x1=\"21\" x2=\"16.65\" y1=\"21\" y2=\"16.65\" /> <line x1=\"11\" x2=\"11\" y1=\"8\" y2=\"14\" /> <line x1=\"8\" x2=\"14\" y1=\"11\" y2=\"11\" />",
  "zoom-out": "<circle cx=\"11\" cy=\"11\" r=\"8\" /> <line x1=\"21\" x2=\"16.65\" y1=\"21\" y2=\"16.65\" /> <line x1=\"8\" x2=\"14\" y1=\"11\" y2=\"11\" />",
} as const;

export type PizzicoIconName = keyof typeof PATHS;

/**
 * Restituisce l'SVG come stringa, senza colori cablati.
 *
 * @param name nome dell'icona (vedi `iconNames`)
 * @param size lato in px; la scala ammessa è 16 (toolbar, righe elenco) o 20 (bottoni principali)
 * @param className classe CSS aggiuntiva sull'elemento svg
 */
export function icon(name: PizzicoIconName, size: number = 16, className?: string): string {
  const cls = className ? `lucide lucide-${name} ${className}` : `lucide lucide-${name}`;
  return (
    `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">` +
    `${PATHS[name]}</svg>`
  );
}

/** Nomi disponibili, in ordine alfabetico. */
export const iconNames = Object.keys(PATHS) as PizzicoIconName[];

export const BrushIcon = (size: number = 16): string => icon('brush', size);
export const CheckIcon = (size: number = 16): string => icon('check', size);
export const ChevronDownIcon = (size: number = 16): string => icon('chevron-down', size);
export const CircleIcon = (size: number = 16): string => icon('circle', size);
export const AlertCircleIcon = (size: number = 16): string => icon('circle-alert', size);
export const CommandIcon = (size: number = 16): string => icon('command', size);
export const CropIcon = (size: number = 16): string => icon('crop', size);
export const DownloadIcon = (size: number = 16): string => icon('download', size);
export const EraserIcon = (size: number = 16): string => icon('eraser', size);
export const EyeIcon = (size: number = 16): string => icon('eye', size);
export const EyeOffIcon = (size: number = 16): string => icon('eye-off', size);
export const FolderOpenIcon = (size: number = 16): string => icon('folder-open', size);
export const HandIcon = (size: number = 16): string => icon('hand', size);
export const ImageIcon = (size: number = 16): string => icon('image', size);
export const InfoIcon = (size: number = 16): string => icon('info', size);
export const LayersIcon = (size: number = 16): string => icon('layers', size);
export const MoveIcon = (size: number = 16): string => icon('move', size);
export const PaletteIcon = (size: number = 16): string => icon('palette', size);
export const PenIcon = (size: number = 16): string => icon('pen', size);
export const PipetteIcon = (size: number = 16): string => icon('pipette', size);
export const PlusIcon = (size: number = 16): string => icon('plus', size);
export const RedoIcon = (size: number = 16): string => icon('redo', size);
export const SaveIcon = (size: number = 16): string => icon('save', size);
export const SlidersIcon = (size: number = 16): string => icon('sliders', size);
export const SparklesIcon = (size: number = 16): string => icon('sparkles', size);
export const SplineIcon = (size: number = 16): string => icon('spline', size);
export const SquareIcon = (size: number = 16): string => icon('square', size);
export const SquareDashedIcon = (size: number = 16): string => icon('square-dashed', size);
export const SunIcon = (size: number = 16): string => icon('sun', size);
export const Trash2Icon = (size: number = 16): string => icon('trash-2', size);
export const TypeIcon = (size: number = 16): string => icon('type', size);
export const UndoIcon = (size: number = 16): string => icon('undo', size);
export const UploadIcon = (size: number = 16): string => icon('upload', size);
export const WandSparklesIcon = (size: number = 16): string => icon('wand-sparkles', size);
export const XIcon = (size: number = 16): string => icon('x', size);
export const ZoomInIcon = (size: number = 16): string => icon('zoom-in', size);
export const ZoomOutIcon = (size: number = 16): string => icon('zoom-out', size);
