# Contributing to Pizzico

Thank you for your interest in contributing to **Pizzico**!  
Pizzico is an open-source, offline-first graphics editor engineered in Rust and WebAssembly, developed under a strict clean-room methodology and peer-reviewed scientific foundations.

---

## Code of Conduct & Principles

1. **Clean-Room Methodology**: Do not inspect, decompile, or copy proprietary code (e.g. Photoshop, Figma, or closed-source products). All implementations must be derived from public standards, official specifications (e.g. Adobe PSD spec), or peer-reviewed papers. See [docs/clean-room/methodology.md](docs/clean-room/methodology.md).
2. **Deterministic & Scientific**: Version 1 focuses on robust, offline, deterministic mathematical algorithms. No proprietary cloud AI APIs or non-verifiable black boxes.
3. **Memory Safety & Performance**: Rust code must maintain zero memory safety compromises. Avoid `unsafe` unless strictly justified and verified. Target 60 FPS performance budgets.

---

## Development Setup

### Prerequisites
- **Node.js**: >= 20.x
- **pnpm**: >= 9.x
- **Rust toolchain**: >= 1.78
  ```bash
  rustup target add wasm32-unknown-unknown
  cargo install wasm-pack
  ```

### Build and Run
```bash
# Clone the repository
git clone https://github.com/marcorzzn/Pizzico.git
cd Pizzico

# Install monorepo dependencies
pnpm install

# Compile the Rust core into WebAssembly
pnpm build:wasm

# Start the development web server
pnpm dev
```

---

## Testing & Validation

Before submitting any Pull Request, ensure that all test suites pass locally:

```bash
# 1. Run all Rust unit and integration tests (including PSD codec tests)
cargo test --workspace

# 2. Run TypeScript typecheck across all workspace packages
pnpm typecheck

# 3. Build production web bundle
pnpm build
```

---

## Commit Guidelines

Pizzico follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat(scope)`: A new feature (e.g., `feat(io-psd): add PSB large document support`)
- `fix(scope)`: A bug fix (e.g., `fix(raster): fix alpha matting in composite image data`)
- `docs(scope)`: Documentation changes (e.g., `docs(algorithms): add proof for tone curve spline`)
- `refactor(scope)`: Code refactoring without changing observable behavior
- `test(scope)`: Adding or updating test suites
- `chore(scope)`: Maintenance, dependencies, or configuration updates

---

## Submitting Issues and Pull Requests

### Bug Reports
When submitting a bug report, please include:
- A clear, descriptive title.
- Steps to reproduce the issue.
- Expected behavior vs. actual behavior.
- Browser/OS version and console logs.
- If applicable, a sample test file (e.g. non-sensitive `.psd` or `.png`).

### Feature Requests
Feature requests should align with the project goals:
- Must specify whether the feature is raster, vector, or layer-related.
- Should cite public specifications or academic literature where applicable.

### Pull Requests
1. Create a descriptive feature branch from `master`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Keep PRs focused on a single responsibility.
3. Ensure all automated GitHub Actions CI jobs pass.
4. Update relevant documentation in `docs/` when introducing new capabilities.

Thank you for helping make Pizzico the best open-source creative graphics editor!
