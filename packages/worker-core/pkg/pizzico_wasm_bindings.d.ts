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
     * Inizia traslazione layer attivo.
     */
    begin_move_layer(): boolean;
    /**
     * Avvia un tratto di pennello.
     */
    begin_stroke(): boolean;
    /**
     * Disegna un segmento di pennello.
     */
    brush_stroke(from_x: number, from_y: number, to_x: number, to_y: number, radius: number, hardness: number, color: Uint8Array, opacity: number): boolean;
    /**
     * Può ripristinare?
     */
    can_redo(): boolean;
    /**
     * Può annullare?
     */
    can_undo(): boolean;
    /**
     * Rimuove selezione attiva.
     */
    clear_selection(): boolean;
    /**
     * Crea un nuovo documento.
     */
    create_document(width: number, height: number): void;
    /**
     * Termina traslazione layer attivo con registrazione history.
     */
    end_move_layer(): boolean;
    /**
     * Conclude il tratto registrando l'azione nella history.
     */
    end_stroke(): boolean;
    /**
     * Disegna un segmento di gomma.
     */
    eraser_stroke(from_x: number, from_y: number, to_x: number, to_y: number, radius: number, hardness: number, opacity: number): boolean;
    /**
     * ID del livello attivo.
     */
    get_active_layer_id(): number | undefined;
    /**
     * Restituisce [x, y] del layer attivo.
     */
    get_active_layer_offset(): any;
    /**
     * Serializza il documento in formato JSON.
     */
    get_document_json(): string;
    /**
     * Restituisce i metadati globali del documento attivo.
     */
    get_document_metadata(): any;
    /**
     * Informazioni sulla history.
     */
    get_history_info(): any;
    /**
     * Metadati di tutti i livelli in formato array JS.
     */
    get_layers_metadata(): any;
    /**
     * Restituisce la selezione attiva in formato JS.
     */
    get_selection(): any;
    /**
     * Verifica presenza selezione attiva.
     */
    has_active_selection(): boolean;
    /**
     * Altezza del documento corrente in pixel.
     */
    height(): number;
    /**
     * Flag dirty del documento.
     */
    is_dirty(): boolean;
    /**
     * Numero di livelli presenti nel documento.
     */
    layer_count(): number;
    /**
     * Carica un file PSD binario e sostituisce il documento corrente.
     */
    load_psd_bytes(bytes: Uint8Array): void;
    /**
     * Imposta posizione assoluta del layer attivo.
     */
    move_active_layer(x: number, y: number): boolean;
    /**
     * Inizializza l'istanza dell'engine con un nuovo documento.
     */
    constructor(width: number, height: number, title: string);
    /**
     * Ripristina l'ultima azione annullata.
     */
    redo(): boolean;
    /**
     * Rimuove un livello dato il suo ID.
     */
    remove_layer(id: number): boolean;
    /**
     * Esegue il compositing e restituisce il buffer RGBA 8-bit per Canvas.
     */
    render_frame(): Uint8Array;
    /**
     * Seleziona un livello come attivo.
     */
    select_layer(id: number): void;
    /**
     * Imposta il flag dirty del documento.
     */
    set_dirty(dirty: boolean): void;
    /**
     * Modifica l'opacità di un livello.
     */
    set_layer_opacity(id: number, opacity: number): void;
    /**
     * Modifica la visibilità di un livello.
     */
    set_layer_visibility(id: number, visible: boolean): void;
    /**
     * Imposta selezione rettangolare.
     */
    set_selection(x: number, y: number, width: number, height: number): boolean;
    /**
     * Trasla il layer attivo del delta specificato.
     */
    translate_active_layer(dx: number, dy: number): boolean;
    /**
     * Annulla l'ultima azione.
     */
    undo(): boolean;
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
 * Inizia un'operazione di traslazione (Move Tool) per il livello attivo.
 * Registra la posizione iniziale per generare un unico `MoveLayerCommand` al rilascio del cursore.
 */
export function begin_move_layer(): boolean;

/**
 * Avvia una sessione di tratto con il pennello o gomma.
 * Memorizza lo stato iniziale del livello raster attivo per generare un unico comando Undo/Redo compatto.
 */
export function begin_stroke(): boolean;

/**
 * Rasterizza un segmento di pennello continuo tra (from_x, from_y) e (to_x, to_y) sul livello attivo.
 * Aggiorna il dirty bounding box e notifica WebGPU per la ricomposizione immediata a schermo.
 */
export function brush_stroke(from_x: number, from_y: number, to_x: number, to_y: number, radius: number, hardness: number, color: Uint8Array, opacity: number): boolean;

/**
 * Verifica se è presente almeno un'operazione ripristinabile nella cronologia.
 */
export function can_redo(): boolean;

/**
 * Verifica se è presente almeno un'operazione annullabile nella cronologia.
 */
export function can_undo(): boolean;

/**
 * Rimuove la selezione attiva (deseleziona).
 */
export function clear_selection(): boolean;

/**
 * Crea o resetta il documento attivo con larghezza e altezza specificate.
 */
export function create_document(width: number, height: number): void;

/**
 * Termina l'operazione di spostamento del livello attivo.
 * Se l'offset finale differisce da quello iniziale, registra un `MoveLayerCommand` nella History.
 */
export function end_move_layer(): boolean;

/**
 * Termina la sessione di tratto e registra un unico `StrokeCommand` compatto nella History.
 */
export function end_stroke(): boolean;

/**
 * Rasterizza un segmento di gomma tra (from_x, from_y) e (to_x, to_y) sul livello attivo.
 */
export function eraser_stroke(from_x: number, from_y: number, to_x: number, to_y: number, radius: number, hardness: number, opacity: number): boolean;

/**
 * Restituisce l'ID del livello attualmente selezionato (se presente).
 */
export function get_active_layer_id(): number | undefined;

/**
 * Restituisce l'offset corrente `[x, y]` del livello attivo, oppure null.
 */
export function get_active_layer_offset(): any;

/**
 * Restituisce il buffer RGBA 8-bit calcolato fondendo tutti i livelli visibili del documento.
 */
export function get_composite_buffer(): Uint8Array;

/**
 * Restituisce le dimensioni correnti del documento attivo come array `[width, height]`.
 */
export function get_document_dimensions(): Uint32Array;

/**
 * Restituisce i metadati globali del documento attivo in formato oggetto JSON.
 */
export function get_document_metadata(): any;

/**
 * Restituisce lo stato corrente della History in formato oggetto JS `{ canUndo, canRedo, undoCount, redoCount }`.
 */
export function get_history_info(): any;

/**
 * Restituisce il numero di livelli presenti nel documento attivo.
 */
export function get_layer_count(): number;

/**
 * Restituisce i metadati di tutti i livelli presenti nel documento attivo come array JS.
 */
export function get_layers_metadata(): any;

/**
 * Restituisce la selezione corrente serializzata come oggetto JS, o null se inattiva.
 */
export function get_selection(): any;

/**
 * Restituisce true se è presente una selezione rettangolare attiva.
 */
export function has_active_selection(): boolean;

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
 * Verifica se il documento attivo necessita di un nuovo rendering WebGPU.
 */
export function is_dirty(): boolean;

/**
 * Carica un file Adobe Photoshop (PSD/PSB) da buffer binario, sostituisce il Documento attivo
 * e segnala la necessità di un nuovo frame di compositing WebGPU.
 */
export function load_psd_bytes(bytes: Uint8Array): void;

/**
 * Imposta la posizione assoluta (x, y) del livello attivo e marca il documento dirty.
 */
export function move_active_layer(x: number, y: number): boolean;

/**
 * Versione del core come intero (100 = v0.1.0).
 */
export function pizzico_version(): number;

/**
 * Ripristina (Redo) l'ultima operazione precedentemente annullata.
 */
export function redo(): boolean;

/**
 * Rimuove il livello specificato dal documento attivo.
 */
export function remove_layer(id: number): boolean;

/**
 * Seleziona il livello specificato come livello attivo nel documento.
 */
export function select_layer(id: number): void;

/**
 * Imposta manualmente il flag dirty del documento attivo.
 */
export function set_dirty(dirty: boolean): void;

/**
 * Imposta l'opacità del livello specificato (0.0 - 1.0) e marca il documento dirty.
 */
export function set_layer_opacity(id: number, opacity: number): void;

/**
 * Imposta la visibilità del livello specificato e marca il documento dirty.
 */
export function set_layer_visibility(id: number, visible: boolean): void;

/**
 * Imposta la selezione rettangolare attiva nel documento in coordinate logiche documento.
 */
export function set_selection(x: number, y: number, width: number, height: number): boolean;

/**
 * Trasla il livello attivo del delta (dx, dy) e marca il documento dirty.
 */
export function translate_active_layer(dx: number, dy: number): boolean;

/**
 * Annulla (Undo) l'ultima operazione effettuata nel documento.
 */
export function undo(): boolean;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_pizzicoengine_free: (a: number, b: number) => void;
    readonly add: (a: number, b: number) => number;
    readonly add_raster_layer: (a: number, b: number, c: number, d: number, e: number, f: number) => bigint;
    readonly begin_move_layer: () => number;
    readonly begin_stroke: () => number;
    readonly brush_stroke: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => number;
    readonly can_redo: () => number;
    readonly can_undo: () => number;
    readonly clear_selection: () => number;
    readonly create_document: (a: number, b: number) => void;
    readonly end_move_layer: () => number;
    readonly end_stroke: () => number;
    readonly eraser_stroke: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly get_active_layer_id: () => number;
    readonly get_active_layer_offset: () => any;
    readonly get_composite_buffer: () => [number, number];
    readonly get_document_dimensions: () => [number, number];
    readonly get_document_metadata: () => [number, number, number];
    readonly get_history_info: () => [number, number, number];
    readonly get_layer_count: () => number;
    readonly get_layers_metadata: () => [number, number, number];
    readonly get_selection: () => [number, number, number];
    readonly has_active_selection: () => number;
    readonly init_panic_hook: () => void;
    readonly init_webgpu: (a: number, b: number) => any;
    readonly is_dirty: () => number;
    readonly load_psd_bytes: (a: number, b: number) => [number, number];
    readonly move_active_layer: (a: number, b: number) => number;
    readonly pizzico_version: () => number;
    readonly pizzicoengine_add_raster_layer: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => bigint;
    readonly pizzicoengine_begin_move_layer: (a: number) => number;
    readonly pizzicoengine_begin_stroke: (a: number) => number;
    readonly pizzicoengine_brush_stroke: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => number;
    readonly pizzicoengine_can_redo: (a: number) => number;
    readonly pizzicoengine_can_undo: (a: number) => number;
    readonly pizzicoengine_clear_selection: (a: number) => number;
    readonly pizzicoengine_create_document: (a: number, b: number, c: number) => void;
    readonly pizzicoengine_end_move_layer: (a: number) => number;
    readonly pizzicoengine_end_stroke: (a: number) => number;
    readonly pizzicoengine_eraser_stroke: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly pizzicoengine_get_active_layer_id: (a: number) => number;
    readonly pizzicoengine_get_active_layer_offset: (a: number) => any;
    readonly pizzicoengine_get_document_json: (a: number) => [number, number, number, number];
    readonly pizzicoengine_get_document_metadata: (a: number) => [number, number, number];
    readonly pizzicoengine_get_history_info: (a: number) => [number, number, number];
    readonly pizzicoengine_get_layers_metadata: (a: number) => [number, number, number];
    readonly pizzicoengine_get_selection: (a: number) => [number, number, number];
    readonly pizzicoengine_has_active_selection: (a: number) => number;
    readonly pizzicoengine_height: (a: number) => number;
    readonly pizzicoengine_is_dirty: (a: number) => number;
    readonly pizzicoengine_layer_count: (a: number) => number;
    readonly pizzicoengine_load_psd_bytes: (a: number, b: number, c: number) => [number, number];
    readonly pizzicoengine_move_active_layer: (a: number, b: number, c: number) => number;
    readonly pizzicoengine_new: (a: number, b: number, c: number, d: number) => number;
    readonly pizzicoengine_redo: (a: number) => number;
    readonly pizzicoengine_remove_layer: (a: number, b: number) => number;
    readonly pizzicoengine_render_frame: (a: number) => [number, number];
    readonly pizzicoengine_select_layer: (a: number, b: number) => void;
    readonly pizzicoengine_set_dirty: (a: number, b: number) => void;
    readonly pizzicoengine_set_layer_opacity: (a: number, b: number, c: number) => void;
    readonly pizzicoengine_set_layer_visibility: (a: number, b: number, c: number) => void;
    readonly pizzicoengine_set_selection: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly pizzicoengine_translate_active_layer: (a: number, b: number, c: number) => number;
    readonly pizzicoengine_undo: (a: number) => number;
    readonly pizzicoengine_width: (a: number) => number;
    readonly redo: () => number;
    readonly remove_layer: (a: number) => number;
    readonly select_layer: (a: number) => void;
    readonly set_dirty: (a: number) => void;
    readonly set_layer_opacity: (a: number, b: number) => void;
    readonly set_layer_visibility: (a: number, b: number) => void;
    readonly set_selection: (a: number, b: number, c: number, d: number) => number;
    readonly translate_active_layer: (a: number, b: number) => number;
    readonly undo: () => number;
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
