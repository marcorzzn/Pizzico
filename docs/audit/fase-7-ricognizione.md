# Fase 7 — Ricognizione (APK Android con Tauri)

> Sessione di **sola lettura**: nessun file di codice modificato, nessuna toolchain
> installata. Ogni affermazione qui sotto è stata verificata con un comando il cui esito è
> riportato; dove non ho potuto verificare, è scritto.

## Sintesi

**La Fase 7 parte da zero sul lato nativo.** `apps/tauri` non è uno scaffold funzionante: è
un guscio di quattro file che **non è mai stato compilato** e che oggi non è nemmeno
risolvibile da Cargo. Non esiste sulla macchina alcun componente della toolchain Android.

Il lato web, invece, è **adatto all'incorporamento**: non richiede isolamento cross-origin,
ha un fallback grafico, e il bundle è già producibile.

La stima «3-4 settimane» non era basata su nulla di verificato. Con i dati raccolti,
la stima rivista è nella sezione 5, insieme ai rischi reali.

---

## 1. Stato di `apps/tauri`

Contenuto completo (escluso `target/`, che è vuoto o assente):

| File | Byte |
| --- | --- |
| `apps/tauri/Cargo.toml` | 510 |
| `apps/tauri/tauri.conf.json` | 880 |
| `apps/tauri/src/main.rs` | 352 |
| `apps/tauri/README.md` | 396 |

Non esistono: `build.rs`, `capabilities/`, `icons/`, `src-tauri/`, `gen/android/`, `android/`.

### 1.1 `Cargo.toml`

```toml
[package]
name = "pizzico-tauri"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.0", features = [] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

**Già su Tauri 2**, non su Tauri 1: la preoccupazione su un'API obsoleta non si applica.
Manca però `build.rs`, che `tauri-build` richiede: senza di esso `tauri::generate_context!()`
non trova le risorse generate e la compilazione fallisce.

Manca anche una sezione `[lib]`. Tauri 2 su mobile richiede che il crate sia una
**libreria** (`crate-type = ["staticlib", "cdylib", "rlib"]`) con un binario sottile: oggi è
solo un binario, quindi `cargo tauri android init` dovrà ristrutturare il crate.

### 1.2 `tauri.conf.json`

| Voce | Valore | Valutazione |
| --- | --- | --- |
| `$schema` | `nicepkg/tauri-schema` | **schema di terze parti**, non quello ufficiale Tauri: da sostituire |
| `identifier` | `io.pizzico.app` | valido |
| `frontendDist` | `../web/dist` | corretto (relativo a `apps/tauri` → `apps/web/dist`) |
| `devUrl` | `http://localhost:5173` | coerente con Vite |
| `beforeBuildCommand` | `pnpm --filter @pizzico/app-web build` | corretto |
| `csp` | `default-src 'self' 'unsafe-inline' blob: data:` | permissiva ma coerente con l'app |
| `bundle.icon` | `../web/public/icon.svg` | **formato non adatto al bundler** (servono PNG/ICO/ICNS): va rigenerato con `tauri icon` a partire dall'SVG |
| permessi | assenti | in Tauri 2 i permessi vivono in `capabilities/*.json`, non nel config |

### 1.3 `src/main.rs`

Binario minimo: `tauri::Builder::default().run(generate_context!())`. Nessun plugin,
nessuna configurazione mobile.

### 1.4 Il crate non è nel workspace

`apps/tauri` **non è tra i `members`** del `Cargo.toml` radice. Le conseguenze, verificate:

```
$ cargo check -p pizzico-tauri --offline
error: package ID specification `pizzico-tauri` did not match any packages

$ cd apps/tauri && cargo metadata --no-deps --offline
error: current package believes it's in a workspace when it's not:
current:   C:\Progetti\Pizzico\apps\tauri\Cargo.toml
workspace: C:\Progetti\Pizzico\Cargo.toml
```

E `tauri` **non compare nel `Cargo.lock`** (0 occorrenze di `name = "tauri"`,
`name = "tauri-build"`, `name = "tauri-plugin*"`): le dipendenze non sono mai state
risolte. Questo crate non è mai stato compilato, su nessuna piattaforma.

### 1.5 Trappola: aggiungerlo al workspace rompe la CI verde

La CI esegue:

```
cargo check --workspace --all-targets
cargo test --workspace
```

Oggi passa perché `apps/tauri` è fuori dal workspace. **Aggiungerlo ai `members` come prima
cosa renderebbe rossa la CI immediatamente**, per tre motivi indipendenti: manca `build.rs`,
l'icona è un SVG, e su `ubuntu-latest` servirebbe `webkit2gtk` per compilare Tauri desktop.

Due strade, da decidere prima di toccare il file radice:

| Opzione | Effetto | Costo |
| --- | --- | --- |
| **A (consigliata)** tenere `apps/tauri` fuori dal workspace, con una tabella `[workspace]` vuota nel suo `Cargo.toml` | la CI resta com'è; il crate si compila solo nel workflow APK | si perde la copertura CI su quel crate |
| B aggiungerlo ai `members` | `cargo check` copre anche Tauri | CI più lenta di parecchi minuti e da dotare di `webkit2gtk` |

---

## 2. Toolchain Android sul sistema

Verificato sulla macchina, **niente installato**.

| Componente | Stato | Comando / evidenza | Cosa serve |
| --- | --- | --- | --- |
| `rustc` / `cargo` | ✅ 1.99.1 | `rustc --version` | — |
| **JDK** | ❌ assente | `java` non trovato, `JAVA_HOME` vuoto | JDK 17 ([Adoptium](https://adoptium.net/)) |
| **Android SDK** | ❌ assente | `ANDROID_HOME` e `ANDROID_SDK_ROOT` vuoti; `%LOCALAPPDATA%\Android\Sdk` inesistente | SDK via [Android Studio](https://developer.android.com/studio) o `cmdline-tools` |
| **Android NDK** | ❌ assente | nessuna cartella `ndk` | NDK (r26+ consigliata) |
| **Rust target Android** | ❌ assenti | `rustup target list --installed` → solo `wasm32-unknown-unknown`, `x86_64-pc-windows-msvc` | `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android` |
| **Tauri CLI** | ❌ assente | `cargo tauri --version` → `no such command: tauri` | `cargo install tauri-cli --version "^2"` o `pnpm add -D @tauri-apps/cli` |
| `@tauri-apps/cli` nel progetto | ❌ assente | nessun riferimento nei `package.json` | idem |
| Node / pnpm locali | ⚠️ v24.14.1 / pnpm 11.2.2 | `node -v`, `pnpm -v` | il workflow usa **node 20 / pnpm 9**: allineare |

Riferimento ufficiale: <https://v2.tauri.app/start/prerequisites/>

**Nessun componente della toolchain Android è presente.** Non è un «forse serve aggiornare il
JDK»: non c'è nulla da aggiornare.

---

## 3. Compatibilità delle dipendenze

Il controllo richiesto (`cargo check --target aarch64-linux-android`) non è eseguibile: il
target non è installato e il crate non è risolvibile. Quest'ultimo punto rende la domanda
prematura: prima va reso compilabile per l'host.

### 3.1 Cosa manca perché il crate compili (host, Windows)

| Mancanza | Effetto |
| --- | --- |
| `build.rs` con `tauri_build::build()` | `generate_context!()` non trova le risorse |
| `[lib] crate-type = ["staticlib","cdylib","rlib"]` + `src/lib.rs` | `tauri android init` non può generare il progetto Android |
| `capabilities/default.json` | nessun permesso IPC in Tauri 2 |
| icone raster (`32x32.png`, `128x128.png`, `icon.icns`, `icon.ico`) | `tauri build` fallisce sul bundle |
| appartenenza/estraneità al workspace dichiarata | Cargo rifiuta il pacchetto |

### 3.2 Dipendenze problematiche per Android

| Dipendenza | Rischio | Nota |
| --- | --- | --- |
| `wgpu` (via `pizzico-render`) | **Alto, ma fuori dal crate Tauri** | il crate Tauri non dipende dal motore Rust: l'app è la SPA web dentro la WebView. Se un giorno si volesse il rendering nativo, servirebbe Vulkan sull'NDK |
| `tauri 2` | Medio | compila su Android ma richiede NDK + target; versioni recenti cavalcano bene |
| `webkit2gtk` | Solo Linux desktop | non riguarda l'APK, ma riguarda la CI se si adotta l'opzione B |
| patch `crates-io` (`rustversion`, `autocfg`) | Basso | sono copie complete degli upstream (1.0.23 / 1.5.1), non stub: nessun problema atteso |

### 3.3 Il punto che conta davvero: l'app è web, dentro una WebView

Il crate Tauri **non collega il motore Rust**: carica `apps/web/dist` in una WebView. Quindi
il nucleo del rischio non è Rust, è **cosa succede al WASM e a WebGPU dentro la WebView
Android**. Ho verificato il lato applicativo:

| Verifica | Esito | Conseguenza |
| --- | --- | --- |
| `SharedArrayBuffer` / `Atomics` / `crossOriginIsolated` | **nessun riferimento** | l'app è WASM **a thread singolo**: non serve COOP/COEP, che una WebView con asset locali non applicherebbe comunque. **Questo elimina il rischio più temuto** |
| WebGPU | `navigator.gpu` assente in molte WebView Android | esiste un **fallback Canvas2D** (`main.ts:1469`): l'app parte, ma la composizione passa dalla CPU |
| Prestazioni del fallback | **non verificabile senza dispositivo** | è la vera incognita della Fase 7 |
| OPFS | `main.ts` usa OPFS con fallback IndexedDB | su WebView Android OPFS esiste ma con regole di storage diverse: da provare |
| Asset locali | `frontendDist` embeds i file | niente server HTTP: eventuali fetch relativi funzionano, ma non ci sono header |

---

## 4. Strategia di build

### 4.1 Workflow `release-apk.yml`

Esiste, è su Tauri 2 e ha la forma giusta: JDK 17 (zulu), `setup-android`, i quattro target
Rust Android, pnpm e Node 20. **Ma il passo di build è un segnaposto commentato:**

```yaml
      - name: Build Android APK
        run: |
          echo "Building signed Android APK via Tauri 2..."
          # cargo tauri android build --apk
```

Il file stesso dichiara un secondo problema: `android-actions/setup-android@v3` fallisce
sulle immagini runner attuali (cerca il pacchetto `tools` legacy rimosso). È già limitato a
`workflow_dispatch` per non produrre run rossi. Quindi: **il workflow non è utilizzabile
così com'è**, va aggiornato insieme alla toolchain.

### 4.2 Firma

Nessun keystore nel repository (`*.keystore`, `*.jks`, `*.p12`: nessun risultato). La firma
va creata e gestita come segreto CI:

| Cosa | Stato | Note |
| --- | --- | --- |
| Keystore | ❌ assente | `keytool -genkey` o Android Studio; **non va committato** |
| Password/aliasi | ❌ assenti | da mettere nei *secrets* GitHub |
| Config di firma in Tauri | ❌ assente | `bundle.android` in `tauri.conf.json` + variabili d'ambiente in CI |

Riferimento: <https://v2.tauri.app/distribute/sign/android/>

### 4.3 Prerequisiti locali

`apps/web/dist` **esiste** già in locale, quindi il `frontendDist` ha una sorgente. Ma il
build del web app non è eseguibile in questo ambiente (`vite build` → `spawn EPERM` su
esbuild): ogni rigenerazione va fatta via Cloudflare o su un'altra macchina. Per la Fase 7
questo significa che il ciclo «modifica UI → guarda sull'emulatore» richiede di sistemare il
build locale prima.

---

## 5. Rischi, stima e sequenza

### 5.1 Cosa è pronto

| Area | Prontezza | Evidenza |
| --- | --- | --- |
| Web app (UI, motore WASM, PSD, export) | ✅ pronta | in produzione, Fase 6 chiusa |
| Assenza di requisiti COOP/COEP | ✅ eliminato un rischio | nessun `SharedArrayBuffer` |
| Fallback grafico senza WebGPU | ✅ esiste | `main.ts:1469` |
| Config Tauri 2 di base | ⚠️ parziale | versione giusta, forma incompleta |
| Crate compilabile | ❌ no | due errori Cargo riprodotti |
| Toolchain Android | ❌ no | nulla installato |
| Firma e release | ❌ no | nessun keystore, workflow segnaposto |

In sintesi: **il prodotto web è pronto, il contenitore nativo non esiste.**

### 5.2 Stima rivista

La stima «3-4 settimane» non era basata su dati. Con quelli sopra:

| Blocco | Contenuto | Stima |
| --- | --- | --- |
| **A. Toolchain** | JDK 17, SDK, NDK, 4 target Rust, CLI Tauri; verifica con un `cargo check` Android | 1 sessione (installazione guidata, non automatica in questa sessione) |
| **B. Crate valido** | `build.rs`, `lib.rs` + `[lib]`, `capabilities/`, icone raster, schema ufficiale, decisione workspace (A o B) | 1 sessione |
| **C. Primo APK debug** | `tauri android init`, `cargo tauri android build --debug`, apertura su emulatore | 1-2 sessioni (dipende da quanto Tauri 2.0 è indietro rispetto all'ultima 2.x) |
| **D. Verifica funzionale su emulatore** | PSD, brush, export, autosave, GPU fallback, performance | 1-2 sessioni |
| **E. Adattamento touch** | bottom sheet al posto del pannello 280px, aree 44px, gesture | 2-4 sessioni |
| **F. Firma e release** | keystore, secrets, workflow reale, APK su GitHub Releases | 1 sessione |
| **G. Dispositivo reale** | installazione e verifica su un telefono | 1 sessione |

**Totale: 8-12 sessioni.** Se «sessione» vale mezza giornata, siamo a **4-6 settimane** di
lavoro part-time, non 3-4. La variabile che può sfondare la stima è **D**: se la WebView
Android non regge il rendering Canvas2D con documenti reali, la Fase 7 diventa un progetto
di ottimizzazione, non un porting.

### 5.3 Rischi principali, in ordine

1. **Prestazioni del fallback Canvas2D** su WebView Android, non verificabile senza
   dispositivo né emulatore: è l'unico rischio che può invalidare l'architettura (non solo
   la pianificazione).
2. **OPFS nella WebView**: su Android le regole di storage sono più restrittive; il fallback
   IndexedDB esiste, ma va provato che i dati sopravvivano.
3. **Tauri 2.0 vs 2.x**: le versioni `2.0` nel `Cargo.toml` risolveranno all'ultima 2.x
   compatibile; potrebbero servire aggiustamenti di API (minori, ma non nulli).
4. **CI**: adottare l'opzione B (workspace) costa `webkit2gtk` e minuti di build su ogni push.
5. **Build web locale bloccato** in questo ambiente: il ciclo di sviluppo su emulatore va
   reso possibile prima di iniziare E.

### 5.4 Sequenza proposta

1. **A** — installare la toolchain (JDK 17, SDK, NDK, target Rust, CLI Tauri). *Manuale: non
   la faccio io in una sessione di sola lettura, e richiede download grossi.*
2. **B** — rendere il crate compilabile per l'host: `build.rs`, `lib.rs`, icone, schema,
   `capabilities/`, e decidere A o B per il workspace (consiglio: `[workspace]` vuoto, così
   la CI resta com'è).
3. **C** — `cargo check --target aarch64-linux-android` (mai eseguito finora), poi
   `tauri android init` e primo APK **debug**.
4. **D** — aprire l'APK su emulatore e verificare: caricamento PSD, tratto, export,
   autosave, comportamento senza WebGPU. **Qui si decide se la stima regge.**
5. **E** — adattamento touch della UI (bottom sheet, 44px, gesture).
6. **F** — keystore, secrets, workflow APK reale, release.
7. **G** — dispositivo reale.

### 5.5 Domande a cui solo tu puoi rispondere

1. **Emulatore o dispositivo reale?** Con un telefono collegato, il punto 4 diventa
   affidabile; con il solo emulatore, le prestazioni grafiche sono poco rappresentative.
2. **Google Play o solo GitHub Releases?** Cambia i requisiti di firma (Play App Signing) e
   la dimensione dell'APK (split per ABI).
3. **Il pannello da 280px va sostituito da un bottom sheet** o basta ridimensionarlo su
   schermi stretti? La prima è più lavoro, la seconda più fedele all'attuale.

---

## Nota di metodo

Questa sessione non ha modificato nulla: nessun file di codice, nessuna installazione.
L'unico file prodotto è questo documento. I due errori Cargo riportati sono testuali, non
parafrasati, e si riproducono con i comandi indicati.

---

## 6. Decisioni prese al termine della ricognizione

Due scelte fatte dal committente alla chiusura di questa sessione. Sono vincolanti per
l'apertura della Fase 7.

1. **Si parte dal blocco B, non da A.** Prima rendere il crate compilabile per l'host
   (`build.rs`, `lib.rs` con `crate-type` mobile, icone raster, `capabilities/`, schema
   ufficiale, e la decisione workspace con `[workspace]` vuoto per non rompere la CI).
   Motivo: non richiede la toolchain Android, quindi si verifica subito con `cargo check` su
   Windows. L'installazione della toolchain (blocco A) resta a carico del committente e può
   avvenire in parallelo senza bloccare.
2. **La verifica funzionale si farà su dispositivo reale**, non solo su emulatore. Motivo:
   è l'unico modo per rispondere alla domanda aperta — «il fallback Canvas2D regge un
   documento reale su WebView Android?» — che è anche l'unica che può invalidare
   l'architettura e non solo la pianificazione.

Restano aperte, da decidere più avanti: distribuzione su Google Play o solo GitHub Releases
(cambia requisiti di firma e split per ABI) e se il pannello da 280px diventi un bottom
sheet o resti un pannello ridimensionato su schermi stretti.

---

## 7. Eseguito: blocco B (crate compilabile)

Chiuso. `cargo check` lanciato in `apps/tauri` **passa** (tauri 2.12.5, wry 0.57.1,
tao 0.37.2), e `cargo check --workspace` resta verde.

| Intervento | Esito |
| --- | --- |
| `build.rs` con `tauri_build::build()` | fatto |
| `[workspace]` vuota nel crate | risolve l'errore «believes it's in a workspace when it's not» |
| `[lib] crate-type` + `src/lib.rs` con `run()` | fatto, `main.rs` ridotto a un guscio |
| `capabilities/default.json` con `core:default` | fatto (nessun plugin installato: `dialog`/`fs` sarebbero falliti) |
| `tauri.conf.json` sullo schema ufficiale | fatto, più `label: "main"` sulla finestra |
| icone raster flat | fatte (32, 128, 128@2x, 512, `.ico` 7 risoluzioni) |

**Due cose da sapere per la prossima sessione:**

1. **`cargo check -p pizzico-tauri` dal root non funziona, e non deve.** Il crate non è nel
   workspace (scelta deliberata, vedi §6). Il comando giusto è `cd apps/tauri && cargo check`.
2. **`cargo` ha bisogno di rete** per risolvere le dipendenze Tauri, e questo ambiente
   blocca il certificato Windows (`schannel SEC_E_NO_CREDENTIALS`). Il check è passato solo
   con accesso completo al sandbox. In CI il problema non esiste.

**Cosa resta per il blocco C:** toolchain Android (JDK 17, SDK, NDK, quattro target Rust),
`tauri android init`, primo APK debug, verifica su dispositivo reale. Il workflow
`release-apk.yml` esiste ma il passo di build è ancora un commento.

**Nota sulle icone:** `.icns` (macOS) non è stato generato — non serve su Windows e il
target Apple non è in programma. L'SVG in `apps/web/public/icon.svg` ha ancora il gradiente
vietato dall'ADR: le icone native sono state ridisegnate piatte, ma il file sorgente web
andrebbe allineato.
