# Architectural Decision Records (ADR)

Records of significant architectural decisions: the context, the options
considered, the decision taken, and its consequences.

| Record | Subject |
| --- | --- |
| [0001-architecture.md](0001-architecture.md) | Overall system architecture and crate boundaries. |
| [0003-rustversion-patch.md](0003-rustversion-patch.md) | Vendored patch of `rustversion` required by the WASM build. |

## Format

Each record states the context, the decision, and the consequences. Records are
immutable once accepted: a superseding decision creates a new record rather than
rewriting the old one. The numbering is not necessarily contiguous, and gaps mean
a proposal was withdrawn rather than that a file is missing.

New decisions should be added as `ADR/NNNN-short-title.md`.
