# Pizzart — Predecessor Project

Documentation from **Pizzart**, the earlier project whose Rust engine was ported
into Pizzico during Phase 1. These files are kept as the source-of-record for
that migration: they explain what was inherited, what was rewritten, and what was
deliberately left behind.

| Document | Subject |
| --- | --- |
| [spec-README.md](spec-README.md) | Entry point for the specification set. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Pizzart's original architecture. |
| [FASE_1_CHIUSA.md](FASE_1_CHIUSA.md) | Closure report for Pizzart's Phase 1. |
| [FASE_2_SPEC.md](FASE_2_SPEC.md) | Specification for Pizzart's Phase 2. |
| [DEVLOG.md](DEVLOG.md) | Development log kept during the original work. |
| [REPORT_UI_20261025.md](REPORT_UI_20261025.md) | UI review report dated 2026-10-25. |
| [LICENSE](LICENSE) | The license governing this ported material. |

## Relationship to Pizzico

The Rust engine in `crates/` originates here: it was transplanted in Phase 1 and
then progressively restructured behind the `EngineBackend` abstraction. Attribution
for the incorporated MIT-licensed engine is recorded in
[../../NOTICE.md](../../NOTICE.md).

For the extracted design-system inventory rather than the project documentation,
see [../design-pizzart/](../design-pizzart/). For the migration audit itself, see
[../audit/fase-1-trapianto.md](../audit/fase-1-trapianto.md).
