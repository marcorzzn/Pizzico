// Pizzico — packages/ui-kit/src/components/ColorPicker.ts
// Riferimento manifesto: §5.1, §11 Step 3
// Licenza: MIT OR Apache-2.0

export interface ColorPickerOptions {
  color: string;
  onChange?: (hex: string) => void;
}

export class ColorPicker {
  public element: HTMLDivElement;
  private input: HTMLInputElement;
  private preview: HTMLDivElement;

  constructor(options: ColorPickerOptions) {
    this.element = document.createElement('div');
    this.element.className = 'pz-color-picker';

    this.preview = document.createElement('div');
    this.preview.className = 'pz-color-preview';
    this.preview.style.backgroundColor = options.color;

    this.input = document.createElement('input');
    this.input.type = 'color';
    this.input.className = 'pz-color-native-input';
    this.input.value = options.color;

    this.preview.addEventListener('click', () => this.input.click());
    this.input.addEventListener('input', () => {
      this.preview.style.backgroundColor = this.input.value;
      if (options.onChange) {
        options.onChange(this.input.value);
      }
    });

    this.element.appendChild(this.preview);
    this.element.appendChild(this.input);
  }

  public getColor(): string {
    return this.input.value;
  }
}
