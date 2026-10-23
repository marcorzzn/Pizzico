# Step I (Sotto-passo 1): Export Immagini Raster (PNG / JPEG / WebP)

**Data**: 23 Ottobre 2026  
**Milestone**: Fase 1 (§4, §9 Interoperabilità, §10, §11 Step 8)  
**Status**: Completato con successo ✅  

---

## 1. Obiettivo dello Step I - Sotto-passo 1

Implementare la pipeline di esportazione per i formati immagine standard del Web e della grafica digitale (**PNG**, **JPEG**, **WebP**), consentendo all'utente di condividere, pubblicare o scaricare il documento composito renderizzato, rispettando il Manifesto §9 (Interoperabilità: priorità alta) e §3.1 (architettura pure-Rust compilata in WebAssembly, zero dipendenze cloud o native C non portabili).

---

## 2. Architettura & Implementazione

### 2.1 Modulo di Esportazione Rust (`crates/io-native/src/export.rs`)
Implementato con il crate standard `image` (v0.25 con backend pure-Rust `png`, `zune-jpeg` e `image-webp`):

```rust
pub fn export_png(doc: &Document) -> Result<Vec<u8>, ExportError>;
pub fn export_jpeg(doc: &Document, quality: u8) -> Result<Vec<u8>, ExportError>;
pub fn export_webp(doc: &Document, quality: u8) -> Result<Vec<u8>, ExportError>;
```

- **PNG**:
  - Compressione lossless con canale alpha RGBA a 32-bit (`ExtendedColorType::Rgba8`).
  - Scrittura tramite `image::codecs::png::PngEncoder`.
- **JPEG**:
  - Compressione lossy a qualità regolabile (1–100, default 90).
  - Poiché il formato JPEG non contempla il canale alpha, le trasparenze vengono composte algebricamente su sfondo bianco matte (`#FFFFFF`):
    $$C_{out} = \frac{C \cdot A + 255 \cdot (255 - A) + 127}{255}$$
  - Scrittura tramite `image::codecs::jpeg::JpegEncoder::new_with_quality`.
- **WebP**:
  - Codifica lossless pure-Rust VP8L con supporto pieno alla trasparenza alpha.
  - Scrittura tramite `image::codecs::webp::WebPEncoder::new_lossless`.

### 2.2 Bridge WASM (`crates/wasm-bindings/src/lib.rs`)
Esportate le API verso TypeScript / browser:
- `export_as_png() -> Result<Vec<u8>, JsValue>`
- `export_as_jpeg(quality: u8) -> Result<Vec<u8>, JsValue>`
- `export_as_webp(quality: u8) -> Result<Vec<u8>, JsValue>`
- Re-export in `@pizzico/worker-core` e metodi speculari su struct `PizzicoStudio`.

### 2.3 UI & Dropdown Esporta (`packages/ui-web` & `apps/web`)
1. **Topbar Action Button**:
   - Aggiunto il pulsante `📤 Esporta ▾` accanto a `💾 Salva`, `📁 Apri Progetto` e `📂 Apri PSD`.
2. **Dropdown Menu Contestuale**:
   - Design glassmorphism coerente con la palette dark di Pizzico.
   - Scheda **PNG**: badge `Lossless · Alpha`, pulsante `Scarica PNG`.
   - Scheda **JPEG**: badge `Compresso`, slider qualità interattivo (1–100%, default 90%), pulsante `Scarica JPEG`.
   - Scheda **WebP**: badge `Moderno · Leggero`, slider qualità interattivo (default 90%), pulsante `Scarica WebP`.
3. **Flusso di Download & Toast**:
   - Generazione file Blob + trigger download automatico `<a download="titolo.ext">`.
   - Notifica toast con dimensione file formattata:  
     `✅ Esportato: sample-01.png (10.8 KB)`.

---

## 3. Risultati & Verifiche

| Test / Verifica | Esito | Note |
|---|---|---|
| `cargo test -p pizzico-io-native` | ✅ **5/5 passati** | Magic number PNG, SOI JPEG, RIFF/WEBP, roundtrip container |
| `cargo check` sui crate del workspace | ✅ **0 errori** | 10 crate verificati |
| `pnpm -r typecheck` | ✅ **0 errori** | 7 package TypeScript validati |
| **Node.js WASM Verification** | ✅ **Passato** | Test su `sample-01.psd` reale con validazione byte signature |
| **Browser E2E Flow** | ✅ **Verificato** | Menu a tendina, interazione slider, download e toast |

### Confronto Dimensioni File Generati (`sample-01.psd` 800×600):
- **WebP (Lossless VP8L)**: **400 B** (0.4 KB) — altissima efficienza di compressione per immagini grafiche uniformi.
- **PNG (Lossless Rgba8)**: **11.0 KB**
- **JPEG (Quality 50)**: **19.8 KB**
- **JPEG (Quality 90)**: **25.5 KB**

---

## 4. Screenshot del Menu "Esporta"

![Menu Esporta Immagine aperto nella topbar con canvas composito e opzioni PNG, JPEG e WebP](assets/step-i1-export.png)

*Figura 1: Interfaccia utente con il menu a tendina "📤 Esporta Immagine" aperto, raffigurante le opzioni PNG (Lossless Alpha), JPEG (con slider qualità interattivo al 90%) e WebP (Moderno Leggero).*
