# Checkpoint — 2026-10-29 (P1-Arch, Gate 3)

- **Branch:** `arch/p1-tool-registry`
- **HEAD:** `c660c622b` (`docs(audit): record the signed APK and its checksum`)
- **Tag:** `checkpoint-p1-arch-gate3` (annotated, su questo commit)
- **Stato:** Gate 1, 2 e 3 chiusi; Gate 4 pianificato

## Cosa contiene il checkpoint

| Gate | Contenuto | Evidenza |
| --- | --- | --- |
| 1 | Comandi byte-exact + catalogo `pizzico-tools` validato | [`p1-arch-gate-1.md`](p1-arch-gate-1.md) |
| 2 | Ponte WASM, tipi TypeScript, parità sul compilato | [`p1-arch-gate-2.md`](p1-arch-gate-2.md) |
| 3 | Inspector generato dallo schema, E2E, APK firmato | [`p1-arch-gate-3.md`](p1-arch-gate-3.md) |

APK del Gate 3: `scratch/apk/universal/release/pizzico-0.1.5-android.apk`
(38 353 891 byte, SHA-256 `4ec8b5f0…f08bc6b`), dal run CI
[40926446626](https://github.com/marcorzzn/pizzico/actions/runs/40926446626).

## Flusso locale ↔ GitHub

Problemi trovati e corretti:

1. **Remote con maiuscola** (`Pizzico.git`) su un repository che ora si chiama
   `pizzico`: GitHub rispondeva con un redirect a ogni operazione. URL normalizzato
   in minuscolo.
2. **TLS schannel** (`SEC_E_NO_CREDENTIALS`) su fetch/push: il backend OpenSSL
   funziona. Impostato `http.sslBackend=openssl` nel config locale del repository.
3. **Branch senza upstream**: `arch/p1-tool-registry` era stato pushato con un URL
   esplicito e non tracciava `origin`. Ora `git status` mostra
   `...origin/arch/p1-tool-registry`.
4. **Default branch su GitHub = `main`**, mentre lo sviluppo vive su `master` e
   `origin/main` era fermo a un commit vecchio. Default cambiato a `master` via API;
   `origin/HEAD` aggiornato.
5. **Credential helper**: resta quello globale di `gh`. Da un terminale normale
   funziona; dentro il sandbox DSH la push richiede il workaround con URL token
   (shell del helper bloccata), non una configurazione del repository.

Verifica: `git status -sb` pulito, `git branch -vv` con upstream corretto,
`origin/HEAD -> origin/master`.

## Pulizia eseguita

Rimossi (tutti ignorati da git, nessun file tracciato):

- 99 elementi in `scratch/`: vecchie cartelle di screenshot, script one-off,
  messaggi di commit, backup WASM e `main.before.ts`;
- `packages/worker-core/pkg-legacy/` e `pkg-v2/` (artefatti della verifica 4.2,
  ~5 MB complessivi);
- `apps/web/dist/` (build rigenerabile);
- l'APK stallo `pizzico-0.1.1-android.apk` dentro l'artifact;
- la cache npm di `playwright-core`.

Conservati:

- `scratch/apk/universal/release/pizzico-0.1.5-android.apk` (+ checksum): serve per
  la prova sul device;
- `scratch/pw/` (`playwright-core`): serve per l'E2E locale con Chrome di sistema;
- `docs/_legacy/` (archivio storico, ignorato);
- `target/` (10,8 GB di cache di build): non cancellato perché rallenterebbe ogni
  build successiva. Se serve spazio, `cargo clean` è l'operazione esplicita.

## Comandi di ripartenza

```bash
git switch master
git pull                     # master locale = origin/master
git switch arch/p1-tool-registry
git pull                     # il branch traccia origin

cargo test --workspace
node tests/tool-catalog.mjs
node tests/wasm-roundtrip.mjs
```

La build web e il test E2E richiedono, in questo ambiente, l'avvio fuori sandbox
(esbuild/Chrome usano stdio piped):

```bash
node node_modules/vite/bin/vite.js build          # da apps/web
PLAYWRIGHT_MODULE=... PLAYWRIGHT_CHANNEL=chrome node tests/e2e/wasm-runtime.mjs
```

## Prossimo passo

Gate 4: toolbar generata dal catalogo + strumento fittizio (`vignette`) visibile e
regolabile senza toccare `main.ts`, con il seam di esecuzione ancora da chiudere.
