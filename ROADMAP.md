# Project Roadmap

The living roadmap for the **LWApost Archiver** project, tracking milestones and architectural evolution.

---

## Completed Milestones (v1.0.0) :white_check_mark:

- [x] Full headless browser extraction of `@learnwithashmeet/posts` feed via Chrome DevTools automation.
- [x] Continuous scrolling pagination with automatic InnerTube API continuation handling.
- [x] Extraction of 220 posts and 1,150 high-resolution card images.
- [x] `=s0` uncompressed PNG parameter resolution engine.
- [x] Asynchronous multi-connection downloader with automated retry logic and progress metrics.
- [x] Sanitized hierarchical folder organization (`Post_001_...` with `info.txt` metadata).
- [x] Zero-dependency Node.js native test runner suite.

---

## Current Release (v1.1.0) :rocket:

- [ ] Automated incremental updates (sync only new posts since last download).
- [ ] Export to PDF booklet format for offline reading and study.
- [ ] OCR / Full-text search index generation across all card images.

---

## Future Horizons (v2.0.0) :crystal_ball:

- [ ] Multi-channel batch archiving CLI.
- [ ] Direct export to Anki flashcards with spaced repetition metadata.
- [ ] Local offline progressive web app (PWA) reader with audio pronunciation integration.
