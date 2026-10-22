/* tslint:disable */
/* eslint-disable */

/**
 * Handle principale all'engine grafico esposto al JavaScript.
 */
export class PizzicoEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Serializza il documento in JSON (utile per DevTools e testing).
     */
    get_document_json(): string;
    /**
     * Altezza del documento corrente in pixel.
     */
    height(): number;
    /**
     * Numero di livelli presenti nel documento.
     */
    layer_count(): number;
    /**
     * Crea un nuovo documento vuoto con le dimensioni specificate.
     */
    constructor(width: number, height: number, title: string);
    /**
     * Esegue il compositing e restituisce il buffer RGBA 8-bit per Canvas.
     */
    render_frame(): Uint8Array;
    /**
     * Larghezza del documento corrente in pixel.
     */
    width(): number;
}

/**
 * Verifica l'integrità della pipeline WASM: addizione intera.
 * `add(2, 3)` deve restituire `5`.
 */
export function add(a: number, b: number): number;

/**
 * Installa il panic hook di `console_error_panic_hook`.
 * Chiamato UNA volta al boot del modulo WASM per ottenere backtrace
 * leggibili nella console del browser.
 */
export function init_panic_hook(): void;

/**
 * Inizializza WebGPU tramite web-sys, aggancia il Surface al `<canvas>`
 * identificato da `canvas_id`, e avvia il render loop a 60 FPS.
 *
 * Il render loop esegue il seguente frame:
 * 1. Clear color scuro di sfondo
 * 2. Disegno del rettangolo con shader WGSL (6 vertici, 2 triangoli)
 *    con la palette brand Pizzico (Indigo, Cyan, Rose, Purple)
 *
 * Ritorna un `Promise<void>` — deve essere atteso con `await` in JS/TS.
 */
export function init_webgpu(canvas_id: string): Promise<void>;

/**
 * Versione del core come intero (100 = v0.1.0, 200 = v0.2.0, …).
 */
export function pizzico_version(): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_pizzicoengine_free: (a: number, b: number) => void;
    readonly add: (a: number, b: number) => number;
    readonly init_panic_hook: () => void;
    readonly init_webgpu: (a: number, b: number) => any;
    readonly pizzico_version: () => number;
    readonly pizzicoengine_get_document_json: (a: number) => [number, number, number, number];
    readonly pizzicoengine_height: (a: number) => number;
    readonly pizzicoengine_layer_count: (a: number) => number;
    readonly pizzicoengine_new: (a: number, b: number, c: number, d: number) => number;
    readonly pizzicoengine_render_frame: (a: number) => [number, number];
    readonly pizzicoengine_width: (a: number) => number;
    readonly wasm_bindgen_12528a006083644c___convert__closures_____invoke___f64______true_: (a: number, b: number, c: number) => void;
    readonly wasm_bindgen_12528a006083644c___convert__closures_____invoke___js_sys_38ea4d597d213009___Function_fn_wasm_bindgen_12528a006083644c___JsValue_____wasm_bindgen_12528a006083644c___sys__Undefined___js_sys_38ea4d597d213009___Function_fn_wasm_bindgen_12528a006083644c___JsValue_____wasm_bindgen_12528a006083644c___sys__Undefined_______true_: (a: number, b: number, c: any, d: any) => void;
    readonly wasm_bindgen_12528a006083644c___convert__closures_____invoke___wasm_bindgen_12528a006083644c___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_12528a006083644c___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
