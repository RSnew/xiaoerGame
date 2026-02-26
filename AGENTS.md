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

### Project layout

```
src/
├── main.rs            # entry point
├── character/         # player-controlled characters
├── enemy/             # enemy types (Slime, …)
├── card/              # card definitions (attack, …)
├── mechanics/         # combat trait, turn system
└── game/              # game engine / main loop
```

### Notes

- The game reads from stdin. When testing non-interactively, pipe input (one line per card choice, e.g. `printf '1\n1\n1\n'`).
- No external dependencies — the project builds with the Rust standard library only.
- Cross-platform: compiles on Linux, macOS, and Windows via `cargo build`.
