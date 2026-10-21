// Pizzico — packages/worker-core/pkg/pizzico_wasm_bindings.js
// Riferimento manifesto: §3.1, §11 Step 8
// Licenza: MIT OR Apache-2.0

let wasm;

export function add(a, b) {
    return wasm.add(a, b);
}

export function pizzico_version() {
    return wasm.pizzico_version();
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                if (module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                } else {
                    throw e;
                }
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
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    return imports;
}

function __wbg_init_memory(_imports, _maybe_memory) {}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;
    return wasm;
}

export default async function init(input) {
    if (wasm !== undefined) return wasm;
    if (typeof input === 'undefined') {
        input = new URL('pizzico_wasm_bindings_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();
    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }
    __wbg_init_memory(imports);
    const { instance, module } = await __wbg_load(await input, imports);
    return __wbg_finalize_init(instance, module);
}

export { init };
