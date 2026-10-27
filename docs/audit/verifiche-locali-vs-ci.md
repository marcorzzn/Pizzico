# Le verifiche locali devono usare le stesse feature della CI

Registrato dopo l'errore **RGBA del 2026-10-27**, che è costato un run di CI rosso su un
crate che in locale risultava verde da giorni.

## Il fatto

La build Android della CI esegue:

```
cargo build --package pizzico-tauri --features tauri/custom-protocol --lib --release
```

Io verificavo con:

```
cargo check --package pizzico-tauri          # senza feature
```

Con `tauri/custom-protocol` attiva, `tauri::generate_context!()` **valida le icone del
bundle** (formato, canale alpha). Le icone erano PNG **RGB** — generate con
`Image.open(src).convert('RGB')` — e la macro è andata in panico:

```
error: proc macro panicked
  --> src/lib.rs:12:14
   = help: message: icon .../apps/tauri/icons/32x32.png is not RGBA
```

Senza la feature, la stessa macro non esegue quella validazione: il check locale era verde
e non poteva esserlo di meno.

## La regola

**Una verifica locale vale solo se usa la stessa feature, lo stesso profilo e la stessa
toolchain della CI.** Altrimenti non dice «funziona», dice «compila in una configurazione
che nessuno usa».

Comando corretto per il crate Tauri:

```powershell
cd apps/tauri
cargo check --package pizzico-tauri --features tauri/custom-protocol
```

Per un controllo più vicino alla release: aggiungere `--release`.

## Lo stesso pattern, altrove nel progetto

| Verifica locale | Cosa non copre |
| --- | --- |
| `cargo check` senza `--features` | validazioni attivate solo in release (icone, asset embedded) |
| `pnpm build` su questa macchina | **non gira affatto** (`spawn EPERM`): il bundle è verificato solo dalla CI e in produzione |
| `pnpm typecheck` ricorsivo | idem (`spawn EPERM`); i singoli pacchetti vanno verificati con `--filter` |
| `wasm-pack build` | qui non può lanciare `cargo`; il pkg committato è rigenerato a mano (`cargo` + `wasm-bindgen` + `wasm-opt`), quindi non è byte-identico all'output di `wasm-pack` |

Nessuna di queste è una scusa: sono i punti in cui «verde in locale» non è una prova, e
vanno detti quando si dichiara qualcosa verificato.

## Debito aperto

- Aggiungere in CI un job che esegua `cargo check -p pizzico-tauri --features
  tauri/custom-protocol` a ogni push: il crate è fuori dal workspace, quindi oggi nessun job
  lo tocca e un errore come questo si scopre solo al momento della build APK.
- Valutare un controllo automatico del canale alpha delle icone (il byte 25 dell'IHDR deve
  valere 6): è una riga, e intercetta esattamente questo caso.
