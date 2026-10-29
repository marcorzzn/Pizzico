# Sessione P1-Arch — Gate 1

- **Data:** 2026-10-29
- **Branch:** `arch/p1-tool-registry`
- **Ambito:** solo Gate 1 della certificazione P1-Arch. Nessuna modifica al runtime,
  alla UI o alle release; nessun tag.
- **Decisione:** [`docs/ADR/0008-tool-registry.md`](../ADR/0008-tool-registry.md)

## Esito in breve

Il pilastro "Command Pattern" **era già presente** in entrambi i motori e non è stato
riscritto: il Gate 1 ne aggiunge la prova byte per byte che mancava come test dedicato.
Il pilastro mancante, il catalogo degli strumenti, è stato implementato come dati
validati e versionati, senza collegarlo ancora all'app.

## Cosa è stato verificato, non riscritto

| Motore | Comando | Storia | Percorso vivo |
| --- | --- | --- | --- |
| `pizzico-core` | `Command::apply` / `undo` (`crates/core/src/history.rs:13`) | `History` con `Vec<Box<dyn Command>>` | `LegacyBackend` (`crates/wasm-bindings/src/engine/legacy.rs:254`), backend predefinito |
| `pizzico-engine-core` | `Command::apply` / `undo` (`crates/engine/core/src/history.rs:20`) | `History` con `Vec<Box<dyn Command>>` | `V2Backend`, dietro la feature `engine-v2` |

`HistoryStack` (snapshot) esiste ancora in `pizzico-core` per il `CommandExecutor` di
`pizzico-commands`, ma non è il percorso del bridge dell'editor: nessuna azione
dell'utente passa da lì. Sostituirla con i comandi, come chiedeva la certificazione,
sarebbe stato un lavoro già fatto.

### Il test del Gate

`crates/engine/core/tests/gate1_command_roundtrip.rs`

- sette comandi di natura diversa: aggiunta layer, sostituzione pixel con bbox,
  opacità, blend mode, trasformazione, visibilità (due volte);
- confronto completo: albero dei nodi, `StableId`, nome, visibilità, opacità (bit a bit),
  blend, trasformazione (bit a bit), **buffer RGBA di ogni layer**, composito finale;
- undo totale: sette undo devono restituire il documento **identico byte per byte**
  allo stato iniziale, con `undo_count == 0` e `redo_count == 7`;
- redo totale: ritorno identico allo stato finale;
- sequenza parziale (due undo, due redo) senza residui;
- un nuovo comando dopo un undo scarta la pila del redo.

Limite dichiarato: lo scenario non crea maschere, quindi i buffer delle maschere non
sono nel confronto. I comandi di maschera hanno già test propri in
`crates/engine/core/src/history.rs`.

## Cosa è stato aggiunto

Nuovo crate `pizzico-tools` (dati, nessuna dipendenza dal motore):

- `ToolId` validato anche in deserializzazione (`[a-z][a-z0-9_-]*`, massimo 64);
- `ParamSpec`: `integer`, `float`, `color`, `boolean`, `choice`, con limiti, passo,
  predefinito e unità;
- `ToolSchema`: id, etichetta, descrizione, scorciatoia, parametri; validazione
  fail-closed anche dopo un `from_json`;
- `ToolRegistry`: `BTreeMap` (ordine deterministico), id duplicati rifiutati, nessuna
  registrazione parziale;
- builtin `brush`, `eraser`, `move`, `marquee` con gli stessi id di `currentTool` e gli
  stessi valori correnti della UI (raggio 20 px, durezza 80%, opacità 100%, colore
  `#22c55e`); la gomma non dichiara il colore;
- `catalog_json()` → `{"schemaVersion":1,"tools":[...]}`.

## Evidenza dei comandi

Eseguiti il 2026-10-29 su Windows, toolchain 1.99.1 risolta con `cargo +stable`
(il `cargo` nudo tenta di sincronizzare `rust-toolchain.toml` e il sandbox impedisce
la scrittura in `~/.rustup/tmp`; `+stable` è la stessa versione, 1.99.1).

```text
cargo test -p pizzico-tools
  test result: ok. 9 passed; 0 failed     (tests/registry.rs)
  test result: ok. 1 passed; 0 failed     (doc-test)

cargo test -p pizzico-engine-core --test gate1_command_roundtrip
  test result: ok. 2 passed; 0 failed

cargo test -p pizzico-engine-core
  99 + 2 + 19 + 3 + 1 = 124 passed, 0 failed

cargo test --workspace
  49 suite, 330 passed, 0 failed

cargo clippy -p pizzico-tools --all-targets -- -D warnings
  nessun warning

cargo fmt -p pizzico-tools -p pizzico-engine-core -- --check
  nessuna differenza
```

## Stato dei gate

| Gate | Contenuto | Stato |
| --- | --- | --- |
| 1 | Comandi verificati byte per byte; catalogo validato in Rust | **chiuso in questa sessione** |
| 2 | Esposizione WASM del catalogo (`tool_catalog_json`, `tool_schema_json`) | da autorizzare |
| 3 | UI data-driven al posto degli slider cablati | pianificato |
| 4 | Strumento fittizio visibile in UI senza toccare `main.ts` | pianificato |

## Rischi residui

1. **Il catalogo non è ancora collegato**: nessun effetto visibile. È voluto (Gate 1
   verificabile con `cargo test`), ma finché UI e bridge non lo leggono esiste il rischio
   che schema e comportamento divergano. Mitigazione: i builtin replicano i valori
   correnti, e il Gate 3 confronterà i controlli generati con quelli attuali.
2. **Due motori**: il catalogo è neutro, ma l'esecuzione resta duplicata fra legacy e
   `Session`/`draw`. Il Gate 3 dovrà scegliere un solo punto di adattamento per motore,
   non due UI.
3. **Nessun plugin a runtime**: scelta esplicita, non una mancanza. In WASM non esiste
   caricamento dinamico di codice; l'estensibilità è "modulo Rust + registrazione".
