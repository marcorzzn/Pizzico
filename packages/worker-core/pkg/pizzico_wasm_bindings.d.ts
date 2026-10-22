/* tslint:disable */
/* eslint-disable */

/**
 * Handle principale all'engine grafico esposto al JavaScript.
 */
export class PizzicoEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Aggiunge un livello raster uniforme.
     */
    add_raster_layer(name: string, width: number, height: number, color: Uint8Array): bigint;
    /**
     * Crea un nuovo documento.
     */
    create_document(width: number, height: number): void;
    /**
     * Serializza il documento in formato JSON.
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
     * Inizializza l'istanza dell'engine con un nuovo documento.
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
 */
export function add(a: number, b: number): number;

/**
 * Aggiunge un nuovo livello raster al documento attivo riempito con un colore RGBA uniforme.
 * Ritorna l'ID univoco del livello appena creato.
 */
export function add_raster_layer(name: string, width: number, height: number, color: Uint8Array): bigint;

/**
 * Crea o resetta il documento attivo con larghezza e altezza specificate.
 */
export function create_document(width: number, height: number): void;

/**
 * Restituisce il buffer RGBA 8-bit calcolato fondendo tutti i livelli visibili del documento.
 */
export function get_composite_buffer(): Uint8Array;

/**
 * Restituisce le dimensioni [larghezza, altezza] del documento attivo in pixel.
 */
export function get_document_dimensions(): Uint32Array;

/**
 * Restituisce il numero di livelli presenti nel documento attivo.
 */
export function get_layer_count(): number;

/**
 * Installa il panic hook di `console_error_panic_hook`.
 */
export function init_panic_hook(): void;

/**
 * Inizializza WebGPU tramite web-sys, aggancia il Surface al `<canvas>`
 * identificato da `canvas_id`, e avvia il render loop a 60 FPS che campiona
 * la texture del Documento composito.
 */
export function init_webgpu(canvas_id: string): Promise<void>;

/**
 * Versione del core come intero (100 = v0.1.0).
 */
export function pizzico_version(): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_pizzicoengine_free: (a: number, b: number) => void;
    readonly add: (a: number, b: number) => number;
    readonly add_raster_layer: (a: number, b: number, c: number, d: number, e: number, f: number) => bigint;
    readonly create_document: (a: number, b: number) => void;
    readonly get_composite_buffer: () => [number, number];
    readonly get_document_dimensions: () => [number, number];
    readonly get_layer_count: () => number;
    readonly init_panic_hook: () => void;
    readonly init_webgpu: (a: number, b: number) => any;
    readonly pizzico_version: () => number;
    readonly pizzicoengine_add_raster_layer: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => bigint;
    readonly pizzicoengine_create_document: (a: number, b: number, c: number) => void;
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
