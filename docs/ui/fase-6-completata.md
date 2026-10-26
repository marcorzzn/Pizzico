# Fase 6 — completata

Riepilogo della riscrittura dell'interfaccia: cosa è stato fatto, cosa resta come debito
dichiarato, e cosa sapere prima di toccarla di nuovo.

**Stato: chiusa.** Le sotto-fasi 6a, 6b, 6c-a, 6c-b e 6c-c sono complete, la UI è in
produzione e nessun file usa più i nomi token della generazione precedente.

## Cosa è stato fatto

| Sotto-fase | Contenuto | Commit |
| --- | --- | --- |
| **6a** | Token Pizzart definiti come layer inerte, icon set Lucide generato da sorgenti ufficiali con lock dei digest, gate `tokens:check` con ratchet sulle emoji | `2f61c273f` |
| **6b** | Tema attivo su `:root`, shell ristrutturata (menu in alto, strumenti a destra, pannello 280px con quattro sezioni, barra di stato), 17 emoji di `layout.ts` → icone | `83546d7a5`, `ec272f086` |
| **6c-a** | `Slider` e `ColorPicker` completati (unità, clamp, accessibilità, factory), `LayerRow` con icone per i cinque `LayerKind`, baseline emoji di `ui-kit`/`ui-web` a zero | `52f367039`, `f58df3291` |
| **6c-b** | `main.ts`: i tre slider del pennello e il color picker usano i componenti; opacità livello via `setValue()`; accento unico; 9 emoji di testo → icone; colori inline → token; toast con icona per tipo; 13 emoji di console rimosse | `7997e69d9`, `cc469026c`, `9168e489c`, `be04f1422`, `d67f65ad5` |
| **6c-c** | Barra di stato dinamica, slider con track scuro, card dell'inspector con classe `.pz-card`, rimozione del blocco alias v1, segnaposto Effetti/Maschere chiariti | `69c7024c1`, `04db48c01`, `3d1f01926` |

### Numeri

| | Prima della Fase 6 | Dopo |
| --- | --- | --- |
| Emoji in `ui-kit`, `ui-web`, `apps/web/src` | 22 + 47 | **0** |
| Colori letterali inline in `main.ts` | 23 | **0** (restano i 2 che sono dati di rendering) |
| Classi CSS inesistenti usate dal codice | `pz-slider-input` (4 usi) | **0** |
| Token dichiarati in `:root` | 55 (20 canonici + 35 derivati/alias) | **43** (20 canonici + 23 derivati) |
| Alias v1 residui | 12 | **0** |

## Cosa resta come debito dichiarato

Non blocca nulla, ma va saputo.

1. **`main.ts` non ha test.** Le modifiche della 6b, 6c-b e 6c-c sono state verificate a mano
   in produzione (click su slider, trascinamento di una riga layer, export PNG). Ogni
   sessione futura su quel file eredita lo stesso onere.
2. **`vite build` non gira su questa macchina** (`spawn EPERM` su esbuild): il build lo fa
   Cloudflare e la verifica avviene in produzione, non in locale.
3. **Inter non è inclusa**: la stack la dichiara e ricade su `system-ui`. Decidere se
   spedire i file del font.
4. **Effetti e Maschere sono sezioni vuote dichiarate**: il testo dice che verranno collegate
   quando il motore esporrà gli effetti. Non è una promessa su una fase.
5. **Il track degli slider non ha riempimento a sinistra del thumb**: conseguenza voluta
   dello styling esplicito. Per riaverlo serve uno slider con parte colorata calcolata.
6. **Le aree di tocco sotto 640px** sono fissate a 44px via CSS ma non verificate su un
   dispositivo reale: la Fase 7 (Android) è il posto giusto per farlo.

## Dove guardare

| Cosa | File |
| --- | --- |
| Token e loro uso | [`tokens.md`](tokens.md) |
| Icon set | [`icons.md`](icons.md) |
| Decisioni vincolanti | [`design-decisions.md`](design-decisions.md) |
| Mappatura usata per la 6c-b | [`fase-6c-b-mappatura.md`](fase-6c-b-mappatura.md) |
| Prima/dopo del tema | [`fase-6b-before-after.png`](fase-6b-before-after.png) |
| Invarianza della 6c-a | [`fase-6c-a-invarianza.png`](fase-6c-a-invarianza.png) |
| UI finale (Fase 6c-c) | [`../assets/fase-6c-c-final.png`](../assets/fase-6c-c-final.png) |
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
