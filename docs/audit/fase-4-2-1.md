# Fase 4.2.1 — History nel backend

> **Data**: 2026-10-26
> **Stato**: completata. La 4.2.2 (backend v2) **non è stata iniziata**: c'è un
> ostacolo di progetto da decidere prima (vedi §4), non un problema di tempo.

---

## 1. Cosa è cambiato

`ACTIVE_HISTORY` **non esiste più**. La history vive dentro `EngineBackend`.

Nuovi metodi del trait (`src/engine/mod.rs`):

```rust
fn history_can_undo(&self) -> bool;
fn history_can_redo(&self) -> bool;
fn history_undo(&mut self) -> bool;
fn history_redo(&mut self) -> bool;
fn history_info(&self) -> HistoryMeta;
fn push_command(&mut self, cmd: Box<dyn pizzico_core::history::Command>);
fn clear_history(&mut self);
```

`LegacyBackend` li implementa delegando al proprio campo `history`, e
`history_undo`/`history_redo` applicano il comando **al documento che il backend
possiede** — questa è la differenza che elimina il rischio di due storici divergenti.

## 2. Il borrow annidato

`add_raster_layer` era l'unico punto con due prestiti sovrapposti (documento mutabile
+ history). Invece di appianarlo a mano, la funzione ora delega al metodo omonimo del
backend, che gestisce documento e comando in modo atomico:

```rust
pub fn add_raster_layer(name: &str, width: u32, height: u32, color: &[u8]) -> u64 {
    let col = …;
    with_backend_mut(|b| b.add_raster_layer(name, width, height, col))
}
```

## 3. Gate

| Gate | Esito |
|---|---|
| `cargo test -p pizzico-wasm-bindings` | ✅ 5/5 |
| `cargo check -p pizzico-wasm-bindings --target wasm32-unknown-unknown` | ✅ exit 0 |
| `cargo check --workspace` | ✅ exit 0 |
| `Select-String ACTIVE_HISTORY` | ✅ **0 occorrenze** |

Commits: `fase-4.2.1: history spostata nel backend`,
`fase-4.2.1b: opacita, visibilita e rimozione layer via metodi semantici`.

## 4. Ostacolo per la 4.2.2 (da decidere)

Il piano prevedeva: «la 4.2 implementa `EngineBackend` per `pizzico_engine_core::Document`».
La verifica del codice dice che **non basta implementare i metodi**: il trait ha una
firma che il motore v2 non può soddisfare.

```rust
fn push_command(&mut self, cmd: Box<dyn pizzico_core::history::Command>);
```

`pizzico_core::history::Command` è il trait di comando del motore **legacy**. I comandi
di `pizzico-engine-core` sono tipi diversi (`AddLayer`, `RemoveLayer`, `SetOpacity`,
`SetTransform`, …) che implementano un trait diverso, omonimo ma distinto. Un
`V2Backend` non può accodare un comando legacy al proprio documento: sono due sistemi
di history incompatibili.

Conseguenza: finché `push_command` resta nel trait, il backend v2 non è implementabile
senza un adattatore che converte comandi legacy in comandi v2 — cioè esattamente il
«wrapper finto» che le regole vietano.

### Quanto è grande il problema

Dopo la 4.2.1b il bridge costruisce comandi legacy solo in **2 punti**:

| Riga | Funzione | Comando |
|---|---|---|
| ~630-651 | `end_stroke` (patch dei pixel del tratto) | `StrokeCommand::new_bounded` / `new_full` |
| ~786-791 | `end_move_layer` (offset finale) | `MoveLayerCommand` |

Quindi la soluzione è piccola e circoscritta: **sostituire `push_command` con due
metodi semantici**, e implementarli in entrambi i backend.

```rust
// al posto di push_command(...)
fn commit_move(&mut self, layer_id: u64, from: (i32, i32), to: (i32, i32));
fn commit_stroke(
    &mut self,
    layer_id: u64,
    before: Vec<u8>,
    after: Vec<u8>,
    bbox: Option<(u32, u32, u32, u32)>,
);
```

- **Legacy**: costruisce `MoveLayerCommand` / `StrokeCommand` come fa oggi.
- **V2**: usa i comandi del motore nuovo. `move` ha già `SetTransform`; per il tratto
  serve un comando che sostituisca i pixel — `pizzico-engine-core` **non ce l'ha**.
  Va aggiunto (è codice nostro), con test.

### Cosa serve quindi per la 4.2.2

1. Due metodi semantici al posto di `push_command` (§4), con i 2 punti del bridge
   riscritti. Stima: mezza sessione.
2. Un comando «sostituisci pixel» in `pizzico-engine-core` + test. Stima: mezza sessione.
3. `V2Backend`: ~30 metodi su tipi engine (documento, layer, metadata, composito,
   selezione, history). Le traduzioni delicate sono `LayerId` (v2 ha id autonomi, serve
   una mappa `u64 ⇄ LayerId`) e `title` (v2 non lo ha: va tenuto nel backend). Stima:
   1-2 sessioni.
4. Feature `engine-v2` + init condizionale di `BACKEND`. Stima: mezza sessione.

Totale realistico: **2-3 sessioni**, coerente con la stima del committente.

## 5. Funzioni che resteranno legacy-only anche dopo la 4.2.2

Da dichiarare esplicitamente, non da fingere:

| Funzione | Motivo |
|---|---|
| `load_psd_bytes`, `export_as_psd` | usa `pizzico-io-psd`, che lavora su `pizzico_core::Document` |
| `save_project`, `load_project` | formato `.pizzico` di `pizzico-io-native`, legato al core legacy |
| `export_as_png/jpeg/webp` | oggi via `io-native`; in v2 esiste `pizzico-engine-io::encode` → **tradursi** |
| `brush_stroke` / `eraser_stroke` | usano `pizzico-raster::brush`; in v2 esiste `engine-draw` → **tradursi** |

Le prime quattro vanno dichiarate escluse nel backend v2 e documentate nel `.d.ts`
(commento JSDoc), come da regola. Le ultime due si traducono davvero.
