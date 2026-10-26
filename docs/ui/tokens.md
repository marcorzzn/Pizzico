# Design tokens

Where the design values live, what they are, and how they are consumed.

> Source of truth: [`docs/ui/design-decisions.md`](design-decisions.md) §2, §3, §5
> (binding, decided 2026-10-26). This document describes the implementation, not
> new decisions.

## Two token layers, on purpose

The repository currently contains two generations of tokens. They coexist
temporarily, and the reason matters more than the mechanics:

| Layer | Files | State | Consumed by |
| --- | --- | --- | --- |
| **v1** | [`colors.ts`][c], [`spacing.ts`][s], [`typography.ts`][t], [`tokens.css`][css] | **live** | `packages/ui-web/src/styles.css` (19 custom properties) |
| **Pizzart** | [`pizzart.ts`][pt], [`pizzart.css`][pcss] | **inert** | nothing yet |

The v1 palette is what the current interface renders. The Pizzart layer holds the
values chosen for Phase 6 and is deliberately inactive: it is declared under
`[data-theme="pizzart"]`, so it only applies when that attribute is present on
the root element. Phase 6a ships the values without changing the appearance.

[c]: ../../packages/ui-kit/src/tokens/colors.ts
[s]: ../../packages/ui-kit/src/tokens/spacing.ts
[t]: ../../packages/ui-kit/src/tokens/typography.ts
[css]: ../../packages/ui-kit/src/tokens/tokens.css
[pt]: ../../packages/ui-kit/src/tokens/pizzart.ts
[pcss]: ../../packages/ui-kit/src/tokens/pizzart.css

Activating it is one attribute:

```ts
document.documentElement.dataset.theme = 'pizzart';
```

Activating it today would **not** restyle the app: the existing components read
v1 names (`--pz-bg-app`, `--pz-accent-primary`, …), and the Pizzart layer
declares its own names (`--pz-bg-canvas`, `--pz-accent`, …). Mapping v1 names
onto Pizzart names — or replacing them — is a Phase 6b/6c decision, because it is
inseparable from rewriting the components.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--pz-bg-canvas` | `#1c1e22` | Canvas surface (from Pizzart's own code) |
| `--pz-bg-panel` | `#1e1e24` | Panels, inspector, layers list |
| `--pz-bg-toolbar` | `#18181b` | Top bar, bottom bar |
| `--pz-border` | `#2d2d35` | Dividers and control outlines |
| `--pz-text-primary` | `#e0e0e0` | Values, labels with emphasis |
| `--pz-text-secondary` | `#a0a0a8` | Field labels, units of measure |
| `--pz-accent` | `#6366f1` | Active state, focus, primary button only |
| `--pz-error` | `#f07864` | Error text and destructive affordances (from Pizzart) |
| `--pz-ok` | `#a0c8a0` | Positive status text (from Pizzart) |

Usage rules from the decision document: the accent is used **sparingly** — never
as a large background. `--pz-text-secondary` is for labels and units, never for
numeric values.

Two Pizzart colours are intentionally **not** interface tokens:
`#ffbe3c` (confirmed selection) and `#78c8ff` (selection in progress). They
describe a real canvas state and stay on the canvas.

## Typography

| Token | Value | Use |
| --- | --- | --- |
| `--pz-font-ui` | `Inter, system-ui, …` | Every UI text |
| `--pz-font-size-small` | `12px` | Field labels, status bar |
| `--pz-font-size-body` | `14px` | Default body text |
| `--pz-font-size-heading` | `16px` | Section headings |
| `--pz-font-size-title` | `20px` | Panel titles |
| `--pz-font-weight-regular` | `400` | Body |
| `--pz-font-weight-medium` | `500` | Headings, labels with emphasis |
| `--pz-font-weight-semibold` | `600` | Titles only |

Weights 300 and 700 are excluded by the decision document. Numeric columns
(opacity, dimensions, coordinates) use `font-variant-numeric: tabular-nums`.

**Unknown at this stage:** Inter is not bundled. The stack declares it and falls
back to `system-ui`, so nothing breaks, but the intended font only appears on
machines that already have it. Whether to ship the font files (and their licence
terms) is a decision for 6b/6c.

## Radius

| Token | Value | Note |
| --- | --- | --- |
| `--pz-radius-sm` | `4px` | Small controls, layer rows |
| `--pz-radius-md` | `6px` | Buttons, inputs |
| `--pz-radius-lg` | `8px` | Panels, popovers |

`design-decisions.md` does not cover radii. These values follow the proposal in
[`docs/design-pizzart/typography.md`](../design-pizzart/typography.md) and differ
from the live v1 radii (`4 / 8 / 12`).

## Spacing

No new tokens were added, because the non-binding proposal and the current
implementation already agree on the required scale. Existing names are kept:

| Value | Token |
| --- | --- |
| 4px | `--pz-space-xs` |
| 8px | `--pz-space-sm` |
| 12px | `--pz-space-md` |
| 16px | `--pz-space-lg` |
| 24px | `--pz-space-xl` |
| 32px | `--pz-space-xxl` |

Fixed by the decision document: panel padding 12px, gap between controls 8px,
layer row height 32px, interactive areas at least 44px below 640px viewport
width.

## Using the tokens

CSS, once the theme is active:

```css
.panel {
  background: var(--pz-bg-panel);
  border: 1px solid var(--pz-border);
  color: var(--pz-text-primary);
  padding: var(--pz-space-md);
  border-radius: var(--pz-radius-lg);
  font-family: var(--pz-font-ui);
}
```

TypeScript, when a value is needed outside CSS:

```ts
import { pizzartTokens } from '@pizzico/ui-kit';

pizzartTokens['--pz-accent']; // '#6366f1'
```

## Verifying

`pizzart.ts` is the source of truth and `pizzart.css` mirrors it by hand, so a
gate keeps them honest:

```bash
pnpm --filter @pizzico/ui-kit tokens:check
```

It fails when the two files diverge, when a custom property is declared twice in
the same block, when a `var(--pz-*)` is used but never declared, or when an emoji
appears outside the recorded baseline. The baseline exists because the current
components still contain 22 emoji that Phase 6a is not allowed to touch; the
check prevents new ones while that debt is paid down in 6c/6d.
