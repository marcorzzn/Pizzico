// Pizzico — packages/ui-kit/src/components/Slider.ts
// Riferimento manifesto: §5.1, §11 Step 3
// Riferimento design: docs/ui/design-decisions.md §3 (scala, pesi), §5 (spaziature)
// Licenza: MIT OR Apache-2.0
//
// Un solo slider, due punti d'ingresso:
//   new Slider(options).element     — quando serve tenere il riferimento (setValue)
//   createSlider(options)           — quando basta l'elemento da inserire nel DOM
// La factory avvolge la classe: non c'è logica duplicata.

export interface SliderOptions {
  /** id applicato all'input, così può essere interrogato dal codice chiamante. */
  id?: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  /** Suffisso mostrato dopo il valore: 'px', '%', '°'. */
  unit?: string;
  onInput?: (value: number) => void;
}

export class Slider {
  public element: HTMLDivElement;
  private input: HTMLInputElement;
  private valueLabel: HTMLSpanElement;
  private unit: string;
  private decimals: number;

  constructor(options: SliderOptions) {
    this.unit = options.unit ?? '';
    const step = options.step ?? 1;
    // Con step frazionari (0.01, 0.1) il valore va mostrato con i decimali utili.
    this.decimals = Number.isInteger(step) ? 0 : `${step}`.split('.')[1].length;

    this.element = document.createElement('div');
    this.element.className = 'pz-slider-group';

    const header = document.createElement('div');
    header.className = 'pz-slider-header';

    const title = document.createElement('span');
    title.className = 'pz-slider-title';
    title.textContent = options.label;

    this.valueLabel = document.createElement('span');
    this.valueLabel.className = 'pz-slider-value';
    this.valueLabel.textContent = this.format(options.value);

    header.appendChild(title);
    header.appendChild(this.valueLabel);

    this.input = document.createElement('input');
    this.input.type = 'range';
    this.input.className = 'pz-slider-range';
    if (options.id) this.input.id = options.id;
    this.input.min = String(options.min);
    this.input.max = String(options.max);
    this.input.step = String(step);
    this.input.value = String(options.value);
    this.input.setAttribute('aria-label', options.label);

    this.input.addEventListener('input', () => {
      const value = this.getValue();
      this.valueLabel.textContent = this.format(value);
      options.onInput?.(value);
    });

    this.element.appendChild(header);
    this.element.appendChild(this.input);
  }

  public getValue(): number {
    return parseFloat(this.input.value);
  }

  /** Imposta il valore, lo limita all'intervallo e riallinea l'etichetta. */
  public setValue(value: number) {
    const clamped = Math.min(Number(this.input.max), Math.max(Number(this.input.min), value));
    this.input.value = String(clamped);
    this.valueLabel.textContent = this.format(clamped);
  }

  public setDisabled(disabled: boolean) {
    this.input.disabled = disabled;
  }

  private format(value: number): string {
    return `${value.toFixed(this.decimals)}${this.unit}`;
  }
}

/** Elemento pronto da inserire nel DOM. */
export function createSlider(options: SliderOptions): HTMLElement {
  return new Slider(options).element;
}
