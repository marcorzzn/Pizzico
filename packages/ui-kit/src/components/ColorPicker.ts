// Pizzico — packages/ui-kit/src/components/ColorPicker.ts
// Riferimento manifesto: §5.1, §11 Step 3
// Licenza: MIT OR Apache-2.0
//
// Il campione è un <button>: deve essere raggiungibile da tastiera e avere un
// nome accessibile. Un <div> cliccabile, come nella prima versione, non lo era.

export interface ColorPickerOptions {
  id?: string;
  /** Nome accessibile del controllo e del campione di colore. */
  label: string;
  value: string;
  onChange?: (hex: string) => void;
}

export class ColorPicker {
  public element: HTMLDivElement;
  private input: HTMLInputElement;
  private preview: HTMLButtonElement;
  private valueLabel: HTMLSpanElement;

  constructor(options: ColorPickerOptions) {
    this.element = document.createElement('div');
    this.element.className = 'pz-color-picker';

    this.preview = document.createElement('button');
    this.preview.type = 'button';
    this.preview.className = 'pz-color-preview';
    this.preview.style.backgroundColor = options.value;
    this.preview.setAttribute('aria-label', options.label);
    this.preview.title = options.label;

    this.valueLabel = document.createElement('span');
    this.valueLabel.className = 'pz-color-value';
    this.valueLabel.textContent = options.value;

    this.input = document.createElement('input');
    this.input.type = 'color';
    this.input.className = 'pz-color-native-input';
    if (options.id) this.input.id = options.id;
    this.input.value = options.value;
    this.input.setAttribute('aria-label', options.label);

    this.preview.addEventListener('click', () => this.input.click());
    this.input.addEventListener('input', () => {
      this.setValue(this.input.value);
      options.onChange?.(this.input.value);
    });

    this.element.appendChild(this.preview);
    this.element.appendChild(this.valueLabel);
    this.element.appendChild(this.input);
  }

  public getColor(): string {
    return this.input.value;
  }

  public setValue(hex: string) {
    this.input.value = hex;
    this.preview.style.backgroundColor = hex;
    this.valueLabel.textContent = hex;
  }
}

/** Elemento pronto da inserire nel DOM. */
export function createColorPicker(options: ColorPickerOptions): HTMLElement {
  return new ColorPicker(options).element;
}
