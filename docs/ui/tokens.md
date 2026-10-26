# Design tokens

Where the design values live, what they are, and how they are consumed.

> Source of truth: [`docs/ui/design-decisions.md`](design-decisions.md) §2, §3, §5
> (binding, decided 2026-10-26). This document describes the implementation, not
> new decisions.

## One theme, active

Since Phase 6b the Pizzart theme **is** the interface. Up to Phase 6a the values
sat in an inert layer scoped to `[data-theme="pizzart"]`; that layer was removed
and the values moved into `:root`.

The token file has four sections, in this order:

| Section | Content | Nature |
| --- | --- | --- |
| **1. Token Pizzart** | The 20 values from the decision document | Source of truth |
| **2. Derivati** | Hover/overlay/shadow values computed from the above | Implementation detail |
| **3. Spaziature** | The §5 scale | Unchanged from v1 — it was already compliant |
| **4. Alias v1** | Old names pointing at new tokens | Temporary bridge, removed in 6c/6d |

The TypeScript mirror is [`pizzart.ts`][pt]: it holds section 1 only, and
[`scripts/check-tokens.mjs`][gate] fails if it diverges from `tokens.css`.

[pt]: ../../packages/ui-kit/src/tokens/pizzart.ts
[gate]: ../../packages/ui-kit/scripts/check-tokens.mjs

### Why the aliases exist

The components written before Phase 6 read v1 names (`--pz-bg-app`,
`--pz-accent-primary`, `--pz-font-sans`, …). The alias block points each of them
at its Pizzart counterpart, so those components restyle without being touched:

```css
--pz-bg-app: var(--pz-bg-canvas);
--pz-accent-primary: var(--pz-accent);
--pz-font-sans: var(--pz-font-ui);
```

Components rewritten in 6c/6d should use the Pizzart names directly; once no
consumer is left, section 4 is deleted.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `--pz-bg-canvas` | `#1c1e22` | Canvas surface (from Pizzart's own code) |
| `--pz-bg-panel` | `#1e1e24` | Panels, inspector, layers list |
| `--pz-bg-toolbar` | `#18181b` | Top bar, bottom status bar |
| `--pz-border` | `#2d2d35` | Dividers and control outlines |
| `--pz-text-primary` | `#e0e0e0` | Values, labels with emphasis |
| `--pz-text-secondary` | `#a0a0a8` | Field labels, units of measure |
| `--pz-accent` | `#6366f1` | Active state, focus, primary button only |
| `--pz-error` | `#f07864` | Error text and destructive affordances (from Pizzart) |
| `--pz-ok` | `#a0c8a0` | Positive status text (from Pizzart) |

Rules from the decision document: the accent is used **sparingly** — never as a
large background. `--pz-text-secondary` is for labels and units, never for
numeric values.

Two Pizzart colours are intentionally **not** interface tokens: `#ffbe3c`
(confirmed selection) and `#78c8ff` (selection in progress). They describe a
canvas state and stay on the canvas.

### Derived values (not in the decision document)

`--pz-bg-elevated`, `--pz-surface-hover`, `--pz-surface-active`,
`--pz-border-strong`, `--pz-text-muted`, `--pz-text-inverse`, `--pz-accent-hover`,
`--pz-accent-subtle`, `--pz-accent-tint`, `--pz-accent-border`, `--pz-overlay`,
`--pz-shadow-document`, `--pz-shadow-popover`, `--pz-radius-full`.

One deserves a note: **`--pz-warning`** (`#d9a441`). Pizzart has no warning
colour and the decision document does not define one, so this is a derived amber
(taken from the selection colour and desaturated) rather than an inherited value.

## Typography

| Token | Value | Use |
| --- | --- | --- |
| `--pz-font-ui` | `Inter, system-ui, …` | Every UI text |
| `--pz-font-size-small` | `12px` | Labels, status bar, layer names |
| `--pz-font-size-body` | `14px` | Default body text |
| `--pz-font-size-heading` | `16px` | Brand, command palette input |
| `--pz-font-size-title` | `20px` | Drag-and-drop overlay |
| `--pz-font-weight-regular` | `400` | Body |
| `--pz-font-weight-medium` | `500` | Menu items, labels with emphasis |
| `--pz-font-weight-semibold` | `600` | Titles, section headings |

Weights 300 and 700 are excluded by the decision document. Numeric columns
(opacity, dimensions, coordinates) use `font-variant-numeric: tabular-nums`,
applied in `styles.css`.

**Unknown at this stage:** Inter is not bundled. The stack declares it and falls
back to `system-ui`. Shipping the font files (and their licence terms) is still
an open decision.

## Radius

| Token | Value | Note |
| --- | --- | --- |
| `--pz-radius-sm` | `4px` | Small controls, menu items, layer rows |
| `--pz-radius-md` | `6px` | Buttons, inputs, popovers |
| `--pz-radius-lg` | `8px` | Panels, export dropdown |

`design-decisions.md` does not cover radii; these follow the proposal in
[`docs/design-pizzart/typography.md`](../design-pizzart/typography.md).

## Spacing

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
width (see the `@media` block in `styles.css`).

## Using the tokens

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

`styles.css` holds no colour literals outside `tokens.css`; the only exceptions
are inline styles that `apps/web/src/main.ts` still sets (it passes hex values to
`updateAutosaveIndicator`, which `layout.ts` maps back onto tokens until that
file is refactored).

## Verifying

```bash
pnpm --filter @pizzico/ui-kit tokens:check
```

It fails when a canonical token from `pizzart.ts` is missing from `tokens.css` or
diverges from it, when a custom property is declared twice in the same block,
when a `var(--pz-*)` is used but never declared, or when an emoji appears outside
the recorded baseline. The baseline now only lists `LayerRow.ts` (5 emoji, 6c
territory); `layout.ts` went from 17 to 0 in Phase 6b.
