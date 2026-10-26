# Baseline di fusione — misure reali

> **Data**: 2026-10-26
> **Scopo**: fotografare lo stato misurato di Pizzico e Pizzart al punto zero della
> fusione, prima di qualunque trapianto. Ogni numero qui è stato prodotto da un
> comando eseguito, non copiato da un piano.
> **Tag di sicurezza**: `fusione-punto-zero` (creato in entrambi i repository).

---

## 1. Ambiente di misura

| Voce | Valore |
|---|---|
| rustc | `1.99.1 (58cf8f9c3 2026-10-13)` |
| cargo | `1.99.1 (5f94df478 2026-08-27)` |
| node | `v24.14.1` |
| pnpm | `11.2.2` |
| target installati | `wasm32-unknown-unknown`, `x86_64-pc-windows-msvc` |
| OS | Windows, shell `pwsh` |

## 2. Stato dei repository

| Repository | Commit | Tag | Working tree |
|---|---|---|---|
| `C:\Progetti\Pizzico` | `0ae5f56` — *chore(clean-room): igiene archivio, specifiche recuperate, piano fusione* | `fusione-punto-zero` | pulito |
| `C:\Progetti\picsart-cl\pizzart` | `cc5f419` — *chore: pulizia repo, verifica architetturale, decisione colore* | `fusione-punto-zero` | pulito |

Dimensione dell'object store: Pizzico 555,3 MB (con oggetti non raggiungibili da
`git gc`, avviso `too many unreachable loose objects`), Pizzart 1,2 MB.
Dimensione del working tree di Pizzico: **210,9 MB in 455 file** (era ~13,8 GB prima
dell'archiviazione del materiale non pubblicabile).

---

## 3. Gate G0 — esiti misurati

| # | Comando | Esito | Tempo |
|---|---|---|---|
| 1 | `cargo check --workspace` | **exit 0** | 5 m 18 s |
| 2 | `cargo check -p pizzico-wasm-bindings --target wasm32-unknown-unknown` | **exit 0** | 1,65 s (cache calda) |
| 3 | `pnpm typecheck` | **exit 0** (7 package `Done`) | — |
| 4 | `pnpm --filter @pizzico/app-web build` | **exit 0** | 9,60 s |

### Artefatti della build web

| File | Dimensione |
|---|---:|
| `pizzico_wasm_bindings_bg.wasm` (dist) | 558,66 kB |
| `index-Fu1qYl0I.js` | 63,82 kB (gzip 18,15 kB) |
| `index-ClX2x8hS.css` | 11,02 kB (gzip 2,88 kB) |
| Moduli transformati | 30 |

Binario WASM in `packages/worker-core/pkg/`: **558.656 byte** (prodotto il 2026-10-25).

### Nota operativa sui comandi `pnpm`

Eseguiti la prima volta **dentro il sandbox**, entrambi sono falliti con

```
Error: spawn EPERM   (syscall: 'spawn', Node.js v24.14.1)
```

Non è un difetto del progetto: è il confine del sandbox, che impedisce a Node di
aprire la pipe verso `esbuild`. Con accesso pieno gli stessi comandi identici sono
passati (exit 0). Registrato qui perché chi ripeterà la misura non interpreti
l'errore come regressione.

---

## 4. Matrice WASM dei crate di Pizzart

Comando per ciascuno:
`cargo check -p <crate> --target wasm32-unknown-unknown`
con `CARGO_TARGET_DIR` dentro il workspace di Pizzico (il sandbox non consente
scritture in `C:\Progetti\picsart-cl`).

| Crate | Esito | Tempo (cache calda) | Tempo a freddo (misurato prima) |
|---|---|---:|---:|
| `pizzart-core` | ✅ exit 0 | 1,96 s | 5,9 s |
| `pizzart-draw` | ✅ exit 0 | 2,07 s | 2,3 s |
| `pizzart-text` | ✅ exit 0 | 5,00 s | 4 m 03 s |
| `pizzart-render` | ✅ exit 0 | 3,47 s | 8 m 07 s |
| `pizzart-io` | ✅ exit 0 | 3,97 s | 2 m 01 s |
| `pizzart-project` | ❌ **exit 101** | 90 s | — |

### Errore esatto di `pizzart-project`

```
Compiling zstd-sys v2.1.2+zstd.1.5.7
warning: zstd-sys@2.1.2+zstd.1.5.7: Compiler family detection failed due to error:
ToolNotFound: failed to find tool "clang": program not found
error occurred in cc-rs: failed to find tool "clang": program not found
```

Causa: `zstd-sys` compila codice C tramite `cc-rs` e richiede `clang`. Non è un
problema di configurazione aggirabile con una feature: è un vincolo del crate.
**Conseguenza confermata**: il formato progetto resta `.pizzico` (ZIP+DEFLATE,
`crates/io-native`), non `.pizzart`.

---

## 5. API reali estratte (firme alla lettera)

### 5.1 Contratto WASM di Pizzico — `crates/wasm-bindings/src/lib.rs`

**87 funzioni pubbliche** (funzioni libere + metodi di `PizzicoEngine`). Estratte con
uno script che ricostruisce le firme su più righe. Le principali:

```
create_document(width: u32, height: u32)
add_raster_layer(name: &str, width: u32, height: u32, color: &[u8]) -> u64
get_composite_buffer() -> Vec<u8>
get_document_dimensions() -> Vec<u32>
get_layer_count() -> usize
get_layers_metadata() -> Result<JsValue, JsValue>
set_layer_opacity(id: u32, opacity: f32)
set_layer_visibility(id: u32, visible: bool)
select_layer(id: u32)                    remove_layer(id: u32) -> bool
get_active_layer_id() -> Option<u32>
load_psd_bytes(bytes: &[u8]) -> Result<(), JsValue>
save_project() -> Result<Vec<u8>, JsValue>     load_project(bytes: &[u8]) -> Result<(), JsValue>
export_as_png() -> Result<Vec<u8>, JsValue>    export_as_jpeg(quality: u8) -> Result<Vec<u8>, JsValue>
export_as_webp(quality: u8)                    export_as_psd()
begin_stroke() / end_stroke() -> bool
brush_stroke(from_x: f32, from_y: f32, to_x: f32, to_y: f32,
             radius: f32, hardness: f32, color: &[u8], opacity: f32) -> bool
eraser_stroke(from_x, from_y, to_x, to_y, radius, hardness, opacity) -> bool
undo() / redo() / can_undo() / can_redo() -> bool
get_history_info() -> Result<JsValue, JsValue>
begin_move_layer() / move_active_layer(x, y) / translate_active_layer(dx, dy) / end_move_layer()
get_active_layer_offset() -> JsValue
set_selection(x, y, width, height) -> bool    clear_selection() -> bool
has_active_selection() -> bool                get_selection() -> Result<JsValue, JsValue>
get_document_json() -> Result<String, JsValue>
async init_webgpu(canvas_id: &str) -> Result<(), JsValue>
```

Costruttore della classe: `PizzicoEngine::new(width: u32, height: u32, title: &str) -> Self`.

### 5.2 Core di Pizzico — `crates/core/src/document.rs`

```
pub fn new(width: u32, height: u32, title: &str) -> Self
pub fn new_empty(width: u32, height: u32) -> Self
pub fn allocate_layer_id(&mut self) -> LayerId
pub fn add_layer(&mut self, layer: Layer) -> LayerId
pub fn get_layer(&self, id: LayerId) -> Option<&Layer>
pub fn get_layer_mut(&mut self, id: LayerId) -> Option<&mut Layer>
pub fn get_active_layer(&self) -> Option<&Layer>
pub fn remove_layer(&mut self, id: LayerId) -> Option<Layer>
pub fn set_layer_opacity(&mut self, id: LayerId, opacity: f32) -> bool
pub fn set_layer_visibility(&mut self, id: LayerId, visible: bool) -> bool
pub fn select_layer(&mut self, id: LayerId) -> bool
pub fn set_layer_offset(&mut self, id: LayerId, x: i32, y: i32) -> bool
pub fn translate_layer(&mut self, id: LayerId, dx: i32, dy: i32) -> bool
pub fn set_selection(&mut self, x: u32, y: u32, width: u32, height: u32)
pub fn clear_selection(&mut self)
pub fn has_active_selection(&self) -> bool
pub fn layer_count(&self) -> usize
```

### 5.3 Core di Pizzico — `crates/core/src/layer.rs`

```
pub enum LayerKind { .. }
pub struct Layer { .. }
pub struct Transform2D { .. }
pub fn new_raster(id: LayerId, name: impl Into<String>, width: u32, height: u32) -> Self
pub fn new_raster_with_pixels(id, name, width, height, pixels: Vec<u8>) -> Self
pub fn new_raster_color(id, name, width, height, color: [u8; 4]) -> Self
pub fn new_vector(id: LayerId, name: impl Into<String>) -> Self
pub fn new_group(id: LayerId, name: impl Into<String>) -> Self
```

**Non esiste `Layer::raster(...)`.** Il costruttore è `Layer::new_raster(id, name, w, h)`
e richiede un `LayerId`, che si ottiene da `Document::allocate_layer_id()`.

### 5.4 Core di Pizzart (per confronto, Fase 4)

```
Document::new(width: u32, height: u32) -> Self          // NIENTE title
Document::add_layer(&mut self, layer: Layer) -> LayerId
Document::layer(&self, id) / layer_mut(&mut self, id) / node / node_mut / group / group_mut
Document::parent_of / children_of / index_of / layer_count / visible_layer_count

LayerId::new() -> Self          // autonomo
Layer::new(name, width, height, pixels: Vec<u8>) -> Self
Layer::filled(name, width, height, rgba: [u8; 4]) -> Self
Layer::transparent(name, width, height) -> Self

export: BlendMode, composite, Document, LayerError, PlacedImage, Layer, LayerId,
        Mask, MaskSource, SharedMask, Mat4, Group, InsertWhere, Node,
        EllipseSelection, LassoSelection, RectSelection, StableId, Transform
```

### 5.5 Divergenze che impattano la Fase 4 (rischio R1, ora concreto)

| Aspetto | Pizzico | Pizzart |
|---|---|---|
| Costruttore documento | `new(w, h, title)` | `new(w, h)` |
| Identità layer | allocata dal documento (`allocate_layer_id`) | autonoma (`LayerId::new`) |
| Modello gerarchico | `LayerKind::{Raster, Vector, Group}` piatto | albero `Node`/`Group` con `InsertWhere` |
| Maschere | assenti | `Mask`, `MaskSource`, `SharedMask` |
| Selezione | solo rettangolo | Rect + Ellipse + Lasso con AA 4×4 |
| Compositing | `composite_layers(doc)` in core | `composite(...)` + renderer wgpu |

Queste non sono differenze cosmetiche: sono il lavoro vero della Fase 4.

---

## 6. Conteggio test (statico, non eseguito)

| Repository | `#[test]` nel codice |
|---|---:|
| Pizzico | 62 |
| Pizzart | 254 |

Conteggio statico: il numero di test **eseguiti e verdi** va misurato caso per caso,
perché alcuni test (prestazioni) hanno soglie sensibili al profilo di build.

---

## 7. Conclusioni della Fase 0

1. La baseline è **verde**: workspace nativo, target WASM del bridge, typecheck e
   build web passano tutti.
2. Il motore di Pizzart è **utilizzabile nel browser** per 5 crate su 6; l'unico
   escluso è `project`, per un vincolo del crate `zstd`, non per scelta.
3. Le firme reali sono state estratte e documentate: qualunque fase successiva deve
   citare queste, non assunzioni.
4. Il rischio R1 (due modelli di layer) è confermato e circoscritto: è il contenuto
   della Fase 4, non una sorpresa della Fase 1.

**Nessun crate legacy è stato toccato.**
