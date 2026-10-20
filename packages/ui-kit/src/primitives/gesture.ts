// Pizzico — packages/ui-kit/src/primitives/gesture.ts
// Riferimento manifesto: §5.1, §5.6
// Licenza: MIT OR Apache-2.0

export interface PinchPanState {
  scale: number;
  translation: { x: number; y: number };
}

export class GestureRecognizer {
  private activePointers = new Map<number, { x: number; y: number }>();
  private initialDistance = 0;

  public onPinch?: (scaleChange: number) => void;
  public onPan?: (dx: number, dy: number) => void;

  public handlePointerDown(id: number, x: number, y: number) {
    this.activePointers.set(id, { x, y });
    if (this.activePointers.size === 2) {
      this.initialDistance = this.getDistance();
    }
  }

  public handlePointerMove(id: number, x: number, y: number) {
    if (!this.activePointers.has(id)) return;

    const prev = this.activePointers.get(id)!;
    this.activePointers.set(id, { x, y });

    if (this.activePointers.size === 1 && this.onPan) {
      this.onPan(x - prev.x, y - prev.y);
    } else if (this.activePointers.size === 2 && this.onPinch) {
      const dist = this.getDistance();
      if (this.initialDistance > 0) {
        const factor = dist / this.initialDistance;
        this.onPinch(factor);
        this.initialDistance = dist;
      }
    }
  }

  public handlePointerUp(id: number) {
    this.activePointers.delete(id);
    if (this.activePointers.size < 2) {
      this.initialDistance = 0;
    }
  }

  private getDistance(): number {
    const pts = Array.from(this.activePointers.values());
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
