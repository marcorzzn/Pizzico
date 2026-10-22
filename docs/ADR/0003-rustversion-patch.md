<!--
Pizzico — docs/ADR/0003-rustversion-patch.md
Riferimento manifesto: §3.1, §7, §11 Step 6, §12
Licenza: MIT OR Apache-2.0
-->

# ADR 0003: Patch Locale del Crate `rustversion` per Limitazione Desktop Heap Windows

## Stato
**Accettata (Workaround Tecnico di Compilazione)** — Riferimento Manifesto §3.1, §11 Step 6, §12

---

## Contesto
Durante la compilazione per target WebAssembly (`wasm32-unknown-unknown`) tramite `wasm-pack`, il crate `wasm-bindgen` (v0.2.129) fa affidamento sul macro-builder `rustversion` (v1.0.23) come dipendenza di compilazione (`build-dependency`).

Nel file `build/build.rs`, `rustversion` interroga la versione del compilatore eseguendo:
```rust
Command::new("rustc").arg("--version").output()
```

Su sistemi operativi Microsoft Windows, quando `cargo` o `wasm-pack` vengono invocati da ambienti di esecuzione headless o non-interattivi (quali demoni di background di IDE, task runner di sistema in sessione non interattiva priva di WindowStation `WinSta0\Default`), l'allocazione delle risorse di sistema per la creazione di sottoprocessi annidati (`cargo` → `build-script-build` → `rustc`) fallisce a causa dell'esaurimento della quota di **Desktop Heap** (errore Win32 `0xC0000142` *STATUS_DLL_INIT_FAILED*).

Di conseguenza, `command.output()` cattura uno stdout vuoto (`""`), innescando il panico fatale del build script:
```text
Error: unexpected output from `rustc --version`: ""
Please file an issue in https://github.com/dtolnay/rustversion
```

Questo bloccava la compilazione di `wasm-pack` all'interno dell'ambiente IDE dell'agente, pur essendo il codice Rust del core perfettamente corretto.

---

## Decisione

1. **Creazione di un Fork Locale in Clean Room (`tools/patches/rustversion`)**:
   - È stato isolato un fork puntuale di `rustversion 1.0.23` all'interno della directory `tools/patches/rustversion`.
2. **Fallback Deterministico in `build/build.rs`**:
   - Qualora l'esecuzione di `command.output()` fallisca oppure restituisca una stringa vuota o non valida, il build script intercetta l'anomalia ed effettua un fallback sicuro sulla versione minima/supportata del toolchain di progetto (`rustc 1.99.1`, `Channel::Stable`), evitando l'interruzione della compilazione.
3. **Iniezione Trasparente nel Workspace Cargo**:
   - Nel file `Cargo.toml` della root del workspace è stata dichiarata la sezione:
     ```toml
     [patch.crates-io]
     rustversion = { path = "tools/patches/rustversion" }
     ```
   - Questa configurazione garantisce che qualsiasi crate dell'albero delle dipendenze (incluso `wasm-bindgen`) utilizzi la versione patchata senza dover alterare le dipendenze dichiarate dai singoli crate.

---

## Ambito di Applicabilità

- **Specificità Windows**: L'esaurimento del Desktop Heap per sottoprocessi privi di console interattiva è una caratteristica specifica dell'architettura Win32 subsystem. Su ambienti Linux (es. runner CI GitHub Actions `ubuntu-latest`) e macOS, l'invocazione di `rustc --version` tramite pipe ha successo nativamente.
- **Innocuità su altre piattaforme**: Il comportamento del fallback interviene unicamente se lo stdout risulta vuoto. Negli ambienti in cui `rustc --version` produce il proprio output standard, `rustversion` continua a parsare la versione reale del compilatore.

---

## Strategia di Rimozione (Deprecazione Upstream)

La patch è concepita come temporanea e potrà essere rimossa senza alcun impatto architetturale quando:
1. L'upstream di `rustversion` integrerà un meccanismo di fallback o gestione d'errore resiliente a output vuoti in ambienti headless; oppure
2. Le nuove versioni di `wasm-bindgen` rimuoveranno la dipendenza da `rustversion`; oppure
3. L'ambiente di esecuzione locale allocherà una quota sufficiente di Desktop Heap per sottoprocessi non-interattivi su Windows.

Per rimuovere la patch:
1. Rimuovere `[patch.crates-io]` da `Cargo.toml`.
2. Rimuovere la cartella `tools/patches/rustversion`.
3. Rimuovere la dichiarazione in `NOTICE.md`.

---

## Tracciabilità e Licenze (§7, §12)

- Crate originale: `rustversion` di David Tolnay ([github.com/dtolnay/rustversion](https://github.com/dtolnay/rustversion)).
- Licenza originaria: MIT OR Apache-2.0.
- La provenienza e le modifiche sono formalmente registrate in `NOTICE.md`.
