<!--
Pizzico — crates/wasm-bindings/README.md
Riferimento manifesto: §3.1, §4, §11 Step 8
Licenza: MIT OR Apache-2.0
-->

# pizzico-wasm-bindings

Modulo di binding WebAssembly (`wasm-bindgen`) per esporre le funzionalità del motore Rust al runtime TypeScript nel browser (e WebView Tauri mobile).

## Funzionalità Esposte
- `add(a, b) -> i32`: Funzione atomica di verifica pipeline (§11 Step 8).
- `PizzicoEngine`: Interfaccia OOP per la gestione del documento, rendering frame, esecuzione comandi, manipolazione livelli e filtri.
- Supporto a `SharedArrayBuffer` con allocazione di puntatori diretti per azzerare l'overhead di copia tra Rust e GPU Canvas.
