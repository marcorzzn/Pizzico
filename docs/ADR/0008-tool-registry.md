# ADR-0008 — Catalogo dichiarativo degli strumenti e confine dei comandi

- **Stato:** accettata — Gate 1, 2 e 3 della sessione P1-Arch
- **Data:** 2026-10-29
- **Ambito:** `crates/tools` (nuovo), `crates/engine/core/tests`, UI web (fase successiva)

## Contesto verificato

L'applicazione ha oggi due motori, entrambi già basati su comandi:

| Motore | Trait | Storia | Uso |
| --- | --- | --- | --- |
| `pizzico-core` (legacy) | `Command::apply` / `undo` (`crates/core/src/history.rs:13`) | `History` con `Vec<Box<dyn Command>>` | Backend predefinito del bridge WASM (`crates/wasm-bindings/src/engine/legacy.rs:254`) |
| `pizzico-engine-core` (v2) | `Command::apply` / `undo` (`crates/engine/core/src/history.rs:20`) | `History` con `Vec<Box<dyn Command>>` | Dietro la feature `engine-v2` |

`HistoryStack`, la storia a snapshot, resta definita in `pizzico-core` (e usata dal
`CommandExecutor` di `pizzico-commands`), ma **non è il percorso del bridge
dell'editor**: il backend legacy usa `History::apply_and_push` e i suoi comandi.

Il pilastro mancante è l'estensibilità degli strumenti. Oggi aggiungere un pennello,
una forma o un filtro richiede modifiche coordinate in punti non collegati:

- lo stato è una stringa cablata: `currentTool = 'brush'` e le scorciatoie
  `V/M/B/E` in `apps/web/src/main.ts:101` e `:564-607`;
- il pannello proprietà è costruito a mano con quattro slider e un color picker
  (`apps/web/src/main.ts:1280-1447`);
- il bridge espone funzioni dedicate con parametri fissi: `brush_stroke`
  (`crates/wasm-bindings/src/lib.rs:468`) ed `eraser_stroke` (`:556`);
- la sessione portabile ha un enum chiuso `Tool { Select, Brush, Text, Rect }`
  (`crates/session/src/lib.rs:32-39`).

Conseguenza: ogni nuovo strumento attraversa Rust, bridge e TypeScript, e i tre lati
possono divergere senza che nessun test se ne accorga. Esempio reale: il pannello della
gomma mostra ancora il colore del tratto, che la gomma non usa.

## Decisione

Introdurre un **catalogo dichiarativo** degli strumenti nel nuovo crate
`pizzico-tools`, indipendente da entrambi i motori:

1. **`ToolSchema`** — identificativo stabile (`brush`, `eraser`, `move`, `marquee`),
   etichetta, descrizione, scorciatoia e lista di parametri.
2. **`ParamSpec`** — tipi espliciti e serializzabili: `integer`, `float`, `color`,
   `boolean`, `choice`, ciascuno con `id`, etichetta, limiti, passo, valore predefinito
   e unità (`px`, `%`). Il tipo è il contratto: la UI non interpreta stringhe libere.
3. **Validazione fail-closed** — id conformi (`[a-z][a-z0-9_-]*`, massimo 64 caratteri),
   etichette non vuote, `min < max`, predefinito dentro l'intervallo, colore `#rrggbb`
   o `#rrggbbaa`, opzioni di una `choice` uniche e predefinite esistenti.
4. **`ToolRegistry`** — mappa ordinata `BTreeMap<ToolId, ToolSchema>`. Ordine
   deterministico, id duplicati rifiutati, nessuna registrazione parziale di uno schema
   invalido.
5. **JSON versionato** — `catalog_json()` produce
   `{"schemaVersion":1,"tools":[...]}`. La versione è esplicita perché il formato
   attraverserà il confine WASM: un cambio incompatibile incrementa il numero, non
   rompe silenziosamente la UI.

Il catalogo descrive i parametri **nelle unità della UI** (raggio in pixel,
percentuali 0-100), le stesse che l'utente vede oggi. La conversione verso le unità del
motore di disegno (hardness e opacity normalizzate) appartiene al confine di esecuzione,
non allo schema: così una UI generata dai dati non deve conoscere le convenzioni interne.

### Confine WASM

Il catalogo attraversa il confine con due sole funzioni, senza callback e senza stato
condiviso:

- `get_tool_catalog_json() -> String` — catalogo completo; un errore interno diventa
  un'eccezione JS con messaggio contestualizzato, mai un panic;
- `get_tool_schema_json(id: &str) -> Option<String>` — JSON dello strumento, oppure
  `undefined` se l'id non esiste o non è valido. "Non c'è" non è un errore.

Lato TypeScript i tipi vivono in `packages/shared` (`ParamSpec` come unione discriminata
su `kind`, parser con controllo di `schemaVersion`) e il wrapper tipizzato in
`packages/worker-core` (`getToolCatalog`, `getToolSchema`). Il parser TS verifica
struttura e versione, non duplica le regole di merito già validate in Rust.

## Perché non un sistema di plugin a runtime

Il formato è dati, non codice. In `wasm32-unknown-unknown` non esiste caricamento
dinamico di moduli: un "plugin" è un modulo Rust registrato alla compilazione, come i
service plugin di Krita o i plugin di GIMP (che però girano in processi separati, una
possibilità che il web non offre). Un manifest JSON caricato a runtime aggiungerebbe un
parser, una superficie di integrità e un rischio di divergenza senza dare estensibilità
reale. Il registro resta quindi compilato, ma la sua **descrizione** è dati: è questa
separazione che rende la UI generabile e testabile.

## Alternative scartate

| Alternativa | Motivo del rifiuto |
| --- | --- |
| Lasciare l'enum e la UI cablata | È lo stato attuale: ogni strumento tocca tre linguaggi e non è verificabile in isolamento. |
| Manifest JSON caricati a runtime | Nessun caricamento di codice in WASM; aggiunge parsing e rischi senza estensibilità. |
| Trait object con `on_pointer_*` subito | L'esecuzione vive in `Session`/`draw`: migrarla senza un consumatore UI produrrebbe un'astrazione non testata end-to-end. Arriva in fase 3, quando la UI legge già il catalogo. |
| Un unico grande registro comandi | `pizzico-commands` descrive comandi applicativi per la palette (titolo, scorciatoia), non i parametri di uno strumento. Sono due concetti diversi. |

## Conseguenze

- Aggiungere uno strumento diventa: un modulo Rust che costruisce il suo `ToolSchema`,
  una registrazione. Nessuna modifica al bridge o alla UI (fase 4 lo dimostra).
- Il catalogo attraversa il confine WASM (Gate 2) e la UI lo consuma (Gate 3): il
  pannello dei parametri di pennello e gomma è generato dagli schemi, non più da
  slider cablati in `main.ts` (1607 → 1433 righe). Il componente vive in
  `apps/web/src/tool-inspector.ts`; potrà salire in `ui-kit` quando ci sarà un
  secondo consumatore.
- L'adattatore di esecuzione in `main.ts` conosce ancora i nomi `size`, `hardness`,
  `opacity`, `color`: è il debito dichiarato che il Gate 4 dovrà eliminare quando
  lo strumento fittizio dovrà disegnare, non solo comparire.
- Il catalogo descrive i parametri, non l'elenco degli strumenti nella toolbar:
  quella resta cablata in `ui-web` e il Gate 4 la dovrà generare dal catalogo per
  dimostrare l'estensibilità end-to-end.
- Rischio dichiarato: schema e comportamento possono divergere finché la UI non è
  generata dai dati. Mitigazione: i valori predefiniti dei builtin coincidono con quelli
  correnti della UI (raggio 20 px, durezza 80%, opacità 100%, colore `#22c55e`) e il
  Gate 3 ha confrontato i controlli generati con quelli attuali.
- La gomma non dichiara il parametro colore: la UI generata smetterà di mostrarlo. È una
  correzione di comportamento, non una regressione.

## Stato dei gate

| Gate | Contenuto | Stato |
| --- | --- | --- |
| 1 | Comandi verificati byte per byte + catalogo validato in Rust | **questa sessione** |
| 2 | Esposizione WASM e tipi TypeScript del catalogo | **chiuso in questa sessione** |
| 3 | UI data-driven che sostituisce gli slider cablati | **chiuso in questa sessione** |
| 4 | Strumento fittizio visibile in UI senza toccare `main.ts` | pianificato |

## Riferimenti

- `docs/ADR/0001-architecture.md` — confini dei crate.
- `crates/engine/core/tests/gate1_command_roundtrip.rs` — prova del pilastro comandi.
- `crates/tools` — catalogo, validazione, JSON.
