# P0-E — Hardening report

Data: 2026-10-28
Stato: **fermato in diagnosi**, nessun tag e nessuna release. `v0.1.2` resta
prerelease.

## Obiettivo

Capire e chiudere i due blocchi riportati sul device — touch non funzionante e
import PSD rotto — senza aggiungere fix speculativi, e lasciare un gate che
copra i flussi interattivi.

## Cosa è stato misurato

| Verifica | Esito | Evidenza |
| --- | --- | --- |
| Parser PSD con il WASM reale | **OK**: 800×600, 3 livelli | test Node su `apps/web/public/sample-01.psd` |
| Import dalla UI (menu File → Apri PSD → file chooser) | **OK** | E2E Chromium mobile, run `40699622848` |
| Tratto con eventi touch reali (CDP) | **OK**: `undo` da disabilitato ad abilitato | stesso run |
| `touch-action` del canvas | **`none`** | assert nell'E2E |
| WASM sotto la CSP di Tauri | **OK**: `WASM Rust v100 pronto` | run `40683387745` e successivi |
| Build di test `0.1.3` | **OK**: `versionName 0.1.3`, `versionCode 1003` | run `40683828709`, sha256 `d8f8d7e6…7343` |
| GitHub: branch default | `master` | `gh repo view` |
| GitHub: permessi workflow | default `read` | `gh api .../actions/permissions/workflow` |
| GitHub: draft release | nessuna | `gh release list` |

Il gate E2E esteso è nel commit `9d5874db4`: apre il file chooser dal menu,
importa un PSD con nome distinto (`e2e-import.psd`), poi esegue
`touchStart/Move/End` via CDP su viewport 390×844 e verifica che la history
passi da vuota a piena. Gira in CI con Playwright e la CSP reale di Tauri.

## Cosa non è stato riprodotto

Nel codice condiviso, **import e touch funzionano**. I fallimenti riportati sul
device non sono quindi nel percorso che i test coprono: sono specifici di
Tauri/Android WebView, del file usato, o della build testata.

Non ho applicato fix "a caso" su touch/import: con questa evidenza avrebbero
solo aggiunto variabili.

## Aggiornamento — evidenza dal device (0.1.3)

Il device conferma: `WASM Rust v100 pronto`, `WebGPU attivo`, canvas con il
documento visibile. Quindi le ipotesi “build 0.1.2” e “fallback Canvas2D” sono
**smentite**. Restano:

- il tocco non disegna sul canvas. **Il pulsante flottante non è una prova**:
  `FloatingActionBar` viene creato in `layout.ts` (righe 310-314) con tre item
  senza `onClick`, quindi è inerte per costruzione. Il sospetto resta
  canvas-only: overlay sopra il canvas o pointer non consegnati dalla WebView;
- import che non produce effetti su web e mobile.

## Ipotesi aperte

1. **Hit-testing sul canvas (mobile).** Un overlay trasparente sopra l'area del
   canvas (o una mancata consegna dei `pointer` nella WebView) spiegherebbe
   perché il tratto non parte. Il logger `[P0E] pointerdown` stampa `target` e
   `elementFromPoint`: se `hit` non è il canvas, l'overlay è identificato.
2. **Import web.** Il bundle live è aggiornato (`index-NNwDmTzs.js`), il menu
   è cablato (`onOpenPsd: () => J.click()`) e gli input sono nel DOM. Se il
   click umano non apre il picker, il log `[P0E]` distingue: handler non
   invocato, picker non aperto, oppure file scelto ma parser fallito.
3. **File PSD specifico.** Il parser funziona sul sample; un PSD con feature
   non supportate può lanciare un errore. Serve il file (o il testo esatto del
   toast “Errore parsing PSD: …”).
4. **File picker Tauri/Android.** Wry implementa `onShowFileChooser`
   (`src/android/kotlin/RustWebChromeClient.kt`), quindi il picker dovrebbe
   aprirsi; se non si apre, serve il log della WebView.

## Evidenza che serve per chiudere

- **Web (F12)**: click File → Apri PSD e incollare le righe `[P0E]`:
  `menu: Apri PSD`, `PSD scelto`, `import PSD`; più eventuali errori rossi.
- **Mobile (`chrome://inspect` via USB)**: eseguire lo snippet qui sotto e
  toccare canvas e pulsante flottante; incollare `[P0E] pointerdown` con
  `target`/`hit`.
- la riga `[P0E] navigator.gpu` e `[WebGPU]` (attivo o fallback);
- il file PSD che fallisce, se l'import è file-specifico.

Snippet per la WebView (nessuna build necessaria, funziona sull'APK già
installato):

```js
(() => {
  const d = (el) => el ? `${el.tagName.toLowerCase()}${el.id ? '#'+el.id : ''}` +
    (typeof el.className === 'string' && el.className ? '.'+el.className.trim().replace(/\s+/g,'.') : '') : 'null';
  document.addEventListener('pointerdown', (e) => {
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    console.log('[P0E-live]', e.pointerType, 'target', d(e.target), 'hit', d(hit), e.clientX, e.clientY);
  }, true);
  document.querySelectorAll('input[type=file]').forEach((i) => {
    console.log('[P0E-live] input', i.accept, i.isConnected, getComputedStyle(i).display);
    i.addEventListener('change', () => console.log('[P0E-live] change', i.files?.[0]?.name));
  });
  document.querySelector('#open-psd-btn')?.addEventListener('click', () => console.log('[P0E-live] open-psd click'));
  window.addEventListener('drop', (e) => console.log('[P0E-live] drop', e.dataTransfer?.files?.[0]?.name), true);
  console.log('[P0E-live] pronto');
})();
```

## Pulizia e audit fatti

- rimossi asset orfani verificati con grep: `packages/ui-kit/tokens/logo.svg`,
  `docs/ui/features/brand-topbar.png`, `github-readme.png`,
  `github-readme-release.png`;
- `docs/ADR/README.md` allineato: ADR-0002 puntato in `docs/ui/`, 0004/0007
  dichiarati assenti;
- GitHub già in ordine: default `master`, permessi workflow `read`, nessuna
  draft release.

## Debiti aperti

- **Fallback Canvas2D reale**: se WebGPU manca, oggi il canvas è statico. Un
  renderer 2D che usi `get_composite_buffer()` renderebbe l'editor usabile
  anche senza WebGPU. Da decidere solo dopo il log del device.
- **CI parity Tauri**: manca un job che esegua
  `cargo check -p pizzico-tauri --features tauri/custom-protocol` (vedi
  `docs/audit/verifiche-locali-vs-ci.md`).
- **Log device automatizzati**: il gate E2E non può vedere la WebView Android;
  il test su device resta manuale.
- **ADR 0004/0007**: nessun record; se erano decisioni reali vanno ricostruite,
  altrimenti restano gap documentati.

## Nessun tag

`v0.1.2` resta prerelease. La build `0.1.3` è solo un artefatto CI: il tag si
crea quando il device conferma i fix e l'evidenza sopra è completa.
