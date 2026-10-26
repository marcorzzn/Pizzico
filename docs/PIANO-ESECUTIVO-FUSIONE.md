# Piano esecutivo — Fusione del motore Pizzart dentro Pizzico

> **Destinatario**: agente dsh
> **Versione**: 1.0
> **Stato**: piano da approvare, nessuna riga di codice modificata
> **Regola suprema**: ogni fase termina con una misura, non con una dichiarazione.

---

## 0. Come si usa questo documento

Il piano è **additivo e reversibile**. In nessun momento il repository deve restare
in uno stato non compilante: ogni trapianto avviene accanto al codice esistente,
dietro un flag, e il vecchio codice si cancella solo dopo che il nuovo ha dimostrato
parità misurata.

Regole di ingaggio:

1. Una fase per volta. Non iniziare la fase N+1 senza il gate della fase N superato.
2. Ogni gate produce **output di comando incollato**, non un riassunto.
3. Se un comando fallisce: fermarsi, riportare l'errore esatto, proporre **una**
   ipotesi di causa. Mai "aggirare" un errore cambiando obiettivo.
4. Un commit per fase, messaggio `fase-N: <esito misurato>`.
5. Nessuna cancellazione di codice esistente prima della Fase 8.

---

## 1. Tre correzioni al piano precedente (verificate sui file)

Il piano che mi è stato passato conteneva assunzioni plausibili ma **false**. Vanno
corrette prima di scrivere codice, altrimenti l'agente costruirebbe su sabbia.

### Correzione 1 — Non si crea `Pizzico-v2`. Pizzico è già la casa.

`C:\Progetti\Pizzico` **non è un prototipo**: è un repository con storia git
(commit `a57a067`), deploy web su Cloudflare Pages (`.github/workflows/deploy-web.yml`),
release APK firmata (`.github/workflows/release-apk.yml`), CI (`.github/workflows/ci.yml`),
7 package pnpm, un bridge WASM funzionante e un binario `pizzico_wasm_bindings_bg.wasm`
già prodotto. Pizzart ha un solo workflow.

Creare una terza cartella significherebbe: ricreare deploy, ricreare CI, ricreare la
storia, e mantenere **tre** repository invece di due. La fusione si fa dentro Pizzico:
Pizzico è l'ospite, Pizzart è il donatore di organi.

### Correzione 2 — Il bridge WASM esiste già, con un contratto di ~60 funzioni.

`crates/wasm-bindings/src/lib.rs` (39.956 byte) esporta già, con `#[wasm_bindgen]`:

```
create_document(width, height)            add_raster_layer(name, w, h, color) -> u64
get_composite_buffer() -> Vec<u8>         get_layers_metadata() -> JsValue
set_layer_opacity(id, opacity)            set_layer_visibility(id, visible)
select_layer(id) / remove_layer(id)       get_active_layer_id()
begin_stroke/brush_stroke/eraser_stroke/end_stroke
undo() / redo() / can_undo() / can_redo() / get_history_info()
begin_move_layer/move_active_layer/translate_active_layer/end_move_layer
set_selection/clear_selection/has_active_selection/get_selection
load_psd_bytes/export_as_png/export_as_jpeg/export_as_webp/export_as_psd
save_project/load_project                 init_webgpu(canvas_id)
```

Il piano precedente proponeva di creare `pizzico-wasm` con `Document::new(width, height)`
e `Layer::raster(...)`: **quelle firme non esistono**. Il costruttore reale è
`Document::new(width, height, title)` e non esiste alcun `Layer::raster`.
Scrivere un bridge nuovo significa buttare 60 KB di codice funzionante e rompere la
UI TypeScript che ci parla sopra. Il bridge **non si riscrive: si reindirizza**.

### Correzione 3 — Il motore Pizzart compila già per WASM. Non è "desktop-first".

Misurato ora, con `cargo check --target wasm32-unknown-unknown`:

| Crate Pizzart | Esito | Tempo |
|---|---|---|
| `pizzart-core` | ✅ compila | 5,9 s |
| `pizzart-draw` | ✅ compila | 2,3 s |
| `pizzart-text` (cosmic-text 0.12) | ✅ compila | 4 m 03 s |
| `pizzart-render` (wgpu 23) | ✅ compila | 8 m 07 s |
| `pizzart-io` (image, zune-jpeg) | ✅ compila | 2 m 01 s |
| `pizzart-project` (zip + zstd) | ❌ fallisce | `zstd-sys` richiede un compilatore C (`clang`) |

Il piano precedente prevedeva settimane di "adattamento WASM". Serve **un solo
adattamento**: escludere `pizzart-project`. Tutto il resto è pronto.

### Correzione 4 — Le specifiche sono state recuperate e archiviate (decisione del proprietario)

Il commit `81bcffb` (*"Licenza MIT e spec ripulite dai dump dell'APK"*) rimosse
`docs/spec/effetti.json`, `effetti.md`, `glossario.md`, `schermate.json`, `schermate.md`
trattandoli come "dump". **La classificazione era sbagliata**, e il proprietario ha
ragione: quei documenti si autodichiarano aggregati — «300 elementi: 119 effetti,
109 parametri, 72 enum», e *non* formule, valori, range, shader, LUT o asset. Sono
**fatti**, cioè l'output legittimo di un'analisi clean-room, non espressione protetta.

Stato attuale:

- recuperati **byte per byte** da `81bcffb~1` (dimensione identica ai blob git)
- conservati in `_archivio-personale/4-spec-aggregate/` (cartella esclusa da git)
- una **seconda copia rigenerata** esiste già in `_estrazione/spec_archivio/`
- hash e verifica in `_archivio-personale/MANIFEST.md`

Conseguenza per il piano: la fusione **può usare** il catalogo degli effetti come
capitolato di prodotto (quali effetti, come si chiamano, quante famiglie), perché
sono dati di fatto. Quello che **non** se ne può trarre è *come* implementarli:
formula, intensità e range restano da progettare. Il divieto precedente
(«non ripristinare») era un eccesso di cautela: decade.

---

## 2. Stato misurato (la linea di base)

Comandi eseguiti e relativi esiti reali, da riconfermare in Fase 0.

```
cargo check -p pizzico-wasm-bindings --target wasm32-unknown-unknown
  → Finished dev profile in 1m 16s            ✅ (baseline verde)

rustup target list --installed
  → wasm32-unknown-unknown, x86_64-pc-windows-msvc
cargo 1.99.1
```

### 2.1 Peso reale dei due motori (byte di sorgente Rust)

| Dominio | Pizzico | Pizzart | Lettura |
|---|---:|---:|---|
| core | 42.009 | 132.299 | Pizzart ~3× più profondo (mask, node/group, transform, compositor) |
| render | 6.590 | 120.519 | **Pizzart ~18×**: Pizzico ha solo uno shader rettangolo |
| text | 1.593 | 29.800 | Pizzart ~19×: cosmic-text con layout, registry e cache glyph |
| draw / raster | 24.145 (raster) | 36.543 (draw) | Pizzart ha dirty rect (200 ms → 1,3 ms) |
| selection | 5.740 | 13.000 (in core) | Pizzart: lasso + ellisse + AA 4×4 |
| project | — (io-native) | 36.419 | formati diversi, vedi D3 |
| color | **48.882** | 0 | **solo Pizzico** |
| ui | 52.616 TS + 32.370 TS package | 67.314 egui | linguaggi diversi |

### 2.2 Test

| Repository | `#[test]` nel codice |
|---|---:|
| Pizzart | **254** |
| Pizzico | **62** |

I 254 test di Pizzart sono, da soli, la ragione più forte per trapiantare il motore
invece di riscriverlo: sono la specifica eseguibile del comportamento atteso.

### 2.3 Cosa è già dichiarato funzionante in Pizzico (con milestone documentate)

- Fase 0 — WASM compilato (`docs/milestones/fase-0.md` + screenshot)
- Step H — persistenza `.pizzico` + OPFS (5/5 test)
- Step I-1 — export PNG/JPEG/WebP (5/5 test)
- Deploy Cloudflare Pages con header COOP/COEP (`apps/web/public/_headers`)

### 2.4 Lacune di Pizzico che Pizzart colma (da `docs/audit/consolidamento-2026-10-25.md`)

| Crate Pizzico | Lacuna | Cosa porta Pizzart |
|---|---|---|
| `pizzico-render` | solo shader rettangolo, nessun compositing | `composite.wgsl` con 12 blend modes, parità CPU/GPU ≤ 2/255 |
| `pizzico-selection` | stub senza lasso/ellisse | `selection.rs`: Rect/Ellipse/Lasso con AA 4×4 |
| `pizzico-text` | solo shaping, nessun layout | cosmic-text: multiline, bidi, fallback, `FontRegistry` |
| `pizzico-core` | nessuna mask | `mask.rs`: alpha 8bpp, `MaskSource`, sampling |
| — | nessun effetto | `effects.wgsl`: brightness/contrast/saturate/blur/sharpen/glow + CPU reference |
| `pizzico-raster` | pennello senza dirty rect | dirty rect: 200 ms → 1,3 ms |

### 2.5 La Fase 1 è già stata provata (non è un'ipotesi)

Prima di scrivere questo piano ho eseguito il trapianto **in un'area usa-e-getta**
(`target/plan-probe/`, dentro `target/` che è già in `.gitignore`): copiati i 5 crate,
rinominati i package `pizzart-*` → `pizzico-engine-*`, riscritti i riferimenti
`pizzart_core` → `pizzico_engine_core`, creato un `Cargo.toml` di workspace con lo
**stesso** `[workspace.package]` di Pizzico (`license = "MIT OR Apache-2.0"`, edition 2021).

```
cargo check --workspace --offline
  → Finished dev profile in 7m 09s        EXITCODE=0
```

Conclusione: la procedura della Fase 1 funziona alla lettera, compresa
l'ereditarietà di `version.workspace` / `edition.workspace` / `license.workspace`.
Non serve nessun adattamento di licenza nei `Cargo.toml`.

**Nota operativa emersa dalla prova**: un workspace nuovo non ha `Cargo.lock`, quindi
`cargo` vuole aggiornare il registro. In assenza di rete la build fallisce con
`SSL connect error ... download of config.json failed`. Rimedio: copiare il
`Cargo.lock` del donatore e usare `--offline`, oppure avere rete al primo resolve.

#### Esito reale della suite di test sul trapianto

```
pizzico-engine-core  unit     99 passed
pizzico-engine-core  integrazione layer_ops  19 passed
pizzico-engine-draw  unit     22 passed
pizzico-engine-io    unit     10 passed, 1 FAILED
```

L'unico fallimento **non è un difetto del codice**:

```
test export::tests::encode_di_immagine_1920x1080_entro_il_tempo
panicked: JPEG 1920x1080 in 6.0890218s: troppo lento (misurato ~330 ms)
```

È un test di prestazioni. In debug la soglia è già rilassata 10× (`600 ms × 10 = 6,0 s`)
e la misura è **6,089 s**: sforata dell'1,5%. In release la stessa codifica dichiara
~330 ms contro un budget di 600 ms. Il test è sensibile all'hardware, non al porting.

Verificato eseguendo la stessa suite in release:

```
cargo test -p pizzico-engine-io --release --offline
  → 11 passed; 0 failed     (+ 1 test di integrazione: 1 passed)
  → EXITCODE=0
```

**Conseguenza per il piano**: i gate che devono essere verdi sempre si eseguono in
debug; i test di prestazioni si eseguono in `--release`. Un gate che chiede "254 test
verdi in debug" sarebbe un gate scritto male.

---

## 3. Matrice di riciclo — verdetto per componente

Legenda: 🟢 trapianto diretto · 🟡 trapianto con adattamento · 🔵 resta dov'è (è già
il migliore) · 🔴 non entra.

### 3.1 Da Pizzart (`C:\Progetti\picsart-cl\pizzart`)

| Componente | Verdetto | Destinazione | Note |
|---|---|---|---|
| `crates/core` (14 file, 132 KB) | 🟢 | `crates/engine/core` | zero dipendenze, WASM ✅ |
| `crates/draw` (36,5 KB) | 🟢 | `crates/engine/draw` | WASM ✅ |
| `crates/text` (29,8 KB) | 🟢 | `crates/engine/text` | cosmic-text WASM ✅ (misurato) |
| `crates/render` (120,5 KB + 2 WGSL) | 🟡 | `crates/engine/render` | WASM ✅; il bind group va accordato al canvas di `wasm-bindings/src/gpu` |
| `crates/io` (18,8 KB) | 🟡 | `crates/engine/io` | WASM ✅; WebP è solo lossless, Pizzico ha lossy via `image` |
| `crates/project` (36,4 KB) | 🔴 | — | zstd = C, non compila per WASM. Vedi D3 |
| `crates/ui` (67,3 KB egui) | 🟡 | — (riferimento) | il **codice** non si porta; `state.rs` (26,6 KB) è la specifica del comportamento |
| `crates/ui/src/state.rs` | 🟡 | `crates/session` (Fase 3) | `Editor`: undo, drag opacità, blend, merge, selezione→mask, `apply_effect` |
| `docs/ARCHITECTURE.md` | 🟢 | `docs/pizzart/` | contiene le misure di memoria (1,87 GB su 24 MP) |
| `docs/DEVLOG.md` (24,4 KB) | 🟢 | `docs/pizzart/` | storia delle decisioni, incluse quelle sbagliate |
| `docs/REPORT_UI_20261025.md` (25,8 KB) | 🟢 | `docs/pizzart/` | **riferimento di design** per la Fase 6 |
| `docs/FASE_2_SPEC.md` | 🟢 | `docs/pizzart/` | specifica della fase 2 |
| `LICENSE` (MIT) | 🟢 | `NOTICE.md` | attribuzione obbligatoria |
| 254 test | 🟢 | restano nei crate | regressione gratuita |
| `docs/spec/*` | 🟢 | `_archivio-personale/4-spec-aggregate/` | aggregati (fatti), recuperati da git: usabili come capitolato |
| `target/` | 🔴 | — | artefatti |

### 3.2 Da Pizzico (resta in casa)

| Componente | Verdetto | Note |
|---|---|---|
| `crates/color` (48,9 KB, moxcms, ICC, OkLab) | 🔵 | unico pezzo che Pizzart non ha; 16 test |
| `crates/io-psd` (parser + writer) | 🔵 | 21 test, serve il target "fotografico" |
| `crates/io-native` (formato `.pizzico`, ZIP+DEFLATE) | 🔵 | funziona in web+OPFS (Step H 5/5); vedi D3 |
| `crates/wasm-bindings` (60 KB) | 🔵 | contratto JS confermato: si reindirizza, non si riscrive |
| `apps/web` (`main.ts` 52 KB, `storage.ts`) | 🔵 | orchestratore reale: export, autosave, PSD drag&drop, selezione |
| `packages/ui-web` (`layout.ts` 19,4 KB + CSS 12,9 KB) | 🟡 | base da ristilizzare secondo Pizzart (Fase 6) |
| `packages/ui-mobile` (1,7 KB) | 🔴→🟡 | è un bottom-sheet embrionale: va costruito in Fase 7 |
| `packages/{shared,ui-kit,command-palette,worker-core}` | 🔵 | infrastruttura |
| `apps/tauri` + `tauri.conf.json` | 🔵 | base APK |
| `crates/{core,raster,render,text,selection,commands}` | 🟡 | restano finché il motore nuovo non ha parità (Gate G5), poi si ritirano |
| `crates/{inpainting,vector,io-svg}` | 🔵 | non toccati da questa fusione |
| `.github/workflows/*` (3) | 🔵 | già operativi |
| `docs/algorithms/*` (25 schede) | 🟢 | valore documentale, resta |
| `picsart-cl/` annidata e **untracked** | 🔴 | copia non versionata: va rimossa (Fase 0) |

---

## 4. Architettura target

```
┌──────────────────────────────────────────────────────────────────────┐
│  apps/web  (TypeScript, 52 KB)        apps/tauri (desktop + APK)     │
│  UI: packages/ui-web · ui-mobile · ui-kit                            │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ contratto JS INVARIATO (60 funzioni)
┌───────────────────────────────▼──────────────────────────────────────┐
│  crates/wasm-bindings   (wasm-bindgen, gpu/render.rs → init_webgpu)  │
│  adattatore: traduce le chiamate JS nei tipi del motore              │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│  crates/session   (NUOVO, wasm-safe, no std::path)                   │
│  Documento attivo + History + Tool + selezione + drag               │
│  = porting semantico di pizzart/crates/ui/src/state.rs               │
└──────┬───────────────────────────────────────────────┬───────────────┘
       │                                               │
┌──────▼──────────────────────────┐   ┌────────────────▼───────────────┐
│  MOTORE (da Pizzart)            │   │  SERVIZI (già in Pizzico)      │
│  crates/engine/core             │   │  crates/color   (ICC, OkLab)   │
│  crates/engine/draw             │   │  crates/io-psd  (PSD)          │
│  crates/engine/render (wgpu 23) │   │  crates/io-native (.pizzico)   │
│  crates/engine/text (cosmic)    │   │  crates/inpainting, vector     │
│  crates/engine/io               │   │                                │
└─────────────────────────────────┘   └────────────────────────────────┘
```

### Decisioni architetturali (da registrare come ADR)

**D1 — Prefisso e collocazione.** I crate trapiantati diventano `pizzico-engine-*`
in `crates/engine/*`. Il prefisso `pizzico-engine-` evita la collisione con
`pizzico-core`, che resta in vita fino a G5. Gli path relativi di Pizzart
(`path = "../core"`) continuano a funzionare perché i crate restano fratelli.

**D2 — Contratto JS stabile.** Nessuna funzione del bridge cambia nome o firma.
Il motore nuovo entra dietro il flag di feature `engine-v2` (default: spento fino a
G5). La UI TypeScript non deve accorgersi di nulla: se si accorge, è un bug.

**D3 — Il formato progetto resta `.pizzico`.** Non si adotta `.pizzart`: usa `zstd`
(codice C) e non compila per WASM — misurato. `.pizzico` (ZIP+DEFLATE, `crates/io-native`)
già funziona nel browser con OPFS e ha 5/5 test. Il trapianto di `pizzart-project`
è escluso dal piano, non rimandato.

**D4 — Pipeline RGBA8, colore ai bordi.** Si adotta la decisione già presa in
`pizzart/docs/ARCHITECTURE.md`: si resta su RGBA8 con `PixelFormat` come punto di
indirezione. La gestione colore di Pizzico (moxcms) agisce **in import/export**, non
per pixel durante il blend.

**D5 — Un solo livello di stato.** La semantica di `pizzart/ui/state.rs` diventa il
crate `pizzico-session`, condiviso da web e desktop. Niente doppia implementazione
della logica undo/selezione in Rust (bridge) e in TypeScript (UI).

**D6 — Budget di memoria esplicito.** `pizzart/docs/ARCHITECTURE.md` misura
**1,87 GB** di working set su 24 MP con 5 effetti. Su Android WebView è OOM garantito.
Vincolo: su mobile il documento è limitato a **≤ 8 MP** con proxy di anteprima alla
risoluzione del viewport; il full-res si materializza solo all'export.

---

## 5. Fasi

Stime in **sessioni di lavoro dell'agente** (1 sessione ≈ 2-4 h effettive), non in
giorni-uomo.

### Fase 0 — Igiene, baseline, fotografia dello stato

**Obiettivo**: partire da un repository pulito e misurabile. Nessuna funzionalità.

**Azioni**
1. Rimuovere la copia annidata e non versionata di Pizzart:
   `C:\Progetti\Pizzico\picsart-cl` (risulta `?? picsart-cl/` in `git status`).
   La copia canonica resta `C:\Progetti\picsart-cl\pizzart`, che è fuori dal repo.
   *Prima di cancellare*: verificare che i due alberi siano identici al commit `cc5f419`.
2. Creare il tag di sicurezza: `git tag fusione-punto-zero`.
3. Registrare le misure (§2) in `docs/audit/baseline-fusione.md`, con i comandi.
4. Scrivere `NOTICE.md` integrando l'attribuzione MIT di Pizzart.

**Comandi**
```powershell
cd C:\Progetti\Pizzico
git status --short                      # deve mostrare solo ?? picsart-cl/
git -C C:\Progetti\Pizzico\picsart-cl\pizzart rev-parse HEAD
git -C C:\Progetti\picsart-cl\pizzart rev-parse HEAD   # devono coincidere: cc5f419
git tag fusione-punto-zero
```

**Gate G0**
- `git status --short` non mostra più `picsart-cl/`
- `cargo check -p pizzico-wasm-bindings --target wasm32-unknown-unknown` → Finished
- `docs/audit/baseline-fusione.md` esiste e contiene output reali
- **Rollback**: `git reset --hard fusione-punto-zero`

**Stima**: 1 sessione.

---

### Fase 1 — Trapianto additivo del motore

**Obiettivo**: i crate di Pizzart vivono dentro Pizzico e compilano per il target
nativo. Nessun collegamento al bridge. Il repository deve restare verde.

**Azioni**
1. Creare `crates/engine/`.
2. Copiare `core`, `draw`, `text`, `render`, `io` (NON `project`, NON `ui`).
3. Rinominare i package `pizzart-*` → `pizzico-engine-*` in ogni `Cargo.toml`.
4. Rinominare i riferimenti nel codice Rust `pizzart_core` → `pizzico_engine_core`
   (e gli altri).
5. Aggiungere i 5 crate a `members` del workspace root.
6. Copiare la documentazione in `docs/pizzart/` e la LICENSE in `docs/pizzart/LICENSE`.

**Comandi**
```powershell
cd C:\Progetti\Pizzico
$src = "C:\Progetti\picsart-cl\pizzart\crates"
$dst = "crates\engine"
New-Item -ItemType Directory -Force -Path $dst | Out-Null

foreach ($c in @("core","draw","text","render","io")) {
    Copy-Item -Recurse -Force "$src\$c" "$dst\$c"
    Remove-Item -Recurse -Force "$dst\$c\target" -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force "$dst\$c\examples" -ErrorAction SilentlyContinue
}

# rinomina package e path di dipendenza
Get-ChildItem $dst -Recurse -Filter Cargo.toml | ForEach-Object {
    (Get-Content $_.FullName -Raw) `
        -replace 'pizzart-core',  'pizzico-engine-core'  `
        -replace 'pizzart-draw',  'pizzico-engine-draw'  `
        -replace 'pizzart-text',  'pizzico-engine-text'  `
        -replace 'pizzart-render','pizzico-engine-render' `
        -replace 'pizzart-io',    'pizzico-engine-io'    |
      Set-Content $_.FullName -NoNewline
}

# rinomina i riferimenti nel codice
Get-ChildItem $dst -Recurse -Filter *.rs | ForEach-Object {
    (Get-Content $_.FullName -Raw) `
        -replace 'pizzart_core',  'pizzico_engine_core'  `
        -replace 'pizzart_draw',  'pizzico_engine_draw'  `
        -replace 'pizzart_text',  'pizzico_engine_text'  `
        -replace 'pizzart_render','pizzico_engine_render' `
        -replace 'pizzart_io',    'pizzico_engine_io'    |
      Set-Content $_.FullName -NoNewline
}
```

Poi aggiungere a mano a `Cargo.toml` root, dentro `members`:
```toml
    "crates/engine/core",
    "crates/engine/draw",
    "crates/engine/text",
    "crates/engine/render",
    "crates/engine/io",
```

E copiare la documentazione che serve alle fasi successive (Fase 6 legge il report UI):

```powershell
$psrc = "C:\Progetti\picsart-cl\pizzart"
New-Item -ItemType Directory -Force -Path "docs\pizzart" | Out-Null
foreach ($f in @("ARCHITECTURE.md","DEVLOG.md","FASE_2_SPEC.md","REPORT_UI_20261025.md")) {
    Copy-Item -Force "$psrc\docs\$f" "docs\pizzart\$f"
}
# LICENSE sta nella root di pizzart, non in docs/
Copy-Item -Force "$psrc\LICENSE" "docs\pizzart\LICENSE"

# verifica che il riferimento di design esista davvero
Get-ChildItem docs\pizzart | Select-Object Name, Length
```
Se `REPORT_UI_20261025.md` non fosse presente, **la Fase 6 non parte**: il design
reference è un prerequisito, non un'opzione.

**Attenzione**: i crate usano `version.workspace = true` — compatibile con
`[workspace.package]` di Pizzico, che ha `version`, `edition`, `license`, `authors`.
Il `license` ereditato sarà `MIT OR Apache-2.0` mentre il codice è MIT: è
compatibile, ma `NOTICE.md` deve dichiararlo.

**Gate G1**
```powershell
# compilazione nativa di tutti i crate trapiantati
cargo check -p pizzico-engine-core -p pizzico-engine-draw -p pizzico-engine-text `
            -p pizzico-engine-render -p pizzico-engine-io

# test funzionali (debug): devono essere tutti verdi tranne i test di prestazioni
cargo test -p pizzico-engine-core -p pizzico-engine-draw -p pizzico-engine-text --offline

# test con soglie di performance: solo in release
cargo test -p pizzico-engine-io --release --offline
```
- `cargo check` → Finished
- `cargo test` (debug) → **140 test verdi attesi**: 99 core unit + 19 core integrazione
  + 22 draw; `text` aggiunge i suoi
- `cargo test --release` su `io` → 11/11 verdi

Il numero esatto va **misurato e scritto** in `docs/audit/baseline-fusione.md`, non
copiato da questo piano: i conteggi dipendono dal profilo.

**Stima**: 1 sessione. **Rollback**: `git reset --hard` (i crate sono solo aggiunti).

---

### Fase 2 — Gate WASM sui crate trapiantati

**Obiettivo**: dimostrare con misure ripetibili che il motore trapiantato è
utilizzabile nel browser, e che l'unico escluso è `project`.

**Comandi**
```powershell
$env:CARGO_TARGET_DIR = "C:\Progetti\Pizzico\target\probe-engine"
foreach ($p in @("pizzico-engine-core","pizzico-engine-draw","pizzico-engine-text",
                 "pizzico-engine-render","pizzico-engine-io")) {
    Write-Host "### $p"
    cargo check -p $p --target wasm32-unknown-unknown --message-format short
    Write-Host "EXIT=$LASTEXITCODE"
}
```

**Gate G2**
- 5/5 crate → `EXIT=0`
- Esiti registrati in `docs/audit/baseline-fusione.md`
- Se uno fallisce: **fermarsi** e documentare l'errore. Non toccare `Cargo.toml`
  a caso: riportare la dipendenza che rompe e l'errore esatto.

**Nota misurata**: `pizzico-engine-render` impiega ~8 minuti a freddo per il target
WASM. Non interpretare la lentezza come blocco.

**Stima**: 1 sessione (il tempo è quasi tutto di compilazione).

---

### Fase 3 — Crate `pizzico-session` (il "tesoro" reso portabile)

**Obiettivo**: estrarre la semantica di `pizzart/crates/ui/src/state.rs` in un crate
WASM-safe, senza `std::path` e senza `std::fs`.

**Perché**: `state.rs` contiene la logica vera dell'editor (drag opacità con
`begin/update/end`, `merge_down`, `apply_selection_as_mask`, `apply_effect`,
`push_point`/`finish_stroke`). È scritto contro i tipi di Pizzart e usa `Path`,
quindi non si compila per WASM così com'è — ma è la **specifica** di cosa deve fare
la sessione.

**Azioni**
1. Creare `crates/session` (`pizzico-session`), membro del workspace.
2. Portare i tipi: `Tool`, lo stato del drag, la selezione in corso.
3. Sostituire ogni I/O con un trait: `trait AssetSource { fn read(&mut self, id) -> Vec<u8> }`.
   Nessuna funzione della sessione apre file.
4. Lasciare fuori (per ora): `open_image`, `save_project`, `export_png` — sono
   responsabilità del bridge, che già le espone.
5. Portare i test di `state.rs` che riguardano la logica (non quelli che toccano il disco).

**Gate G3**
```powershell
cargo test -p pizzico-session
cargo check -p pizzico-session --target wasm32-unknown-unknown
```
- test verdi; check WASM → Finished
- Nessuna occorrenza di `std::fs` o `std::path` nel crate:
  `Select-String -Path crates\session\src\*.rs -Pattern 'std::fs|std::path'` → nessun risultato

**Stima**: 2 sessioni.

---

### Fase 4 — Reindirizzamento del bridge dietro flag

**Obiettivo**: `crates/wasm-bindings` parla al motore nuovo, ma solo con la feature
`engine-v2` attiva. Il contratto JS resta identico.

**Azioni**
1. In `crates/wasm-bindings/Cargo.toml` aggiungere:
   ```toml
   [features]
   engine-v2 = ["pizzico-engine-core", "pizzico-engine-render"]
   ```
   con le dipendenze engine dichiarate `optional = true`.
2. Nel codice, incapsulare l'accesso al documento dietro un modulo `engine`:
   ```
   src/engine/mod.rs      // trait EngineBackend
   src/engine/legacy.rs   // pizzico-core di oggi
   src/engine/v2.rs       // pizzico-engine-core
   ```
3. `src/lib.rs` non cambia firma: chiama `EngineBackend`.
4. Compilare entrambe le configurazioni:
   ```powershell
   cargo check -p pizzico-wasm-bindings --target wasm32-unknown-unknown
   cargo check -p pizzico-wasm-bindings --target wasm32-unknown-unknown --features engine-v2
   ```

**Gate G4**
- Entrambe le configurazioni → Finished
- Il `.d.ts` generato con `engine-v2` espone **le stesse** funzioni del `.d.ts` legacy.
  Verifica: confronto dei due file, nessuna funzione mancante.
  ```powershell
  wasm-pack build crates/wasm-bindings --target web --out-dir ../../packages/worker-core/pkg-legacy
  wasm-pack build crates/wasm-bindings --target web --out-dir ../../packages/worker-core/pkg-v2 -- --features engine-v2
  Compare-Object (Select-String -Path packages\worker-core\pkg-legacy\*.d.ts -Pattern 'export function (\w+)' |
      ForEach-Object { $_.Matches.Groups[1].Value }) `
    (Select-String -Path packages\worker-core\pkg-v2\*.d.ts -Pattern 'export function (\w+)' |
      ForEach-Object { $_.Matches.Groups[1].Value })
  ```
  → nessuna differenza (`Compare-Object` non stampa nulla)

**Stima**: 3 sessioni. **Rischio**: medio — è il punto in cui due modelli di dati
(`Layer`/`LayerContent` di Pizzico vs `Layer`/`Node` di Pizzart) si incontrano.

---

### Fase 5 — Parità misurata (la fase che autorizza il resto)

**Obiettivo**: dimostrare che il motore nuovo produce **le stesse immagini** del
vecchio, entro tolleranza dichiarata. Senza questo gate, la Fase 8 non esiste.

**Azioni**
1. Creare `tests/parity/` con 8 documenti di riferimento costruiti **da codice**
   (non da file binari dell'APK): tinta unita, gradiente, 3 layer con opacità,
   blend multiply, mask, testo, selezione rettangolare, ellisse sfumata.
2. Per ciascuno: composito con motore legacy e con `engine-v2`, confronto pixel.
3. Tolleranza: **max 2/255 per canale** (la stessa che Pizzart dichiara per la
   parità CPU/GPU) e **0 pixel con ΔE > 2** misurato con `pizzico-color`.
4. Registrare l'esito in `docs/audit/parita-motore.md`.

**Gate G5**
- 8/8 documenti entro tolleranza
- suite del motore trapiantato verde: `--offline` in debug per i test funzionali,
  `--release` per `pizzico-engine-io` (test di performance)
- 62 test di Pizzico ancora verdi
- Se un documento non passa: **non** allargare la tolleranza. Isolare il caso,
  capire quale blend/mask/text differisce, riportarlo.

**Stima**: 2-3 sessioni. Questo è il gate più importante del piano.

---

### Fase 6 — UI: adottare il linguaggio visivo di Pizzart

**Obiettivo**: la UI web deve "sentire" come Pizzart, **senza** essere riscritta da zero.

**Cosa non fare**: buttare `apps/web/src/main.ts` (52 KB di orchestrazione reale:
export, autosave, drag&drop PSD, selezione, toast, spinner) e `packages/ui-web/src/layout.ts`
(19,4 KB di struttura). Sono 70 KB di UI funzionante.

**Azioni**
1. Leggere `docs/pizzart/REPORT_UI_20261025.md` (25,8 KB): è il resoconto di design
   di Pizzart, con le scelte di densità, pannelli e toolbar.
2. Mappare i componenti Pizzart → componenti esistenti:

   | Pizzart (egui) | Pizzico (TS) | Azione |
   |---|---|---|
   | `panels.rs` — pannello layer | `layout.ts` → `LayersPanel` | ristilizzare, non riscrivere |
   | `app.rs` — toolbar + top bar | `layout.ts` → `Toolbar` | ristilizzare |
   | `canvas.rs` — canvas + zoom | `main.ts` → canvas + `init_webgpu` | mantenere |
   | `tools.rs` — enum strumenti | `main.ts` → cursori/bottoni | allineare i nomi |
   | `dialogs.rs` — dialoghi | toast/spinner esistenti | mantenere |
   | `state.rs` | ora è `pizzico-session` | **già fatto in Fase 3** |

3. Allineare i token visivi in `packages/ui-kit` ai valori di Pizzart (densità,
   spaziature, scala tipografica), non copiare colori a caso.
4. Nessuna nuova dipendenza UI (no React/Svelte): la shell è DOM diretto.

**Gate G6**
- `pnpm --filter @pizzico/app-web build` → build verde
- `pnpm typecheck` → 0 errori
- Screenshot prima/dopo salvati in `docs/ui/`, con la lista delle differenze volute
- **Nessuna** funzione del bridge chiamata diversamente

**Stima**: 3-4 sessioni.

---

### Fase 7 — Mobile e APK (dove i conti si pagano)

**Obiettivo**: la stessa build gira su Android senza OOM.

**Azioni**
1. Applicare D6: limite documento ≤ 8 MP su mobile, proxy di anteprima.
2. Costruire la UI mobile vera: `packages/ui-mobile` oggi è 1,7 KB. Serve bottom sheet
   per layer/strumenti, gesti touch, toolbar compatta.
3. Test di memoria: aprire 8 MP con 3 effetti e misurare l'heap WASM.
4. `apps/tauri`: verificare che `tauri.conf.json` punti alla build web corrente.

**Gate G7**
- APK installato su emulatore/device: apertura immagine, un effetto, export PNG
- Nessun crash per OOM sul caso 8 MP + 3 effetti
- Dimensione APK registrata; heap WASM misurato e scritto nel report

**Stima**: 4-6 sessioni. È la fase con più incognite reali.

---

### Fase 8 — Switch, ritiro, pulizia

**Obiettivo**: `engine-v2` diventa l'unico motore.

**Azioni**
1. `engine-v2` diventa default; rimuovere il flag.
2. Cancellare `crates/{core,raster,render,text,selection,commands}` **solo** se
   nessun crate residuo li importa (verifica con `cargo tree -i`).
3. Attenzione: `crates/io-native`, `io-psd`, `wasm-bindings`, `raster` (brush) hanno
   dipendenze su `pizzico-core`. Il ritiro richiede una mappatura delle dipendenze,
   non un `Remove-Item`.
4. Aggiornare `docs/STATO-PROGETTO.md` e `NOTICE.md`.

**Gate G8**
- `cargo check --workspace` e `cargo check --workspace --target wasm32-unknown-unknown` verdi
- deploy Cloudflare verde
- nessun crate orfano: `cargo metadata` senza errori

**Stima**: 2 sessioni.

---

## 6. Regole anti-bluff

1. **Vietato dichiarare "completato" senza output.** Ogni gate si chiude incollando
   il comando e le ultime righe reali.
2. **Vietato inventare API.** Prima di scrivere una chiamata, `Select-String` sul
   file per verificare che la funzione esista con quella firma.
3. **Vietato allargare le tolleranze** per far passare un test di parità.
4. **Vietato "sistemare" un errore di compilazione cambiando l'obiettivo** (es.
   togliendo una feature, commentando un test).
5. **Vietato riscrivere la UI da zero.** 70 KB di TypeScript funzionante sono un
   asset, non un debito.
6. **Vietato confondere aggregati e dump**: il catalogo degli effetti (nomi, conteggi,
   famiglie) è un fatto e si può usare; formule, valori, shader e LUT non esistono e
   non vanno cercati. Il divieto riguarda la **copia**, non la conoscenza.
7. Se una fase richiede meno di 5 minuti, è stata eseguita male: rileggerla.

---

## 7. Rischi

| # | Rischio | Prob. | Impatto | Mitigazione |
|---|---|---|---|---|
| R1 | Due modelli `Layer` incompatibili (Pizzico `LayerContent`/`LayerKind` vs Pizzart `Node`/`Group`) | Alta | Alto | Fase 4 con `EngineBackend` trait; parità G5 prima di toccare la UI |
| R2 | Bind group di `pizzart-render` incompatibile con il canvas di `gpu/render.rs` | Media | Medio | Fase 2 verifica solo compilazione; l'accordo runtime si misura in G5 |
| R3 | OOM su mobile con documenti grandi | Alta | Alto | D6: cap 8 MP, proxy anteprima, misura in G7 |
| R4 | `pizzico-session` duplica logica già nel bridge | Media | Medio | D5: una sola implementazione; il bridge diventa adattatore sottile |
| R5 | Il wasm binario cresce oltre il ragionevole (oggi 558 KB) | Media | Basso | misurare a ogni fase; `opt-level="z"` + `wasm-opt -Oz` già configurati |
| R6 | Licenza/attribuzione incompleta (Pizzart è MIT, non MIT OR Apache) | Bassa | Alto | Fase 0: `NOTICE.md` + `docs/pizzart/LICENSE` |
| R7 | Regressione silenziosa nel formato `.pizzico` | Bassa | Alto | Step H ha 5/5 test: restano nel gate G8 |
| R8 | Test di prestazioni sensibili all'hardware (fallisce in debug per 89 ms) | Alta | Basso | eseguirli in `--release`; mai allargare la soglia per "farli passare" |
| R9 | Primo resolve senza rete: build bloccata su `download of config.json failed` | Media | Medio | copiare il `Cargo.lock` del donatore e usare `--offline`, oppure rete al primo resolve |
| R10 | Aggiunta di 5 crate al workspace = tempi di build più lunghi (render 8 min a freddo) | Alta | Basso | `CARGO_TARGET_DIR` dedicato, misure a freddo documentate |

---

## 8. Cosa non fare (elenco esplicito)

- ❌ Creare `C:\Progetti\Pizzico-v2` o qualunque terzo repository.
- ❌ Scrivere un crate `pizzico-wasm` nuovo: il bridge esiste.
- ❌ Adottare `.pizzart`/zstd: non compila per WASM.
- ❌ Copiare `crates/ui` di Pizzart (egui non è portabile sul web).
- ❌ Copiare `crates/project` di Pizzart.
- ❌ Riscrivere `apps/web/src/main.ts` da zero.
- ❌ Cancellare i crate legacy prima di G5.
- ❌ Trattare le specifiche aggregate come materiale illecito: non lo sono.
- ❌ Fondere i due repository in un monorepo unico con due `[workspace]`.

---

## 9. Registro ADR da creare

| ADR | Titolo | Deciso in |
|---|---|---|
| 0004 | Pizzico è il repository ospite; Pizzart è donatore | Fase 0 |
| 0005 | Prefisso `pizzico-engine-*` e collocazione `crates/engine/*` | Fase 1 |
| 0006 | Contratto JS congelato; motore dietro feature flag | Fase 4 |
| 0007 | Formato progetto: `.pizzico` (ZIP+DEFLATE), non `.pizzart` (zstd) | Fase 0 |
| 0008 | Pipeline RGBA8, gestione colore in import/export | Fase 5 |
| 0009 | Budget memoria mobile: 8 MP, proxy anteprima | Fase 7 |

---

## 10. Criterio di "fuso"

La fusione è conclusa quando, **contemporaneamente**:

1. `cargo test --workspace` è verde, con i 254 test di Pizzart dentro;
2. `cargo check --workspace --target wasm32-unknown-unknown` è verde;
3. 8/8 documenti di parità entro 2/255;
4. il sito Cloudflare Pages si apre e disegna un tratto, con il motore nuovo;
5. l'APK si installa e apre 8 MP con 3 effetti senza crash;
6. `docs/audit/parita-motore.md` e `NOTICE.md` sono aggiornati.

Il punto 4 è quello che l'utente vede. I punti 1-3 sono quelli che gli permettono di
fidarsi del punto 4.

---

## Appendice A — Inventario completo delle fonti

```
C:\Progetti\Pizzico                       ospite (git, CI, deploy, UI, color, PSD)
C:\Progetti\picsart-cl\pizzart            donatore (motore, test, doc, design)
C:\Progetti\Pizzico\picsart-cl\pizzart    duplicato NON versionato → rimuovere (Fase 0)
C:\Progetti\Pizzico\progetti da aggregare\  ZIP di terzi: fuori da questo piano
C:\Progetti\Pizzico\docs\_legacy\         dump APK/Photopea: rischio legale, non toccare
```

## Appendice B — Comandi di misura da rieseguire a ogni fase

```powershell
cd C:\Progetti\Pizzico

# 1. stato workspace nativo
cargo check --workspace

# 2. stato WASM del bridge (baseline: 1m 16s, exit 0)
cargo check -p pizzico-wasm-bindings --target wasm32-unknown-unknown

# 3. WASM del motore trapiantato
$env:CARGO_TARGET_DIR = "C:\Progetti\Pizzico\target\probe-engine"
cargo check -p pizzico-engine-core -p pizzico-engine-draw -p pizzico-engine-text `
            -p pizzico-engine-render -p pizzico-engine-io --target wasm32-unknown-unknown

# 4. frontend
pnpm typecheck
pnpm --filter @pizzico/app-web build

# 5. test
cargo test --workspace

# 6. dimensione wasm
Get-ChildItem packages\worker-core\pkg\*.wasm | Select-Object Name, Length
```
