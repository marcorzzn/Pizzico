# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Native vector engine backend (`engine-v2`) behind a feature flag: `EngineBackend`
  trait with an isolated legacy backend and a v2 implementation.
- Semantic layer operations (opacity, visibility, removal, move) routed through
  backend methods instead of direct command pushes.
- `ReplacePixelCommand` in `engine-core` for pixel-level history entries.
- PNG and JPEG export on the v2 backend.
- Declared exclusions on the v2 backend for capabilities that remain legacy-only
  (PSD import/export, `.pizzico` project save/load, WebP export), documented with
  `@deprecated not supported in engine-v2` annotations in the public API.
- `pizzico-session` crate: WASM-safe port of the editor session semantics.
- Dual licensing: full `LICENSE-MIT` and `LICENSE-APACHE` texts.

### Changed

- Stroke completion now records a single compact pixel modification in history
  instead of a `StrokeCommand`.
- Eraser and clipping-mask semantics implemented in `engine-draw`.
- Release packaging: the APK is named `pizzico-<version>-android.apk` and the
  `.sha256` contains only the basename. The workflow fix ships from the next
  tag; the v0.1.2 assets were renamed manually (same bytes and sha256).

### Known Limitations

- The stroke pipeline still contains 16 legacy residual points; see
  `docs/audit/gruppo-2-handoff.md` for the executable handoff.
- Stroke tools on the v2 backend are still pending.

## [0.1.2] - 2026-10-28

### Changed

- Release identity fixed: `versionName 0.1.2`, `versionCode 1002`, and Android
  launcher icons generated from the brand source in CI.
- Android workflow: tag/version check, APK smoke test (manifest and embedded
  bundle), `.sha256` checksum, releases only from tags and always as
  prerelease.
- Build hygiene: Rust 1.99.1 and tauri-cli 2.12.4 pinned, frozen pnpm lockfile.

## [0.1.0-alpha] - 2026-10-26

First public alpha. Phase 1 (raster editor) is complete.

### Added

- **Raster editing core**: layered documents, layer stack with opacity and
  visibility, and 24 blend modes.
- **Adobe PSD support**: import and export of layered `.psd` files (PackBits RLE
  compression, tagged blocks `luni`, `lyid`, `lsct`), independently validated in
  Adobe Photoshop and Photopea.
- **Brush engine**: pressure-sensitive, anti-aliased continuous strokes.
- **Undo / redo**: bounding-box-optimized atomic history with memory rollback.
- **Rectangular selection** with clipping-mask constraints.
- **Multi-format export**: PNG, JPEG, WebP, and layered PSD.
- **Persistence**: automatic saving through the Origin Private File System (OPFS)
  with an IndexedDB fallback.
- **WebGPU rendering**: compute-shader compositing with WebGL2 and Canvas fallback.
- **Scientific color management**: sRGB, Display P3, OkLab, 3D LUTs, and ICC
  profile handling.
- **PWA support**: installable and fully offline-capable after first load.
- **Clean-room methodology** and peer-reviewed algorithm documentation in `docs/`.

### Infrastructure

- Rust workspace compiled to WebAssembly via `wasm-pack`, with a TypeScript
  monorepo (pnpm workspaces) front end.
- CI suite: workspace check and tests, TypeScript typecheck, WASM build, and
  verification of the COOP/COEP headers required for `SharedArrayBuffer`.
