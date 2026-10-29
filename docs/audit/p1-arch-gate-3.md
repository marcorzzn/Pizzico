# Sessione P1-Arch — Gate 3

- **Data:** 2026-10-29
- **Branch:** `arch/p1-tool-registry`
- **Ambito:** pannello inspector di pennello e gomma. Toolbar, icone e scorciatoie
  **non sono state toccate**. Nessun tag, nessun merge su `master`.
- **Decisione:** [`docs/ADR/0008-tool-registry.md`](../ADR/0008-tool-registry.md)

## Cosa è cambiato

- Nuovo componente [`apps/web/src/tool-inspector.ts`](../../apps/web/src/tool-inspector.ts):
  riceve un `ToolSchema` e costruisce un controllo per ogni `ParamSpec`
  (`integer`/`float` → slider, `color` → color picker, `boolean` → checkbox,
  `choice` → select). Inizializza ai `default` dello schema.
- [`apps/web/src/main.ts`](../../apps/web/src/main.ts): rimossi i quattro controlli
  cablati e il ramo `currentTool === 'eraser' ? ... : ...`. Il pannello ora è lo
  stesso per ogni strumento con schema; per `move` e `marquee` restano i pannelli
  informativi, per gli strumenti senza schema compare un messaggio esplicito invece
  dei controlli del pennello.
- I valori sono per strumento (`Map<string, ToolParamValues>`): pennello → gomma →
  pennello conserva raggio, durezza e opacità. Il colore esiste solo dove lo schema
  lo dichiara.
- Un solo adattatore (`applyToolValues`) traduce i valori nei quattro globali usati
  dal disegno (`brushRadius`, `brushHardness`, `brushOpacity`, `brushColorRgba`).
  I nomi `size`, `hardness`, `opacity`, `color` sono il contratto dello schema; il
  componente non li conosce.

`main.ts`: **1607 → 1433 righe** (−174), mentre il componente generico è 187 righe
in un file separato.

## Evidenza

Build di produzione (`apps/web/dist`):

```text
vite v5.4.21 building for production...
✓ 37 modules transformed.
dist/assets/pizzico_wasm_bindings_bg-CzlEghIe.wasm  594.97 kB
dist/assets/index-BFcMmjAz.js                        77.21 kB
✓ built in 5.75s
```

Test E2E sul browser reale (Chromium mobile 390×844, touch CDP):

```text
node tests/e2e/wasm-runtime.mjs
  pannello pennello: 4 controlli (20, 80, 100), 1 color picker
  pannello gomma:    3 controlli, 0 color picker
  SMOKE RUNTIME SUPERATO
  badge:  WASM Rust v100 pronto
  canvas: 816x544
```

Il test seleziona `B` e `E` da tastiera, legge il DOM generato
(`#tool-param-panel[data-tool-id]`), confronta numero e tipo di controlli e verifica
che un raggio impostato a 42 sul pennello sopravviva al giro pennello → gomma →
pennello. Il tratto touch successivo usa ancora il pennello e produce storia: il
percorso di disegno non è stato aggirato dal refactor.

TypeScript: `tsc --noEmit` su `apps/web` (e sugli altri sei progetti) esce 0. I test
Rust non sono stati toccati in questo gate.

## Build di test per il device

- Web: `apps/web/dist` è pronta; il bundle contiene il WASM ottimizzato.
- Android: workflow `Android APK` sul branch, run
  [40926446626](https://github.com/marcorzzn/pizzico/actions/runs/40926446626),
  concluso con **success**. I passi `Decode keystore`, `Verify keystore`,
  `Configure Android signing` e `Build APK` sono verdi: l'APK è firmato.
- Artifact `pizzico-apk` (14.4 MB zippato) scaricato in
  `scratch/apk/universal/release/pizzico-0.1.5-android.apk`
  (38 353 891 byte, SHA-256 `4ec8b5f0…f08bc6b`, uguale al `.sha256` del workflow).
- Igiene dell'artifact: contiene anche un vecchio `pizzico-0.1.1-android.apk`
  (27/10). Non è il file da installare; l'upload path della CI dovrebbe essere
  ristretto ai soli output del run corrente. È un follow-up del workflow, fuori
  dal perimetro del Gate 3.
- Installazione: `adb install -r scratch/apk/universal/release/pizzico-0.1.5-android.apk`
  oppure copia sul telefono e apertura diretta (consentire l'installazione da
  sorgenti sconosciute). Se sul telefono esiste la vecchia app con un identifier
  diverso, le due possono convivere.
- Nota ambientale: la build Vite locale richiede l'avvio del servizio esbuild con
  stdio piped, che il sandbox blocca; è stata eseguita una volta con accesso completo.
  La CI non ha questo vincolo. Playwright locale ha usato Chrome di sistema
  (`PLAYWRIGHT_CHANNEL=chrome`) con `playwright-core` in `scratch/` (ignorato da git);
  la CI usa il Chromium installato dal workflow.

## Limiti dichiarati

1. La toolbar resta l'array `TOOLS` cablato in `ui-web`: il catalogo descrive i
   parametri, non ancora l'elenco degli strumenti visibili. Il Gate 4 dovrà generare
   anche la toolbar.
2. L'adattatore di esecuzione conosce i nomi dei parametri del pennello: uno
   strumento nuovo compare nel pannello ma non disegna. Il Gate 4 deve chiudere
   questo debito con lo strumento fittizio.
3. La verifica su device reale dipende dall'APK del run CI; il test locale è
   Chromium con emulazione touch, non una WebView Android.

## Stato dei gate

| Gate | Contenuto | Stato |
| --- | --- | --- |
| 1 | Comandi byte-exact + catalogo validato | chiuso |
| 2 | Ponte WASM + tipi TS + parità sul compilato | chiuso |
| 3 | UI data-driven (pennello/gomma) + E2E | **chiuso in questa sessione** |
| 4 | Strumento fittizio in UI senza toccare `main.ts` | pianificato |
