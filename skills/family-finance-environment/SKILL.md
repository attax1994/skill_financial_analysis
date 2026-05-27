---
name: family-finance-environment
description: Use when family-finance users need installation, first-run setup, dependency checks, missing Node.js/npm/npx/lark-cli fixes, Feishu CLI authentication, PATH troubleshooting, or runtime environment diagnosis before using the family finance ledger skills.
---

# Family Finance Environment

## Overview

Prepare the local runtime for the family finance skill suite. This skill exists because the main validation scripts are Node.js scripts, but a user without Node.js needs a clear bootstrap path before those scripts can run.

## Dependency Summary

Runtime dependencies for ordinary ledger work:

- Node.js 20 or newer: required for bundled `.mjs` scripts, `node:test`, and many `npx skills` install flows.
- npm and npx: required for `npx skills` installation and normal npm-based CLI installation flows.
- `lark-cli >= 1.0.39`: required for Feishu Sheets/Wiki read, write, export, and auth operations.
- Feishu access: the user identity must be able to read or write the target spreadsheet/wiki node.

Development-only or optional dependencies:

- `zip`: only needed to regenerate `assets/family-finance-template.xlsx` from the manifest.
- Python plus PyYAML: only needed for `skill-creator/scripts/quick_validate.py`, not for user ledger workflows.
- Git: only needed for repository work or private-repo install fallback.
- Extra npm packages: only for future optional CSV/YAML/XLSX import or report-only export filtering; do not install these silently.

## First-Run Protocol

1. If the user says Node.js, npm, npx, or `lark-cli` is missing, stop ledger work and diagnose environment first.
2. Run `family-finance/scripts/check-env.sh` when available. It does not require Node.js and gives a bootstrap report.
3. If Node.js is available, run `family-finance/scripts/check-env.mjs` for the stricter JSON check.
4. If Node.js is missing, tell the user that `npx skills` and bundled scripts cannot run locally until Node.js 20+ is installed.
5. If `lark-cli` is missing, install/configure it after Node.js exists, then run `lark-cli --version`.
6. If Feishu auth is missing, use least-privilege `lark-cli auth login --scope ...` guidance for the operation being attempted.

Do not silently install software or request broad Feishu scopes. Show the missing dependency, why it matters, and the smallest next command or manual action.

## Install Guidance

Use the user's platform and package manager when known. Keep guidance concrete but avoid assuming admin rights.

- macOS with Homebrew: install Node.js 20+ through Homebrew or the official Node.js installer, then reopen the terminal.
- Windows: use the official Node.js LTS installer or a managed package source approved by the user.
- Linux: use the distribution package manager, NodeSource, nvm, fnm, or another user-approved Node.js 20+ source.

After Node.js is available:

```bash
node -v
npm -v
npx -v
lark-cli --version
```

If `lark-cli` is not installed, use the current Lark CLI quick-start path for installation and configuration. In npm-based environments this is typically an `@larksuite/cli` global install/update followed by `lark-cli config init` and targeted `lark-cli auth login`.

## Fallbacks

- If the user cannot install Node.js, do not run local `.mjs` scripts. Offer to continue with manual spreadsheet guidance, a hosted/agent environment that already has Node.js and `lark-cli`, or ask the user to switch to a machine where `npx skills` can run.
- If only `zip` or PyYAML is missing, ordinary ledger usage can continue; only template regeneration or developer validation is blocked.
- If `lark-cli` works but Feishu permissions fail, keep the diagnosis at the missing scope or document permission level.
