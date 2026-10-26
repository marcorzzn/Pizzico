# Milestones

Phase-by-phase record of what was built, how it was verified, and what the
evidence was. Each milestone document states its completion criteria and the
observations that satisfied them.

| Milestone | Subject |
| --- | --- |
| [fase-0.md](fase-0.md) | Phase 0: baseline fusion, establishing the starting point. |
| [step-f.md](step-f.md) | Step F: compositing pipeline. |
| [step-g.md](step-g.md) | Step G: rectangular selection and clipping. |
| [step-h.md](step-h.md) | Step H: persistence through OPFS and IndexedDB. |
| [step-i1.md](step-i1.md) | Step I1: multi-format export. |

Evidence images live in [assets/](assets/):

| Image | Shows |
| --- | --- |
| `fase-0-browser.png` | The application running in a browser at the Phase 0 baseline. |
| `fase-1-compositing.webp` | Compositing output after Phase 1. |
| `step-g-selection.png` | Rectangular selection with the layer panel. |
| `step-h-persistence.png` | Autosave and persistence state. |
| `step-i1-export.png` | Export pipeline output. |

## Convention

Milestone documents are historical records: they describe the state at the time
of writing and are not retroactively updated. When a later phase changes a
decision, the change is recorded in [../audit/](../audit/) or in a
[../ADR/](../ADR/) entry instead.

For the current state of the project, see [../../CHANGELOG.md](../../CHANGELOG.md).
