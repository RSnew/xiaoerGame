# AGENTS.md

## Cursor Cloud specific instructions

This is a **Rust** turn-based card game project (`xiaoerGame`). The toolchain requirement is Rust stable (edition 2021).

### Common commands

| Task | Command |
|------|---------|
| Build | `cargo build` |
| Lint | `cargo clippy -- -D warnings` |
| Format check | `cargo fmt -- --check` |
| Test | `cargo test` |
| Run (interactive) | `cargo run` |
| Run (non-interactive, piped) | `printf '1\n1\n1\n' \| cargo run` |

| Serve web version | `python3 -m http.server 8080` (from `web/`) |

### Project layout

```
src/                   # Rust CLI version
├── main.rs
├── character/
├── enemy/
├── card/
├── mechanics/
└── game/

web/                   # Web browser version (pure ES Modules, no build step)
├── index.html
├── style.css
└── js/
    ├── main.js
    ├── character/
    ├── enemy/
    ├── card/
    ├── mechanics/
    └── game/
```

### Notes

- **Rust CLI**: reads from stdin; test non-interactively with `printf '1\n1\n1\n' | cargo run`.
- **Web version**: serve with any static HTTP server (ES Modules need HTTP, not `file://`). Example: `cd web && python3 -m http.server 8080`, then open `http://localhost:8080`.
- No external dependencies in either version.
- Cross-platform: Rust compiles on Linux/macOS/Windows; web runs in any modern browser.
