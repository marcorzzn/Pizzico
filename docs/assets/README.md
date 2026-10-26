# Documentation Assets

Images referenced by the root [README](../README.md) and by other documents in
this tree. The files here are part of the repository, so they are versioned like
code and should be optimised before committing.

| File | Used by | Subject |
| --- | --- | --- |
| `screenshot-canvas.png` | Root README | The editor with a layered PSD open: canvas, tool strip in the top bar, layer panel (Phase 6 UI). |
| `screenshot-inspector.png` | Root README | Context-aware inspector: tool settings and active layer properties. |
| `screenshot-export.png` | Root README | Export panel offering PNG, JPEG, WebP and layered PSD. |
| `fase-6c-c-final.png` | Docs | Final Phase 6 UI, with the dynamic status bar and the dark slider track. |
| `photopea-validation.png` | Root README | A PSD exported by Pizzico, opened in Photopea with layers, blend modes, and opacity intact. |
| `feature-selection.png` | — (legacy) | Pre-Phase-6 interface. Kept as a historical record, no longer referenced. |
| `feature-export.png` | — (legacy) | Pre-Phase-6 interface. Kept as a historical record, no longer referenced. |
| `feature-persistence.png` | Docs | Autosave through OPFS and IndexedDB. |
| `live-demo-working.png` | Docs | The deployed PWA running in a browser. |
| `github-readme-showcase.png` | Docs | Showcase composition. |
| `github-readme-architecture.png` | Docs | Architecture diagram rendering. |
| `github-public-homepage.png` | Docs | Public repository homepage. |

## Guidelines

- Prefer PNG for UI screenshots and WebP for photographic content.
- Keep screenshots under roughly 200 KB each; the README should stay fast to load.
- Use descriptive file names, and update this table when adding an image.
- Never commit screenshots that contain credentials, personal data, or
  third-party proprietary artwork.
