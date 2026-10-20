// Pizzico — packages/ui-kit/src/components/Slider.ts
// Riferimento manifesto: §5.1, §11 Step 3
// Licenza: MIT OR Apache-2.0

export interface SliderOptions {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  unit?: string;
  onChange?: (val: number) => void;
}

export class Slider {
  public element: HTMLDivElement;
  private input: HTMLInputElement;
  private valueLabel: HTMLSpanElement;

  constructor(options: SliderOptions) {
    this.element = document.createElement('div');
    this.element.className = 'pz-slider-group';

    const header = document.createElement('div');
    header.className = 'pz-slider-header';

    const title = document.createElement('span');
    title.className = 'pz-slider-title';
    title.textContent = options.label;

    this.valueLabel = document.createElement('span');
    this.valueLabel.className = 'pz-slider-value';
    this.valueLabel.textContent = `${options.value}${options.unit || ''}`;

    header.appendChild(title);
    header.appendChild(this.valueLabel);

    this.input = document.createElement('input');
    this.input.type = 'range';
    this.input.className = 'pz-slider-range';
    this.input.min = options.min.toString();
    this.input.max = options.max.toString();
    this.input.step = (options.step || 1).toString();
    this.input.value = options.value.toString();

    this.input.addEventListener('input', () => {
      const val = parseFloat(this.input.value);
      this.valueLabel.textContent = `${val}${options.unit || ''}`;
      if (options.onChange) {
        options.onChange(val);
      }
    });

    this.element.appendChild(header);
    this.element.appendChild(this.input);
  }

  public setValue(val: number) {
    this.input.value = val.toString();
    this.valueLabel.textContent = `${val}`;
  }
}
