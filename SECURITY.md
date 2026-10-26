# Security Policy

## Supported Versions

Pizzico is in active pre-1.0 development. Security fixes are applied to the
latest release on the `master` branch.

| Version | Supported |
| ------- | --------- |
| 0.1.x (alpha) | :white_check_mark: |
| < 0.1.0 | :x: |

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Use GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/marcorzzn/Pizzico/security) of the repository.
2. Click **"Report a vulnerability"**.
3. Describe the issue with enough detail to reproduce it.

This opens a private security advisory visible only to the maintainer, and lets
us coordinate a fix and a disclosure timeline before any public details appear.

If you cannot use GitHub Security Advisories, contact the maintainer
[@marcorzzn](https://github.com/marcorzzn) directly on GitHub.

### What to include

- A clear description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept file, `.psd` sample, or code snippet)
- Affected version, commit hash, browser, and operating system
- Any suggested mitigation

## Response Timeline

This is a small, maintainer-driven project, so timelines are best-effort:

| Stage | Target |
| --- | --- |
| Acknowledgement of report | within 7 days |
| Initial assessment and severity triage | within 14 days |
| Fix or mitigation plan | within 30 days for high-severity issues |

We will keep you informed of progress and credit you in the advisory unless you
prefer to remain anonymous.

## Scope

Pizzico runs entirely client-side: there is no backend, no user accounts, and no
server-side data storage. Areas of particular interest:

- **Parsers and decoders**: the PSD/PSB parser (`crates/io-psd`) and image
  decoders are the primary attack surface, since they process untrusted files.
- **WebAssembly boundary**: memory safety and input validation across the
  JS/WASM bridge (`crates/wasm-bindings`).
- **Untrusted content rendering**: handling of malformed or hostile documents
  without crashing the worker or leaking memory.

Out of scope:

- Vulnerabilities in third-party dependencies that are already publicly
  disclosed upstream with a fix available (please open a regular issue instead).
- Issues requiring a compromised browser, extension, or operating system.
- Denial of service caused purely by intentionally enormous but valid documents.
