// Pizzico — packages/ui-kit/src/primitives/input.ts
// Riferimento manifesto: §5.6, §11 Step 3
// Licenza: MIT OR Apache-2.0

export type PointerDeviceType = 'mouse' | 'pen' | 'touch';

export interface UnifiedPointerEvent {
  x: number;
  y: number;
  pressure: number; // 0.0 - 1.0 (fondamentale per pennelli con pressione)
  tiltX: number;
  tiltY: number;
  deviceType: PointerDeviceType;
  button: number;
  buttons: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  originalEvent: PointerEvent;
}

export type PointerHandler = (event: UnifiedPointerEvent) => void;

export class UnifiedInputManager {
  private element: HTMLElement;
  private onDown?: PointerHandler;
  private onMove?: PointerHandler;
  private onUp?: PointerHandler;

  constructor(element: HTMLElement) {
    this.element = element;
    this.attach();
  }

  public setHandlers(handlers: {
    onDown?: PointerHandler;
    onMove?: PointerHandler;
    onUp?: PointerHandler;
  }) {
    this.onDown = handlers.onDown;
    this.onMove = handlers.onMove;
    this.onUp = handlers.onUp;
  }

  private normalize(e: PointerEvent): UnifiedPointerEvent {
    const rect = this.element.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let pressure = e.pressure;
    if (e.pointerType === 'mouse' && e.buttons > 0 && pressure === 0) {
      pressure = 0.5; // Valore di fallback standard per mouse
    }

    return {
      x,
      y,
      pressure,
      tiltX: e.tiltX,
      tiltY: e.tiltY,
      deviceType: (e.pointerType as PointerDeviceType) || 'mouse',
      button: e.button,
      buttons: e.buttons,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      originalEvent: e,
    };
  }

  private handlePointerDown = (e: PointerEvent) => {
    this.element.setPointerCapture(e.pointerId);
    if (this.onDown) this.onDown(this.normalize(e));
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (this.onMove) this.onMove(this.normalize(e));
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.element.hasPointerCapture(e.pointerId)) {
      this.element.releasePointerCapture(e.pointerId);
    }
    if (this.onUp) this.onUp(this.normalize(e));
  };

  private attach() {
    this.element.addEventListener('pointerdown', this.handlePointerDown);
    this.element.addEventListener('pointermove', this.handlePointerMove);
    this.element.addEventListener('pointerup', this.handlePointerUp);
    this.element.addEventListener('pointercancel', this.handlePointerUp);
  }

  public detach() {
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('pointercancel', this.handlePointerUp);
  }
}
