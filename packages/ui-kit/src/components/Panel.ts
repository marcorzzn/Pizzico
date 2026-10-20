// Pizzico — packages/ui-kit/src/components/Panel.ts
// Riferimento manifesto: §5.1, §5.5, §11 Step 3
// Licenza: MIT OR Apache-2.0

export interface PanelOptions {
  title: string;
  collapsible?: boolean;
}

export class Panel {
  public element: HTMLDivElement;
  public body: HTMLDivElement;
  private isCollapsed = false;

  constructor(options: PanelOptions) {
    this.element = document.createElement('div');
    this.element.className = 'pz-panel';

    const header = document.createElement('div');
    header.className = 'pz-panel-header';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'pz-panel-title';
    titleSpan.textContent = options.title;
    header.appendChild(titleSpan);

    if (options.collapsible) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'pz-panel-toggle';
      toggleBtn.textContent = '▾';
      toggleBtn.addEventListener('click', () => this.toggleCollapse(toggleBtn));
      header.appendChild(toggleBtn);
    }

    this.body = document.createElement('div');
    this.body.className = 'pz-panel-body';

    this.element.appendChild(header);
    this.element.appendChild(this.body);
  }

  private toggleCollapse(btn: HTMLButtonElement) {
    this.isCollapsed = !this.isCollapsed;
    this.body.style.display = this.isCollapsed ? 'none' : 'block';
    btn.textContent = this.isCollapsed ? '▸' : '▾';
  }
}
