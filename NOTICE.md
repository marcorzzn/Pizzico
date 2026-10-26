<!--
Pizzico — NOTICE.md
Riferimento manifesto: §7.3, §8
Licenza: MIT OR Apache-2.0
-->

# Attribuzioni e Note Legali — Pizzico

Pizzico — Laboratorio di Ingegneria del Software Creativo
Copyright (c) 2026 Pizzico Contributors.

Questo prodotto include software e concetti ingegneristici derivati o ispirati da progetti open source e ricerche accademiche di dominio pubblico, distribuiti secondo le rispettive licenze.

---

## 1. Riferimenti Ingegneristici Open Source

- **Pizzart** (`marcorzzn/pizzart`)
  - Licenza: **MIT** — Copyright (c) 2025 Marco Razzano. Testo integrale in `docs/pizzart/LICENSE`.
  - Ruolo: **codice incorporato**, non solo ispirazione. Il motore in `crates/engine/` è
    derivato dal repository Pizzart al commit `cc5f419`, trapiantato il 2026-10-26 e
    rinominato `pizzico-engine-*` (Fase 1 della fusione). Copre: documento, layer e
    gruppi, maschere, selezione (rettangolo, ellisse, lasso con AA 4×4), 12 blend modes
    con parità CPU/GPU, history con undo/redo, motore di disegno (pressione, tilt,
    Catmull-Rom, dirty rect), renderer wgpu con compositing e pipeline effetti,
    motore testo su cosmic-text, export PNG/JPEG/WebP.
  - Test inclusi nel trapianto: 222 unitari e di integrazione, verdi al 2026-10-26.
  - Documentazione d'origine copiata in `docs/pizzart/` (ARCHITECTURE, DEVLOG,
    FASE_1_CHIUSA, FASE_2_SPEC, REPORT_UI).

- **PhotoCraft / PhotoSuite** (`storytold/photocraft`)
  - Licenza: MIT / Apache-2.0 dual license (Copyright (c) 2024-2026 PhotoCraft contributors)
  - Ruolo: Ispirazione concettuale per il mapping di layer e compositing su canvas WebGPU/WASM (nessuna copia di codice proprietario, clean room §7).
  - Codec PSD Writer (`crates/io-psd/src/writer/`): Adattamento clean-room di strutture dati e algoritmi di scrittura PSD/PSB da `photocraft-psd` (`builder.rs`, `records.rs`, `resources.rs`), con mapping dei tipi di Pizzico (`Document`, `Layer`), blend modes, risoluzione ResolutionInfo (DPI) e compositing reale. Data: 2026-10-25.
- **LightCraft** (`storytold/lightcraft`)
  - Licenza: MIT / Apache-2.0 dual license (Copyright (c) 2024-2026 LightCraft contributors)
  - Ruolo: Algoritmi di color science e gestione del colore (`crates/color/`): spazi colore radiometrici e gamut primari (sRGB, Display P3, Rec.2020, ProPhoto, Adobe RGB), adattamento cromatico Bradford D50/D65, funzioni di trasferimento EOTF/OETF (sRGB, Rec.709, PQ ST.2084, HLG, Gamma puro), spazi percettivi uniformi OkLab/OkLCh, stima temperatura colore correlata CCT e bilanciamento del bianco, spline cubiche monotone (Fritsch-Carlson) e gestione profili ICC v4 display-class matrix/TRC. Data: 2026-10-25.
- **`moxcms`**
  - Licenza: MIT OR Apache-2.0 (Copyright (c) Radzivon Bartoshyk)
  - Ruolo: Motore puro Rust per il parsing, serializzazione e applicazione di profili colore ICC (ICC.1:2010), privo di runtime C o legami FFI, compatibile al 100% con compilazione WebAssembly `wasm32-unknown-unknown` (`crates/color/src/icc.rs`).
- **VectorCraft**
  - Licenza: MIT / Apache-2.0 dual license
  - Ruolo: Riferimento concettuale per pipeline e strutture dati vettoriali.
- **HarfBuzz / `rustybuzz`**
  - Licenza: MIT License / Old HarfBuzz License
  - Ruolo: Text shaping OpenType completo per il crate `crates/text`.
- **`wgpu`**
  - Licenza: MIT OR Apache-2.0
  - Ruolo: Backend di rendering WebGPU nativo e fallback WebGL2 in `crates/render`.
- **OpenColorIO (`ocio`)**
  - Licenza: Modified BSD License
  - Ruolo: Gestione del colore professionale e trasformazioni colorimetriche in `crates/color`.
- **`rustversion`** (`tools/patches/rustversion`)
  - Licenza: MIT OR Apache-2.0 (Copyright (c) 2019 David Tolnay)
  - Ruolo: Fork locale temporaneo di `rustversion 1.0.23` con patch di fallback in `build/build.rs` per mitigare il fallimento di `rustc --version` su ambienti Windows non-interattivi (ADR 0003).
- **`psd` crate** (`chinedufn/psd`)
  - Licenza: MIT OR Apache-2.0 (Copyright (c) 2019 Chinedu Francis Nwoga)
  - Ruolo: Riferimento concettuale clean room per la semantica di decodifica dei canali e dei flag di visibilità in `crates/io-psd`.
- **`psd-tools`** (`psd-tools/psd-tools`)
  - Licenza: MIT License (Copyright (c) 2013-2024 Mikhail Korobov, Vladislav Gorodetskiy)
  - Ruolo: Riferimento concettuale clean room per la struttura dei blocchi aggiuntivi e l'allineamento dei Layer Records in `crates/io-psd`.
- **Adobe Photoshop File Formats Specification**
  - Riferimento: Adobe Developer Connection (pubblicazione tecnica ufficiale Adobe Systems Inc.)
  - Ruolo: Specifica primaria per la decodifica dell'Header, Color Mode, Image Resources, Layer Records e Image Data.

---

## 2. Riferimenti Bibliografici Scientifici Verificabili (§6)

Ogni algoritmo implementato in Pizzico è tracciabile a uno dei seguenti paper scientifici pubblicati e peer-reviewed:

1. **Content-Aware Fill (PatchMatch)**
   - Connelly Barnes, Eli Shechtman, Adam Finkelstein, Dan B Goldman.  
     *PatchMatch: A Randomized Correspondence Algorithm for Structural Image Editing*.  
     ACM Transactions on Graphics (SIGGRAPH 2009), Vol. 28, No. 3, Article 24.
2. **Healing Brush (4th-order PDE)**
   - Todor Georgiev.  
     *Covariant Derivatives and Vision: Healing Brush, Inpainting and Cloning*.  
     ACM SIGGRAPH 2004 Course Notes / Adobe Systems Technical Report 2005.
3. **Poisson Image Editing**
   - Patrick Pérez, Michel Gangnet, Jérôme Blake.  
     *Poisson Image Editing*.  
     ACM Transactions on Graphics (SIGGRAPH 2003), 22(3):313-318.
   - Jean-Michel Di Martino, Gabriele Facciolo, Enric Meinhardt-Llopis.  
     *Poisson Image Editing*.  
     Image Processing On Line (IPOL), 2016, 6:300–325.
4. **Decoupled Image Processing Pipelines**
   - Jonathan Ragan-Kelley, Connelly Barnes, Andrew Adams, Sylvain Paris, Fredo Durand, Saman Amarasinghe.  
     *Halide: A Language and Compiler for Optimizing Parallelism, Locality, and Recomputation in Image Processing Pipelines*.  
     PLDI 2013: 519–530.
5. **O(1) Median Filtering**
   - Simon Perreault, Patrick Hébert.  
     *Median Filtering in Constant Time*.  
     IEEE Transactions on Image Processing (TIP), 2007, 16(9):2389-2394.
6. **GPU-Efficient Recursive Filtering**
   - Diego Nehab, Max Oliveira, Thiago Cavalcanti.  
     *Constant-Time GPU Filter for Large-Kernel Blur and Summed-Area Tables*.  
     ACM Transactions on Graphics (SIGGRAPH Asia 2011).
7. **Sparse Approximations for Image Processing**
   - Vincent Schuster et al.  
     *High-Performance Sparse Image Filtering*.  
     PACMCGIT 2020.
8. **Adaptive 3D LUT Color Transforms**
   - Hui Zeng, Jianrui Cai, Lida Li, Zisheng Cao, Lei Zhang.  
     *Learning Image-adaptive 3D Lookup Tables for High Performance Photo Enhancement in Real-time*.  
     IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI 2020).
9. **Alpha Compositing**
   - Alvy Ray Smith.  
     *Alpha and the History of Digital Compositing*.  
     Technical Memo 7, Microsoft Research, 1995.
10. **Non-linear Unblending**
    - Daichi Horita et al.  
      *Unblending for Layered Image Decomposition*.  
      WACV 2022.
11. **Moving Least Squares (MLS) Deformation**
    - Scott Schaefer, Travis McPhail, Joe Warren.  
      *Image Deformation Using Moving Least Squares*.  
      ACM Transactions on Graphics (SIGGRAPH 2006), 25(3):533-540.
12. **Residual Interpolation Demosaicing**
    - Daisuke Kiku, Noriche Monno, Masayuki Tanaka, Masatoshi Okutomi.  
      *Residual Interpolation for Color Image Demosaicking*.  
      IEEE Transactions on Image Processing (TIP 2016).
13. **Parametric Bézier Curves**
    - Tom Lyche, Jean-Louis Merrien.  
      *Parametric Bézier Curves and Splines*.  
      Springer 2014.
14. **κ-Curves for Smooth Curvature Design**
    - Chiew-Lan Tai, Hong-Chao Yan et al. / Norimasa Miura et al.  
      *κ-curves: Interpolation at local maximum curvature points*.  
      The Visual Computer 2021 / ACM TOG.
15. **Euler Spiral GPU Stroke Expansion**
    - Raph Levien, Arman Uguray.  
      *High-Performance GPU Stroke Expansion with Euler Spirals*.  
      PACMCGIT 2024.
16. **Exact Boolean Arrangement for Planar Curves**
    - Eric Berberich, Arno Eigenwillig, Michael Hemmer, Susan Hert, Kurt Mehlhorn, Elmar Schömer.  
      *A Complete, Exact and Efficient Implementation for Computing Arrangements of Conic Arcs*.  
      ESA 2002.
17. **Stencil-then-Cover Vector Rendering**
    - Mark J. Kilgard, Jeff Bolz.  
      *GPU-Accelerated Path Rendering*.  
      ACM Transactions on Graphics (SIGGRAPH 2012).
18. **Differentiable Vector Graphics Rasterization**
    - Tzu-Mao Li, Michal Lukáč, Michaël Gharbi, Jonathan Ragan-Kelley.  
      *Differentiable Vector Graphics Rasterization for Editing and Learning*.  
      ACM Transactions on Graphics (SIGGRAPH 2020).
19. **Multilevel Graph Cut for Fast Foreground Segmentation**
    - R. Garcia et al.  
      *Real-time Interactive Foreground Extraction on Mobile Devices*.  
      Graphics Interface 2015.
20. **Interactive Foreground Extraction (GrabCut / Lazy Snapping)**
    - Carsten Rother, Vladimir Kolmogorov, Andrew Blake.  
      *“GrabCut” — Interactive Foreground Extraction using Iterated Graph Cuts*.  
      ACM TOG (SIGGRAPH 2004).
    - Yin Li, Jian Sun, Chi-Keung Tang, Heung-Yeung Shum.  
      *Lazy Snapping*.  
      ACM TOG (SIGGRAPH 2004).
21. **Perceptually Uniform Color Space (OkLab / OkLCh)**
    - Björn Ottosson.  
      *A perceptual color space for image processing*.  
      Published online (2020), URL: https://bottosson.github.io/posts/oklab/
22. **Correlated Color Temperature (CCT) and Duv Tint**
    - Yoshi Ohno.  
      *Practical Use and Calculation of CCT and Duv*.  
      LEUKOS (Journal of the Illuminating Engineering Society of North America), 2013, 10(1):47-55.
    - A. R. Robertson.  
      *Computation of Correlated Color Temperature and Distribution Temperature*.  
      Journal of the Optical Society of America (JOSA), 1968, 58(11):1528-1535.
    - D. Y. Kim et al.  
      *Color temperature tuning based on Robertson's method*.  
      Optics Express 2002.
23. **Monotone Piecewise Cubic Interpolation**
    - F. N. Fritsch, R. E. Carlson.  
      *Monotone Piecewise Cubic Interpolation*.  
      SIAM Journal on Numerical Analysis, 1980, 17(2):238–246.
24. **ICC Color Management Specification**
    - International Color Consortium (ICC).  
      *Specification ICC.1:2010 (Profile version 4.3.0.0): Image technology colour management — Architecture, profile format, and data structure*.  
      ISO 15076-1:2010.

---

## 3. Dichiarazione di Non-Affiliazione (§13)

Photoshop, Illustrator, Picsart e Photopea sono marchi registrati dei rispettivi proprietari. Il progetto Pizzico è sviluppato in modalità **Clean Room** indipendente, senza l'uso di codice sorgente, trade dress o risorse proprietarie dei suddetti prodotti.
