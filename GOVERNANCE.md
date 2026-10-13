# Project Governance Model

This project operates under a meritocratic open-source governance framework aligned with the **Linux Foundation** and **Cloud Native Computing Foundation (CNCF)** standards.

---

## 1. Roles and Responsibilities

### Maintainers
Maintainers are responsible for:
- Overall project architectural vision and technical direction.
- Reviewing, approving, and merging pull requests.
- Enforcing the Code of Conduct and security protocols.
- Release engineering and artifact provenance.

**Primary Maintainer:** [@Upendra8127](https://github.com/Upendra8127)

### Reviewers
Reviewers are active community contributors who evaluate code changes, test suites, documentation, and compliance with the zero-dependency standard.

### Contributors
Anyone who submits issues, pull requests, RFCs, documentation improvements, or bug reports.

---

## 2. Decision Making & Lazy Consensus

Technical decisions and non-breaking changes follow the **Lazy Consensus** model:
1. A proposal or pull request is opened with clear rationale.
2. Maintainers and reviewers have a review window (minimum 72 hours for significant changes).
3. If no objections are raised and required CI/security checks pass, the proposal is considered approved.
4. If objections are raised, consensus must be reached through constructive discourse.

---

## 3. Request for Comments (RFC) Process

Major architectural changes, API shifts, or format modifications require a formal RFC:
1. Open an issue using the RFC template detailing:
   - Summary & Problem Statement
   - Motivation & Design Specification
   - Backward Compatibility & Migration Strategy
   - Security, Performance & Dependency impact (must uphold zero-dependency rule).
2. Gather community input for a minimum of 7 calendar days.
3. Obtain consensus from project maintainers before merging implementation code.
