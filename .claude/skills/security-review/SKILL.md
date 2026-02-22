---
name: security-scan
description: Use when reviewing code for security vulnerabilities, before merging security-sensitive changes, or when explicitly asked to audit code security
---

# Security Scan

Perform a security-focused code review on changed files, checking for OWASP Top 10 vulnerabilities.

## When to Use
- Before merging code that handles authentication, authorization, or user input
- When a developer asks for a security review or audit
- As part of a pre-release review

## Steps

1. **Identify changed files:**
```bash
git diff --name-only main...HEAD
```

2. **Detect the framework** by checking project config files:
   - `package.json` -> Node.js / Express / Next.js
   - `go.mod` -> Go
   - `pom.xml` / `build.gradle` -> Java / Spring
   - `requirements.txt` / `pyproject.toml` -> Python / Django / Flask
   - `Cargo.toml` -> Rust

3. **Read and analyze each changed file** for these vulnerability categories:

   - **Injection** -- SQL, NoSQL, OS command, LDAP injection
   - **Broken Authentication** -- Weak credentials, session issues, missing MFA
   - **Sensitive Data Exposure** -- Hardcoded secrets, weak encryption, data leaks
   - **Broken Access Control** -- Missing authorization checks, privilege escalation
   - **Security Misconfiguration** -- Debug mode, default credentials, verbose errors
   - **XSS** -- Reflected, stored, DOM-based cross-site scripting
   - **Insecure Dependencies** -- Known vulnerable packages

4. **Report each issue found:**
   - **Severity:** CRITICAL / HIGH / MEDIUM / LOW
   - **Location:** `file:line`
   - **Risk:** What could happen if exploited
   - **Fix:** Exact code change to remediate

5. **If no vulnerabilities found**, confirm the code follows security best practices and note what's done well.

## Rules
- Focus only on security. Don't comment on style or performance.
- CRITICAL = actively exploitable. Don't overuse this severity.
- Always provide the fix, not just the problem.
- Check for hardcoded secrets, API keys, and credentials in every review.

---

## How to Install

Save everything above the line to your project as a `.md` file:

**Claude Code:** `.claude/skills/security-scan/SKILL.md`
**Cursor:** `.cursor/skills/security-scan/SKILL.md`
**Codex:** `.codex/skills/security-scan/SKILL.md`

The skill activates when you ask your agent for a security review.