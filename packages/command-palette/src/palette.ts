// Pizzico — packages/command-palette/src/palette.ts
// Riferimento manifesto: §5.1, §5.5, §11 Step 3
// Licenza: MIT OR Apache-2.0

import { Command } from '@pizzico/shared';

export interface CommandPaletteOptions {
  commands: Command[];
  onExecute: (commandId: string) => void;
}

export class CommandPalette {
  public element: HTMLDivElement;
  private overlay: HTMLDivElement;
  private input: HTMLInputElement;
  private list: HTMLUListElement;
  private commands: Command[];
  private onExecute: (commandId: string) => void;
  private isOpen = false;

  constructor(options: CommandPaletteOptions) {
    this.commands = options.commands;
    this.onExecute = options.onExecute;

    this.overlay = document.createElement('div');
    this.overlay.className = 'pz-palette-overlay';
    this.overlay.style.display = 'none';

    this.element = document.createElement('div');
    this.element.className = 'pz-palette-modal';

    const searchBox = document.createElement('div');
    searchBox.className = 'pz-palette-search';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.placeholder = 'Cerca un comando o azione... (es. sfoca, inverti, livello)';
    this.input.className = 'pz-palette-input';

    searchBox.appendChild(this.input);

    this.list = document.createElement('ul');
    this.list.className = 'pz-palette-list';

    this.element.appendChild(searchBox);
    this.element.appendChild(this.list);
    this.overlay.appendChild(this.element);

    this.input.addEventListener('input', () => this.filter(this.input.value));
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    document.body.appendChild(this.overlay);
    this.filter('');
  }

  public open() {
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    this.input.value = '';
    this.filter('');
    setTimeout(() => this.input.focus(), 50);
  }

  public close() {
    this.isOpen = false;
    this.overlay.style.display = 'none';
  }

  public toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  private filter(query: string) {
    const q = query.toLowerCase().trim();
    const matched = this.commands.filter(
      (c) => c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );

    this.list.innerHTML = '';
    for (const cmd of matched) {
      const li = document.createElement('li');
      li.className = 'pz-palette-item';

      const title = document.createElement('span');
      title.className = 'pz-palette-item-title';
      title.textContent = cmd.title;

      li.appendChild(title);

      if (cmd.shortcut) {
        const kbd = document.createElement('kbd');
        kbd.className = 'pz-palette-item-shortcut';
        kbd.textContent = cmd.shortcut;
        li.appendChild(kbd);
      }

      li.addEventListener('click', () => {
        this.close();
        this.onExecute(cmd.id);
      });

      this.list.appendChild(li);
    }
  }
}
