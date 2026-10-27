# Android identifier

| Voce | Valore |
| --- | --- |
| Identifier | `io.github.marcorzzn.pizzico` |
| Scelto il | 2026-10-27 |
| Usato da | `apps/tauri/tauri.conf.json` → `identifier` |
| Stato | **definitivo** |

## Perché questo valore

1. **È garantito dal proprietario**: dipende dall'account GitHub `marcorzzn`, non da un
   dominio che si può perdere o cambiare.
2. **Non richiede possedere un dominio.** `app.pizzico` avrebbe presupposto il controllo di
   `pizzico.app`; `io.pizzico.app` di `pizzico.io`. Nessuno dei due è necessario qui.
3. **È una convenzione diffusa** nell'open source per i progetti distribuiti fuori dal Play
   Store (es. `io.github.<utente>.<app>`): comunica subito chi pubblica l'app.

## Vincolo da ricordare

L'identifier **non è modificabile dopo la pubblicazione sul Play Store**: Google lo usa come
identità permanente dell'app. Cambiarlo significa pubblicare una scheda nuova, perdendo
installazioni e recensioni.

Finché la distribuzione passa da GitHub Releases il cambio è indolore, ma comporta un
**effetto collaterale**: Android considera l'APK con un identifier diverso come **un'altra
app**. Un'installazione precedente non viene aggiornata, ma affiancata (due icone "pizzico"
nel launcher).

## Storia

| Data | Valore | Nota |
| --- | --- | --- |
| 2026-10-26 | `io.pizzico.app` | primo scaffold Tauri, mai pubblicato |
| 2026-10-27 | `app.pizzico` | rebrand |
| 2026-10-27 | `io.github.marcorzzn.pizzico` | **definitivo** |

Le APK costruite prima di questa data (`io.pizzico.app`) restano installabili ma sono un'app
distinta: vanno disinstallate a mano dopo aver verificato quella nuova.

## Come verificarlo

```powershell
(Get-Content apps/tauri/tauri.conf.json | ConvertFrom-Json).identifier
# atteso: io.github.marcorzzn.pizzico
```

Dentro l'APK (dopo averlo scaricato) il package name compare in
`gen/android/app/build.gradle.kts` alla voce `namespace`/`applicationId`, generata al primo
`tauri android init` o alla prima build.
