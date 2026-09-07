# Remote Template V2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository template, manifest, monthly snapshot workflow, and documentation use the generalized v2 structure derived from the current remote workbook.

**Architecture:** Keep the manifest as the single source of truth. Define the v2 cashflow and balance layouts in `renderable_templates`, point stable snapshot keys at the new columns, extend the model with asset redemptions, and regenerate the XLSX from the manifest. Verification inspects both manifest semantics and generated OOXML.

**Tech Stack:** Node.js ESM, `node:test`, JSON manifest, OOXML/XLSX generated with the system `zip` command.

---

### Task 1: Lock The V2 Contract With Failing Tests

**Files:**
- Modify: `tests/manifest.test.mjs`
- Modify: `tests/build-write-preview.test.mjs`
- Modify: `tests/validate-snapshot.test.mjs`
- Create: `tests/template-xlsx.test.mjs`
- Modify: `tests/skill-suite-entry.test.mjs`

- [ ] Assert v2 version numbers and the remote-derived cashflow mappings (`D:G`, `I:L`, `N:R`, `Z:AB`, `AD:AF`).
- [ ] Assert monthly formulas for operating surplus, net-asset increase, conversions, redemptions, and cash change.
- [ ] Assert v2 writable and protected ranges plus the generalized expanded balance layout.
- [ ] Assert `asset_redemption` normalization, note validation, and write-preview ranges.
- [ ] Assert the main skill documents rolling actuals, the privacy-driven absence of cash balances, and no budget/actual comparison in the actual sheet.
- [ ] Assert generated XLSX structure: `A1:AI18`, v2 formulas, merged cells, and no private labels.
- [ ] Run focused tests and confirm they fail because the v2 contract is not implemented.

### Task 2: Migrate The Manifest And Data Contract

**Files:**
- Modify: `skills/family-finance/assets/family-finance-template.manifest.json`
- Modify: `skills/family-finance/references/data-model.md`
- Modify: `skills/family-finance/scripts/validate-snapshot.mjs`

- [ ] Bump schema and template versions to `2.0.0`.
- [ ] Replace the cashflow renderable seed with the generalized `A:AI` v2 structure and formulas.
- [ ] Add `asset_redemption` mappings and validation note handling.
- [ ] Expand the generalized balance seed to the remote layout while retaining configurable/generic labels and targets.
- [ ] Update writable/protected ranges, merged ranges, styles, and dimensions in the manifest.
- [ ] Run manifest and validation tests until green.

### Task 3: Upgrade XLSX Generation

**Files:**
- Modify: `skills/family-finance/scripts/generate-template-xlsx.mjs`
- Regenerate: `skills/family-finance/assets/family-finance-template.xlsx`

- [ ] Render manifest-declared merges and column widths in worksheet XML.
- [ ] Preserve v2 formulas, frozen panes, and styles in the generated workbook.
- [ ] Generate the XLSX from the updated manifest.
- [ ] Run the OOXML inspection test until green.

### Task 4: Align Skill Documentation And Workflows

**Files:**
- Modify: `skills/family-finance/SKILL.md`
- Modify: `skills/family-finance/references/manifest.md`
- Modify: `skills/family-finance/references/template-policy.md`
- Modify: `skills/family-finance/references/lark-cli-workflows.md` if range examples depend on the old layout

- [ ] Document the rolling-actuals model and distinguish current-period actuals from the full-year rolling view.
- [ ] Document that opening/ending cash balances are intentionally absent for privacy.
- [ ] Document conversion/redemption semantics and keep budget modeling outside the actual sheet.
- [ ] Update reconstruction and verification guidance for v2 ranges.
- [ ] Run skill behavior/documentation tests until green.

### Task 5: Verify The Complete Migration

**Files:**
- Review all modified files and generated XLSX.

- [ ] Run `npm test` and require zero failures.
- [ ] Run `node skills/family-finance/scripts/generate-template-xlsx.mjs` and then rerun `npm test` to prove reproducibility.
- [ ] Run `git diff --check`.
- [ ] Inspect the XLSX archive for the expected workbook sheets, dimensions, formulas, merges, and absence of known live labels.
- [ ] Review `git diff --stat`, `git diff`, and `git status --short`; ensure `.tmp-auth/` remains untouched and untracked.
- [ ] Commit the implementation as a focused change on `codex/sync-remote-finance-template`.
