// Pizzico — packages/ui-mobile/src/bottom-sheet.ts
// Riferimento manifesto: §5.5, §5.6
// Licenza: MIT OR Apache-2.0

export interface BottomSheetOptions {
  title: string;
}

export class BottomSheet {
  public element: HTMLDivElement;
  public content: HTMLDivElement;
  private backdrop: HTMLDivElement;
  private isOpen = false;

  constructor(options: BottomSheetOptions) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'pz-bottom-sheet-backdrop';
    this.backdrop.style.display = 'none';

    this.element = document.createElement('div');
    this.element.className = 'pz-bottom-sheet';

    const handle = document.createElement('div');
    handle.className = 'pz-bottom-sheet-handle';

    const header = document.createElement('div');
    header.className = 'pz-bottom-sheet-header';
    header.innerHTML = `<h3>${options.title}</h3>`;

    this.content = document.createElement('div');
    this.content.className = 'pz-bottom-sheet-content';

    this.element.appendChild(handle);
    this.element.appendChild(header);
    this.element.appendChild(this.content);
    this.backdrop.appendChild(this.element);

    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    document.body.appendChild(this.backdrop);
  }

  public open() {
    this.isOpen = true;
    this.backdrop.style.display = 'block';
    setTimeout(() => this.element.classList.add('pz-open'), 10);
  }

  public close() {
    this.isOpen = false;
    this.element.classList.remove('pz-open');
    setTimeout(() => {
      if (!this.isOpen) this.backdrop.style.display = 'none';
    }, 200);
  }
}
