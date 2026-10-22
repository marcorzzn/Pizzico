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

// ── Inizializzazione e funzioni core ─────────────────────────────────────────
export {
  default as initWasm,
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
