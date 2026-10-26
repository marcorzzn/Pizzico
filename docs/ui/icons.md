# Icon set

The product uses a single SVG icon set. No emoji, no icon fonts, no raster
assets.

- **Source**: [Lucide](https://lucide.dev) `v1.61.0`
- **Licence**: ISC — compatible with this project's MIT OR Apache-2.0
- **Location**: [`packages/ui-kit/src/icons/index.ts`][icons]
- **Provenance**: [`packages/ui-kit/src/icons/icons.lock.json`][lock] records the
  source URL and the SHA-256 of every icon file the module was generated from.

[icons]: ../../packages/ui-kit/src/icons/index.ts
[lock]: ../../packages/ui-kit/src/icons/icons.lock.json

## Why a generated module instead of hand-written SVG

The path geometry comes from the upstream icon files, not from memory. Hand-typing
25 SVG paths produces icons that compile, render, and are subtly wrong — the kind
of defect nobody notices until the toolbar looks off.

Regenerate after changing the icon list or the Lucide version:

```bash
pnpm --filter @pizzico/ui-kit icons:gen
```

The generator ([`scripts/gen-icons.mjs`][gen]) validates every icon before
writing it: `viewBox="0 0 24 24"`, `stroke="currentColor"`, `fill="none"`, and at
least one drawable child element. A missing or malformed icon fails the run
instead of silently producing an empty glyph.

[gen]: ../../packages/ui-kit/scripts/gen-icons.mjs

## Available icons

36 icons, exported both by name and through a generic `icon()` helper.

### Tools

| Export | Lucide name |
| --- | --- |
| `MoveIcon` | `move` |
| `SquareDashedIcon` | `square-dashed` |
| `BrushIcon` | `brush` |
| `EraserIcon` | `eraser` |
| `PenIcon` | `pen` |
| `SplineIcon` | `spline` |
| `WandSparklesIcon` | `wand-sparkles` |
| `CropIcon` | `crop` |
| `HandIcon` | `hand` |
| `PipetteIcon` | `pipette` |
| `SquareIcon` | `square` |
| `CircleIcon` | `circle` |
| `TypeIcon` | `type` |
| `ZoomInIcon` | `zoom-in` |
| `ZoomOutIcon` | `zoom-out` |

### Actions

| Export | Lucide name |
| --- | --- |
| `UndoIcon` | `undo` |
| `RedoIcon` | `redo` |
| `SaveIcon` | `save` |
| `FolderOpenIcon` | `folder-open` |
| `DownloadIcon` | `download` |
| `UploadIcon` | `upload` |
| `Trash2Icon` | `trash-2` |
| `PlusIcon` | `plus` |
| `EyeIcon` | `eye` |
| `EyeOffIcon` | `eye-off` |
| `LayersIcon` | `layers` |
| `SlidersIcon` | `sliders` |
| `PaletteIcon` | `palette` |
| `SparklesIcon` | `sparkles` |
| `SunIcon` | `sun` |
| `CommandIcon` | `command` |
| `ChevronDownIcon` | `chevron-down` |

### Status

| Export | Lucide name |
| --- | --- |
| `CheckIcon` | `check` |
| `XIcon` | `x` |
| `AlertCircleIcon` | `circle-alert` |
| `InfoIcon` | `info` |

## Usage

```ts
import { PenIcon, icon, iconNames } from '@pizzico/ui-kit';

PenIcon();            // 16px, the toolbar and list-row size
PenIcon(20);          // 20px, primary buttons
icon('eraser', 16);   // same thing by name
iconNames;            // ['brush', 'check', …] — useful for specimens and tests
```

> Import from `@pizzico/ui-kit`, not from a subpath: the package exposes a single
> entry (`src/index.ts`) and has no `exports` map, so `@pizzico/ui-kit/icons`
> would not resolve.

Each function returns an SVG **string**:

```html
<svg class="lucide lucide-pen" width="16" height="16" viewBox="0 0 24 24"
     fill="none" stroke="currentColor" stroke-width="2"
     stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true" focusable="false">…</svg>
```

## Colour

Icons use `stroke="currentColor"` and carry **no** hardcoded colour. They inherit
the text colour of whatever they sit in:

```css
.tool-button { color: var(--pz-text-primary); }
.tool-button[aria-pressed='true'] { color: var(--pz-accent); }
```

Lucide's `palette` icon includes a few `fill="currentColor"` dots; that is part of
its design and still follows the inherited colour.

## Sizes

Two sizes only, per [`design-decisions.md`](design-decisions.md) §4:

| Size | Where |
| --- | --- |
| 16px | Toolbar, layer rows, inline labels |
| 20px | Primary buttons |

## Accessibility

Icons are decorative: they render with `aria-hidden="true"` and `focusable="false"`,
so screen readers skip them. The accessible name belongs to the control that
contains the icon:

```html
<button class="tool-button" aria-label="Pennello" aria-pressed="true">
  ${PenIcon(16)}
</button>
```

Never rely on the icon alone to convey state: pair it with `aria-pressed`,
`title`, or a visible label.
