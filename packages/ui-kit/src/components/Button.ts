// Pizzico — packages/ui-kit/src/components/Button.ts
// Riferimento manifesto: §5.1, §11 Step 3
// Licenza: MIT OR Apache-2.0

export interface ButtonOptions {
  label?: string;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  active?: boolean;
  onClick?: (e: MouseEvent) => void;
  title?: string;
}

export class Button {
  public element: HTMLButtonElement;

  constructor(options: ButtonOptions = {}) {
    this.element = document.createElement('button');
    this.element.className = `pz-btn pz-btn-${options.variant || 'secondary'}`;
    if (options.title) {
      this.element.title = options.title;
    }
    this.update(options);

    if (options.onClick) {
      this.element.addEventListener('click', options.onClick);
    }
  }

  public update(options: Partial<ButtonOptions>) {
    if (options.active !== undefined) {
      this.element.classList.toggle('pz-btn-active', options.active);
    }
    this.element.innerHTML = '';
    if (options.icon) {
      const span = document.createElement('span');
      span.className = 'pz-btn-icon';
      span.innerHTML = options.icon;
      this.element.appendChild(span);
    }
    if (options.label) {
      const text = document.createElement('span');
      text.className = 'pz-btn-label';
      text.textContent = options.label;
      this.element.appendChild(text);
    }
  }
}
