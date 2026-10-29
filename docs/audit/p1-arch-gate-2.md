# Sessione P1-Arch — Gate 2

- **Data:** 2026-10-29
- **Branch:** `arch/p1-tool-registry`
- **Ambito:** ponte WASM e tipi TypeScript del catalogo. **Nessuna modifica a
  `main.ts` o alla UI visiva**; nessun tag, nessuna release.
- **Decisione:** [`docs/ADR/0008-tool-registry.md`](../ADR/0008-tool-registry.md)

## Cosa è stato esposto

| Funzione WASM | Firma JS generata | Comportamento |
| --- | --- | --- |
| `get_tool_catalog_json()` | `string` | JSON `{"schemaVersion":1,"tools":[...]}`. Un errore interno diventa un'eccezione JS con messaggio contestualizzato. |
| `get_tool_schema_json(id)` | `string \| undefined` | JSON dello strumento; `undefined` se l'id non esiste o non è conforme. Un id sconosciuto non è un errore. |

Il registro è costruito una sola volta (`OnceLock`) e il fallimento di
inizializzazione resta memorizzato come `String`: nessun percorso produce un panic
nel runtime WASM. Le funzioni "pure" (`catalog_json`, `schema_json`) sono separate
dai wrapper `#[wasm_bindgen]`, così i test nativi non dipendono da `JsValue`.

## Lato TypeScript

- `packages/shared/src/tools.ts`: `ToolSchema`, `ToolCatalog`, `ChoiceOption` e
  `ParamSpec` come unione discriminata su `kind` (`integer`, `float`, `color`,
  `boolean`, `choice`); `TOOL_CATALOG_SCHEMA_VERSION = 1`;
  `parseToolCatalog`/`parseToolSchema`.
- Il parser rifiuta una `schemaVersion` diversa invece di interpretarla con i tipi
  attuali, e verifica la struttura (campi, tipi, opzioni). Non duplica le regole di
  merito (limiti, colori): quelle restano validate in Rust.
- `packages/worker-core/src/tools.ts`: `getToolCatalog()` e `getToolSchema(id)`.
  Un id sconosciuto restituisce `null`, coerente con `undefined` lato WASM.
- Nessuna funzione grezza è stata aggiunta al barrel: l'API pubblica è quella
  tipizzata.

## Evidenza

```text
node tests/tool-catalog.mjs
  Catalogo OK: 4 strumenti, 4 parametri del pennello, schemaVersion 1.

node tests/wasm-roundtrip.mjs
  ROUND-TRIP .pizzico OK
  documento: 64x48, layer: 5
  progetto:  1030 byte, composite: 0 byte diversi
  export:    PNG 984 byte, JPEG 2074 byte

cargo test -p pizzico-wasm-bindings
  test result: ok. 10 passed; 0 failed

cargo test -p pizzico-tools
  test result: ok. 9 passed; 0 failed   (integrazione)
  test result: ok. 1 passed; 0 failed   (doc-test)

cargo test --workspace
  49 suite, 334 passed, 0 failed

tsc --noEmit sui 7 progetti (packages/* + apps/web)
  tutti exit 0
```

Il test `tests/tool-catalog.mjs` istanzia il modulo compilato e chiama le due
esportazioni wasm-bindgen: non verifica le funzioni Rust "pure", verifica il ponte
reale. È stato aggiunto come step CI dopo il round-trip `.pizzico`.

## Rigenerazione del pacchetto WASM

`wasm-pack 0.13.1` in questo ambiente non riesce ad avviare `cargo metadata`
(`Accesso negato`, os error 5): il sandbox blocca la spawn dei processi figli con
stdio piped. Il pacchetto è stato quindi rigenerato con la pipeline manuale, usando
gli strumenti già nella cache di wasm-pack:

```text
cargo build -p pizzico-wasm-bindings --target wasm32-unknown-unknown --release
wasm-bindgen 0.2.129 --target web --out-dir packages/worker-core/pkg \
  --out-name pizzico_wasm_bindings target/wasm32-unknown-unknown/release/pizzico_wasm_bindings.wasm
wasm-opt 117 -Oz --enable-mutable-globals <wasm> -o <wasm>
```

Risultato: `594 971` byte (prima `564 106`). La CI continua a usare `wasm-pack` sul
runner Linux, dove il problema non esiste, e ora esegue anche il test di parità sul
pacchetto appena costruito: se la pipeline manuale e quella CI divergono, il test
fallisce.

## Stato dei gate

| Gate | Contenuto | Stato |
| --- | --- | --- |
| 1 | Comandi byte-exact + catalogo validato | chiuso |
| 2 | Ponte WASM + tipi TypeScript + test di parità | **chiuso in questa sessione** |
| 3 | UI data-driven al posto degli slider cablati | pianificato |
| 4 | Strumento fittizio visibile in UI senza toccare `main.ts` | pianificato |

## Rischi residui

1. Il wrapper TypeScript non è ancora consumato da nessuna schermata: il Gate 3 è la
   prima prova end-to-end. Finché non accade, il catalogo è verificato ma inerte.
2. Il pacchetto committato è generato a mano in questo ambiente; il test Node contro
   il pacchetto compilato è la protezione contro una deriva silenziosa.
3. La UI attuale continua a usare `currentTool` e i suoi slider: nessuna regressione,
   ma anche nessun miglioramento visibile finché il Gate 3 non sostituisce il pannello.
