# Support Policy

Thank you for utilizing **LWApost Archiver**! We provide multi-tier community and enterprise support channels.

---

## 1. Support Channels

| Tier | Purpose | Destination |
| ---- | ------- | ----------- |
| **Tier 1: Q&A and Discussions** | How-to questions, setup assistance, best practices | [GitHub Discussions](https://github.com/Upendra8127/LWApost/discussions) |
| **Tier 2: Bug Reports & Regressions** | Functional bugs, parsing issues, unexpected behaviors | [GitHub Issues](https://github.com/Upendra8127/LWApost/issues) |
| **Tier 3: Security & Vulnerabilities** | Sensitive vulnerability disclosures | [GitHub Security Advisory](https://github.com/Upendra8127/LWApost/security/advisories) |

---

## 2. Self-Service Diagnostics

Before opening an issue, verify your local environment:

```bash
# Verify Node.js version (Node 18+ required)
node -v

# Run the automated validation test suite
npm test

# Check posts_data.json integrity
node -e "const d=require('./posts_data.json'); console.log('Posts:', d.totalPosts, 'Cards:', d.totalCards);"
```
