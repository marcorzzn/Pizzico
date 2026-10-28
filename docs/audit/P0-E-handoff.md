# P0-E — Handoff

Stato al 2026-10-28: nessun tag, nessuna release. `v0.1.2` resta prerelease.
La build `0.1.3` (run `40683828709`, commit `8628ab5c4`) è un artefatto CI, non
una release.

## Cosa è già chiuso

- Gate runtime esteso (`tests/e2e/wasm-runtime.mjs`, commit `9d5874db4`):
  import PSD dal menu, tratto touch via CDP, `touch-action`, CSP, WASM.
- Parser PSD verificato in Node sul sample (3 livelli, 800×600).
- Pulizia orfani e indice ADR.
- Audit GitHub: default `master`, permessi workflow `read`, nessuna draft.

## Cosa manca per chiudere i due bug device

Build confermata: `0.1.3` (run `40683828709`). WASM `v100 pronto` e
`WebGPU attivo` sono verificati dal device; quindi non sono loro la causa.
Serve l'evidenza di routing:

1. **Mobile**: con `chrome://inspect` via USB eseguire lo snippet in
   `P0-E-report.md` e toccare canvas e pulsante flottante. Il log
   `[P0E-live] pointerdown` mostra `target`/`hit`: se `hit` non è canvas/HUD,
   un overlay sta mangiando i tocchi.
2. **Web (F12)**: click File → Apri PSD e incollare `[P0E] menu`, `[P0E] PSD
   scelto`, `[P0E] import PSD` (o l'assenza di queste righe).
3. **File PSD** che fallisce, se l'import è file-specifico, e testo esatto del
   toast “Errore parsing PSD: …”.

## Prossime azioni (in ordine)

1. Se `[P0E-live] hit` è un overlay: rimuoverlo dal flusso o renderlo
   `pointer-events: none`; ricostruire 0.1.4 e testare touch + HUD.
2. Se il click web non logga `[P0E] menu: Apri PSD`: il listener del menu non
   parte; ispezionare l'elemento che copre il pulsante (hit-test) e correggere.
3. Se logga il menu ma non `PSD scelto`: il picker non si apre; verificare
   `input.click()` e `onShowFileChooser` sul device.
4. Se logga `PSD scelto` ma non l'import: errore parser; serve il file.

## Comandi utili

```powershell
gh run download 40683828709 -n pizzico-apk -D $env:TEMP\pizzico-0.1.3
# hash: d8f8d7e64daf6846ac10df6c616fa2db291d176f00fb268206722dc8d7d87343
```

## Regole

- Nessun tag `v0.1.3` finché i due flussi non sono verificati sul device.
- Nessun fix “a caso”: il codice condiviso passa già import + touch in CI.
- `v0.1.2` non va promossa: è la build con il bug CSP.
