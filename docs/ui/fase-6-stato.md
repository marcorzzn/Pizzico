# Fase 6 — stato dell'interfaccia

Riepilogo di cosa è stato fatto nella riscrittura dell'interfaccia, cosa resta, e cosa
sapere prima di toccarla di nuovo.

> Nome del file: il piano prevedeva `fase-6-completata.md`. La fase **non è completa**
> (manca la 6c-c), quindi il documento si chiama `fase-6-stato.md`. Quando la 6c-c sarà
> chiusa, questo file può essere rinominato: il contenuto è già quello definitivo.

## Cosa è stato fatto

| Sotto-fase | Contenuto | Commit |
| --- | --- | --- |
| **6a** | Token Pizzart definiti come layer inerte (`[data-theme="pizzart"]`), icon set Lucide generato da sorgenti ufficiali, gate `tokens:check` con ratchet sulle emoji | `2f61c273f` |
| **6b** | Tema attivo su `:root` con alias v1 come ponte; shell ristrutturata (menu in alto, strumenti a destra, pannello 280px con 4 sezioni, barra di stato); 17 emoji di `layout.ts` → icone | `83546d7a5`, `ec272f086` |
| **6c-a** | `Slider` e `ColorPicker` completati (unità, clamp, accessibilità, factory); `LayerRow` con icone per i cinque `LayerKind`; baseline emoji di `ui-kit`/`ui-web` portata a zero | `52f367039`, `f58df3291` |
| **6c-b** | `main.ts`: i 3 slider del pennello e il color picker usano i componenti; opacità livello via `setValue()`; accento unico; 9 emoji di testo → icone; colori inline → token; toast con icona per tipo; 13 emoji di console rimosse | `7997e69d9`, `cc469026c`, `9168e489c`, `be04f1422`, `d67f65ad5` |

Risultato misurabile: `main.ts` da 47 righe con emoji a **0**; `ui-kit` e `ui-web` già a zero
dalla 6c-a. Nessun colore letterale inline residuo, tranne i due che sono dati di rendering
(colore di clear del canvas, colore di default del pennello).

## Cosa manca (6c-c)

1. **Classi `.pz-card`**: le quattro card dell'inspector (stato WASM, documento, strumento,
   livello) sono ancora costruite con `cssText` inline, ~30 righe di stile sparse e quasi
   identiche. Una classe in `styles.css` le normalizza.
2. **Rimozione degli alias v1** in `tokens.css` (`--pz-bg-app`, `--pz-accent-primary`,
   `--pz-font-sans`, …): sopravvivono per i pochi punti di `layout.ts` e `main.ts` non ancora
   riscritti.
3. **Sezioni Effetti e Maschere**: oggi sono segnaposto con un testo esplicito. Vanno
   collegate al motore o rimosse — è una decisione di prodotto, non una pulizia.
4. **Font Inter**: la stack lo dichiara ma i file non sono inclusi, quindi ricade su
   `system-ui`. Decidere se spedirli.

## Debito tecnico

- **`main.ts` non ha test.** Le modifiche della 6c-b sono state verificate a mano in
  produzione (click su slider, trascinamento di una riga layer, export PNG). Ogni sessione
  futura su quel file eredita lo stesso onere: nessuna rete di sicurezza automatica.
- **`vite build` non gira nell'ambiente di sviluppo di questa macchina** (`spawn EPERM` su
  esbuild): il build lo fa Cloudflare. Le modifiche alla UI sono state verificate in
  produzione dopo il deploy, non in locale.
- **La barra di stato mostra ancora valori statici** (`1200 × 800 px`, `100%`) invece delle
  dimensioni reali del documento: con un PSD da 800 × 600 il numero mostrato è sbagliato. È
  visibile anche nello screenshot del README (`screenshot-export.png`). Da correggere in
  6c-c o 6d.
- **Gli slider nativi** hanno il tratto non riempito chiaro: `color-scheme: dark` non lo
  cambia. Serve uno styling esplicito del `range` (già previsto per la 6c-c).

## Dove guardare

| Cosa | File |
| --- | --- |
| Token e loro uso | [`tokens.md`](tokens.md) |
| Icon set | [`icons.md`](icons.md) |
| Decisioni vincolanti | [`design-decisions.md`](design-decisions.md) |
| Mappatura usata per la 6c-b | [`fase-6c-b-mappatura.md`](fase-6c-b-mappatura.md) |
| Prima/dopo del tema | [`fase-6b-before-after.png`](fase-6b-before-after.png) |
| Invarianza della 6c-a | [`fase-6c-a-invarianza.png`](fase-6c-a-invarianza.png) |
| Screenshot per il README | [`../assets/`](../assets/) |

## Come verificare una modifica alla UI

```bash
pnpm --filter @pizzico/ui-kit typecheck
pnpm --filter @pizzico/ui-web typecheck
pnpm --filter @pizzico/app-web typecheck
pnpm --filter @pizzico/ui-kit tokens:check
```

Poi, sempre a mano: caricare un PSD, muovere uno slider, disegnare un tratto, esportare un
PNG. Il `typecheck` dice che il codice compila, non che la UI funziona.
