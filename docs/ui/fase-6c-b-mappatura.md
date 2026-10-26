# Fase 6c-b — mappatura di `main.ts` (sola lettura)

Documento di lavoro. **Nessun file è stato modificato** per produrlo.

- File analizzato: [`apps/web/src/main.ts`](../../apps/web/src/main.ts)
- Versione: **1492 righe**, `sha256 4cdf3f0dd21e878f2f47419f4b48598db0ccbf83d922218af7809fb30bef5464`
- Ultimo commit che lo tocca: `24e6e93a7` (`feat(export): PSD export wired to UI`)
- Metodo: scansione statica con uno script dedicato (emoji, colori letterali, ID dichiarati
  e interrogati, classi emesse, costruzione di controlli) **più** lettura diretta delle
  regioni citate. Ogni riga indicata qui è stata letta, non dedotta.

> Se `main.ts` cambia, questo documento scade. L'hash qui sopra è il riferimento: prima
> di eseguire la 6c-b va riconfrontato.

---

## 0. Discrepanze rispetto a quanto atteso

Cinque cose non corrispondono a come la fase era stata descritta. Vanno lette prima del resto.

| Atteso | Rilevato |
|---|---|
| I 4 slider «alle righe 850-870 e 1200» | Stanno a **1245-1270** (i tre del pennello) e **1359-1396** (opacità livello). Le righe indicate sono in `handlePsdFile` e nella scheda marquee. |
| «2 elementi ColorPicker: `brush-color-picker`, `brush-color-hex`» | `brush-color-hex` **non è un color picker**: è lo `<span>` che mostra il valore esadecimale. Il controllo è uno solo. |
| «47 emoji da eliminare» | Sono **47 righe**, ma non hanno lo stesso peso: **9** sono testo visibile nella UI, **25** sono messaggi di toast (visibili all'utente), **13** sono `console.*` (solo sviluppatore). Vanno trattate in tre passaggi diversi. |
| `inspector-opacity-input` costruito come gli altri | È l'unico dei quattro creato con `document.createElement` + `.id = '...'` (righe 1370-1377), e la sua etichetta è in **un elemento diverso** creato via `innerHTML` (riga 1366). |
| La sostituzione è meccanica | C'è **una dipendenza nascosta** su `#inspector-opacity-val` (dettaglio 1.4) che, sostituendo lo slider senza accorgersene, smette di funzionare **in silenzio**. |

In più, `main.ts` contiene **due accenti che non esistono nella palette**: viola `#a855f7`
(scheda Move) e ciano `#06b6d4` (scheda Marquee). `design-decisions.md` §2 ammette un solo
accento. Non è una sostituzione meccanica: è una decisione di design, e la segnalo qui
invece di prenderla da solo.

---

## 1. Controlli Slider — 4 blocchi

Tutti e quattro vivono dentro `updateInspector()` (riga 1172), che **ricostruisce il proprio
DOM a ogni chiamata** (`innerHTML = ''` più ricreazione). Conseguenza da tenere presente:
un'istanza di componente non sopravvive tra un render e l'altro — va riassegnata a ogni
`updateInspector()`.

### 1.1 `brush-radius-input`

- **Righe**: 1245-1252 (markup), 1283-1288 (listener)
- **HTML attuale**:

```html
<div style="display: flex; flex-direction: column; gap: 3px;">
  <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--pz-text-secondary);">
    <span>Dimensione (Raggio)</span>
    <span id="brush-radius-val">${brushRadius} px</span>
  </div>
  <input type="range" min="1" max="100" value="${brushRadius}" class="pz-slider-input" style="width: 100%; accent-color: var(--pz-accent-primary); cursor: pointer;" id="brush-radius-input">
</div>
```

- **ID**: `brush-radius-input`, `brush-radius-val`
- **Chi li interroga**: solo il blocco stesso, righe 1283-1284. Nessun altro punto del file.
- **Sostituzione proposta**:

```ts
brushPropsSection.appendChild(
  createSlider({
    id: 'brush-radius-input',
    label: 'Dimensione (Raggio)',
    min: 1,
    max: 100,
    value: brushRadius,
    step: 1,
    unit: ' px',
    onInput: (v) => {
      brushRadius = v;
    },
  })
);
```

- **Nota**: il componente usa `--pz-accent` (via `accent-color` in `styles.css`), non
  `--pz-accent-primary`; sono la stessa cosa, il primo è il nome Pizzart.
- **Rischio**: **Basso**. Gli ID `-val` spariscono, ma nessuno li legge fuori dal blocco
  sostituito: la sincronizzazione dell'etichetta la fa il componente.

### 1.2 `brush-hardness-input`

- **Righe**: 1254-1261 (markup), 1290-1296 (listener)
- **HTML attuale**: identico per struttura al 1.1, con `min="0"`, valore iniziale
  `Math.round(brushHardness * 100)`, etichetta `Durezza (Hardness)`, unità `%`.
- **ID**: `brush-hardness-input`, `brush-hardness-val`
- **Chi li interroga**: solo righe 1290-1291.
- **Sostituzione**: `createSlider({ id: 'brush-hardness-input', label: 'Durezza (Hardness)', min: 0, max: 100, value: Math.round(brushHardness * 100), unit: '%', onInput: (v) => { brushHardness = v / 100.0; } })`
- **Rischio**: **Basso**, come 1.1.

### 1.3 `brush-opacity-input`

- **Righe**: 1263-1270 (markup), 1298-1305 (listener)
- **HTML attuale**: struttura del 1.1, `min="1"`, etichetta `Opacità Tratto`, unità `%`.
- **ID**: `brush-opacity-input`, `brush-opacity-val`
- **Chi li interroga**: solo righe 1298-1299.
- **Sostituzione**: `createSlider({ id: 'brush-opacity-input', label: 'Opacità Tratto', min: 1, max: 100, ... onInput: (v) => { brushOpacity = v / 100.0; brushColorRgba[3] = Math.round(brushOpacity * 255); } })`
- **Attenzione**: `onInput` deve continuare a mutare `brushColorRgba[3]`, altrimenti il
  colore per il motore resta all'alpha precedente.
- **Rischio**: **Basso**.

### 1.4 `inspector-opacity-input` — **il blocco delicato**

- **Righe**: 1359-1396 (costruzione), 1164-1170 (`syncInspectorOpacity`), 1084 (unico
  punto che chiama `syncInspectorOpacity`)
- **HTML e codice attuali** (due elementi distinti):

```ts
// riga 1363: l'etichetta nasce da una stringa
opacityRow.innerHTML = `
  <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--pz-text-secondary);">
    <span>Opacità Livello</span>
    <span id="inspector-opacity-val" style="font-variant-numeric: tabular-nums;">${opacityPct}%</span>
  </div>
`;

// riga 1370: l'input nasce separato
const slider = document.createElement('input');
slider.id = 'inspector-opacity-input';
slider.type = 'range';
slider.min = '0'; slider.max = '100'; slider.value = String(opacityPct);
slider.className = 'pz-slider-input';
slider.style.cssText = `width: 100%; accent-color: var(--pz-accent-primary); cursor: pointer;`;
```

- **Dipendenze**:
  - `syncInspectorOpacity()` (1164) legge **entrambi** gli ID e scrive `.value` e `.textContent`
  - viene chiamata da `renderLayersPanel()` (riga 1084) quando si trascina lo slider di una
    **riga layer** — serve a tenere allineati riga e inspector
- **Problema**: il componente produce **un solo** elemento con ID (l'input) e un'etichetta
  interna con classe `.pz-slider-value`, **senza ID**. Sostituendo alla lettera, `#inspector-opacity-val`
  non esiste più: `syncInspectorOpacity` non lancia errori (ha il guard `if (inspectorVal)`),
  ma **l'etichetta smette di aggiornarsi**. È esattamente il tipo di regressione silenziosa
  che questa fase deve evitare.
- **Due soluzioni, entrambe praticabili**:

| Opzione | Come | Costo | Contro |
|---|---|---|---|
| **A (consigliata)** | tenere un riferimento al componente in una variabile di modulo (`let inspectorOpacitySlider: Slider \| null`), assegnarla in `updateInspector()` e in `syncInspectorOpacity` usare `inspectorOpacitySlider?.setValue(pct)` | nessuna modifica a `ui-kit` | richiede di sostituire `getElementById(...).value = ...` con la chiamata al componente |
| B | aggiungere a `SliderOptions` un `valueId?: string` che dia un ID all'etichetta | modifica a `ui-kit` (piccola) | riapre il pacchetto appena chiuso, per un solo caso |

  L'opzione A usa l'API che il componente espone già (`setValue`), che tra l'altro è stata
  corretta nella 6c-a proprio per non perdere l'unità.

- **Rischio**: **Medio** (non per difficoltà, per silenziosità del guasto). **Mitigazione**:
  dopo la sostituzione, trascinare lo slider di una riga layer e verificare che il valore
  nell'inspector cambi; è un test manuale di 10 secondi che copre esattamente questo caso.

---

## 2. ColorPicker

### 2.1 `brush-color-picker` — l'unico controllo

- **Righe**: 1272-1279 (markup), 1307-1313 (listener)
- **HTML attuale**:

```html
<div style="display: flex; align-items: center; justify-content: space-between; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.06);">
  <span style="font-size: 11px; color: var(--pz-text-secondary);">Colore Tratto</span>
  <div style="display: flex; align-items: center; gap: 8px;">
    <input type="color" value="${brushColorHex}" id="brush-color-picker" style="border: none; width: 28px; height: 26px; border-radius: 4px; cursor: pointer; background: transparent;">
    <span id="brush-color-hex" style="font-family: monospace; font-size: 11px; color: #fff;">${brushColorHex}</span>
  </div>
</div>
```

- **ID**: `brush-color-picker`, `brush-color-hex`
- **Chi li interroga**: solo righe 1307-1308.
- **Sostituzione**:

```ts
const colorRow = document.createElement('div');
colorRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';
const colorLabel = document.createElement('span');
colorLabel.textContent = 'Colore Tratto';
colorRow.append(
  colorLabel,
  createColorPicker({
    id: 'brush-color-picker',
    label: 'Colore tratto',
    value: brushColorHex,
    onChange: (hex) => {
      brushColorHex = hex;
      brushColorRgba = hexToRgba(brushColorHex, brushOpacity);
    },
  })
);
```

- **Nota**: `brush-color-hex` **non va ricreato** — il componente mostra già il valore
  esadecimale (`.pz-color-value`). Va solo verificato che nessuno lo cerchi: nessuno lo fa.
- **Rischio**: **Basso**.

### 2.2 `brush-color-hex`

Non è un controllo: è l'etichetta del 2.1. Sparisce assorbita dal componente. Nessun
riferimento residuo oltre a riga 1308.

---

## 3. Emoji residue — 47 righe, tre categorie

`ui-kit` e `ui-web` sono a zero dalla 6c-a. Restano tutte in `main.ts`.

### 3.1 Testo visibile nella UI — 9 righe (obbligatorie, §1)

| Riga | Contenuto | Sostituzione |
|---|---|---|
| 478 | `<span style="font-size: 20px;">💾</span>` (banner ripristino) | `SaveIcon(20)` |
| 626 | `<div style="font-size: 36px;">📂</div>` (overlay drag & drop) | `FolderOpenIcon(36)` |
| 964 | `label: '➕ Aggiungi Livello Vuoto'` | `Button({ icon: PlusIcon(16), label: 'Aggiungi Livello Vuoto' })` |
| 1185 | `📐 ${width} × ${height} px · 🗂️ ${layerCount} livelli` | testo semplice, oppure `CropIcon`/`LayersIcon` accanto |
| 1194 | `<span>Strumento: ✥ Sposta</span>` | `MoveIcon(16)` + `Sposta` |
| 1228 | `✕ Rimuovi Selezione (Ctrl+D)` | `XIcon(16)` |
| 1241 | `Strumento: 🧹 Gomma / 🖌️ Pennello` | `EraserIcon`/`BrushIcon` |
| 1405 | `👁️ Visibile / 🕶️ Nascosto` | `EyeIcon`/`EyeOffIcon` |
| 1418 | `🗑️ Elimina` | `Trash2Icon` |

Le righe 1405 e 1418 sono i due pulsanti della scheda «Proprietà Livello»: possono diventare
`new Button({ icon: ..., label: ... })`, che il componente `Button` supporta già.

### 3.2 Messaggi di toast — 25 righe (visibili all'utente)

Righe: 268, 288, 292, 298, 318, 325, 362, 374, 378, 385, 397, 401, 408, 420, 424, 431,
443, 447, 576, 582, 587, 608, 614, 1449, 1453.

Sono stringhe tipo `showToast('⚠️ Engine WASM non ancora pronto', 'warning')`. Due strade:

- **A (consigliata)**: togliere l'emoji dalle stringhe e far disegnare l'icona a `showToast()`
  in base a `type` (`CheckIcon`, `AlertCircleIcon`, `InfoIcon`). 25 modifiche di testo + 1
  modifica alla funzione (riga 121).
- B: togliere solo l'emoji, senza icona. Più rapido, ma i toast perdono il segnale visivo
  oltre al colore del bordo.

### 3.3 Log di console — 13 righe (solo sviluppatore)

Righe: 67, 166, 173, 256, 258, 291, 324, 600, 613, 1460, 1471, 1482, 1484.

`design-decisions.md` §1 dice «mai, in nessun contesto», quindi anche questi andrebbero
ripuliti; ma non sono visibili all'utente e non hanno effetto sulla UI. Li metto **per ultimi**,
come pulizia facoltativa: se li lasciamo, il gate non li vede (scansiona `ui-kit` e `ui-web`),
quindi va deciso esplicitamente se estendere il gate ad `apps/web/src`.

---

## 4. Inline style con colori letterali

23 righe con `#hex`, 15 con `rgba(...)`. Raggruppate per tipo di intervento.

### 4.1 Sostituzione diretta con token (nessuna decisione da prendere)

| Riga(e) | Valore | Token |
|---|---|---|
| 168, 255, 465, 1242, 1450 | `#38bdf8` | `var(--pz-accent)` |
| 174 | `#ef4444` | `var(--pz-error)` |
| 259, 1417 | `#f87171` | `var(--pz-error)` |
| 473, 480, 1183, 1277, 1345, 1355 | `#fff` | `var(--pz-text-primary)` |
| 481 | `#94a3b8` | `var(--pz-text-muted)` |
| 1346 | `#a5b4fc` (badge su sfondo accento) | `var(--pz-accent-hover)` |
| 1110, 1111 | `rgba(79,70,229,…)` (vecchio accento) | `var(--pz-accent-subtle)` / `var(--pz-accent-border)` |
| 462 | `rgba(26,27,31,0.96)` | `var(--pz-bg-elevated)` |
| 466 | `rgba(0,0,0,0.6)` | `var(--pz-shadow-popover)` |
| 959, 1126, 1143, 1158 | `rgba(255,255,255,0.08…0.1)` | `var(--pz-border)` |
| 1125, 1142, 1157 | `rgba(255,255,255,0.02…0.03)` | `var(--pz-surface-hover)` |
| 1273 | `rgba(255,255,255,0.06)` | `var(--pz-border)` |
| 1346 | `rgba(99,102,241,0.2)` | `var(--pz-accent-subtle)` |

### 4.2 Da decidere (non è una sostituzione meccanica)

| Riga(e) | Cosa | Perché serve una decisione |
|---|---|---|
| 1114 | testo `#c7d2fe` su card accento | è una tinta lavanda che non esiste in palette: `--pz-text-primary` è la scelta coerente |
| 1195, 1200 | viola `#a855f7` / `#d8b4fe` / `rgba(168,85,247,…)` — scheda Move | **secondo accento non previsto**: §2 ammette solo `--pz-accent` |
| 1211, 1217 | ciano `#06b6d4` / `#67e8f9` / `rgba(6,182,212,…)` — scheda Marquee | idem |
| 1487 | `ctx.fillStyle = '#121316'` (fallback Canvas2D) | è il colore di **clear del canvas**, non della UI: va lasciato o ricavato a runtime, non tokenizzato |
| 75 | `brushColorHex = '#22c55e'` | è il colore **del contenuto** disegnato, non dell'interfaccia |

Le due schede colorate (Move viola, Marquee ciano) sono un residuo del vecchio design: la
scelta è se uniformarle all'accento unico o se introdurre due token semantici nuovi. Non la
prendo io: la propongo come punto 3 della sequenza qui sotto.

---

## 5. Altri controlli costruiti a mano (candidati)

| Zona | Righe | Cosa | Candidato |
|---|---|---|---|
| Banner ripristino autosave | 454-498 | card fissa con bordo `#38bdf8`, emoji, due `<button class="pz-btn …">` | classe `.pz-banner` in `styles.css` + `SaveIcon` + `Button` |
| Overlay drag & drop | 621-631 | già usa `.pz-drag-overlay` dal CSS, ma emoji a 36px inline | `FolderOpenIcon(36)` |
| Pulsante «Aggiungi Livello Vuoto» | 963-976 | `new Button` con emoji nella label | `icon: PlusIcon(16)` |
| Pulsante «Rimuovi Selezione» | 1227-1238 | `<button class="pz-btn pz-btn-secondary">` con emoji, `id="inspector-deselect-btn"` | `Button` + `XIcon`, **conservando l'ID** (`getElementById('inspector-deselect-btn')` a riga 1236); nota: `shell.deselectBtn` in `layout.ts` è un altro pulsante, non va confuso |
| Pulsanti visibilità/elimina livello | 1402-1426 | `createElement` + `cssText` con hex | `Button` + icona |
| Card inspector (stato WASM, documento, strumento, livello) | 1105-1162, 1182-1210 | 4 card con `border-radius: 8px`, bordi e sfondi inline | classi `.pz-card` / `.pz-card-accent` in `styles.css` |

Le card sono il candidato più utile: sono **quattro blocchi quasi identici** con valori
inline leggermente diversi. Una classe sola le normalizza e toglie ~30 righe di stile sparso.

Segnalo anche che `main.ts` definisce **la classe `pz-slider-input` (3 usi) che non esiste in
`styles.css`**: oggi quegli slider sono stilizzati solo dall'`accent-color` inline. Sostituirli
con `Slider` li porta sotto il CSS reale, quindi è un miglioramento, non solo un riordino.

---

## 6. Proposta di esecuzione

Un blocco per volta, con verifica dopo ognuno. Nessun commit che mescoli due categorie.

| # | Intervento | Rischio | Verifica | Tempo |
|---|---|---|---|---|
| **1** | `brush-radius`, `brush-hardness`, `brush-opacity` → `createSlider` | Basso | trascinare i tre slider nel pannello Strumento; disegnare sul canvas e vedere che raggio/durezza/opacità cambiano il tratto | 30 min |
| **2** | `inspector-opacity` → `Slider` + opzione A (`syncInspectorOpacity` via `setValue`) | **Medio** | trascinare lo slider di una **riga layer** e controllare che il valore nell'inspector si allinei; trascinare quello dell'inspector e controllare la riga | 30 min |
| **3** | Scheda Move e scheda Marquee: uniformare viola/ciano all'accento, token al posto degli hex | Medio (è design) | screenshot; decidere prima con il committente | 20 min |
| **4** | I 9 punti con emoji nel testo UI → icone Lucide (inclusi i due pulsanti con `Button`) | Basso | screenshot dell'inspector, del banner e dell'overlay drag | 30 min |
| **5** | Card inspector → classi `.pz-card`; resto degli hex → token | Basso | screenshot; nessun cambio di comportamento atteso | 40 min |
| **6** | Toast: icona in `showToast()` e rimozione delle 25 emoji dai messaggi | Basso | forzare un toast di ogni tipo (salvataggio riuscito, export, errore) | 25 min |
| **7** | *Facoltativo*: le 13 emoji nei `console.*`, ed eventualmente estendere il gate a `apps/web/src` | Basso | `tokens:check` con baseline vuota anche per `main.ts` | 15 min |

Totale stimato: **~3 ore**, più le verifiche in produzione.

### Rischi trasversali

1. **`main.ts` non ha test.** Ogni blocco va verificato a mano in produzione dopo il deploy,
   non solo con `typecheck`. In particolare: il pannello si ricostruisce a ogni
   `updateInspector()`, quindi un errore di costruzione si vede solo interagendo.
2. **Il motore va coinvolto nelle verifiche.** Sostituire uno slider può lasciare intatto il
   DOM e rompere il valore passato a Rust. Il test deve sempre finire con **un tratto disegnato**
   e, dove si tocca l'export, **un file esportato**.
3. **Ordine non negoziabile**: i punti 1 e 2 prima dei punti 4-5. Se si spostano gli stili
   nello stesso momento in cui si sostituiscono i controlli, un eventuale regressione non è
   più attribuibile.
4. **Rollback**: ogni punto è un commit isolato su un solo file (`main.ts`, più eventualmente
   `styles.css`), quindi `git revert` del singolo commit è sempre praticabile.

### Cosa NON propongo di fare

- **Non** toccare `main.ts` e `styles.css` nello stesso commit, tranne nel punto 5 dove la
  classe `.pz-card` richiede entrambi per definizione.
- **Non** convertire le quattro card in componenti `ui-kit`: sono specifiche dell'inspector
  e non hanno un secondo consumatore. Bastano le classi CSS.
- **Non** introdurre `valueId` in `Slider` (opzione B del 1.4) se l'opzione A funziona: il
  pacchetto è appena stato chiuso e non vale riaprirlo per un solo caso.
