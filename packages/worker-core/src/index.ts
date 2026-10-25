// Pizzico — packages/worker-core/src/index.ts
// Riferimento manifesto: §3.1, §4, §11 Step 8
// Licenza: MIT OR Apache-2.0

//! Re-export delle funzionalità WASM generate da wasm-pack.
//! Il percorso `../pkg/` è la destinazione canonicale di
//! `wasm-pack build crates/wasm-bindings --target web --out-dir ../../packages/worker-core/pkg`
//!
//! NOTE: I tipi e le funzioni esportate qui sono generati AUTOMATICAMENTE
//! da wasm-pack/wasm-bindgen e NON devono essere scritti a mano.
//! Il file `pkg/pizzico_wasm_bindings.js` e `pizzico_wasm_bindings.d.ts`
//! vengono ri-generati ogni volta che si esegue `wasm-pack build`.

import initWasmInternal from '../pkg/pizzico_wasm_bindings';

export async function initWasm(moduleOrPath?: any): Promise<any> {
  if (moduleOrPath !== undefined) {
    return initWasmInternal(moduleOrPath);
  }
  if (typeof window !== 'undefined') {
    const res = await fetch('/pizzico_wasm_bindings_bg.wasm?t=' + Date.now());
    const bytes = await res.arrayBuffer();
    return initWasmInternal({ module_or_path: bytes });
  }
  return initWasmInternal();
}

export {
  add,
  pizzico_version,
  PizzicoEngine,
  init_webgpu,
  create_document,
  add_raster_layer,
  get_composite_buffer,
  get_document_dimensions,
  get_layer_count,
  get_layers_metadata,
  set_layer_opacity,
  set_layer_visibility,
  select_layer,
  remove_layer,
  get_active_layer_id,
  is_dirty,
  set_dirty,
  load_psd_bytes,
  get_document_metadata,
  begin_stroke,
  brush_stroke,
  eraser_stroke,
  end_stroke,
  undo,
  redo,
  can_undo,
  can_redo,
  get_history_info,
  begin_move_layer,
  move_active_layer,
  translate_active_layer,
  end_move_layer,
  get_active_layer_offset,
  set_selection,
  clear_selection,
  has_active_selection,
  get_selection,
  save_project,
  load_project,
  export_as_png,
  export_as_jpeg,
  export_as_webp,
  export_as_psd,
} from '../pkg/pizzico_wasm_bindings';

export type { InitOutput, InitInput } from '../pkg/pizzico_wasm_bindings';

export * from './worker';

// ── WorkerClient ──────────────────────────────────────────────────────────────

export class WorkerClient {
  private worker: Worker | null = null;
  private messageId = 0;
  private pending = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

  constructor(workerScriptUrl?: string) {
    if (typeof window !== 'undefined' && workerScriptUrl) {
      this.worker = new Worker(workerScriptUrl, { type: 'module' });
      this.worker.onmessage = this.handleMessage;
    }
  }

  private handleMessage = (e: MessageEvent) => {
    const { id, success, result, error } = e.data;
    if (this.pending.has(id)) {
      const { resolve, reject } = this.pending.get(id)!;
      this.pending.delete(id);
      if (success) resolve(result);
      else reject(new Error(error));
    }
  };

  public post(type: 'init' | 'compute' | 'render', payload?: any): Promise<any> {
    if (!this.worker) {
      return Promise.resolve({ simulated: true });
    }
    const id = ++this.messageId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type, payload });
    });
  }

  public terminate() {
    this.worker?.terminate();
    this.worker = null;
  }
}
