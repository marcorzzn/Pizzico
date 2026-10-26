# Algorithm Specifications

One specification card per non-trivial algorithm, each tracing the implementation
back to a public standard or a peer-reviewed paper. This directory is the
project's main defence for the clean-room claim: if an algorithm has no card and
no citation, it is not ready to be implemented.

## Raster and filters

| Card | Subject |
| --- | --- |
| [compositing.md](compositing.md) | Layer compositing and blend modes (Porter–Duff). |
| [median-filter.md](median-filter.md) | Median filter for noise reduction. |
| [recursive-filter.md](recursive-filter.md) | Recursive (IIR) approximations of Gaussian filters. |
| [sparse-filtering.md](sparse-filtering.md) | Sparse and guided filtering for edge-aware operations. |
| [demosaicing.md](demosaicing.md) | Raw sensor demosaicing. |
| [halide-pipeline.md](halide-pipeline.md) | Scheduling rationale for stencil pipelines. |

## Color

| Card | Subject |
| --- | --- |
| [color-management.md](color-management.md) | Color spaces, ICC handling, and transfer functions. |
| [lut3d.md](lut3d.md) | 3D LUT application and interpolation. |

## Vector and geometry

| Card | Subject |
| --- | --- |
| [bezier.md](bezier.md) | Bézier curve evaluation and flattening. |
| [boolean-pathfinder.md](boolean-pathfinder.md) | Boolean path operations (union, subtract, intersect). |
| [kappa-curves.md](kappa-curves.md) | Kappa curve corner smoothing. |
| [stroke-expansion.md](stroke-expansion.md) | Stroke to outline expansion. |
| [diffvg-rasterize.md](diffvg-rasterize.md) | Differentiable vector rasterization. |

## GPU rendering

| Card | Subject |
| --- | --- |
| [stencil-then-cover.md](stencil-then-cover.md) | Stencil-then-cover GPU path rendering. |

## Image restoration and editing

| Card | Subject |
| --- | --- |
| [patchmatch.md](patchmatch.md) | PatchMatch nearest-neighbour field search. |
| [poisson-editing.md](poisson-editing.md) | Poisson (seamless) image editing. |
| [healing-brush.md](healing-brush.md) | Healing brush and texture synthesis. |
| [liquify.md](liquify.md) | Liquify warping. |

## Segmentation and matting

| Card | Subject |
| --- | --- |
| [grabcut.md](grabcut.md) | GrabCut interactive segmentation. |
| [graphcut-segmentation.md](graphcut-segmentation.md) | Graph-cut energy minimisation. |

## Text and formats

| Card | Subject |
| --- | --- |
| [harfbuzz-text.md](harfbuzz-text.md) | Text shaping and layout. |
| [psd-format.md](psd-format.md) | Adobe PSD file format, from the public specification. |

## Adding a card

Each card should state the problem, the chosen algorithm, the properties and
complexity, the reference (DOI, ISBN, or official specification URL), and any
deliberate deviations from the reference.
