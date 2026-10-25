# Audit di consolidamento Pizzico — 2026-10-25

> **VINCOLO**: Questo documento e un REPORT DI AUDIT. Nessuna azione e stata eseguita
> sul codice sorgente di `C:\Progetti\Pizzico`. Tutte le operazioni di merge/move
> devono attendere approvazione esplicita dell'utente.

---

## Executive Summary

Sono state esaminate tre location: `C:\Progetti\Pizzico\` (repo principale, 85% Fase 1),
`C:\Progetti\Pizzico\progetti da aggregare\` (6 ZIP da ~163 MB totali) e
`C:\Progetti\picsart-cl\pizzart\` (workspace Rust autonomo, da ~1 GB incluso target).

Il materiale piu prezioso e **`pizzart`**: un workspace Rust/WGPU (MIT OR Apache-2.0)
scritto in parallelo con Pizzico, che copre i gap esatti che Pizzico deve ancora
affrontare: blend modes completi con parita GPU, layer mask, selection tools avanzati
(lasso, ellisse, rettangolo con AA 4x4), effects pipeline (blur/sharpen/glow),
motore di testo con cosmic-text. I 6 ZIP di "progetti da aggregare" sono un mix:
Graphite, Lightcraft, Photocraft, ArtCraft sono progetti open source di terze parti
(MIT/Apache) rilevanti; `spizzico` e un prototipo TS/React da scartare (contiene
duplicati degli altri ZIP); `picsedit` e un PoC TS marginale con licenza sconosciuta.

Il materiale in `docs/_legacy/picsart-apk` e `photopea-web` e gia isolato
correttamente (§7 Manifesto) e non puo entrare nel codebase.

**Score finale: 8/12 gap principali della roadmap hanno un candidato esterno valido.**

---

## Inventario per origine

### A. `C:\Progetti\Pizzico\` — Stato corrente repository

**Allineamento con STATO-PROGETTO.md (2026-10-21):**

| Componente dichiarato | Verifica filesystem | Allineato? |
|---|---|---|
| 13 crates Rust | Trovati esattamente 13 crates | OK |
| Bridge WASM wasm-bindgen | crates/wasm-bindings/src/lib.rs presente | OK |
| Pipeline WebGPU in Rust | crates/wasm-bindings/src/gpu/render.rs presente | OK |
| Frontend monorepo pnpm | apps/web, apps/tauri, packages/ presenti | OK |
| Binario WASM pkg/ | Non verificato (nel gitignore) | N/V |

**Milestone vs evidenza:**

| Milestone | Stato |
|---|---|
| Fase 0 - WASM compilato | COMPLETATO (docs/milestones/fase-0.md + screenshot) |
| Step H - Persistenza .pizzico + OPFS | COMPLETATO (5/5 test) |
| Step I-1 - Export PNG/JPEG/WebP | COMPLETATO (5/5 test) |
| Step F, G | COMPLETATI |

**Lacune identificate nei crates:**

| Crate | Stato | Note |
|---|---|---|
| pizzico-render | LACUNA critica | Solo shader rettangolo; nessun compositing layer |
| pizzico-selection | LACUNA | Stub di pochi KB, no lasso/ellisse funzionanti |
| pizzico-text | LACUNA | Solo rustybuzz shaping, no layout/render/registry |
| pizzico-commands | Non ispezionato | Atteso per Step 10 roadmap |

**File legacy gia isolati correttamente in `docs/_legacy/`:**
- picsart-apk/ — 174.052 file, 2.10 GB — codice decompilato (RISCHIO LEGALE)
- photopea-web/ — 86 file, 53 MB — bundle JS proprietario (RISCHIO LEGALE)
- src/, legacy/ — vecchi prototipi TS pre-WASM (obsoleti)

**File orfani/corrotti**: Nessuno rilevato.

---

### B. `C:\Progetti\Pizzico\progetti da aggregare\`

| File | Dimensione | Data | Tipo | Licenza | Rilevanza |
|---|---|---|---|---|---|
| Graphite-master.zip | 3.8 MB | 23/10/2026 | Codice Rust/TS (editor vettoriale) | MIT OR Apache-2.0 | Utile |
| artcraft-main.zip | 36.6 MB | 24/10/2026 | Codice Rust (API client generazione AI) | MIT OR Apache-2.0 | Marginale |
| lightcraft-main.zip | 17.8 MB | 24/10/2026 | Codice Rust (photo catalog, codecs) | MIT OR Apache-2.0 | Utile |
| photocraft-main.zip | 21.3 MB | 24/10/2026 | Codice Rust (photo editor, PSD codec) | MIT OR Apache-2.0 | CRITICA |
| picsedit-studio-...zip | 0.4 MB | 24/10/2026 | Codice TS + stub Rust minimali | Sconosciuto | Marginale |
| spizzico-(pizzico-alternativo).zip | 80.7 MB | 25/10/2026 | Prototipo TS/React + embed degli altri ZIP | Sconosciuto | DISCARD |

Nota: spizzico contiene al suo interno copie degli altri 4 ZIP come asset in
`public/assets/aistudio/`. Non aggiunge contenuto nuovo.

---

### C. `C:\Progetti\picsart-cl\pizzart\`

Workspace Rust a 4 crates (core, render, draw, text). Target compilato in release+debug.
Nessun file decompilato. README dichiara metodologia clean-room, specifiche derivate
solo da metadati pubblici (stringhe localizzazione, AndroidManifest.xml).
**Licenza: MIT OR Apache-2.0. Conforme al Manifesto.**

| File | Dim. | Data | Tipo | Licenza | Rilevanza |
|---|---|---|---|---|---|
| crates/core/src/blend.rs | 10.4 KB | 24/10 | Rust: 12 blend modes W3C, funzioni pure | MIT/Apache | CRITICA |
| crates/core/src/compositor.rs | 10.3 KB | 25/10 | Rust: compositing CPU multi-layer | MIT/Apache | CRITICA |
| crates/core/src/mask.rs | 9.0 KB | 25/10 | Rust: Mask struct, alpha 8bpp, inverted, MaskSource | MIT/Apache | CRITICA |
| crates/core/src/selection.rs | 13.0 KB | 25/10 | Rust: Rect/Ellipse/Lasso con AA 4x4 supersampling | MIT/Apache | CRITICA |
| crates/core/src/history.rs | 15.0 KB | 25/10 | Rust: Command trait + History, 1000 passi LRU | MIT/Apache | CRITICA |
| crates/core/src/layer.rs | 6.3 KB | 25/10 | Rust: Layer + LayerId + blend + mask | MIT/Apache | CRITICA |
| crates/core/src/document.rs | 4.7 KB | 24/10 | Rust: Document + layer stack | MIT/Apache | CRITICA |
| crates/core/src/image.rs | 5.9 KB | 24/10 | Rust: PlacedImage (tile + offset) | MIT/Apache | CRITICA |
| crates/core/src/math.rs | 5.0 KB | 24/10 | Rust: utilita geometriche | MIT/Apache | Utile |
| crates/core/src/transform.rs | 4.4 KB | 24/10 | Rust: trasformazioni affini | MIT/Apache | Utile |
| crates/render/src/lib.rs | 105.6 KB | 25/10 | Rust: renderer WGPU completo (compositing GPU) | MIT/Apache | CRITICA |
| crates/render/src/cpu.rs | 10.3 KB | 25/10 | Rust: CPU fallback renderer | MIT/Apache | CRITICA |
| crates/render/src/composite.wgsl | 4.5 KB | 25/10 | WGSL: compositing GPU, 12 blend modes, mask | MIT/Apache | CRITICA |
| crates/render/src/effects.wgsl | 8.8 KB | 25/10 | WGSL: brightness/contrast/saturate/blur/sharpen/glow | MIT/Apache | CRITICA |
| crates/draw/src/lib.rs | 35.4 KB | 25/10 | Rust: pennello Catmull-Rom, tilt, dirty rect | MIT/Apache | CRITICA |
| crates/draw/examples/stroke_demo.rs | 3.8 KB | 24/10 | Rust: demo pennellata | MIT/Apache | Utile |
| crates/text/src/lib.rs | 16.1 KB | 25/10 | Rust: testo con cosmic-text, layout+shaping | MIT/Apache | CRITICA |
| crates/text/src/registry.rs | 12.5 KB | 25/10 | Rust: FontRegistry con cache glyph | MIT/Apache | CRITICA |
| docs/spec/effetti.md | 20.4 KB | 24/10 | Doc: catalogo 119 effetti nomi EN/IT | MIT/Apache | Utile |
| docs/spec/effetti.json | 223.7 KB | 24/10 | Dataset: 300 elementi effetti strutturati | MIT/Apache | Utile |
| docs/spec/schermate.md | 20.9 KB | 24/10 | Doc: 243 schermate, deeplink, rotte | MIT/Apache | Marginale |
| docs/spec/glossario.md | 5.5 KB | 24/10 | Doc: vocabolario UI EN/IT | MIT/Apache | Marginale |
| tools/gen_spec.py | 29.4 KB | 24/10 | Python: generatore spec da dati analisi | MIT/Apache | Marginale |
| Cargo.toml | 0.4 KB | 25/10 | Config workspace pizzart | MIT/Apache | Utile |
| Output PNG (7 file) | ~627 KB | 24-25/10 | Screenshot demo compilati | MIT/Apache | Utile |

---

### D. Altri archivi (gia in docs/_legacy/)

| File | Dim. | Tipo | Stato legale | Rilevanza |
|---|---|---|---|---|
| docs/_legacy/analisi picsart/Picsart.apk | 90.4 MB | Dump APK | PROPRIETARIO | RISCHIO LEGALE |
| docs/_legacy/analisi picsart/piLibs-master.zip | 1.6 MB | Codice C++ IQ | MIT | Reference solo |
| docs/_legacy/analisi picsart/mtt_iq_piLibs-JS.zip | 0.5 MB | Codice JS IQ | MIT | Reference solo |
| docs/_legacy/output_analisi/ (varie ZIP) | ~62 MB | Analisi/asset da APK | PROPRIETARIO | RISCHIO LEGALE |
| docs/_legacy/photopea-web/pp*.js | ~2.6 MB | Bundle JS Photopea | PROPRIETARIO | RISCHIO LEGALE |
| docs/_legacy/photopea-web/hb.wasm, fribidi.wasm | 477 KB | HarfBuzz + FriBidi WASM | MIT/LGPL | Reference solo |

TUTTO il materiale in docs/_legacy/ e gia correttamente isolato (README §7 Manifesto).
Non va toccato, non va copiato nel motore.

---

## Candidati MERGE (proposta, non azione)

### MERGE-01 — pizzart/crates/core/src/blend.rs
- **Cosa contiene**: Enum BlendMode (12 modi W3C), funzioni pure per ogni blend,
  label italiane. Zero dipendenze. Test parita CPU/GPU verificata (max 2/255).
- **Dove andrebbe**: crates/core/src/blend.rs (confrontare con esistente prima)
- **Perche conviene**: Il renderer Pizzico non ha ancora shader compositing. pizzart
  ha la coppia CPU/WGSL con contratto di parita dimostrata.
- **Rischi**: Potenziale duplicazione se blend.rs di Pizzico e gia completo.
  Verificare prima del merge.
- **Sforzo**: S (se stub) / M (se parziale)

### MERGE-02 — pizzart/crates/core/src/selection.rs
- **Cosa contiene**: rasterize_alpha (4x4 supersampling), RectSelection, EllipseSelection,
  LassoSelection (even-odd ray casting con AA). Bordi morbidi su tutti gli strumenti.
- **Dove andrebbe**: crates/selection/src/ (integrarsi con wand.rs, grabcut.rs esistenti)
- **Perche conviene**: Risolve il gap "lasso tool" della roadmap. I stub esistenti
  sono di pochi KB, senza implementazione completa.
- **Rischi**: Tipo Mask deve matchare pizzico-core. RectSelection potrebbe duplicarsi.
- **Sforzo**: M

### MERGE-03 — pizzart/crates/core/src/mask.rs
- **Cosa contiene**: Struct Mask (alpha 8bpp, flag inverted, MaskSource enum con
  Selection/FromLayer/FromTile/Procedural), sampling nearest, clamp bordi.
- **Dove andrebbe**: crates/core/src/mask.rs (nuovo file nel core Pizzico)
- **Perche conviene**: Layer mask e gap critico roadmap. Zero dipendenze, tipo
  unificato per selezione e compositing.
- **Rischi**: Verificare assenza di un concetto mask gia in pizzico-core.
- **Sforzo**: S

### MERGE-04 — pizzart/crates/core/src/history.rs
- **Cosa contiene**: Trait Command (apply+undo+label), History con 2 stack done/undone,
  limite 1000 passi con LRU del piu vecchio, comandi concreti per tutte le operazioni layer.
- **Dove andrebbe**: crates/commands/src/
- **Perche conviene**: Step 10 roadmap richiede CommandRegistry. Risparmio stimato
  2-3 settimane di implementazione.
- **Rischi**: Document/Layer di pizzart non e 1:1 con Pizzico. Adattamento necessario.
- **Sforzo**: M

### MERGE-05 — pizzart/crates/render/src/composite.wgsl
- **Cosa contiene**: Shader WGSL completo: compositing GPU di layer, 12 blend modes
  (parita con CPU verificata max 2/255), alpha premoltiplicato, opacita per layer,
  mask sampling.
- **Dove andrebbe**: crates/render/src/ o crates/wasm-bindings/src/gpu/
- **Perche conviene**: Il renderer Pizzico ha solo shader "rettangolo colorato".
  Questo e il gap critico piu urgente per rendere l'editor funzionale.
- **Rischi**: Formato bind group potrebbe differire. Verificare versione wgpu.
- **Sforzo**: M

### MERGE-06 — pizzart/crates/render/src/effects.wgsl + cpu.rs
- **Cosa contiene**: Pipeline effetti ping-pong: brightness/contrast/saturate
  (1 pass point-wise), gaussian blur (2 pass separabile), sharpen+glow (3 pass
  unsharp mask). CPU reference per ogni effetto. Flag is_last per blend unico.
- **Dove andrebbe**: crates/render/src/effects.wgsl + crates/render/src/cpu.rs
- **Perche conviene**: Infrastruttura per tutti i 119 effetti futuri. CPU reference
  garantisce test di accettazione automatici.
- **Rischi**: render/src/lib.rs di pizzart (105.6 KB) e molto complesso;
  meglio portare solo WGSL+cpu.rs, riscrivere la logica Rust per WASM.
- **Sforzo**: L (completo) / M (solo shader)

### MERGE-07 — pizzart/crates/draw/src/lib.rs (parziale: dirty rect)
- **Cosa contiene**: Pipeline disegno CPU: Point (pressione+tilt+timestamp),
  stabilizzazione ewma, Catmull-Rom, campionamento arco, timbri ellittici, dirty rect.
  Performance: 1.328ms vs 200ms prima del dirty rect.
- **Dove andrebbe**: crates/raster/src/brush.rs (confrontare con esistente 12.8 KB)
- **Perche conviene**: Se brush.rs di Pizzico non ha dirty rect, l'ottimizzazione
  porta da 200ms a 1.3ms per pennellata — critica per la latenza UX.
- **Rischi**: brush.rs di Pizzico potrebbe gia coprire parte del terreno.
  Rischio duplicazione alto. Confronto necessario prima.
- **Sforzo**: M (solo dirty rect) / L (refactor completo)

### MERGE-08 — pizzart/crates/text/src/lib.rs + registry.rs
- **Cosa contiene**: Motore testo con cosmic-text: layout multiriga, shaping,
  fallback font, rendering in PlacedImage compatibile con pipeline layer.
  FontRegistry con cache glyph (mutabilita interna necessaria, dichiarata nel README).
- **Dove andrebbe**: crates/text/src/ (sostituire rustybuzz standalone)
- **Perche conviene**: crate pizzico-text ha solo shaping basilare, nessun layout
  ne rendering. cosmic-text copre bidi, multiline, fallback.
- **Rischi**: cosmic-text deve compilare per wasm32-unknown-unknown (verificare).
- **Sforzo**: M

### MERGE-09 — photocraft-main/crates/psd/ (da ZIP)
- **Cosa contiene**: Crate PSD di Photocraft (README 13 KB). Probabilmente
  il parser PSD piu maturo in Rust open source.
- **Dove andrebbe**: crates/io-psd/
- **Perche conviene**: PSD Writer e gap critico roadmap.
- **Rischi**: ATTRIBUTION.md da 26.8 KB da verificare (nessuna dipendenza GPL-only).
  Richiede estrazione ZIP in temp per ispezione.
- **Sforzo**: M (adattamento API)

### MERGE-10 — lightcraft-main/crates/codecs/ (da ZIP)
- **Cosa contiene**: Codec colore display, encode/decode JPEG/PNG/EXIF, gainmap HDR.
- **Dove andrebbe**: crates/color/ o crates/io-native/
- **Perche conviene**: Pipeline colore avanzata per export professionale.
- **Rischi**: Alcune dipendenze native potrebbero non essere WASM-compatibili.
- **Sforzo**: L

---

## Candidati REFERENCE (solo consultazione)

### REF-01 — pizzart/docs/spec/effetti.json
- **Utile per**: Catalogo 119 effetti con nomi EN/IT, 109 parametri, 72 enum.
- **Perche no copia diretta**: Deriva da analisi APK. Usarlo come input per
  docs/algorithms/effects-catalog.md, non copiarlo verbatim.
- **Dove**: docs/algorithms/effects-catalog.md

### REF-02 — piLibs-master.zip / mtt_iq_piLibs-JS.zip (MIT, Quilez)
- **Utile per**: Algoritmi grafica e shader WebGL2 di alta qualita.
- **Perche no copia diretta**: Il contesto (analisi Picsart) rende l'uso ambiguo.
  Meglio referenziare la fonte originale GitHub iq/piLibs direttamente.
- **Dove**: docs/clean-room/logs/pilibs-reference.md

### REF-03 — photopea-web/03-analisi/STEP1-mappa-ottimizzazioni.md
- **Utile per**: Mappa ottimizzazioni renderer Photopea (comportamentale).
- **Perche no copia diretta**: Osservazione su prodotto proprietario.
- **Dove**: docs/clean-room/logs/photopea-renderer-observations.md

---

## Candidati DISCARD

| File/Archivio | Motivo |
|---|---|
| spizzico-(pizzico-alternativo).zip | Prototipo TS/React obsoleto; embed degli stessi ZIP; zero valore aggiuntivo |
| picsart-apk/jadx_out/ | Java decompilato da APK proprietario — RISCHIO LEGALE — gia isolato |
| picsart-apk/apktool_out/ | Smali decompilato — RISCHIO LEGALE — gia isolato |
| photopea-web/pp*.js | Bundle JS Photopea offuscato — RISCHIO LEGALE — gia isolato |
| output_analisi/pizzico_clone_kit/ | Asset da APK proprietario — RISCHIO LEGALE |
| picsedit-studio-...zip | PoC TS con stub Rust 1KB, licenza sconosciuta, nessun valore |
| artcraft-main.zip | Editor AI generativo cloud — fuori perimetro Pizzico v1 locale |
| docs/_legacy/src/ (TS vecchio) | Codice UI pre-WASM obsoleto, gia isolato |

---

## Gap di Pizzico vs file disponibili

| Gap roadmap | File candidato | Colma il gap? |
|---|---|---|
| Blend modes completi con parita GPU | pizzart blend.rs + composite.wgsl | SI |
| Layer mask | pizzart mask.rs | SI |
| Lasso tool | pizzart selection.rs (LassoSelection) | SI |
| Magic Wand | wand.rs esiste + pizzart base | Parziale |
| Layer Groups | Nessun file trovato | NO |
| Text tool (layout+rendering) | pizzart crates/text/ (cosmic-text) | SI |
| Trasformazioni (affini) | pizzart transform.rs | Parziale |
| Effects pipeline (blur, sharpen) | pizzart effects.wgsl + cpu.rs | SI (infrastruttura) |
| PSD Writer | photocraft crates/psd/ (da verificare) | Potenziale |
| Fallback WebGL2 | Nessun file trovato | NO |
| Command pattern / Undo-Redo | pizzart history.rs | SI |
| Dirty rect per pennello | pizzart draw/lib.rs | SI |

**Score: 8/12 gap coperti da candidati validi.**

---

## Piano di azione proposto (in attesa di approvazione)

> NESSUNO DI QUESTI STEP E ESEGUITO. Attendono approvazione esplicita.

1. **Confronto blend.rs** — stabilire se Pizzico ha gia 12 blend modes completi
2. **Confronto brush.rs** — verificare se dirty rect e gia implementato
3. **Verifica WASM per cosmic-text** — controllare compatibilita wasm32-unknown-unknown
4. **Ispezione photocraft crates/psd/** — estrarre ZIP in temp, leggere ATTRIBUTION.md
5. **Merge mask.rs** (MERGE-03, sforzo S) — zero dipendenze, aggiornare NOTICE.md
6. **Merge selection.rs** (MERGE-02, sforzo M) — dipende da Step 5
7. **Merge history.rs** (MERGE-04, sforzo M) — adattare tipi Document/Layer
8. **Portare composite.wgsl** (MERGE-05, sforzo M) — shader compositing reale
9. **Portare effects.wgsl + cpu.rs** (MERGE-06 parziale, sforzo M) — 4 effetti base
10. **Upgrade crates/text/** (MERGE-08, sforzo M) — dipende da Step 3
11. **Creare docs/algorithms/effects-catalog.md** (REF-01) — 119 effetti come spec Fase 2

---

## Note finali

- **docs/_legacy/** e correttamente isolato e conforme al Manifesto §7. Nessuna azione necessaria.
- **pizzart** e stato sviluppato nelle stesse date di Pizzico (24-25/10/2026) —
  e un banco di prova parallelo con metodologia clean-room dichiarata.
- **Licenza MIT OR Apache-2.0** di pizzart e identica a Pizzico: integrazione
  compatibile senza cambi di licenza.
- **NOTICE.md** di Pizzico dovra essere aggiornato per ogni file portato da pizzart.

---

*Report generato il 2026-10-25. Audit read-only: nessuna modifica eseguita.*
*Autore: Antigravity AI IDE — C:\Progetti\Pizzico intatto.*
