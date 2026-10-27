// Pizzico — packages/ui-kit/src/tokens/pizzart.ts
// Riferimento: docs/ui/design-decisions.md §2, §3, §5 (vincolante dal 2026-10-26)
// Licenza: MIT OR Apache-2.0
//
// Token del tema Pizzart. NON sono attivi: il foglio pizzart.css li dichiara
// sotto `[data-theme="pizzart"]`, quindi finché l'attributo non viene impostato
// sull'elemento radice restano definiti ma inerti.
//
// Perché un layer separato invece di sovrascrivere :root: i token v1
// (colors.ts, tokens.css) sono già consumati dalla UI corrente — 19 variabili
// usate da packages/ui-web/src/styles.css. Sovrascriverli qui cambierebbe
// l'aspetto dell'app durante la Fase 6a, che invece deve restare invariato.
//
// La sorgente di verità è questo file: pizzart.css ne è lo specchio e
// `node packages/ui-kit/scripts/check-tokens.mjs` fallisce se divergono.

/** Attributo da impostare sull'elemento radice per attivare il tema. */
export const PIZZART_THEME = 'pizzart';

/**
 * Valori dei custom property CSS, indicizzati per nome di variabile.
 * I nomi sono quelli effettivamente dichiarati in pizzart.css.
 */
export const pizzartTokens = {
  // Superfici (docs/ui/design-decisions.md §2)
  '--pz-bg-canvas': '#1c1e22',
  '--pz-bg-panel': '#f0f0f0',
  '--pz-bg-toolbar': '#e8e8e8',

  // Linee
  '--pz-border': '#c8c8c8',

  // Testo
  '--pz-text-primary': '#1a1a1a',
  '--pz-text-secondary': '#6b6b6b',

  // Accento
  '--pz-accent': '#0078d4',

  // Semantici (valori da Pizzart)
  '--pz-error': '#d13438',
  '--pz-ok': '#107c10',

  // Tipografia (§3): Inter con fallback di sistema, scala 12/14/16/20, pesi 400/500/600
  '--pz-font-ui': 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  '--pz-font-size-small': '12px',
  '--pz-font-size-body': '14px',
  '--pz-font-size-heading': '16px',
  '--pz-font-size-title': '20px',
  '--pz-font-weight-regular': '400',
  '--pz-font-weight-medium': '500',
  '--pz-font-weight-semibold': '600',

  // Raggi: sm/md/lg = 4/6/8. Valori non fissati da design-decisions.md,
  // che non tratta i raggi; seguono docs/design-pizzart/typography.md.
  '--pz-radius-sm': '0px',
  '--pz-radius-md': '2px',
  '--pz-radius-lg': '2px',
} as const;

export type PizzartTokenName = keyof typeof pizzartTokens;
