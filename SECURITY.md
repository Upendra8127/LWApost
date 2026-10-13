# Security Policy

The **LWApost Archiver** project adheres to the Open Source Security Foundation (OpenSSF) recommendations for **Coordinated Vulnerability Disclosure (CVD)**.

---

## 1. Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 2. Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please use one of the following private reporting channels:
1. **GitHub Private Vulnerability Reporting**: Navigate to the repository's **Security** tab, select **Advisories**, and click **Report a vulnerability**.
2. **Email**: Send encrypted or plain reports to `upendrayadav8127@gmail.com`.

---

## 3. Vulnerability Response SLAs

We commit to the following strict response times:

* **Initial Acknowledgment:** < 24 hours.
* **Triage & Validation:** < 48 hours.
* **Patch & Remediation:** < 7 calendar days.
* **Public Disclosure:** Coordinated with the reporter after patch deployment.

---

## 4. Security Principles

- **Zero-Dependency Core**: Eliminates software supply-chain vulnerabilities in core evaluation.
- **Path Traversal & Injection Prevention**: All filenames, post IDs, and paths are strictly sanitized against shell and filesystem escape sequences.
- **Cryptographic Fairness**: Critical randomness operations implement Web Crypto API / CSPRNG.
