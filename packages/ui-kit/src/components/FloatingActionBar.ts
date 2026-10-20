// Pizzico — packages/ui-kit/src/components/FloatingActionBar.ts
// Riferimento manifesto: §5.1, §5.5, §11 Step 3
// Licenza: MIT OR Apache-2.0

import { Button, ButtonOptions } from './Button';

export interface FloatingActionItem extends ButtonOptions {
  id: string;
}

export class FloatingActionBar {
  public element: HTMLDivElement;
  private buttons = new Map<string, Button>();

  constructor(items: FloatingActionItem[] = []) {
    this.element = document.createElement('div');
    this.element.className = 'pz-floating-hud';

    for (const item of items) {
      this.addItem(item);
    }
  }

  public addItem(item: FloatingActionItem) {
    const btn = new Button({
      label: item.label,
      icon: item.icon,
      variant: item.variant || 'ghost',
      title: item.title,
      onClick: item.onClick,
    });
    this.buttons.set(item.id, btn);
    this.element.appendChild(btn.element);
  }

  public setVisible(visible: boolean) {
    this.element.style.display = visible ? 'flex' : 'none';
  }
}
