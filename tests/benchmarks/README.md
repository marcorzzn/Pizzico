<!--
Pizzico — tests/benchmarks/README.md
Riferimento manifesto: §2, §6, §11 Step 7
Licenza: MIT OR Apache-2.0
-->

# Obiettivi di Performance e Benchmark Scientifici

Nessun algoritmo o filtro entra nella release stabile di Pizzico se non rispetta le metriche prestazionali minime stabilite in questo documento (misurate su hardware desktop medio e dispositivi mobile di fascia media).

---

## 1. Obiettivi Prestazionali Quantitativi

| Operazione / Filtro | Risoluzione Test | Target Tempo Massimo | FPS Target | Algoritmo di Riferimento |
|---|---|---|---|---|
| **Compositing 5 livelli RGBA** | 4K ($3840 \times 2160$) | $< 16.6\text{ ms}$ | 60 FPS stabili | WebGPU Pipeline / Smith 1995 |
| **Box Blur O(1) ricorsivo** ($R = 50\text{px}$) | 12 Megapixel ($4000 \times 3000$) | $< 35\text{ ms}$ | Interattivo | Nehab et al. 2011 |
| **Filtro Mediano O(1)** ($R = 5\text{px}$) | 4 Megapixel ($2000 \times 2000$) | $< 50\text{ ms}$ | Interattivo | Perreault & Hébert 2007 |
| **Applicazione 3D LUT (33³)** | 4K ($3840 \times 2160$) | $< 2.0\text{ ms}$ | 60 FPS stabili | Zeng et al. 2020 |
| **Deformazione Liquify MLS** | 2 Megapixel ($1920 \times 1080$) | $< 8.0\text{ ms}$ | 60 FPS stabili | Schaefer et al. 2006 |
| **Multilevel Graph Cut (Rimozione Sfondo)** | 1080p ($1920 \times 1080$) | $< 120\text{ ms}$ | Feedback immediato | Garcia et al. 2015 |
| **PatchMatch Content-Aware Fill** ($200 \times 200\text{px}$ hole) | 2 Megapixel | $< 400\text{ ms}$ | Feedback immediato | Barnes et al. 2009 |
| **Stroke Expansion Vettoriale (1000 nodi)** | 1000 punti | $< 1.5\text{ ms}$ | 60 FPS stabili | Levien & Uguray 2024 |
| **Text Shaping HarfBuzz (1000 caratteri)** | Testo misto OpenType | $< 4.0\text{ ms}$ | Istantaneo | `rustybuzz` |

---

## 2. Metodologia di Misurazione
- Benchmark eseguiti con `tools/benchmark` via Criterion.rs per il core Rust nativo e WASM.
- Benchmark su browser tramite `performance.now()` ad alta precisione con test multi-run (10 iterazioni, scarto dei valori anomali).
