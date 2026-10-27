# Generare il keystore Android in GitHub Codespaces

Procedura **cloud-only**: il tuo PC non installa niente (niente JDK, niente `keytool`,
niente Android Studio). Il keystore nasce in un Codespace, finisce in un secret di GitHub,
e il Codespace viene buttato via.

## Prerequisiti

- Accesso al repository su GitHub con permessi di scrittura sui secret.
- Un account GitHub: il piano free include 120 core-ore di Codespaces al mese. Questa
  procedura ne consuma circa 10 minuti.
- Java: l'immagine universale di Codespaces ha già un JDK, quindi `keytool` c'è. Verificalo
  con `keytool -version` (se manca: `sudo apt-get update && sudo apt-get install -y openjdk-17-jdk-headless`).

> **Nota sulle password.** Il keystore ha *due* password distinte: quella del file
> (`-storepass`) e quella della chiave (`-keypass`). La procedura guidata di `keytool` le
> imposta uguali se non dici altro, ed è la scelta più semplice. Nei secret sono **due
> variabili separate**, non una ripetuta: il workflow le usa per due campi diversi.

## Step 1 — Apri il Codespace

1. Vai su <https://github.com/marcorzzn/Pizzico>.
2. **Code** → **Codespaces** → **Create codespace on master**.
3. Attendi 1-2 minuti il provisioning.

## Step 2 — Genera il keystore

Nel terminale del Codespace:

```bash
cd apps/tauri
keytool -genkeypair -v \
  -keystore pizzico-release.keystore \
  -alias pizzico \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype PKCS12 \
  -dname "CN=Pizzico, OU=Development, O=Pizzico, L=Roma, ST=RM, C=IT"
```

- `-storetype PKCS12`: formato moderno; il vecchio JKS è deprecato e alcune versioni di
  Gradle lo rifiutano.
- `-genkeypair` è il nome attuale del comando (`-genkey` è un alias deprecato).
- Ti chiederà la password del keystore e quella della chiave. **Annotale entrambe**:
  serviranno nei secret.

Verifica:

```bash
keytool -list -v -keystore pizzico-release.keystore -alias pizzico | head -20
```

## Step 3 — Codifica in base64

```bash
base64 -w0 pizzico-release.keystore > keystore.b64
wc -c keystore.b64
```

`-w0` evita gli a capo. Sono comunque innocui (il workflow li rimuove prima di decodificare),
ma un file su una riga sola si incolla meglio.

### Verifica prima di incollare (non saltarla)

Un secret sbagliato costa un run di sette minuti e un errore incomprensibile di Gradle
(`toDerInputStream rejects tag type -11`). Questi tre controlli costano dieci secondi:

```bash
# 1. il keystore deve pesare 2-3 KB, non centinaia di byte
ls -l pizzico-release.keystore

# 2. keytool deve aprirlo ed elencare l'alias
keytool -list -keystore pizzico-release.keystore -storepass '<password>' -alias pizzico

# 3. il base64 deve riprodurre esattamente il file originale
base64 -w0 pizzico-release.keystore | base64 -d | cmp - pizzico-release.keystore && echo "base64 OK"
```

Se il punto 3 stampa `base64 OK`, il secret è corretto. Se `wc -c keystore.b64` dà un numero
molto più piccolo di qualche migliaio di caratteri, il file non è quello giusto.

La prima riga del file decodificato deve iniziare con `30 82` (PKCS12/DER) oppure
`fe ed fe ed` (JKS): sono le firme dei due formati. Il workflow stampa i primi 8 byte, così
si vede subito se il contenuto è un keystore.

## Step 4 — Copia il contenuto

```bash
cat keystore.b64
```

Seleziona **tutto** l'output e copialo. Sono circa 3-5 KB su una riga.

## Step 5 — Aggiungi i 4 secret su GitHub

Vai su <https://github.com/marcorzzn/Pizzico/settings/secrets/actions> →
**New repository secret**.

| Nome | Valore |
| --- | --- |
| `ANDROID_KEY_BASE64` | il contenuto di `keystore.b64` (tutto) |
| `ANDROID_KEYSTORE_PASSWORD` | la password del **file** keystore |
| `ANDROID_KEY_PASSWORD` | la password della **chiave** (spesso la stessa) |
| `ANDROID_KEY_ALIAS` | `pizzico` |

I nomi sono quelli che `.github/workflows/android-apk.yml` legge: se ne cambi uno, la firma
salta e la build produce un APK non firmato (il workflow lo segnala con un warning, non
fallisce).

## Step 6 — Pulisci il Codespace

```bash
rm -f pizzico-release.keystore keystore.b64
```

Poi **Stop** o **Delete** il Codespace dalla dashboard. Non è indispensabile (il filesystem
è effimero), ma un keystore di release non va lasciato in giro più del necessario.

## Step 7 — Lancia il workflow

1. <https://github.com/marcorzzn/Pizzico/actions> → **Android APK** → **Run workflow**.
2. Attendi **15-25 minuti** il primo run (Gradle e le dipendenze Rust si scaricano da zero;
   i run successivi sono più rapidi grazie alle cache).
3. Scarica l'APK da **Artifacts** → `pizzico-apk`.

In alternativa, taggando una release:

```bash
git tag v0.1.0-android && git push origin v0.1.0-android
```

Il workflow parte col tag e crea anche una **draft release** con l'APK allegato.

## Step 8 — Installa sul telefono

Opzione A, con `adb` (dal PC, se lo hai):

```bash
adb install -r app-universal-release.apk
```

Opzione B, senza cavo: scarica l'artifact dall'app GitHub (o trasferisci il file), apri il
`.apk` e consenti l'installazione da origine sconosciuta.

Al primo avvio Android chiederà conferma per un'app non firmata da Play: è atteso.

## Cosa verificare dopo l'installazione

1. L'app si avvia e mostra la UI chiara.
2. Il documento PSD di esempio si carica (o un'immagine, se il preload non è incluso).
3. Il canvas si ridisegna: un tratto di pennello deve apparire subito. Se il canvas resta
   fermo, è il bug del repaint che è già stato chiuso su web: significa che su WebView
   Android il loop non parte.
4. Export PNG: deve produrre un file scaricabile senza crash.
5. Prestazioni: il rendering probabilmente usa il fallback Canvas2D, non WebGPU. Un
   documento grande può risultare lento.

## Se il run fallisce

I quattro punti che si rompono davvero, in ordine di probabilità:

| Sintomo | Causa | Rimedio |
| --- | --- | --- |
| `NDK not found` / versione diversa | `NDK_VERSION` non disponibile per l'SDK installato | leggere la versione proposta da `sdkmanager --list` e aggiornare `env.NDK_VERSION` |
| `Gradle ... could not resolve` | rete lenta o cache corrotta | rilanciare: le cache sono keyed su `runner.os` |
| `Signing failed` / APK non firmato | base64 troncato o password sbagliate | rigenerare `keystore.b64` con `-w0` e ricontrollare i 4 secret |
| `tauri android init` chiede input | CLI che ignora `--ci` | togliere `--ci` e fornire i valori in `tauri.conf.json`, oppure fare `init` una volta e committare `gen/android` |

In ogni caso: **leggere l'errore esatto dal log**, non dedurlo.
