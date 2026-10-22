<!--
Pizzico — docs/algorithms/psd-format.md
Riferimento manifesto: §6.5, §7
Licenza: MIT OR Apache-2.0
-->

# Specifica Formato Adobe Photoshop (PSD / PSB) e Motore di Parsing

## 1. Riferimenti Ufficiali e Principi di Clean Room
- **Specifica Ufficiale Adobe**: [Adobe Photoshop File Formats Specification](https://www.adobe.com/devnet-apps/photoshop/fileformatashtml/) (Adobe Developer Connection, revisione ufficiale).
- **Riferimento Clean Room (§7)**: L'implementazione in `crates/io-psd` è condotta seguendo principi formali di ingegneria inversa pulita, partendo dalla specifica documentata di Adobe e validata tramite test black-box sul corpus in `tests/psd-corpus/`.
- **Attribuzioni e Progetti di Riferimento (§7.3)**: 
  - `PhotoCraft` / `PhotoSuite` (`storytold/photocraft`, MIT/Apache-2.0) per confronto su strutture dati e terminologia.
  - `psd` crate (Rust, MIT/Apache-2.0) e `psd-tools` (Python, MIT).
  - Tali riferimenti sono tracciati in [NOTICE.md](file:///c:/Progetti/Pizzico/NOTICE.md).

---

## 2. Struttura Binaria del Formato PSD / PSB

Tutti i dati all'interno di un file PSD sono codificati in formato **Big-Endian** (Network Byte Order). Il file è suddiviso in 5 macro-sezioni consecutive:

```text
┌──────────────────────────────────────────────┐
│ 1. File Header (26 bytes)                    │
├──────────────────────────────────────────────┤
│ 2. Color Mode Data Section (Length + Data)   │
├──────────────────────────────────────────────┤
│ 3. Image Resources Section (8BIM Blocks)     │
├──────────────────────────────────────────────┤
│ 4. Layer and Mask Information Section        │
│    ├── Layer Info (Layer Records + Channels) │
│    └── Global Mask & Additional Info         │
├──────────────────────────────────────────────┤
│ 5. Image Data Section (Composite Image)      │
└──────────────────────────────────────────────┘
```

---

### Sezione 1: File Header (26 bytes fixed)

| Offset | Lunghezza | Tipo | Nome | Descrizione |
|---|---|---|---|---|
| `0` | 4 bytes | `[u8; 4]` | `signature` | Signature fissa: `'8BPS'` (`0x38 0x42 0x50 0x53`) |
| `4` | 2 bytes | `u16` | `version` | `1` per PSD standard; `2` per PSB (Large Document Format) |
| `6` | 6 bytes | `[u8; 6]` | `reserved` | 6 byte riservati, obbligatoriamente a zero (`0x00`) |
| `12` | 2 bytes | `u16` | `channels` | Numero di canali nell'immagine (1–56) |
| `14` | 4 bytes | `u32` | `height` | Altezza dell'immagine in pixel (1–30.000 per PSD, 1–300.000 per PSB) |
| `18` | 4 bytes | `u32` | `width` | Larghezza dell'immagine in pixel (1–30.000 per PSD, 1–300.000 per PSB) |
| `22` | 2 bytes | `u16` | `depth` | Profondità colore: `1`, `8`, `16`, o `32` bit per canale |
| `24` | 2 bytes | `u16` | `color_mode` | Bitmap (0), Grayscale (1), Indexed (2), RGB (3), CMYK (4), Multichannel (7), Duotone (8), Lab (9) |

---

### Sezione 2: Color Mode Data

| Offset | Lunghezza | Tipo | Descrizione |
|---|---|---|---|
| `0` | 4 bytes | `u32` | Lunghezza della sezione in byte (`N`). |
| `4` | `N` bytes | `[u8]` | Dati della modalità colore (tavolozza di 768 byte per Indexed; curve per Duotone; 0 per RGB/CMYK). |

---

### Sezione 3: Image Resources

Contiene metadati del documento suddivisi in blocchi sequenziali:
- **Length** (4 bytes `u32`): lunghezza totale della sezione.
- Sequenza di **Image Resource Blocks**:
  - `signature` (4 bytes): tipicamente `'8BIM'` (`0x38 0x42 0x49 0x4D`).
  - `resource_id` (2 bytes `u16`): es. `0x03ED` (ResolutionInfo DPI), `0x0400` (Layer State Info), `0x0408` (Guide e griglie).
  - `name`: Pascal string (1 byte lunghezza $L$, seguito da $L$ byte di caratteri). Padded con byte nullo se $L$ è pari affinché la dimensione totale (incluso il byte di lunghezza) sia pari.
  - `size` (4 bytes `u32`): dimensione dei dati del blocco.
  - `data` (`size` bytes): dati del blocco, seguiti da un eventuale byte di padding a 0 per garantire allineamento a 2 byte.

---

### Sezione 4: Layer and Mask Information

La sezione fondamentale per la ricostruzione dell'albero dei livelli:

#### 4.1 Intestazione Sezione
- `section_length` (4 bytes per PSD, 8 bytes per PSB).
- Se `section_length > 0`:
  - `layer_info_length` (4 bytes per PSD, 8 bytes per PSB).
  - `layer_count` (2 bytes `i16`, intero con segno):
    - Se $C > 0$: numero di livelli presenti.
    - Se $C < 0$: $|C|$ è il numero di livelli, e il primo canale alpha dell'immagine unita contiene la trasparenza del risultato composito.

#### 4.2 Layer Records (per ciascun livello)
- **Coordinate del rettangolo** ($top, left, bottom, right$): 4 interi a 32 bit con segno (`i32`).
- **Channel Count** (2 bytes `u16`): numero di canali nel livello.
- **Channel Info array** ($6 \times \text{channels}$ bytes per PSD, $10 \times \text{channels}$ per PSB):
  - `channel_id` (2 bytes `i16`):
    - `0` = Canale Rosso (o Grigio)
    - `1` = Canale Verde
    - `2` = Canale Blu
    - `-1` = Maschera di trasparenza (Alpha del livello)
    - `-2` = Maschera utente del livello
    - `-3` = Real user mask
  - `channel_data_length` (4 bytes per PSD, 8 bytes per PSB): dimensione dei dati compressi del canale.
- **Blend Mode Signature** (4 bytes): `'8BIM'`.
- **Blend Mode Key** (4 bytes ASCII):
  - `'norm'` = Normal
  - `'mul '` = Multiply
  - `'scrn'` = Screen
  - `'over'` = Overlay
  - `'dark'` = Darken
  - `'lite'` = Lighten
  - `'div '` = Color Dodge
  - `'idiv'` = Color Burn
  - `'hLit'` = Hard Light
  - `'sLit'` = Soft Light
  - `'diff'` = Difference
  - `'smud'` = Exclusion
  - `'pass'` = Pass Through (Gruppi)
- **Opacity** (1 byte `u8`): `0` = trasparente, `255` = opaco.
- **Clipping** (1 byte `u8`): `0` = base, `1` = non-base.
- **Flags** (1 byte `u8`):
  - bit 0: trasparenza protetta
  - bit 1: **visibilità** (`0` = visibile, `1` = **invisibile** secondo specifica Adobe)
  - bit 2: obsoleto
  - bit 3: `1` se il bit 4 contiene informazioni utili
  - bit 4: dati pixel irrilevanti per l'aspetto
- **Filler** (1 byte): `0x00`.
- **Extra Data Length** (4 bytes `u32`):
  - `mask_data_length` (4 bytes) + dati maschera
  - `blending_ranges_length` (4 bytes) + dati blending ranges
  - `name`: Pascal string con padding a multipli di 4 byte.
  - `additional_info`: blocchi aggiuntivi con signature `'8BIM'`/`'8B64'` (es. `'lsct'` per sezioni e gruppi).

#### 4.3 Channel Image Data
I dati effettivi dei canali seguono immediatamente i Layer Records. Per ciascun canale di ciascun livello:
- `compression` (2 bytes `u16`):
  - `0`: Raw (dati non compressi)
  - `1`: RLE PackBits (algoritmo Macintosh PackBits)
  - `2`: ZIP senza predizione
  - `3`: ZIP con predizione
- Se RLE:
  - Tabella delle lunghezze delle scansioni: per ogni riga ($height = bottom - top$), 2 byte `u16` indicano la dimensione del flusso RLE compresso di quella riga.
  - Flusso di byte PackBits per ciascuna scansione.

---

### Sezione 5: Image Data (Composite Image)

Contiene l'immagine unita "Maximize Compatibility":
- `compression` (2 bytes `u16`): `0` = Raw, `1` = RLE PackBits.
- Se RLE: array di lunghezze di scansione per $channels \times height$ righe, seguito dai byte compressi di ciascun canale piano per piano.

---

## 3. Algoritmo di Decompressione PackBits (Apple RLE)

La decompressione opera su singoli byte:
Sia $b$ un byte interpretato come intero con segno a 8 bit (`i8`):
1. **$0 \le b \le 127$**: Copia letterale dei successivi $b + 1$ byte dall'input all'output.
2. **$-127 \le b \le -1$**: Ripeti il byte successivo $(-b) + 1$ volte nell'output.
3. **$b = -128$ (`0x80`)**: Valore no-op (ignorato / saltato).

La decodifica termina quando il buffer di output raggiunge la dimensione attesa di una scansione ($width$ pixel).
