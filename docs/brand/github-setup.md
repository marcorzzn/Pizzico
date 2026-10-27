# Brand: cosa è automatizzato e cosa va fatto su GitHub

Stato dell'identità visiva dopo l'allineamento. Le voci "manuale" non sono
automatizzabili da repository: vanno fatte una volta nella UI di GitHub.

## Fatto nel repository

| Area | Cosa |
| --- | --- |
| Sorgente | `apps/web/public/icona_pizzico.png` (1254×1254) e copia in `apps/tauri/icons/source.png` |
| Web | `favicon.ico` (16/32/48), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (logo al 60% su `#0a0c10`), `apple-touch-icon.png` (180), `logo-48.png` per la top bar |
| HTML | `apps/web/index.html`: link a png + ico + apple-touch-icon, `theme-color: #0a0c10`, titolo «pizzico — editor grafico» |
| PWA | `apps/web/public/manifest.json`: `name`/`short_name` `pizzico`, icone png, `theme_color`/`background_color` `#0a0c10` |
| App nativa | `apps/tauri/icons/`: 32, 128, 128@2x, 512 e `icon.ico` multi-risoluzione, rigenerati dal PNG con Pillow (`cargo tauri icon` richiede il CLI, non installato in questo ambiente) |
| Tauri | `productName: pizzico`, `identifier: app.pizzico`, `publisher`/`copyright` Marco Razzano |
| Metadata | `package.json` (`name: pizzico`), `Cargo.toml` (autore e repository), `LICENSE-MIT` (copyright Marco Razzano), README (titolo minuscolo, autore, Credits) |
| UI | la top bar usa `/logo-48.png` al posto dell'SVG inline; rimosse `.pz-brand-mark` e `.pz-brand-shape` |

## Da fare a mano su GitHub

1. **Social preview** — Settings → General → *Social preview*: caricare
   un'immagine 1200×630 con l'icona e la scritta «pizzico». È l'unica
   cosa che compare quando il repo viene condiviso.
2. **Avatar del repository/organizzazione** — se il progetto avrà
   un'organizzazione, usare la stessa icona quadrata.
3. **Nome del repository** — oggi `Pizzico`. GitHub tratta il path in
   modo case-insensitive, quindi i link esistenti continuano a
   funzionare; rinominarlo in `pizzico` è cosmetico e romperebbe gli URL
   citati nei documenti e nei badge. Non necessario.
4. **Bio del profilo** — menzionare il progetto, con il link alla demo.
5. **Topics del repository** — `rust`, `wasm`, `webgpu`, `image-editor`,
   `graphics`, `tauri`.

## Note tecniche

- La favicon **vettoriale** non c'è: la sorgente fornita è un PNG. Se in
  futuro arriva un SVG, va aggiunto `favicon.svg` e il `link` nel `<head>`
  (il `.ico` resta come fallback).
- Il cambio di `identifier` in `app.pizzico` cambia il package name
  dell'APK: è un'app **diversa** per Android, quindi un'installazione
  precedente non viene aggiornata ma affiancata. Va disinstallata la
  vecchia, oppure si tiene `io.pizzico.app` finché non si pubblica.
- Le icone Android in `gen/android/app/src/main/res/mipmap-*` non sono
  ancora state rigenerate: `tauri android init` le deriva da
  `apps/tauri/icons/` alla prima build con il nuovo set.

## Verifica

```powershell
# l'icona è servita in produzione?
node -e "fetch('https://pizzico.pages.dev/favicon.ico').then(r=>console.log('favicon', r.status, r.headers.get('content-type')))"
node -e "fetch('https://pizzico.pages.dev/manifest.json').then(r=>r.json()).then(m=>console.log(m.name, m.icons.length, 'icone'))"
```
