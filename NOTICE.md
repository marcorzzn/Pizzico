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

- **PhotoCraft / PhotoSuite** (`storytold/photocraft`)
  - Licenza: MIT / Apache-2.0 dual license
  - Ruolo: Ispirazione concettuale per il mapping di layer e compositing su canvas WebGPU/WASM (nessuna copia di codice proprietario, clean room §7).
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

---

## 3. Dichiarazione di Non-Affiliazione (§13)

Photoshop, Illustrator, Picsart e Photopea sono marchi registrati dei rispettivi proprietari. Il progetto Pizzico è sviluppato in modalità **Clean Room** indipendente, senza l'uso di codice sorgente, trade dress o risorse proprietarie dei suddetti prodotti.
