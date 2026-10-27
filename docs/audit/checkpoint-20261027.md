# Checkpoint globale — 2026-10-27

Analisi di sola lettura prima della Sessione 1-A-bis. Nessun file modificato, nessun
comando git di scrittura eseguito. L'unico artefatto è questo documento, lasciato
**non committato** di proposito.

## Executive summary

Il progetto è **sano**: build e test verdi (263 test, 0 falliti), CI verde sugli ultimi
dieci run, nessun segreto nei file tracciati, nessun commit locale non push. Non ci sono
blocchi di sicurezza.

Ci sono però **due problemi da chiudere prima di 1-A-bis** e un gruppetto di rifiniture:
il repository locale è **indietro di un commit** rispetto al remoto (una modifica al README
fatta da GitHub), e il README promette «Download the latest APK» verso una release che
**non ha allegati**. Nessuno dei due è grave, entrambi sono visibili o bloccanti.

---

## Fase 1 — Repository git

| Voce | Esito | Severità |
| --- | --- | --- |
| Working tree | Pulito: nessun modificato, nessun untracked | — |
| Commit locali non push | **Nessuno** (`HEAD == origin/master` fino al fetch di oggi) | — |
| Branch | `master` locale; remoti `origin/master`, `origin/main`; `origin/HEAD -> origin/main` | **media** |
| Tag | `fusione-punto-zero`, `gruppo2-punto-partenza`, `v0.1.0-alpha`: locali e remoti allineati | — |
| Remote | `github.com/marcorzzn/Pizzico.git` (corretto) | — |
| Stash | Nessuno | — |
| Dimensione `.git` | `size-pack` **484,47 MiB**, 76 954 oggetti in pack, 546 loose | bassa (sotto i 500, ma vicino) |

**Segnalazioni.**

1. **Il repository locale è indietro di un commit.** Dopo `git fetch`:
   `origin/master` = `4d6a9dcfb "Update README.md"`, locale = `d7bb93100`. La modifica è
   tua, fatta dall'interfaccia GitHub, e tocca proprio il logo del README:
   ```diff
   -  <img src="./packages/ui-kit/tokens/logo.svg" alt="pizzico logo" ... />
   +  <img src="docs/brand/icona-pizzico.png" alt="pizzico logo" ... />
   ```
   È una correzione reale: nel README che avevo aggiornato il logo puntava ancora al **vecchio**
   asset `packages/ui-kit/tokens/logo.svg`, non all'icona nuova. Va integrata con un `git pull`
   prima di aprire 1-A-bis, altrimenti il primo commit della sessione parte da una base
   divergente.
2. **Il branch di default su GitHub è `main`, non `master`.** `origin/HEAD` punta a `main`,
   che non è il branch di sviluppo. Se un giorno Cloudflare o qualcuno clonasse il default,
   otterrebbe lo stato sbagliato. Da decidere: allineare il default a `master` (azione sulla
   UI di GitHub, non automatica).
3. **`.git` a 484 MB**: sotto la soglia di allerta, ma il peso è alto per un repo di codice.
   Cause probabili: `sample-01.psd` (1,9 MB) e i PNG dei documenti storici, più la storia dei
   traguardi. Non serve `gc` ora; da tenere d'occhio.

---

## Fase 2 — Salute del build

| Comando | Esito | Tempo |
| --- | --- | --- |
| `cargo check --workspace` | **OK**, 1 warning (`rustversion`, crate vendored) | 18 s |
| `cargo check --workspace --target wasm32-unknown-unknown` | **OK** | 77 s |
| `cargo test --workspace --lib` | **263 passati, 0 falliti, 0 ignorati**, 19 suite | 353 s |
| `pnpm typecheck` (ricorsivo) | **fallisce: `spawn EPERM`** | — |
| `pnpm --filter … typecheck` (6 pacchetti) | **tutti OK** (shared, ui-kit, ui-web, worker-core, command-palette, app-web) | — |
| `pnpm --filter @pizzico/app-web build` | **fallisce: `spawn EPERM`** (vite/esbuild) | — |
| pkg WASM tracciato | 561 255 byte, 27/10 19:06, contiene `crop_document` | — |

**Il fallimento di typecheck e build è ambientale, non del progetto**: il sandbox di questa
macchina impedisce ai processi figli (vite, esbuild, pnpm annidato) di partire. La CI esegue
gli stessi comandi su Linux e gli ultimi dieci run sono verdi.

**wasm stale?** Non verificabile qui: `wasm-pack` non riesce a lanciare `cargo` in questo
ambiente, e il pkg committato è stato rigenerato a mano (`cargo build` + `wasm-bindgen` +
`wasm-opt`). Non esiste un confronto automatico con l'output di `wasm-pack`. Da trasformare
in un controllo di CI sarebbe utile, ma è una proposta, non un difetto.

---

## Fase 3 — Igiene dei file

| Controllo | Esito | Severità |
| --- | --- | --- |
| Asset totali / non referenziati | 22 / **2** | bassa |
| `.md` duplicati per nome | Solo i `README.md` per cartella (legittimi) | — |
| ADR con numeri duplicati | Nessun duplicato; **numerazione non contigua**: 0001, 0003 in `docs/ADR/`, 0005, 0006; il **0002 vive in `docs/ui/`**, il 0004 non esiste | bassa |
| TODO/FIXME/HACK | **2**, entrambi nel glue generato di wasm-bindgen (`pkg-legacy`, `pkg-v2`) — non nostro codice | — |
| File temporanei sospetti | Solo `Cargo.toml.orig` ×2 in `tools/patches/` (parte dei crate vendored) | — |
| File `.rs` non inclusi da un `mod` | **Controllo inconcludente**: il mio script cerca solo `mod.rs` o il file omonimo della cartella, mentre molti crate dichiarano i moduli in `lib.rs`. Tutti i 78 risultati sono falsi positivi verificabili a campione (`core/src/blend.rs` è dichiarato in `lib.rs`) | — |
| Dipendenze inutilizzate | Non verificato: `cargo machete` non installato | — |

**Asset orfani** (non citati da alcun `.md`):

- `docs/ui/features/brand-topbar.png` — usato in chat, mai in un documento
- `docs/ui/features/github-readme.png` — idem

**Secondo orfano probabile**: `packages/ui-kit/tokens/logo.svg`, dopo che il README è passato
all'icona vera. Da verificare con un grep prima di rimuoverlo (potrebbe essere usato da
un componente).

---

## Fase 4 — Coerenza tra versioni

| Voce | Esito | Severità |
| --- | --- | --- |
| Web `pizzico.pages.dev` | 200, titolo `pizzico — editor grafico`, bundle `index-DdWsDqCi.js` | — |
| Service worker | `pizzico-cache-v2`, **uguale** in produzione e nel sorgente | — |
| Android: ultime run | `40545217346` **success** (16:52, head `53f1afef2`); `40526707596` success (15:00) | — |
| Android: contenuto dell'APK | **Precede il rebrand**: `headSha 53f1afef2`, mentre identifier `app.pizzico` e le icone nuove sono arrivate dopo (`724c200b8`) | **media** |
| Tauri desktop | `cargo check` in `apps/tauri`: **OK** (7,3 s) | — |
| Formato `.pizzico` | Esistono `save_project`/`load_project`, ma **nessun test di round-trip** | **media** |

**Nota sul rebrand Android.** Con `identifier: app.pizzico` il prossimo APK sarà un'app
**diversa** da quella installata (`io.pizzico.app`): non aggiorna, affianca. Va deciso prima
della prossima build se disinstallare o tornare indietro sull'identifier.

---

## Fase 5 — Documentazione

| Voce | Esito | Severità |
| --- | --- | --- |
| README: nome minuscolo | Titolo `pizzico`, intro e Credits corretti | — |
| README: link interni | **9 link locali, 0 rotti** | — |
| README: sezione Status | Riscritta nella sessione precedente, coerente | — |
| `docs/README.md` | Esiste | — |
| `docs/milestones/` | 6 file (`fase-0`, `step-f`, `step-g`, `step-h`, `step-i1`, indice) | — |
| `CHANGELOG.md` | Esiste, 64 righe, formato Keep a Changelog | **media**: non aggiornato alle ultime sessioni |
| `NOTICE.md` | 99 voci; menziona `rustybuzz`. `ab_glyph`/`fontdue` non servono ancora (compaiono solo negli ADR, non sono dipendenze) | — |

Il **CHANGELOG** è la lacuna più visibile: le sessioni del brand, del tema chiaro, dei fix di
repaint e del crop non compaiono. Non è un errore, ma è documentazione che invecchia.

---

## Fase 6 — CI/CD

| Voce | Esito |
| --- | --- |
| Workflow presenti | `ci.yml`, `android-apk.yml` |
| `release-apk.yml` | **rimosso** (sostituito da `android-apk.yml`) |
| Ultimi 10 run | **tutti verdi**; nessun workflow silenziosamente rosso |
| Secrets | `ANDROID_KEY_BASE64`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `ANDROID_KEYSTORE_PASSWORD`: **tutti e quattro presenti**, nessun secret stale |
| Release | `v0.1.0-alpha`, non draft, **asset: nessuno** |

**Il problema della release.** Il README dice «Download the latest APK» e linka
`releases/latest`, ma la release **non contiene l'APK**: gli artefatti restano nei run di
Actions (retention 30 giorni). Chi arriva dalla pagina GitHub non scarica nulla. Severità
**alta** perché è una promessa pubblica non mantenuta.

---

## Fase 7 — Sicurezza e licenze

| Controllo | Esito |
| --- | --- |
| Chiavi private / password nei file tracciati | **Nessuna occorrenza** (patterns `BEGIN * PRIVATE KEY`, `password = "…"`) |
| File con estensione sensibile tracciati | Nessuno (`*.pem`, `*.key`, `*.p12`, `*.jks`, `*.keystore`) |
| `.env` | Presente solo in `docs/_legacy/` ed **è ignorato**; non tracciato |
| `LICENSE-MIT` / `LICENSE-APACHE` | Presenti; copyright allineato a Marco Razzano |
| Audit licenze dipendenze | **Non eseguibile**: `cargo-license`, `cargo-deny`, `cargo-audit` non installati. Esito: **incompleto**, non «nessun problema» |

Nessun blocco di sicurezza.

---

## Candidati da pulire (con approvazione)

| File / cartella | Motivo | Azione proposta | Rischio |
| --- | --- | --- | --- |
| `docs/ui/features/brand-topbar.png` | non referenziato da alcun documento | rimuovi, oppure citalo in `docs/brand/` | basso |
| `docs/ui/features/github-readme.png` | idem | idem | basso |
| `packages/ui-kit/tokens/logo.svg` | probabilmente orfano dopo il rebrand del README | **verificare con grep** e solo allora rimuovere | medio (potrebbe servire a un componente) |
| `packages/worker-core/pkg-legacy/`, `pkg-v2/` | artefatti di verifica della Fase 4, ignorati ma presenti su disco | lasciare: sono in `.gitignore` | zero |

## Candidati da aggiungere

| Cosa | Perché |
| --- | --- |
| `CHANGELOG.md` aggiornato alle ultime sessioni | è la lacuna documentale più visibile |
| Test di round-trip `.pizzico` | il formato si salva e si carica senza una prova automatica |
| Nota in `docs/ADR/README.md` sul 0002 in `docs/ui/` e sul 0004 mancante | evita di cercare un file che non c'è |

## Candidati da sistemare

| Cosa | Severità | Azione |
| --- | --- | --- |
| README: «Download the latest APK» → release senza allegati | **alta** | allegare l'APK alla release, oppure cambiare il link all'artifact del run |
| Locale indietro di 1 commit | **media** | `git pull` prima di 1-A-bis |
| APK precedente al rebrand | **media** | decidere identifier e rigenerare (o disinstallare la vecchia app) |
| Branch default `main` invece di `master` | **media** | cambiare il default su GitHub |
| Nessun test di round-trip `.pizzico` | **media** | scriverlo in una sessione dedicata |
| `.git` a 484 MB | bassa | monitorare |

## Cosa non va toccato

- Tag `fusione-punto-zero`, `gruppo2-punto-partenza`, `v0.1.0-alpha`
- Branch remoti e `origin/main`
- `docs/_legacy/` (archivio personale, ignorato)
- `docs/pizzart/` e `docs/design-pizzart/` (riferimento storico, la casa degli screenshot)
- `packages/worker-core/pkg/` (artefatto necessario al deploy)

## Tag di checkpoint proposto

Solo **dopo** aver integrato il commit remoto e deciso sui punti «alta»:

```bash
git pull                    # porta in locale 4d6a9dcfb
git tag checkpoint-pre-1a-bis
git push origin checkpoint-pre-1a-bis
```

Non propongo di taggare adesso: con il locale indietro di un commit, il tag
fotograferebbe uno stato che non è quello del remoto.
