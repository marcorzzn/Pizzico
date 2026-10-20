<!--
Pizzico — docs/algorithms/stencil-then-cover.md
Riferimento manifesto: §6.2
Licenza: MIT OR Apache-2.0
-->

# Rendering Vettoriale GPU — Stencil-then-Cover

## 1. Paper di Riferimento
- **Autori**: Mark J. Kilgard, Jeff Bolz (NVIDIA)
- **Titolo**: *GPU-Accelerated Path Rendering*
- **Pubblicazione**: ACM Transactions on Graphics (SIGGRAPH 2012), 31(6), Article 152.
- **Riferimento Standard**: NV_path_rendering OpenGL extension.

---

## 2. Formulazione e Fasi di Rendering

Per renderizzare percorsi vettoriali arbitrari (anche auto-intersecanti e con buchi interni) senza triangolazione CPU preventiva:

### Passo 1: Stencil Pass (Geometria Invisibile)
- Disegna una serie di triangoli a ventaglio che collegano un punto centrale a ogni segmento del contorno.
- Disattiva la scrittura sul color buffer (`colorWriteMask = 0`).
- Configura lo Stencil Buffer con operazione `INVERT` o incremento/decremento a seconda dell'orientamento del triangolo (regole *Non-Zero Winding* o *Even-Odd*).

### Passo 2: Cover Pass (Raster finale)
- Disegna il bounding box conservativo (o la mesh convessa) del percorso.
- Attiva la scrittura sul color buffer con test di stencil abilitato (`stencilRef != 0`).
- Solo i pixel interni al tracciato ricevono il colore, sfumatura o shader texture finale.

---

## 3. Note Implementative
- **Collocazione**: `crates/render/src/stencil_cover.rs`.
- Esecuzione diretta su pipeline WebGPU via WGSL shaders.
