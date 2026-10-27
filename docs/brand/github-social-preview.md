# Social preview del repository

GitHub non espone un'API per caricare la social preview: va fatto a mano, una
volta. L'immagine è già pronta nel repository.

## File

`docs/brand/social-preview.png` — **1280×640**, PNG, 80 KB.

Contenuto: icona del progetto su fondo `#0a0c10`, nome `pizzico`, tagline
«Offline-first graphic editor in Rust + WebAssembly» e la riga «No AI, no cloud,
no subscription.»

## Specifiche GitHub

| Voce | Valore |
| --- | --- |
| Dimensioni consigliate | 1280×640 (rapporto 2:1) |
| Formato | PNG o JPG, sotto 1 MB |
| Uso | anteprima quando il link del repo viene condiviso (Twitter/X, Slack, Discord, LinkedIn) |

## Procedura

1. Apri <https://github.com/marcorzzn/pizzico/settings>.
2. Sezione **Social preview** → **Edit**.
3. Carica `docs/brand/social-preview.png`.
4. Salva.
5. Verifica: incolla il link `https://github.com/marcorzzn/pizzico` in un client
   che genera l'anteprima, oppure usa il [Card Validator di Twitter](https://cards-dev.twitter.com/validator).

## Perché non è automatizzato

L'upload passa da un endpoint della UI web, non dalla REST API pubblica: `gh`
non lo copre. Documentarlo qui evita di cercarlo di nuovo la prossima volta.

## Rigenerarlo

Se l'icona cambia, il PNG va rigenerato. Lo script è in
`scratch/` durante le sessioni di lavoro (non versionato); la ricetta è:

- tela 1280×640, fondo `#0a0c10`;
- icona 260×260 a sinistra, centrata verticalmente, margine 80px;
- nome in `#f0f0f0`, circa 96px, a x=390;
- tagline in `#9ca3af`, circa 34px;
- riga accent (`#0078d4`) lunga 310px sotto l'icona.

Le stesse proporzioni valgono se un giorno serve un banner per il README.
