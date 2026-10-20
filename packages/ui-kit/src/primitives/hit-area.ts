// Pizzico — packages/ui-kit/src/primitives/hit-area.ts
// Riferimento manifesto: §5.1, §5.6
// Licenza: MIT OR Apache-2.0

/**
 * Applicazione della Legge di Fitts (§5.1):
 * Assicura che gli elementi interattivi touch abbiano una zona di aggancio (hit-area)
 * non inferiore a 44-48px anche quando l'icona grafica è più piccola.
 */
export function ensureMinHitArea(element: HTMLElement, minSize = 48) {
  element.style.position = 'relative';
  const pseudoArea = document.createElement('span');
  pseudoArea.className = 'pz-fitts-hit-area';
  pseudoArea.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    min-width: ${minSize}px;
    min-height: ${minSize}px;
    width: 100%;
    height: 100%;
    pointer-events: auto;
  `;
  element.appendChild(pseudoArea);
}
