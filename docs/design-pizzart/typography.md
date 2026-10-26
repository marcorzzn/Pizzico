# Tipografia e spaziature — Pizzart UI

## Font

**Nessun font custom.** Pizzart non chiama `set_fonts`, non carica file `.ttf` per la
UI e non configura `FontId` con famiglie proprie: usa i font predefiniti di egui.

Conseguenza: la UI di Pizzart non ha un'identità tipografica da estrarre. In Pizzico
la scelta della tipografia è una **decisione nuova**, da prendere in Fase 6 e
documentare in `packages/ui-kit`.

## Scala tipografica effettivamente usata

| Ruolo nel codice | Chiamata egui | Uso | Occorrenze |
|---|---|---|---|
| Titolo di sezione | `ui.heading("…")` | `Strumento`, `Layer`, `Effetti` | 3 |
| Testo normale | `ui.label(…)` | etichette, valori | molte |
| Suggerimento | `RichText::new(…).small().weak()` | «applica al layer selezionato» | 4+ |
| Enfasi minore | `RichText::new(…).small().strong()` | «maschere» | 1 |
| Testo del canvas | `TextStyle::new(dimensione)` | etichette dei layer sul canvas | 1 |

Non esiste una gerarchia a 4 livelli (display/title/body/caption): ci sono solo
"titolo di sezione" e "testo", con due varianti di enfasi. Anche questa è una
decisione da prendere, non da copiare.

## Spaziature

**Nessuna costante di spaziatura.** Verifica eseguita cercando `add_space`, `Spacing`,
`item_spacing`, `padding`, `gap` nei sorgenti della UI: non ci sono valori espliciti.
Tutto lo spazio è quello predefinito di egui (`Spacing::default()`), cioè:

| Voce | Valore predefinito egui |
|---|---|
| `item_spacing` | 8 × 3 px |
| `button_padding` | 4 × 1 px |
| `slider_width` | 100 px |
| `indent` | 18 px |
| `interact_size` | 40 × 18 px |

Questi non sono "il design di Pizzart": sono i valori della libreria. Vanno citati
come punto di partenza, non come specifica.

## Bozza di token (proposta, non estrazione)

```css
:root {
  /* Scala tipografica: non esiste in Pizzart, va decisa */
  --pz-font-ui: system-ui, -apple-system, "Segoe UI", sans-serif;
  --pz-font-size-caption: 11px;
  --pz-font-size-body:    13px;
  --pz-font-size-title:   15px;
  --pz-font-size-display: 20px;

  /* Densità: derivata dai default egui, arrotondata per il web */
  --pz-space-1: 4px;
  --pz-space-2: 8px;
  --pz-space-3: 12px;
  --pz-space-4: 16px;
  --pz-space-6: 24px;

  --pz-radius-sm: 4px;
  --pz-radius-md: 6px;
}
```

Su mobile la scala va aumentata: 11 px di caption e 40×18 px di area interattiva sono
sotto le soglie di tocco raccomandate (44 px). La Fase 7 deve ridefinire le aree
interattive, non riusare queste.
