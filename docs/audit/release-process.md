# Processo di release — web e Android

**Stato:** operativo dalla sessione A del 2026-10-28.
**Ambito:** come nasce, viene verificata e viene pubblicata una release di
Pizzico. Le voci P1 (versione visibile nell'app, cache busting del service
worker, deploy web dal tag) sono ancora da fare.

Questo non è un audit puntuale: è il documento operativo da seguire prima di
ogni tag.

---

## Principio

Una release **è un tag**. Il tag `v<versione>` deve puntare a un commit in cui
`apps/tauri/tauri.conf.json` ha la stessa `<versione>`.

Il workflow Android parte dal tag, verifica la corrispondenza, rigenera icone e
bundle, esegue uno smoke test sull'APK e pubblica la release **come
prerelease**. La promozione a stabile è un atto esplicito, dopo il test su un
device reale.

Corollari:

- una build `workflow_dispatch` produce solo un artifact, **mai** una release;
- la versione non si scrive a mano in più file: si usa lo script;
- se lo smoke test fallisce, la release non viene pubblicata.

---

## 1. Bump della versione

```bash
pnpm bump 0.1.2
# equivalente, senza pnpm:
node scripts/bump-version.mjs 0.1.2
```

Anteprima senza scrivere nulla:

```bash
node scripts/bump-version.mjs 0.1.2 --dry-run
```

`scripts/bump-version.mjs` aggiorna in cascata:

| File | Cosa |
| --- | --- |
| `package.json` | `version` |
| `apps/web/package.json` | `version` |
| `apps/tauri/tauri.conf.json` | `version` e `bundle.android.versionCode` |
| `Cargo.toml` | `[workspace.package] version` |
| `apps/tauri/Cargo.toml` | `[package] version` |
| `CHANGELOG.md` | nuova sezione `## [X.Y.Z] - YYYY-MM-DD` |
| `Cargo.lock`, `apps/tauri/Cargo.lock` | aggiornati con `cargo update --workspace` |

`versionCode` è `major * 1_000_000 + minor * 1_000 + patch` (per `0.1.2`:
`1002`). È la stessa formula che Tauri usa quando il campo non è impostato, ma
scritta esplicitamente nel config così è verificabile e non cambia con la
versione della CLI.

Lo script **rifiuta** di procedere se:

- la versione non è SemVer `x.y.z`;
- la nuova versione non è maggiore della corrente;
- i file sono già disallineati tra loro;
- esiste già il tag `v<versione>`.

Poi:

```bash
git add -A
git commit -m "chore(release): 0.1.2"
git tag -a v0.1.2 -m "Pizzico 0.1.2"
git push origin master --follow-tags
```

Il push del tag è l'unico evento che pubblica la release.

---

## 2. Check del tag in CI

Il workflow `.github/workflows/android-apk.yml` esegue, prima della build:

- `Log build context`: stampa `GITHUB_SHA`, `GITHUB_REF` e la versione del
  config, così ogni run dice esplicitamente cosa sta costruendo;
- `Verify tag matches version`: sui tag `v*`, fallisce se
  `GITHUB_REF_NAME` senza prefisso `v` è diverso da
  `apps/tauri/tauri.conf.json → version`.

Una build di test su `master` resta possibile con `workflow_dispatch`, ma non
pubblica nulla.

---

## 3. Icone Android

`gen/android` è un progetto generato e **non è tracciato**: la CI lo ricrea a
ogni run con `cargo tauri android init`. Per questo le icone in
`apps/tauri/icons/` non arrivano da sole nelle mipmap.

Subito dopo l'init, prima della build:

```bash
cd apps/tauri
cargo tauri icon icons/android-source.png
```

`icons/android-source.png` è la versione 1024×1024 a **pieno bleed** dell'icona
(sfondo scuro fino ai bordi, mano centrata), derivata da `icons/source.png`
ritagliando i margini bianchi. `source.png` e `128x128.png` hanno un bordo
bianco attorno al quadrato arrotondato: passandoli direttamente a `tauri icon`
si otterrebbe un'icona con cornice bianca. Non usarli per Android.

Il comando (tauri-cli 2.12.4) scrive le icone desktop in `apps/tauri/icons/` e,
poiché esiste `apps/tauri/gen/android/app/src/main/res/`, scrive anche:

- `mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png`
- `mipmap-*/ic_launcher_round.png`
- `mipmap-*/ic_launcher_foreground.png`
- `mipmap-anydpi-v26/ic_launcher.xml`
- `values/ic_launcher_background.xml`

**Non usare `--output`**: l'individuazione della cartella Android si basa sul
genitore della directory di output; spostandola, le icone finirebbero in
`<output>/android` invece che nelle mipmap giuste.

---

## 4. Smoke test dell'APK

Dopo la build e prima della pubblicazione:

```bash
node scripts/verify-apk.mjs <apk> --config apps/tauri/tauri.conf.json --dist apps/web/dist
```

Lo script legge l'APK senza toolchain Android e verifica:

1. `AndroidManifest.xml`: `versionName` == versione del config,
   `versionCode` == `versionCode` del config, `package` == identifier;
2. `assets/tauri.conf.json` dentro l'APK: versione e identifier coerenti;
3. i nomi hashati del bundle (`assets/index-*.js`, `*.css`, `*.wasm`) presenti
   nella libreria nativa corrispondono a quelli prodotti in `apps/web/dist`.

Un passo successivo, `Verify release artifact name and checksum`, verifica il
packaging che lo smoke test non vede:

4. il file si chiama `pizzico-<versione>-android.apk`;
5. il `.sha256` contiene solo `<hash>  <basename>` (due spazi), così
   `sha256sum -c` funziona dopo il download.

Se uno dei controlli fallisce, il job fallisce e la release non viene creata.
Il workflow rinomina l'APK e allega il `.sha256` portabile.

Nota: lo smoke test **non** verifica il rendering dell'interfaccia. Quello
resta un test manuale su device (vedi checklist).

---

## 5. Pubblicazione

La release viene creata solo dal workflow del tag:

- `draft: false`, `prerelease: true`;
- asset: APK + `sha256`;
- note generate da GitHub più eventuale testo nel CHANGELOG.

Dopo il test su device:

```bash
gh release edit v0.1.2 --prerelease=false
```

Se il test fallisce, la release resta prerelease e si prepara una versione
successiva; non si cancella la release precedente senza motivo.

---

## 6. Igiene della build

- `pnpm install --frozen-lockfile` in CI: il lockfile è vincolante.
- `tauri-cli` pinnato a `2.12.4` (`cargo install tauri-cli --version "=2.12.4"`).
- Rust pinnato a `1.99.1` da `rust-toolchain.toml` e da
  `dtolnay/rust-toolchain@1.99.1`. In locale, la prima volta:
  `rustup toolchain install 1.99.1`.
- Le cache Rust/Gradle non devono mascherare un cambio di dipendenze: la cache
  Rust è keyed sul `Cargo.lock`, la cache Gradle viene calcolata dopo
  `android init` (prima `hashFiles` sarebbe vuoto).

---

## Checklist prima del tag

- [ ] `pnpm bump X.Y.Z` eseguito e diff riletto.
- [ ] Sezione del CHANGELOG compilata (niente placeholder).
- [ ] Commit di release pushato su `master`.
- [ ] Tag `vX.Y.Z` creato e pushato.
- [ ] Run del tag verde: check versione, icone, smoke test, checksum.
- [ ] Release presente e marcata prerelease.
- [ ] APK scaricato da GitHub, installato su device, verifica di:
      icona del brand, versione `X.Y.Z` in Impostazioni, layout a 360×800,
      rotazione, safe area, installazione pulita.
- [ ] Solo allora: `gh release edit vX.Y.Z --prerelease=false`.

---

## Nota su `v0.1.1-android`

La release del 2026-10-27 è stata marcata **prerelease** il 2026-10-28: contiene
`versionName 0.1.0`, icone Android di default Tauri e il layout mobile che le
note stesse dichiarano non adattato. Non va usata come riferimento.

## Cosa manca (P1)

- versione e commit visibili nell'interfaccia (`VITE_APP_VERSION`);
- `CACHE_NAME` del service worker generato a build-time, header di cache
  espliciti per `/assets/*` e `/sw.js`;
- deploy web di produzione dal tag, così web e APK nascono dallo stesso commit.
