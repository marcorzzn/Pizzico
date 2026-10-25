/* @ts-self-types="./pizzico_wasm_bindings.d.ts" */

/**
 * Handle principale all'engine grafico esposto al JavaScript.
 */
export class PizzicoEngine {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PizzicoEngineFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pizzicoengine_free(ptr, 0);
    }
    /**
     * Aggiunge un livello raster uniforme.
     * @param {string} name
     * @param {number} width
     * @param {number} height
     * @param {Uint8Array} color
     * @returns {bigint}
     */
    add_raster_layer(name, width, height, color) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(color, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.pizzicoengine_add_raster_layer(this.__wbg_ptr, ptr0, len0, width, height, ptr1, len1);
        return BigInt.asUintN(64, ret);
    }
    /**
     * Inizia traslazione layer attivo.
     * @returns {boolean}
     */
    begin_move_layer() {
        const ret = wasm.pizzicoengine_begin_move_layer(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Avvia un tratto di pennello.
     * @returns {boolean}
     */
    begin_stroke() {
        const ret = wasm.pizzicoengine_begin_stroke(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Disegna un segmento di pennello.
     * @param {number} from_x
     * @param {number} from_y
     * @param {number} to_x
     * @param {number} to_y
     * @param {number} radius
     * @param {number} hardness
     * @param {Uint8Array} color
     * @param {number} opacity
     * @returns {boolean}
     */
    brush_stroke(from_x, from_y, to_x, to_y, radius, hardness, color, opacity) {
        const ptr0 = passArray8ToWasm0(color, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.pizzicoengine_brush_stroke(this.__wbg_ptr, from_x, from_y, to_x, to_y, radius, hardness, ptr0, len0, opacity);
        return ret !== 0;
    }
    /**
     * Può ripristinare?
     * @returns {boolean}
     */
    can_redo() {
        const ret = wasm.pizzicoengine_can_redo(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Può annullare?
     * @returns {boolean}
     */
    can_undo() {
        const ret = wasm.pizzicoengine_can_undo(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Rimuove selezione attiva.
     * @returns {boolean}
     */
    clear_selection() {
        const ret = wasm.pizzicoengine_clear_selection(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Crea un nuovo documento.
     * @param {number} width
     * @param {number} height
     */
    create_document(width, height) {
        wasm.pizzicoengine_create_document(this.__wbg_ptr, width, height);
    }
    /**
     * Termina traslazione layer attivo con registrazione history.
     * @returns {boolean}
     */
    end_move_layer() {
        const ret = wasm.pizzicoengine_end_move_layer(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Conclude il tratto registrando l'azione nella history.
     * @returns {boolean}
     */
    end_stroke() {
        const ret = wasm.pizzicoengine_end_stroke(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Disegna un segmento di gomma.
     * @param {number} from_x
     * @param {number} from_y
     * @param {number} to_x
     * @param {number} to_y
     * @param {number} radius
     * @param {number} hardness
     * @param {number} opacity
     * @returns {boolean}
     */
    eraser_stroke(from_x, from_y, to_x, to_y, radius, hardness, opacity) {
        const ret = wasm.pizzicoengine_eraser_stroke(this.__wbg_ptr, from_x, from_y, to_x, to_y, radius, hardness, opacity);
        return ret !== 0;
    }
    /**
     * Esporta in formato JPEG con qualità specificata (1-100).
     * @param {number} quality
     * @returns {Uint8Array}
     */
    export_as_jpeg(quality) {
        const ret = wasm.pizzicoengine_export_as_jpeg(this.__wbg_ptr, quality);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Esporta in formato PNG (lossless con alpha).
     * @returns {Uint8Array}
     */
    export_as_png() {
        const ret = wasm.pizzicoengine_export_as_png(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Esporta l'intero documento in formato PSD multilivello.
     * @returns {Uint8Array}
     */
    export_as_psd() {
        const ret = wasm.pizzicoengine_export_as_psd(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Esporta in formato WebP (pure-Rust lossless con alpha).
     * @param {number} quality
     * @returns {Uint8Array}
     */
    export_as_webp(quality) {
        const ret = wasm.pizzicoengine_export_as_webp(this.__wbg_ptr, quality);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * ID del livello attivo.
     * @returns {number | undefined}
     */
    get_active_layer_id() {
        const ret = wasm.pizzicoengine_get_active_layer_id(this.__wbg_ptr);
        return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
    }
    /**
     * Restituisce [x, y] del layer attivo.
     * @returns {any}
     */
    get_active_layer_offset() {
        const ret = wasm.pizzicoengine_get_active_layer_offset(this.__wbg_ptr);
        return ret;
    }
    /**
     * Serializza il documento in formato JSON.
     * @returns {string}
     */
    get_document_json() {
        let deferred2_0;
        let deferred2_1;
        try {
            const ret = wasm.pizzicoengine_get_document_json(this.__wbg_ptr);
            var ptr1 = ret[0];
            var len1 = ret[1];
            if (ret[3]) {
                ptr1 = 0; len1 = 0;
                throw takeFromExternrefTable0(ret[2]);
            }
            deferred2_0 = ptr1;
            deferred2_1 = len1;
            return getStringFromWasm0(ptr1, len1);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Restituisce i metadati globali del documento attivo.
     * @returns {any}
     */
    get_document_metadata() {
        const ret = wasm.pizzicoengine_get_document_metadata(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Informazioni sulla history.
     * @returns {any}
     */
    get_history_info() {
        const ret = wasm.pizzicoengine_get_history_info(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Metadati di tutti i livelli in formato array JS.
     * @returns {any}
     */
    get_layers_metadata() {
        const ret = wasm.pizzicoengine_get_layers_metadata(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Restituisce la selezione attiva in formato JS.
     * @returns {any}
     */
    get_selection() {
        const ret = wasm.pizzicoengine_get_selection(this.__wbg_ptr);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return takeFromExternrefTable0(ret[0]);
    }
    /**
     * Verifica presenza selezione attiva.
     * @returns {boolean}
     */
    has_active_selection() {
        const ret = wasm.pizzicoengine_has_active_selection(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Altezza del documento corrente in pixel.
     * @returns {number}
     */
    height() {
        const ret = wasm.pizzicoengine_height(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Flag dirty del documento.
     * @returns {boolean}
     */
    is_dirty() {
        const ret = wasm.pizzicoengine_is_dirty(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Numero di livelli presenti nel documento.
     * @returns {number}
     */
    layer_count() {
        const ret = wasm.pizzicoengine_layer_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Carica un file PSD binario e sostituisce il documento corrente.
     * @param {Uint8Array} bytes
     */
    load_psd_bytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.pizzicoengine_load_psd_bytes(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Imposta posizione assoluta del layer attivo.
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    move_active_layer(x, y) {
        const ret = wasm.pizzicoengine_move_active_layer(this.__wbg_ptr, x, y);
        return ret !== 0;
    }
    /**
     * Inizializza l'istanza dell'engine con un nuovo documento.
     * @param {number} width
     * @param {number} height
     * @param {string} title
     */
    constructor(width, height, title) {
        const ptr0 = passStringToWasm0(title, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.pizzicoengine_new(width, height, ptr0, len0);
        this.__wbg_ptr = ret;
        PizzicoEngineFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Ripristina l'ultima azione annullata.
     * @returns {boolean}
     */
    redo() {
        const ret = wasm.pizzicoengine_redo(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Rimuove un livello dato il suo ID.
     * @param {number} id
     * @returns {boolean}
     */
    remove_layer(id) {
        const ret = wasm.pizzicoengine_remove_layer(this.__wbg_ptr, id);
        return ret !== 0;
    }
    /**
     * Esegue il compositing e restituisce il buffer RGBA 8-bit per Canvas.
     * @returns {Uint8Array}
     */
    render_frame() {
        const ret = wasm.pizzicoengine_render_frame(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Seleziona un livello come attivo.
     * @param {number} id
     */
    select_layer(id) {
        wasm.pizzicoengine_select_layer(this.__wbg_ptr, id);
    }
    /**
     * Imposta il flag dirty del documento.
     * @param {boolean} dirty
     */
    set_dirty(dirty) {
        wasm.pizzicoengine_set_dirty(this.__wbg_ptr, dirty);
    }
    /**
     * Modifica l'opacità di un livello.
     * @param {number} id
     * @param {number} opacity
     */
    set_layer_opacity(id, opacity) {
        wasm.pizzicoengine_set_layer_opacity(this.__wbg_ptr, id, opacity);
    }
    /**
     * Modifica la visibilità di un livello.
     * @param {number} id
     * @param {boolean} visible
     */
    set_layer_visibility(id, visible) {
        wasm.pizzicoengine_set_layer_visibility(this.__wbg_ptr, id, visible);
    }
    /**
     * Imposta selezione rettangolare.
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @returns {boolean}
     */
    set_selection(x, y, width, height) {
        const ret = wasm.pizzicoengine_set_selection(this.__wbg_ptr, x, y, width, height);
        return ret !== 0;
    }
    /**
     * Trasla il layer attivo del delta specificato.
     * @param {number} dx
     * @param {number} dy
     * @returns {boolean}
     */
    translate_active_layer(dx, dy) {
        const ret = wasm.pizzicoengine_translate_active_layer(this.__wbg_ptr, dx, dy);
        return ret !== 0;
    }
    /**
     * Annulla l'ultima azione.
     * @returns {boolean}
     */
    undo() {
        const ret = wasm.pizzicoengine_undo(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Larghezza del documento corrente in pixel.
     * @returns {number}
     */
    width() {
        const ret = wasm.pizzicoengine_width(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) PizzicoEngine.prototype[Symbol.dispose] = PizzicoEngine.prototype.free;

/**
 * Verifica l'integrità della pipeline WASM: addizione intera.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function add(a, b) {
    const ret = wasm.add(a, b);
    return ret;
}

/**
 * Aggiunge un nuovo livello raster al documento attivo riempito con un colore RGBA uniforme.
 * Ritorna l'ID univoco del livello appena creato.
 * @param {string} name
 * @param {number} width
 * @param {number} height
 * @param {Uint8Array} color
 * @returns {bigint}
 */
export function add_raster_layer(name, width, height, color) {
    const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(color, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.add_raster_layer(ptr0, len0, width, height, ptr1, len1);
    return BigInt.asUintN(64, ret);
}

/**
 * Inizia un'operazione di traslazione (Move Tool) per il livello attivo.
 * Registra la posizione iniziale per generare un unico `MoveLayerCommand` al rilascio del cursore.
 * @returns {boolean}
 */
export function begin_move_layer() {
    const ret = wasm.begin_move_layer();
    return ret !== 0;
}

/**
 * Avvia una sessione di tratto con il pennello o gomma.
 * Memorizza lo stato iniziale del livello raster attivo per generare un unico comando Undo/Redo compatto.
 * @returns {boolean}
 */
export function begin_stroke() {
    const ret = wasm.begin_stroke();
    return ret !== 0;
}

/**
 * Rasterizza un segmento di pennello continuo tra (from_x, from_y) e (to_x, to_y) sul livello attivo.
 * Aggiorna il dirty bounding box e notifica WebGPU per la ricomposizione immediata a schermo.
 * @param {number} from_x
 * @param {number} from_y
 * @param {number} to_x
 * @param {number} to_y
 * @param {number} radius
 * @param {number} hardness
 * @param {Uint8Array} color
 * @param {number} opacity
 * @returns {boolean}
 */
export function brush_stroke(from_x, from_y, to_x, to_y, radius, hardness, color, opacity) {
    const ptr0 = passArray8ToWasm0(color, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.brush_stroke(from_x, from_y, to_x, to_y, radius, hardness, ptr0, len0, opacity);
    return ret !== 0;
}

/**
 * Verifica se è presente almeno un'operazione ripristinabile nella cronologia.
 * @returns {boolean}
 */
export function can_redo() {
    const ret = wasm.can_redo();
    return ret !== 0;
}

/**
 * Verifica se è presente almeno un'operazione annullabile nella cronologia.
 * @returns {boolean}
 */
export function can_undo() {
    const ret = wasm.can_undo();
    return ret !== 0;
}

/**
 * Rimuove la selezione attiva (deseleziona).
 * @returns {boolean}
 */
export function clear_selection() {
    const ret = wasm.clear_selection();
    return ret !== 0;
}

/**
 * Crea o resetta il documento attivo con larghezza e altezza specificate.
 * @param {number} width
 * @param {number} height
 */
export function create_document(width, height) {
    wasm.create_document(width, height);
}

/**
 * Termina l'operazione di spostamento del livello attivo.
 * Se l'offset finale differisce da quello iniziale, registra un `MoveLayerCommand` nella History.
 * @returns {boolean}
 */
export function end_move_layer() {
    const ret = wasm.end_move_layer();
    return ret !== 0;
}

/**
 * Termina la sessione di tratto e registra un unico `StrokeCommand` compatto nella History.
 * @returns {boolean}
 */
export function end_stroke() {
    const ret = wasm.end_stroke();
    return ret !== 0;
}

/**
 * Rasterizza un segmento di gomma tra (from_x, from_y) e (to_x, to_y) sul livello attivo.
 * @param {number} from_x
 * @param {number} from_y
 * @param {number} to_x
 * @param {number} to_y
 * @param {number} radius
 * @param {number} hardness
 * @param {number} opacity
 * @returns {boolean}
 */
export function eraser_stroke(from_x, from_y, to_x, to_y, radius, hardness, opacity) {
    const ret = wasm.eraser_stroke(from_x, from_y, to_x, to_y, radius, hardness, opacity);
    return ret !== 0;
}

/**
 * Esporta l'immagine renderizzata del documento corrente in formato JPEG con qualità 1-100.
 * Le aree trasparenti vengono composte su sfondo bianco (#FFFFFF).
 * @param {number} quality
 * @returns {Uint8Array}
 */
export function export_as_jpeg(quality) {
    const ret = wasm.export_as_jpeg(quality);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Esporta l'immagine renderizzata del documento corrente in formato PNG (lossless con canale alpha).
 * @returns {Uint8Array}
 */
export function export_as_png() {
    const ret = wasm.export_as_png();
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Esporta l'intero documento multilivello attivo in formato Adobe Photoshop (PSD).
 * @returns {Uint8Array}
 */
export function export_as_psd() {
    const ret = wasm.export_as_psd();
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Esporta l'immagine renderizzata del documento corrente in formato WebP (pure-Rust lossless con canale alpha).
 * @param {number} quality
 * @returns {Uint8Array}
 */
export function export_as_webp(quality) {
    const ret = wasm.export_as_webp(quality);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Restituisce l'ID del livello attualmente selezionato (se presente).
 * @returns {number | undefined}
 */
export function get_active_layer_id() {
    const ret = wasm.get_active_layer_id();
    return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
}

/**
 * Restituisce l'offset corrente `[x, y]` del livello attivo, oppure null.
 * @returns {any}
 */
export function get_active_layer_offset() {
    const ret = wasm.get_active_layer_offset();
    return ret;
}

/**
 * Restituisce il buffer RGBA 8-bit calcolato fondendo tutti i livelli visibili del documento.
 * @returns {Uint8Array}
 */
export function get_composite_buffer() {
    const ret = wasm.get_composite_buffer();
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Restituisce le dimensioni correnti del documento attivo come array `[width, height]`.
 * @returns {Uint32Array}
 */
export function get_document_dimensions() {
    const ret = wasm.get_document_dimensions();
    var v1 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Restituisce i metadati globali del documento attivo in formato oggetto JSON.
 * @returns {any}
 */
export function get_document_metadata() {
    const ret = wasm.get_document_metadata();
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Restituisce lo stato corrente della History in formato oggetto JS `{ canUndo, canRedo, undoCount, redoCount }`.
 * @returns {any}
 */
export function get_history_info() {
    const ret = wasm.get_history_info();
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Restituisce il numero di livelli presenti nel documento attivo.
 * @returns {number}
 */
export function get_layer_count() {
    const ret = wasm.get_layer_count();
    return ret >>> 0;
}

/**
 * Restituisce i metadati di tutti i livelli presenti nel documento attivo come array JS.
 * @returns {any}
 */
export function get_layers_metadata() {
    const ret = wasm.get_layers_metadata();
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Restituisce la selezione corrente serializzata come oggetto JS, o null se inattiva.
 * @returns {any}
 */
export function get_selection() {
    const ret = wasm.get_selection();
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Restituisce true se è presente una selezione rettangolare attiva.
 * @returns {boolean}
 */
export function has_active_selection() {
    const ret = wasm.has_active_selection();
    return ret !== 0;
}

/**
 * Installa il panic hook di `console_error_panic_hook`.
 */
export function init_panic_hook() {
    wasm.init_panic_hook();
}

/**
 * Inizializza WebGPU tramite web-sys, aggancia il Surface al `<canvas>`
 * identificato da `canvas_id`, e avvia il render loop a 60 FPS che campiona
 * la texture del Documento composito.
 * @param {string} canvas_id
 * @returns {Promise<void>}
 */
export function init_webgpu(canvas_id) {
    const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.init_webgpu(ptr0, len0);
    return ret;
}

/**
 * Verifica se il documento attivo necessita di un nuovo rendering WebGPU.
 * @returns {boolean}
 */
export function is_dirty() {
    const ret = wasm.is_dirty();
    return ret !== 0;
}

/**
 * Carica un progetto `.pizzico` da buffer binario, sostituisce il Documento attivo,
 * resetta la cronologia e segnala la necessità di ricompositing WebGPU.
 * @param {Uint8Array} bytes
 */
export function load_project(bytes) {
    const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.load_project(ptr0, len0);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Carica un file Adobe Photoshop (PSD/PSB) da buffer binario, sostituisce il Documento attivo
 * e segnala la necessità di un nuovo frame di compositing WebGPU.
 * @param {Uint8Array} bytes
 */
export function load_psd_bytes(bytes) {
    const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.load_psd_bytes(ptr0, len0);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

/**
 * Imposta la posizione assoluta (x, y) del livello attivo e marca il documento dirty.
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function move_active_layer(x, y) {
    const ret = wasm.move_active_layer(x, y);
    return ret !== 0;
}

/**
 * Versione del core come intero (100 = v0.1.0).
 * @returns {number}
 */
export function pizzico_version() {
    const ret = wasm.pizzico_version();
    return ret >>> 0;
}

/**
 * Ripristina (Redo) l'ultima operazione precedentemente annullata.
 * @returns {boolean}
 */
export function redo() {
    const ret = wasm.redo();
    return ret !== 0;
}

/**
 * Rimuove il livello specificato dal documento attivo.
 * @param {number} id
 * @returns {boolean}
 */
export function remove_layer(id) {
    const ret = wasm.remove_layer(id);
    return ret !== 0;
}

/**
 * Serializza l'intero progetto attivo (documento, livelli, pixel e selezione)
 * nel formato container compresso nativo `.pizzico` (ZIP).
 * @returns {Uint8Array}
 */
export function save_project() {
    const ret = wasm.save_project();
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Seleziona il livello specificato come livello attivo nel documento.
 * @param {number} id
 */
export function select_layer(id) {
    wasm.select_layer(id);
}

/**
 * Imposta manualmente il flag dirty del documento attivo.
 * @param {boolean} dirty
 */
export function set_dirty(dirty) {
    wasm.set_dirty(dirty);
}

/**
 * Imposta l'opacità del livello specificato (0.0 - 1.0) e marca il documento dirty.
 * @param {number} id
 * @param {number} opacity
 */
export function set_layer_opacity(id, opacity) {
    wasm.set_layer_opacity(id, opacity);
}

/**
 * Imposta la visibilità del livello specificato e marca il documento dirty.
 * @param {number} id
 * @param {boolean} visible
 */
export function set_layer_visibility(id, visible) {
    wasm.set_layer_visibility(id, visible);
}

/**
 * Imposta la selezione rettangolare attiva nel documento in coordinate logiche documento.
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {boolean}
 */
export function set_selection(x, y, width, height) {
    const ret = wasm.set_selection(x, y, width, height);
    return ret !== 0;
}

/**
 * Trasla il livello attivo del delta (dx, dy) e marca il documento dirty.
 * @param {number} dx
 * @param {number} dy
 * @returns {boolean}
 */
export function translate_active_layer(dx, dy) {
    const ret = wasm.translate_active_layer(dx, dy);
    return ret !== 0;
}

/**
 * Annulla (Undo) l'ultima operazione effettuata nel documento.
 * @returns {boolean}
 */
export function undo() {
    const ret = wasm.undo();
    return ret !== 0;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_is_function_1f9d30630b8b1d3d: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_null_e343b7d08827ba72: function(arg0) {
            const ret = arg0 === null;
            return ret;
        },
        __wbg___wbindgen_is_undefined_8865fb403f8fe9d8: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
        },
        __wbg___wbindgen_number_get_2e0e7dee9f701a71: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'number' ? obj : undefined;
            getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
        },
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg__wbg_cb_unref_dcc1a90847f04c41: function(arg0) {
            arg0._wbg_cb_unref();
        },
        __wbg_apply_a910804df6e1e433: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.apply(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_call_187d372bd5fdd4aa: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_document_9854e03c05fc8834: function(arg0) {
            const ret = arg0.document;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_error_757e9472f8410341: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_error_c9cf3fc2064683a9: function(arg0) {
            console.error(arg0);
        },
        __wbg_getElementById_cc94972b404e4eaa: function(arg0, arg1, arg2) {
            const ret = arg0.getElementById(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_get_31af05bd4842a84f: function() { return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments); },
        __wbg_instanceof_Promise_e1dc6893aa1ece28: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Promise;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_instanceof_Window_82d71df4eddf88bc: function(arg0) {
            let result;
            try {
                result = arg0 instanceof Window;
            } catch (_) {
                result = false;
            }
            const ret = result;
            return ret;
        },
        __wbg_navigator_2156486643462a87: function(arg0) {
            const ret = arg0.navigator;
            return ret;
        },
        __wbg_new_227d7c05414eb861: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_new_617a8cdb8bb1130e: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_ee2291f50781bf1d: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_new_from_slice_9a868026ffa4208a: function(arg0, arg1) {
            const ret = new Uint8Array(getArrayU8FromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_typed_b01cb72a8af741a3: function(arg0, arg1) {
            try {
                var state0 = {a: arg0, b: arg1};
                var cb0 = (arg0, arg1) => {
                    const a = state0.a;
                    state0.a = 0;
                    try {
                        return wasm_bindgen_12528a006083644c___convert__closures_____invoke___js_sys_38ea4d597d213009___Function_fn_wasm_bindgen_12528a006083644c___JsValue_____wasm_bindgen_12528a006083644c___sys__Undefined___js_sys_38ea4d597d213009___Function_fn_wasm_bindgen_12528a006083644c___JsValue_____wasm_bindgen_12528a006083644c___sys__Undefined_______true_(a, state0.b, arg0, arg1);
                    } finally {
                        state0.a = a;
                    }
                };
                const ret = new Promise(cb0);
                return ret;
            } finally {
                state0.a = 0;
            }
        },
        __wbg_parse_0fc53dead14b3b42: function() { return handleError(function (arg0, arg1) {
            const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
            return ret;
        }, arguments); },
        __wbg_push_2baf45db356cf468: function(arg0, arg1) {
            const ret = arg0.push(arg1);
            return ret;
        },
        __wbg_queueMicrotask_9833f9a49df95a49: function(arg0) {
            const ret = arg0.queueMicrotask;
            return ret;
        },
        __wbg_queueMicrotask_a72f977e97f23c5f: function(arg0) {
            queueMicrotask(arg0);
        },
        __wbg_requestAnimationFrame_7b526ab7aa550c74: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.requestAnimationFrame(arg1);
            return ret;
        }, arguments); },
        __wbg_resolve_0076e10020304ede: function(arg0) {
            const ret = Promise.resolve(arg0);
            return ret;
        },
        __wbg_set_145a351398b48c65: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = Reflect.set(arg0, arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg_static_accessor_GLOBAL_266715b9d96ba635: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_10fb7dc1ae063179: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_0b583911f537483a: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_d7f903d1508cbdc4: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_then_c949d5a25a4e78f8: function(arg0, arg1, arg2) {
            const ret = arg0.then(arg1, arg2);
            return ret;
        },
        __wbg_then_e71170d78fcf8954: function(arg0, arg1) {
            const ret = arg0.then(arg1);
            return ret;
        },
        __wbindgen_generic_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [Externref], shim_idx: 242, ret: Result(Unit), inner_ret: Some(Result(Unit)) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_12528a006083644c___convert__closures_____invoke___wasm_bindgen_12528a006083644c___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_12528a006083644c___JsError___true_);
            return ret;
        },
        __wbindgen_generic_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Closure(Closure { owned: true, function: Function { arguments: [F64], shim_idx: 7, ret: Unit, inner_ret: Some(Unit) }, mutable: true }) -> Externref`.
            const ret = makeMutClosure(arg0, arg1, wasm_bindgen_12528a006083644c___convert__closures_____invoke___f64______true_);
            return ret;
        },
        __wbindgen_generic_0000000000000003: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_generic_0000000000000004: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./pizzico_wasm_bindings_bg.js": import0,
    };
}

function wasm_bindgen_12528a006083644c___convert__closures_____invoke___wasm_bindgen_12528a006083644c___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_12528a006083644c___JsError___true_(arg0, arg1, arg2) {
    const ret = wasm.wasm_bindgen_12528a006083644c___convert__closures_____invoke___wasm_bindgen_12528a006083644c___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_12528a006083644c___JsError___true_(arg0, arg1, arg2);
    if (ret[1]) {
        throw takeFromExternrefTable0(ret[0]);
    }
}

function wasm_bindgen_12528a006083644c___convert__closures_____invoke___js_sys_38ea4d597d213009___Function_fn_wasm_bindgen_12528a006083644c___JsValue_____wasm_bindgen_12528a006083644c___sys__Undefined___js_sys_38ea4d597d213009___Function_fn_wasm_bindgen_12528a006083644c___JsValue_____wasm_bindgen_12528a006083644c___sys__Undefined_______true_(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen_12528a006083644c___convert__closures_____invoke___js_sys_38ea4d597d213009___Function_fn_wasm_bindgen_12528a006083644c___JsValue_____wasm_bindgen_12528a006083644c___sys__Undefined___js_sys_38ea4d597d213009___Function_fn_wasm_bindgen_12528a006083644c___JsValue_____wasm_bindgen_12528a006083644c___sys__Undefined_______true_(arg0, arg1, arg2, arg3);
}

function wasm_bindgen_12528a006083644c___convert__closures_____invoke___f64______true_(arg0, arg1, arg2) {
    wasm.wasm_bindgen_12528a006083644c___convert__closures_____invoke___f64______true_(arg0, arg1, arg2);
}

const PizzicoEngineFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pizzicoengine_free(ptr, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => wasm.__wbindgen_destroy_closure(state.a, state.b));

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {

        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            state.a = a;
            real._wbg_cb_unref();
        }
    };
    real._wbg_cb_unref = () => {
        if (--state.cnt === 0) {
            wasm.__wbindgen_destroy_closure(state.a, state.b);
            state.a = 0;
            CLOSURE_DTORS.unregister(state);
        }
    };
    CLOSURE_DTORS.register(real, state, state);
    return real;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('pizzico_wasm_bindings_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
