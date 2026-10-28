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

Serve evidenza dalla WebView Android, non dal browser:

1. **Confermare la build**: `0.1.2` (release) o `0.1.3` (run `40683828709`)?
   Con `0.1.2` il bug CSP del WASM spiega sia touch sia import.
2. **Log console** durante gesto e import:
   - `chrome://inspect` via USB, oppure
   - `adb logcat -c`, riprodurre, `adb logcat -d | Select-String "chromium|WASM|WebGPU|PSD"`.
3. **Riga `[WebGPU]`**: `Render loop Rust attivo` o `Fallback a Canvas2D`.
   Se manca WebGPU, il canvas resta statico: non è un bug del touch.
4. **File PSD** che fallisce, se l'import è file-specifico, e testo esatto del
   toast “Errore parsing PSD: …”.

## Prossime azioni (in ordine)

1. Se la build testata era `0.1.2`: installare `0.1.3` e ripetere il test prima
   di scrivere altro codice.
2. Se `0.1.3` e WebGPU è in fallback: decidere se implementare il renderer
   Canvas2D usando `get_composite_buffer()` (debito di prodotto, non touch).
3. Se WebGPU è attivo e il touch non arriva: catturare `pointerType`,
   `pointerId` e `pointercancel` dal device; aggiungere il log solo allora.
4. Se il file picker non si apre: verificare `onShowFileChooser` di wry sul
   device con il log; in caso, passare al plugin dialog.

## Comandi utili

```powershell
gh run download 40683828709 -n pizzico-apk -D $env:TEMP\pizzico-0.1.3
# hash: d8f8d7e64daf6846ac10df6c616fa2db291d176f00fb268206722dc8d7d87343
```

## Regole

- Nessun tag `v0.1.3` finché i due flussi non sono verificati sul device.
- Nessun fix “a caso”: il codice condiviso passa già import + touch in CI.
- `v0.1.2` non va promossa: è la build con il bug CSP.
