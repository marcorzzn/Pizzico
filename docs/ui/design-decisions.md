# Decisioni di design — Fase 6 (vincolanti)

> **Superato da [ADR-0002-flat-egui-redesign.md](ADR-0002-flat-egui-redesign.md) per la v2 della UI.**
> Le sezioni §1 (palette) e §2 (superfici, ombre, arrotondamenti) valgono come storia
> della Fase 6, non più come regole correnti: la palette, i raggi e le ombre sono
> sostituiti dall'ADR. Restano valide le sezioni su tipografia, spaziatura, accessibilità,
> zero emoji e accento unico, dove l'ADR non dice diversamente.

> **Stato**: deciso dal committente (Marco) il 2026-10-26.
> **Natura**: vincolante. Chi implementa la Fase 6 non riapre queste scelte senza
> una nuova decisione esplicita del committente.
> **Riferimento visivo**: `docs/design-pizzart/screenshots/` (tre schermate reali di
> Pizzart, catturate dal committente) e `docs/design-pizzart/*.md`.

---

## 0. Perché questo documento esiste

L'estrazione del design system ha accertato che **Pizzart non ha un design system
visivo**: usa il tema scuro di default di egui, con cinque colori e nessuna scelta
tipografica. Quindi la Fase 6 non è "replicare Pizzart in CSS": è **riusare la
struttura di Pizzart e progettare l'aspetto**.

Questa è la direzione scelta, e qui è fissata.

---

## 1. Stile generale

- **Tema scuro** (dark mode), non chiaro. Gli screenshot mostrano il tema chiaro di
  egui: è un default della libreria, non una scelta, e non va replicato.
- **Pulito, ordinato, professionale.** Il riferimento mentale è un editor moderno
  (Figma, Blender, VS Code), non un pannello di controllo di sistema.
- **Zero emoji.** Mai, in nessun contesto: né nei bottoni, né nelle etichette, né nei
  messaggi, né nel CSS come `content`. Le icone sono **SVG**.
- Niente trasparenze eccessive, niente glow, niente gradienti decorativi.

## 2. Palette (token CSS)

I token marcati "Pizzart" provengono dal codice esistente; gli altri sono la scelta
nuova del committente.

```css
:root {
  /* Superfici */
  --pz-bg-canvas:   #1c1e22;  /* Pizzart: sfondo canvas */
  --pz-bg-panel:    #1e1e24;
  --pz-bg-toolbar:  #18181b;

  /* Linee */
  --pz-border:      #2d2d35;

  /* Testo */
  --pz-text-primary:   #e0e0e0;
  --pz-text-secondary: #a0a0a8;

  /* Accento */
  --pz-accent: #6366f1;  /* indaco: selezione e azioni primarie */

  /* Semantici */
  --pz-error: #f07864;   /* Pizzart */
  --pz-ok:    #a0c8a0;   /* Pizzart */
}
```

Regole d'uso:
- l'accento si usa **poco**: stato attivo, focus, bottone primario. Mai come sfondo
  esteso.
- testo secondario solo per etichette e unità di misura, mai per valori numerici.
- i colori di Pizzart `#ffbe3c` (selezione confermata) e `#78c8ff` (selezione in
  corso) restano validi **sul canvas**, dove indicano uno stato reale; non diventano
  token di interfaccia.

## 3. Tipografia

- **Font**: Inter (fallback `system-ui`). Se Inter non è disponibile, Geist è
  accettabile; non si usano font di sistema come scelta primaria.
- **Scala**: 12px (small), 14px (body), 16px (heading), 20px (title).
- **Pesi**: 400 (normale), 500 (medio), 600 (grassetto). Nessun 300 o 700.
- Numeri in colonna (opacità, dimensioni, coordinate): `font-variant-numeric: tabular-nums`.

## 4. Icone

- **Set**: Lucide (licenza ISC, compatibile MIT) oppure Phosphor (MIT). Non entrambi.
- **Dimensione**: 16px in toolbar e righe elenco, 20px nei bottoni principali.
- **Colore**: eredita `--pz-text-primary`; `--pz-accent` solo per lo stato attivo.
- **Formato**: SVG inline oppure file `.svg` dentro `packages/ui-kit`.
- **Vietato**: emoji, font di icone caricati da CDN, PNG a più risoluzioni.

## 5. Spaziature

- Scala: **4, 8, 12, 16, 24, 32 px**. Nessun valore fuori scala.
- Padding dei pannelli: **12px**.
- Distanza fra controlli: **8px**.
- Altezza di una riga layer: **32px**.
- Su viewport < 640px le aree interattive salgono a **44px** minimi (tocco).

## 6. Componenti (scheletro preso da Pizzart)

Confermato dagli screenshot reali:

| Zona | Contenuto |
|---|---|
| Top bar | a sinistra i menu `File`, `Modifica`, `Vista`; al centro il suggerimento contestuale dello strumento; a destra gli strumenti `Seleziona (S)`, `Pennello (B)`, `Testo (T)`, `Selezione (R)` |
| Canvas | occupa lo spazio flessibile, sfondo `--pz-bg-canvas` |
| Pannello destro | **280px**: `Strumento`, `Layer`, `Effetti`, `Maschere` |
| Bottom bar | altezza ridotta: dimensioni documento, zoom, layer selezionato, nome documento |

Contenuto delle sezioni, come osservato:

- **Strumento** (contestuale): colore, dimensione, opacità, durezza, stabilizza,
  fusione.
- **Layer**: conteggio (`N layer · M gruppi`), elenco, stato vuoto esplicito
  («nessun layer: apri un'immagine o disegna»).
- **Effetti**: selettore effetto, parametri (valore, raggio), bottone `Applica`.
- **Maschere**: `Maschera ellittica`, `Togli maschera`.

## 7. Regola zero-emoji (verificabile)

In implementazione:

1. Il CSS non deve contenere caratteri emoji in `content:` né nel testo dei bottoni.
2. Nessuna icona costruita con caratteri Unicode decorativi.
3. Verifica automatica prima del merge:

```powershell
# deve restituire 0 corrispondenze
Select-String -Path packages\ui-kit\src\*.css,packages\ui-web\src\*.css `
              -Pattern '[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]'
```

4. Le icone sono file: `packages/ui-kit/icons/<nome>.svg`, con `stroke="currentColor"`
   e `fill="none"`, così ereditano il colore senza duplicati.

## 8. Cosa NON è stato deciso qui

- Colori dei layer di anteprima, tema del canvas oltre lo sfondo.
- Animazioni e transizioni (da valutare in Fase 6, non prima).
- Tema chiaro: **non previsto**. Se un giorno servirà, sarà una nuova decisione.
- Layout mobile: la Fase 7 lo affronta; qui è solo fissato il vincolo delle aree di
  tocco a 44px.

## 9. Decisioni prese durante l'implementazione

Registrate qui perché sono state prese **mentre** si implementava, non prima. Restano
vincolanti come le precedenti.

1. **Un solo accento, applicato.** Le schede Move e Marquee usavano viola `#a855f7` e ciano
   `#06b6d4`, due accenti che il §2 non prevede. Sono stati rimossi in favore di
   `--pz-accent`: se un giorno servirà distinguere gli strumenti, sarà una decisione nuova,
   non un residuo.
2. **Il tema è il default, non un'opzione.** In 6a i token Pizzart erano un layer inerte
   attivabile con `[data-theme="pizzart"]`; in 6b sono passati in `:root` e quel layer è
   stato rimosso. Un tema spento che nessuno attiva è solo codice morto.
3. **Alias v1 come ponte, con scadenza.** `--pz-bg-app`, `--pz-accent-primary`,
   `--pz-font-sans` e simili puntano ai token Pizzart finché i componenti non saranno
   riscritti. Non sono un secondo set di valori: sono un reindirizzamento da eliminare
   (6c-c).
4. **Icone generate, non scritte a mano.** Il modulo `ui-kit/src/icons` è prodotto da
   Lucide v1.61.0 con un lock di digest (`icons.lock.json`). Aggiungere un'icona significa
   aggiungere una riga al generatore, non digitare un path SVG.
5. **I controlli dell'inspector sono componenti.** Slider e ColorPicker di `ui-kit` hanno
   una factory (`createSlider`, `createColorPicker`) che avvolge la classe: gli ID restano
   quelli attesi dal codice esistente, così un controllo può essere sostituito senza toccare
   chi lo interroga.
6. **Il tipo di un toast non è solo un colore.** Ogni toast porta un'icona coerente con il
   tipo (Check, Info, AlertCircle): il colore del bordo non basta come segnale, e non basta
   a chi non distingue i colori.
7. **Zero emoji vale anche per i log.** Il §1 dice «in nessun contesto»: sono stati rimossi
   anche i prefissi emoji dei `console.*`, che l'utente non vede. Regola semplice da
   verificare batte eccezione ragionevole.
8. **I valori non presenti nel documento sono derivati, e dichiarati.** `--pz-warning`,
   `--pz-bg-elevated`, le ombre e le varianti alpha dell'accento non provengono da Pizzart
   né da qui: sono calcolati dai token del §2 e marcati come derivati in `tokens.css`.
