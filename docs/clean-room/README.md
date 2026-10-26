# Clean-Room Methodology

Pizzico is developed under a strict clean-room process: every implementation must
be derived from public standards or peer-reviewed literature, never from
inspection of proprietary source code. This directory defines that process and
keeps the provenance record for it.

## Contents

| File | Purpose |
| --- | --- |
| [methodology.md](methodology.md) | The rules themselves: what is permitted, what is forbidden, and how work is recorded. |
| [logs/](logs/) | Per-session provenance logs recording what sources were consulted. |

## The short version

1. **Allowed sources**: published standards and official format specifications
   (for example the Adobe PSD specification), peer-reviewed papers, textbooks,
   public reference implementations under permissive licenses, and publicly
   documented behavior of the tools we interoperate with.
2. **Forbidden**: decompiling, disassembling, or reading the source of
   proprietary software; copying code from closed-source products; using
   artifacts obtained from leaked or unlicensed sources.
3. **Recording**: every non-trivial algorithm gets a citation card in
   [../algorithms/](../algorithms/) and, where a session involved research, an
   entry in [logs/](logs/).

## Starting a logged session

Copy [logs/_template.md](logs/_template.md) to
`logs/YYYY-MM-DD-short-topic.md` and fill it in as you work. The log is the
evidence that the clean-room claim holds, so write it while the research is fresh
rather than reconstructing it afterwards.

## Why this matters

The project interoperates with the Adobe PSD format and reproduces workflows
familiar from commercial editors. That makes the clean-room discipline essential:
it is what allows Pizzico to be published under MIT OR Apache-2.0 with a clear
provenance story for every algorithm it implements.
