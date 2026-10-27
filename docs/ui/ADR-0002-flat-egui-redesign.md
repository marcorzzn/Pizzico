# ADR-0002 — Redesign flat "egui"

- **Stato:** accettato
- **Data:** 2026-10-27
- **Supera:** [`design-decisions.md`](design-decisions.md) §1 (palette) e §2 (superfici, ombre, arrotondamenti)
- **Non tocca:** layout, API dei componenti, icon set, regola «zero emoji», principio dell'accento unico

## Contesto

La Fase 6 ha dato a Pizzico un tema scuro «moderno»: arrotondamenti da 6-8px, ombre
soffici sui pannelli e sui popover, superfici leggermente rialzate, accento indaco.

Funziona, ma non rispecchia il progetto. Pizzico è un motore Rust con un'interfaccia
web: la sua filosofia è quella di uno strumento di misura — poche decorazioni, molta
leggibilità. Il tema attuale appartiene a un'altra famiglia: comunica «prodotto di
design» più di «editor tecnico», e lo fa con un costo concreto:

1. **Le ombre non sopravvivono al ridimensionamento.** Su uno schermo da 6" e su un
   pannello da 280px, un'ombra da 24px di blur è solo rumore.
2. **Gli arrotondamenti mangiano spazio.** Ogni angolo arrotondato su una riga alta 26px
   toglie pixel utili al testo.
3. **Tre livelli di profondità (ombra + bordo + superficie) dicono la stessa cosa tre
   volte.** Un bordo da 1px basta.

La Fase 7 porta l'app su Android, dove la densità è più alta e i margini più stretti: è il
momento giusto per togliere, non per aggiungere.

## Decisione

L'interfaccia passa a un design **piatto, squadrato e monocromatico**, con un solo accento
funzionale. Valori di riferimento:

| Ruolo | Valore |
| --- | --- |
| Sfondo canvas | `#0A0C10` |
| Sfondo pannelli | `#12141A` |
| Bordi | `#1F232D` |
| Testo primario | `#D1D5DB` |
| Testo secondario | `#9CA3AF` |
| Accento | `#3B82F6` (blu desaturato) |

Regole vincolanti:

1. **Raggi:** 0px, al massimo 2px. Niente pill, niente cerchi decorativi.
2. **Ombre:** nessuna. I token `--pz-shadow-*` vengono rimossi: una superficie si stacca
   con un bordo da 1px, non con un blur.
3. **Gradienti:** nessuno.
4. **Gerarchia:** affidata a peso e colore del testo, non alla profondità.
5. **Accento unico:** `#3B82F6` solo per stato attivo, focus e selezione. Nessun secondo
   colore decorativo.

## Conseguenze

**Positive:**

- L'interfaccia perde ogni ornamento che non porta informazione.
- Il tema regge su schermi piccoli e ad alta densità, che è il target della Fase 7.
- Meno token (le ombre spariscono), quindi meno superficie da mantenere.

**Negative, accettate:**

- **La Fase 6 va parzialmente rivista.** Token, screenshot in `docs/` e le affermazioni di
  `fase-6-completata.md` sulla palette non valgono più così come sono scritte. Il lavoro
  strutturale (shell, componenti, icone, zero emoji) resta valido.
- **Meno indizi di profondità.** Un pannello senza ombra è più piatto da leggere: si
  compensa con bordi da 1px e con lo stato hover sullo sfondo.
- **La palette canonica cambia.** I 20 token «Pizzart» non rappresentano più i colori
  dell'app: diventano i token v2. Il gate `tokens:check` continua a garantire che CSS e
  specchio TypeScript restino allineati, ma il documento di design Pizzart non è più la
  fonte della palette.

**Invariate:** struttura della shell, contratto dei componenti (`Slider`, `ColorPicker`,
`LayerRow`), icon set Lucide, divieto di emoji, regola dell'accento singolo.

## Verifica

Una modifica di questo tipo non si dichiara «fatta»: si misura.

1. `tokens:check` verde (canonici allineati, nessuna variabile orfana).
2. Nessuna occorrenza di `box-shadow` o di `border-radius` oltre 2px in `styles.css`.
3. Screenshot del nuovo aspetto, confrontato con quello della Fase 6.
4. Il canvas deve continuare a ridisegnarsi (il bug del loop RAF e quello del flag dirty
   sono stati chiusi prima di questo ADR, di proposito).

## Alternativa scartata

**Mantenere il tema della Fase 6 e limitarsi ad alleggerirlo** (raggi 4px, ombre più
tenui). Sarebbe stato più economico, ma lascia in piedi i tre livelli di profondità e non
risolve il problema della densità: un restyling a metà si paga due volte.
