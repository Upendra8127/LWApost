# Contributing Guidelines

Thank you for contributing to the **LWApost Archiver** project! We welcome contributions that uphold our commitment to quality, security, and developer ergonomics.

---

## 1. Developer Certificate of Origin (DCO 1.1)

All contributions must include a DCO sign-off in commit messages, certifying that you have the right to submit the code under the MIT license. Use:

```bash
git commit -s -m "feat: add support for poll serialization"
```

The sign-off must take the form:
```
Signed-off-by: Random J Developer <random@example.org>
```

---

## 2. Conventional Commits 1.0.0

All commit messages and PR titles must adhere to the [Conventional Commits v1.0.0](https://www.conventionalcommits.org/) specification:
- `feat:` A new feature or capability.
- `fix:` A bug fix.
- `docs:` Documentation changes only.
- `perf:` Performance improvements.
- `test:` Adding or updating tests.
- `refactor:` Code refactoring without behavioral alterations.
- `chore:` Maintenance, build configs, or CI adjustments.

---

## 3. Zero-Dependency & Pure Standards

- **Core Logic**: Retain zero runtime external dependencies for core test and evaluation scripts.
- **Python**: Standard library preferred (`asyncio`, `json`, `pathlib`, `re`).
- **Tests**: Zero npm dependencies; utilize Node's native test runner (`node --test tests/*.test.js`).
- **Code Style**: 2 spaces, UTF-8, LF line endings, trailing newlines (enforced by `.editorconfig` and Prettier).

---

## 4. Submitting a Pull Request

1. Fork and create a branch from `main`: `git checkout -b feat/my-improvement`.
2. Implement your changes along with corresponding unit tests in `tests/`.
3. Run the validation suite:
   ```bash
   npm test
   ```
4. Push and submit a Pull Request following the PR template.
