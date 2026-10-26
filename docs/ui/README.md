# UI Principles and Design Decisions

How the interface is reasoned about, and the decisions already taken.

| Document | Subject |
| --- | --- |
| [principles.md](principles.md) | The principles that govern interaction and layout. |
| [design-decisions.md](design-decisions.md) | Concrete decisions taken for the Phase 6 interface. |
| [tokens.md](tokens.md) | Where the design values live, the two token layers, and how to verify them. |
| [icons.md](icons.md) | The Lucide icon set, how it is generated, and how it is used. |
| [fase-6-completata.md](fase-6-completata.md) | What Phase 6 has done, the numbers, and the debt that remains deliberately open. |
| [fase-6c-b-mappatura.md](fase-6c-b-mappatura.md) | Line-by-line map of `main.ts` used to replace its hand-built controls. |

## Current direction

The dark theme is now the interface, not a proposal: it is active in
`tokens.css`. Emoji are gone from `ui-kit`, `ui-web` and `apps/web/src`, and the
icon set is generated from Lucide rather than drawn by hand.

## Related material

- [../design-pizzart/](../design-pizzart/) — read-only inventory of the design
  system extracted from the predecessor project, including palette, typography,
  layout, and component behaviour, with an explicit split between what is already
  codified and what still needs a decision.
- [../ADR/](../ADR/) — structural decisions that constrain the UI.

## Note

The inventory in [../design-pizzart/](../design-pizzart/) is *not* a design
proposal. It records what exists in Pizzart so that decisions are made
consciously rather than inherited by accident.
