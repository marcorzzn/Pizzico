// Pizzico — packages/ui-kit/src/tokens/density.ts
// Riferimento manifesto: §5.1, §5.6
// Licenza: MIT OR Apache-2.0

export type DensityMode = 'compact' | 'comfortable' | 'touch';

export interface DensitySettings {
  toolbarItemSize: number;
  inputHeight: number;
  panelHeaderHeight: number;
  touchTargetMin: number;
}

export const densityProfiles: Record<DensityMode, DensitySettings> = {
  compact: {
    toolbarItemSize: 32,
    inputHeight: 28,
    panelHeaderHeight: 32,
    touchTargetMin: 32,
  },
  comfortable: {
    toolbarItemSize: 40,
    inputHeight: 36,
    panelHeaderHeight: 40,
    touchTargetMin: 40,
  },
  touch: {
    toolbarItemSize: 48,
    inputHeight: 44,
    panelHeaderHeight: 48,
    touchTargetMin: 48, // Fitts' Law conformance for touch
  },
};
