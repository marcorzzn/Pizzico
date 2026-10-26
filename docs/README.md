# Pizzico Documentation

Technical documentation for Pizzico: architecture decisions, algorithm
specifications, milestone logs, and audit records.

New to the project? Start with the [README](../README.md) for an overview and
quick start.

## Contents

| Directory | What it contains |
| --- | --- |
| [ADR/](ADR/) | Architectural Decision Records: the *why* behind structural choices. |
| [algorithms/](algorithms/) | Specification cards for every non-trivial algorithm, with public standards and peer-reviewed citations. |
| [milestones/](milestones/) | Phase-by-phase milestone logs with verification criteria and test evidence. |
| [audit/](audit/) | Technical audits, phase reports, and executable handoff notes. |
| [clean-room/](clean-room/) | The clean-room methodology and per-session provenance logs. |
| [ui/](ui/) | UI principles and design decisions. |
| [design-pizzart/](design-pizzart/) | Read-only inventory of the design system extracted from the predecessor project, Pizzart. |
| [pizzart/](pizzart/) | Documentation of the predecessor project whose engine was ported into this codebase. |
| [assets/](assets/) | Images used by the README and other documentation. |
| [_legacy/](_legacy/) | Archived pre-manifesto research material, kept for historical reference only. |

## Top-level documents

- [PIANO-ESECUTIVO-FUSIONE.md](PIANO-ESECUTIVO-FUSIONE.md) — the fusion execution plan
  that defines how the ported Pizzart engine becomes Pizzico.
- [STATO-PROGETTO.md](STATO-PROGETTO.md) — project state snapshot.

## A note on language

Older documents in this tree are written in Italian, which was the working
language during early development. New documentation is written in English so the
project is accessible to international contributors. Both are equally valid
sources of record.

## Methodology

Every feature must be traceable to either a public standard (for example the
Adobe PSD specification) or a peer-reviewed paper. See
[clean-room/methodology.md](clean-room/methodology.md) for the rules that govern
how this project avoids proprietary code, and [algorithms/](algorithms/) for the
citations themselves.
