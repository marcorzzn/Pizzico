// Pizzico — apps/web/src/tool-inspector.ts
// Licenza: MIT OR Apache-2.0
//
// Pannello dei parametri generato dal catalogo degli strumenti.
//
// Il componente non conosce pennello, gomma o colori: riceve un `ToolSchema` e
// costruisce un controllo per ogni `ParamSpec`. È il primo consumatore reale del
// catalogo (Gate 3 di P1-Arch); l'esecuzione dei valori resta in `main.ts`.

import { createColorPicker, createSlider } from '@pizzico/ui-kit';
import type { ParamSpec, ToolSchema } from '@pizzico/shared';

/** Valore di un parametro, nella forma che il controllo produce. */
export type ToolParamValue = number | string | boolean;

/** Valori correnti di uno strumento, indicizzati per `ParamSpec.id`. */
export type ToolParamValues = Record<string, ToolParamValue>;

export interface ToolInspectorOptions {
  /**
   * Chiamata a ogni modifica. `toolId` è lo strumento dello schema attivo, così
   * il chiamante non deve indovinarlo.
   */
  onChange?: (toolId: string, values: ToolParamValues) => void;
}

export class ToolInspector {
  public readonly element: HTMLDivElement;

  private schema: ToolSchema | null = null;
  private values: ToolParamValues = {};
  private readonly onChange?: (toolId: string, values: ToolParamValues) => void;

  constructor(options: ToolInspectorOptions = {}) {
    this.onChange = options.onChange;
    this.element = document.createElement('div');
    this.element.id = 'tool-param-panel';
    this.element.className = 'pz-tool-inspector';
  }

  public get activeToolId(): string | null {
    return this.schema?.id ?? null;
  }

  /** Copia dei valori correnti: il chiamante non può mutare lo stato interno. */
  public getValues(): ToolParamValues {
    return { ...this.values };
  }

  /**
   * Mostra lo schema indicato, riusando i valori già noti.
   *
   * Se è già attivo lo stesso strumento il DOM resta intatto: `updateInspector`
   * viene chiamato anche a fine spostamento o selezione, e ricostruire gli
   * slider a ogni chiamata farebbe perdere il fuoco durante il trascinamento.
   */
  public setSchema(schema: ToolSchema | null, stored?: ToolParamValues): void {
    if (!schema) {
      this.schema = null;
      this.values = {};
      this.element.replaceChildren();
      return;
    }

    if (this.schema?.id === schema.id && this.element.childElementCount > 0) {
      return;
    }

    this.schema = schema;
    this.values = { ...defaultsFor(schema), ...(stored ?? {}) };
    this.render();
  }

  private render(): void {
    const schema = this.schema;
    if (!schema) return;

    this.element.replaceChildren();
    this.element.dataset.toolId = schema.id;

    const header = document.createElement('div');
    header.className = 'pz-card-header';

    const title = document.createElement('span');
    title.textContent = schema.label;

    const shortcut = document.createElement('span');
    shortcut.style.cssText =
      'font-size: 11px; color: var(--pz-accent); font-variant-numeric: tabular-nums;';
    shortcut.textContent = schema.shortcut ?? '';

    header.append(title, shortcut);
    this.element.appendChild(header);

    if (schema.description) {
      const description = document.createElement('div');
      description.className = 'pz-tool-description';
      description.style.cssText =
        'font-size: 12px; color: var(--pz-text-secondary); line-height: 1.4;';
      description.textContent = schema.description;
      this.element.appendChild(description);
    }

    for (const param of schema.params) {
      this.element.appendChild(this.buildControl(param));
    }
  }

  private buildControl(param: ParamSpec): HTMLElement {
    const group = document.createElement('div');
    group.className = 'pz-tool-param';
    group.dataset.paramId = param.id;
    group.dataset.paramKind = param.kind;

    switch (param.kind) {
      case 'integer':
      case 'float': {
        const value =
          typeof this.values[param.id] === 'number'
            ? (this.values[param.id] as number)
            : param.default;
        group.appendChild(
          createSlider({
            id: `tool-param-${param.id}`,
            label: param.label,
            min: param.min,
            max: param.max,
            step: param.step,
            value,
            unit: param.unit,
            onInput: (next) => this.setValue(param.id, next),
          })
        );
        break;
      }

      case 'color': {
        group.style.cssText =
          'display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 4px; border-top: 1px solid var(--pz-surface-hover);';

        const label = document.createElement('span');
        label.className = 'pz-slider-title';
        label.textContent = param.label;

        const current =
          typeof this.values[param.id] === 'string'
            ? (this.values[param.id] as string)
            : param.default;

        group.append(
          label,
          createColorPicker({
            id: `tool-param-${param.id}`,
            label: param.label,
            value: current,
            onChange: (hex) => this.setValue(param.id, hex),
          })
        );
        break;
      }

      case 'boolean': {
        group.style.cssText =
          'display: flex; align-items: center; justify-content: space-between; gap: 8px;';

        const label = document.createElement('label');
        label.className = 'pz-slider-title';
        label.htmlFor = `tool-param-${param.id}`;
        label.textContent = param.label;

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `tool-param-${param.id}`;
        input.checked = Boolean(this.values[param.id]);
        input.addEventListener('change', () => this.setValue(param.id, input.checked));

        group.append(label, input);
        break;
      }

      case 'choice': {
        group.style.cssText =
          'display: flex; align-items: center; justify-content: space-between; gap: 8px;';

        const label = document.createElement('label');
        label.className = 'pz-slider-title';
        label.htmlFor = `tool-param-${param.id}`;
        label.textContent = param.label;

        const select = document.createElement('select');
        select.id = `tool-param-${param.id}`;
        select.className = 'pz-btn pz-btn-secondary';
        for (const option of param.options) {
          const element = document.createElement('option');
          element.value = option.value;
          element.textContent = option.label;
          select.appendChild(element);
        }
        select.value = String(this.values[param.id]);
        select.addEventListener('change', () => this.setValue(param.id, select.value));

        group.append(label, select);
        break;
      }
    }

    return group;
  }

  private setValue(paramId: string, value: ToolParamValue): void {
    if (!this.schema) return;
    this.values[paramId] = value;
    this.onChange?.(this.schema.id, this.getValues());
  }
}

/** Valori iniziali dichiarati dallo schema. */
function defaultsFor(schema: ToolSchema): ToolParamValues {
  const values: ToolParamValues = {};
  for (const param of schema.params) {
    values[param.id] = param.default;
  }
  return values;
}
