# Fase 7-C — workflow Android in cloud: stato

Documento di handoff. Cosa esiste, cosa manca, cosa aspettarsi al primo run.

## Cosa è stato fatto

| Intervento | File |
| --- | --- |
| Workflow APK firmato, con release draft sui tag | [`.github/workflows/android-apk.yml`](../../.github/workflows/android-apk.yml) |
| Rimosso il segnaposto rotto | `release-apk.yml` (cancellato) |
| Guida keystore cloud-only | [`keystore-android-codespaces.md`](keystore-android-codespaces.md) |
| `.gitignore` per output Android e keystore | `.gitignore` |
| `icon.svg` allineato al marchio piatto | `apps/web/public/icon.svg` |

Il workflow **non è stato eseguito**: richiede i secret, che non esistono finché non fai i
passi della guida. Quindi in questo documento non c'è nessun «APK pronto» — c'è un impianto
pronto.

## Perché due scelte non sono quelle «standard»

1. **Niente `android-actions/setup-android`.** Il vecchio `release-apk.yml` portava già la
   nota che quell'action fallisce sulle immagini runner attuali (cerca il pacchetto `tools`
   legacy, rimosso). `ubuntu-latest` arriva con l'SDK in `ANDROID_SDK_ROOT`: il NDK si
   installa con `sdkmanager`, punto.
2. **La firma si costruisce in un file JSON con Python**, leggendo i secret da variabili
   d'ambiente. Passare il JSON inline a `--config` funziona finché la password non contiene
   virgolette, backslash o `$`: a quel punto si rompe in modo difficile da leggere.

## Cosa serve per il primo run (una tantum, ~30 min)

1. **Keystore**: segui [`keystore-android-codespaces.md`](keystore-android-codespaces.md).
   Nasce in un Codespace, non sul tuo PC.
2. **Quattro secret** in *Settings → Secrets and variables → Actions*:

   | Secret | Contenuto |
   | --- | --- |
   | `ANDROID_KEY_BASE64` | keystore PKCS12 codificato base64, su una riga |
   | `ANDROID_KEYSTORE_PASSWORD` | password del file keystore |
   | `ANDROID_KEY_PASSWORD` | password della chiave (spesso uguale) |
   | `ANDROID_KEY_ALIAS` | `pizzico` |

3. **Lancia** il workflow da *Actions → Android APK → Run workflow*.

Senza i secret il workflow **non fallisce**: costruisce un APK non firmato e lo segnala con
un warning. È voluto, così si può provare la pipeline prima di avere le chiavi.

## Cosa aspettarsi

| Voce | Valore |
| --- | --- |
| Durata primo run | 15-25 min (Gradle + dipendenze Rust da zero) |
| Run successivi | 6-10 min con le cache Rust e Gradle |
| Artifact | `pizzico-apk` → `app-universal-release.apk` (+ varianti per ABI) |
| Con un tag `v*` | anche una **draft release** con l'APK allegato |

## Cosa verificare quando l'APK è installato

Nell'ordine, perché ognuno presuppone il precedente:

1. **Si avvia** senza crash all'apertura.
2. **La UI è quella giusta**: pannelli grigio chiaro, testo scuro, canvas scuro.
3. **Il documento si carica** (PSD di esempio o immagine).
4. **Il canvas si ridisegna**: un tratto di pennello deve apparire *subito*. Questo è il
   punto critico — su web il loop RAF e il flag dirty sono stati corretti, ma la WebView
   Android è un motore diverso: se il canvas resta fermo, il problema è lì e non nel codice
   dell'app.
5. **Export PNG** senza crash.
6. **Prestazioni**: aspettarsi il fallback Canvas2D, non WebGPU. Un documento grande può
   essere lento; è il rischio dichiarato nella ricognizione.

## Rischi residui

| Rischio | Impatto | Mitigazione |
| --- | --- | --- |
| Versione NDK non disponibile per l'SDK del runner | build fallisce subito | `env.NDK_VERSION` è una costante in cima al workflow: si cambia in un punto |
| `tauri android init` che chiede input nonostante `--ci` | run bloccata in attesa | se succede: togliere `--ci`, eseguire `init` una volta e committare `gen/android` |
| Firma rifiutata (base64 troncato, password sbagliata) | APK non installabile | rigenerare `keystore.b64` con `base64 -w0`; i 4 secret sono separati proprio per non confonderli |
| Primo download Gradle lento | timeout del job (60 min) | la cache Gradle è già configurata |
| WebGPU assente su WebView | canvas lento o fermo | è il punto 4 della verifica: da misurare, non da ipotizzare |

## Cosa manca dopo

- **Commit di `gen/android`** al primo run riuscito: il workflow lo rigenera se manca, ma
  committarlo rende la build riproducibile e revisionabile.
- **Decisione sulla distribuzione**: Google Play (Play App Signing, split per ABI) o solo
  GitHub Releases.
- **Adattamento touch** della UI: aree da 44px, eventuale bottom sheet al posto del pannello
  da 280px.
- **Verifica su dispositivo reale** con un documento vero: la domanda aperta della
  ricognizione.

## Nota di metodo

In questa sessione non è stato installato nulla in locale e il workflow non è stato
eseguito. `cargo check` in `apps/tauri` resta verde dopo le modifiche (verificato), e
`ci.yml` non è stato toccato.
