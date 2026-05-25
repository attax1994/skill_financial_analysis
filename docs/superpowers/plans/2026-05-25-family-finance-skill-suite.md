# Family Finance Skill Suite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first implementation of the `family-finance` skill suite for monthly-summary family finance ledger creation, update previews, Feishu workflows, export guidance, and read-only analysis.

**Architecture:** The suite uses one main lifecycle skill plus three analysis sub-skills. Shared schemas, scripts, manifest, and template assets live under `skills/family-finance`; analysis sub-skills reference those shared resources instead of duplicating them. Runtime logic is Node.js ESM with Node built-ins first; optional import/export enhancements detect missing packages at runtime.

**Tech Stack:** Codex skills, Markdown references, Node.js 20+ ESM, `node:test`, `lark-cli >= 1.0.39`, JSON Schema-style validation, Feishu spreadsheet commands.

---

## File Map

- Create `package.json`: Node test scripts for local validation.
- Create `tests/validate-snapshot.test.mjs`: unit tests for monthly snapshot validation and unit normalization.
- Create `tests/build-write-preview.test.mjs`: unit tests for stale-safe write preview generation.
- Create `tests/manifest.test.mjs`: unit tests for manifest consistency.
- Create `skills/family-finance/SKILL.md`: main skill workflow and resource navigation.
- Create `skills/family-finance/agents/openai.yaml`: UI metadata.
- Create `skills/family-finance/assets/family-finance-template.manifest.json`: renderable manifest and field mapping.
- Create `skills/family-finance/assets/family-finance-template.xlsx`: generated generalized local template.
- Create `skills/family-finance/references/data-model.md`: canonical profile/snapshot/preview schemas and examples.
- Create `skills/family-finance/references/manifest.md`: manifest contract and template reconstruction rules.
- Create `skills/family-finance/references/lark-cli-workflows.md`: Feishu read/write/create/export workflows and permission handling.
- Create `skills/family-finance/references/template-policy.md`: local template generalization and privacy rules.
- Create `skills/family-finance/scripts/check-env.mjs`: checks Node and `lark-cli` runtime.
- Create `skills/family-finance/scripts/validate-snapshot.mjs`: validates JSON `MonthlySnapshot` data.
- Create `skills/family-finance/scripts/build-write-preview.mjs`: builds write previews and stale-write metadata.
- Create `skills/family-finance/scripts/import-monthly-snapshots.mjs`: validates batch JSON input.
- Create `skills/family-finance/scripts/export-ledger.mjs`: emits safe `lark-cli sheets +export` commands.
- Create `skills/family-finance/scripts/generate-template-xlsx.mjs`: generates the local generalized `.xlsx` asset from the manifest.
- Create `skills/family-finance-health-check/SKILL.md`: read-only health check skill.
- Create `skills/family-finance-health-check/agents/openai.yaml`: UI metadata.
- Create `skills/family-finance-structure-analysis/SKILL.md`: read-only structure analysis skill.
- Create `skills/family-finance-structure-analysis/agents/openai.yaml`: UI metadata.
- Create `skills/family-finance-planning/SKILL.md`: planning skill with market-data and advice boundaries.
- Create `skills/family-finance-planning/agents/openai.yaml`: UI metadata.

## Task 1: Initialize Skill Suite Skeletons

**Files:**
- Create: `skills/family-finance/`
- Create: `skills/family-finance-health-check/`
- Create: `skills/family-finance-structure-analysis/`
- Create: `skills/family-finance-planning/`

- [ ] **Step 1: Run `init_skill.py` for the main skill**

Run:

```bash
python3 /Users/bytedance/.codex/skills/.system/skill-creator/scripts/init_skill.py family-finance --path skills --resources scripts,references,assets --interface display_name="Family Finance" --interface short_description="Maintain and analyze a family finance ledger" --interface default_prompt="Use $family-finance to update my monthly family finance ledger."
```

Expected: `skills/family-finance` exists with `SKILL.md`, `agents/openai.yaml`, and resource folders.

- [ ] **Step 2: Run `init_skill.py` for each analysis sub-skill**

Run three commands with `--path skills` and interface metadata:

```bash
python3 /Users/bytedance/.codex/skills/.system/skill-creator/scripts/init_skill.py family-finance-health-check --path skills --interface display_name="Family Finance Health Check" --interface short_description="Review monthly family finance health" --interface default_prompt="Use $family-finance-health-check to review this month's family finance health."
python3 /Users/bytedance/.codex/skills/.system/skill-creator/scripts/init_skill.py family-finance-structure-analysis --path skills --interface display_name="Family Finance Structure" --interface short_description="Analyze assets, debts, and allocation" --interface default_prompt="Use $family-finance-structure-analysis to analyze my asset and debt structure."
python3 /Users/bytedance/.codex/skills/.system/skill-creator/scripts/init_skill.py family-finance-planning --path skills --interface display_name="Family Finance Planning" --interface short_description="Plan budgets, allocation, and scenarios" --interface default_prompt="Use $family-finance-planning to plan my family finances."
```

Expected: all four skill folders exist.

- [ ] **Step 3: Commit skeletons**

Run:

```bash
git add skills
git commit -m "Create family finance skill suite skeletons"
```

## Task 2: Add Test Harness and Write Failing Schema Tests

**Files:**
- Create: `package.json`
- Create: `tests/validate-snapshot.test.mjs`
- Create: `tests/build-write-preview.test.mjs`
- Create: `tests/manifest.test.mjs`

- [ ] **Step 1: Add `package.json` with Node test command**

Use Node's built-in test runner:

```json
{
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write failing validation tests**

Cover:

- omitted units default to 万元
- explicit 元 and 千元 normalize to 万元
- `null` and `0` remain distinct
- negative values require explanation
- month keys must be `YYYY-MM`

- [ ] **Step 3: Write failing preview tests**

Cover:

- preview contains deterministic `preview_id`
- original values are captured
- numeric conflicts are marked
- explanation fields append with newline
- stale compare detects changed cells

- [ ] **Step 4: Write failing manifest tests**

Cover:

- manifest has renderable seed definitions
- writable ranges do not overlap formula ranges
- required sheet roles exist

- [ ] **Step 5: Verify RED**

Run:

```bash
npm test
```

Expected: tests fail because scripts and manifest do not exist yet.

## Task 3: Implement Shared Manifest and Core Scripts

**Files:**
- Create: `skills/family-finance/assets/family-finance-template.manifest.json`
- Create: `skills/family-finance/scripts/validate-snapshot.mjs`
- Create: `skills/family-finance/scripts/build-write-preview.mjs`
- Create: `skills/family-finance/scripts/import-monthly-snapshots.mjs`
- Create: `skills/family-finance/scripts/export-ledger.mjs`
- Create: `skills/family-finance/scripts/check-env.mjs`

- [ ] **Step 1: Add manifest v1**

Include sheet roles, field mappings, unit policy, protected ranges, writable ranges, seed values/formulas, frozen rows/columns, merges, styles, and annual naming rules.

- [ ] **Step 2: Implement `validate-snapshot.mjs`**

Export `normalizeMonthlySnapshot(input, options)` and `validateMonthlySnapshot(input, options)`. CLI mode reads JSON from stdin or a file path and outputs normalized JSON.

- [ ] **Step 3: Run tests for validation**

Run:

```bash
npm test -- tests/validate-snapshot.test.mjs
```

Expected: validation tests pass.

- [ ] **Step 4: Implement `build-write-preview.mjs`**

Export `buildWritePreview({ profile, manifest, snapshot, existingValues })`, `detectStalePreview(preview, currentValues)`, and `hashPreviewInput(input)`.

- [ ] **Step 5: Run tests for preview**

Run:

```bash
npm test -- tests/build-write-preview.test.mjs
```

Expected: preview tests pass.

- [ ] **Step 6: Implement import/export/check scripts**

Keep these thin and deterministic:

- `import-monthly-snapshots.mjs` validates an array of JSON snapshots.
- `export-ledger.mjs` prints or runs `lark-cli sheets +export` commands.
- `check-env.mjs` checks Node and `lark-cli` versions without writing to Feishu.

- [ ] **Step 7: Run all tests and commit**

Run:

```bash
npm test
git add package.json tests skills/family-finance/assets skills/family-finance/scripts
git commit -m "Add family finance manifest and core scripts"
```

## Task 4: Generate Local Template Asset

**Files:**
- Create: `skills/family-finance/scripts/generate-template-xlsx.mjs`
- Create: `skills/family-finance/assets/family-finance-template.xlsx`

- [ ] **Step 1: Implement local `.xlsx` generator**

Generate a generalized workbook from the manifest using only Node built-ins plus the system `zip` command. Include workbook XML, shared strings or inline strings, worksheet formulas, workbook relationships, and basic styles.

- [ ] **Step 2: Generate the asset**

Run:

```bash
node skills/family-finance/scripts/generate-template-xlsx.mjs
```

Expected: `skills/family-finance/assets/family-finance-template.xlsx` exists.

- [ ] **Step 3: Verify no personalized labels leak**

Run text/zip inspection commands to ensure no known personal labels from the source template are present.

- [ ] **Step 4: Commit template asset**

Run:

```bash
git add skills/family-finance/scripts/generate-template-xlsx.mjs skills/family-finance/assets/family-finance-template.xlsx
git commit -m "Add generalized family finance xlsx template"
```

## Task 5: Write Main Skill References and SKILL.md

**Files:**
- Modify: `skills/family-finance/SKILL.md`
- Create: `skills/family-finance/references/data-model.md`
- Create: `skills/family-finance/references/manifest.md`
- Create: `skills/family-finance/references/lark-cli-workflows.md`
- Create: `skills/family-finance/references/template-policy.md`

- [ ] **Step 1: Write concise main `SKILL.md`**

Include trigger-rich frontmatter and only core workflow/navigation in the body.

- [ ] **Step 2: Write reference docs**

Move schema details, manifest rules, Feishu workflows, privacy policy, and template policy to references.

- [ ] **Step 3: Commit main skill docs**

Run:

```bash
git add skills/family-finance/SKILL.md skills/family-finance/references
git commit -m "Document family finance main skill workflows"
```

## Task 6: Write Analysis Sub-Skills

**Files:**
- Modify: `skills/family-finance-health-check/SKILL.md`
- Modify: `skills/family-finance-structure-analysis/SKILL.md`
- Modify: `skills/family-finance-planning/SKILL.md`

- [ ] **Step 1: Write health check skill**

Use read-only behavior and output sections: conclusion, metrics, anomalies, actions, missing data.

- [ ] **Step 2: Write structure analysis skill**

Use read-only behavior and focus on defense/Beta/Alpha, debt, liquidity, target drift, and concentration.

- [ ] **Step 3: Write planning skill**

Use read-only behavior for analysis. Add explicit advice boundaries, market-data citation rules, and route any ledger write back through `family-finance`.

- [ ] **Step 4: Commit sub-skills**

Run:

```bash
git add skills/family-finance-health-check skills/family-finance-structure-analysis skills/family-finance-planning
git commit -m "Add family finance analysis sub-skills"
```

## Task 7: Validate Skills and Finalize

**Files:**
- Modify as needed from validation findings.

- [ ] **Step 1: Run local tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run skill validator**

Run:

```bash
python3 /Users/bytedance/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/family-finance
python3 /Users/bytedance/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/family-finance-health-check
python3 /Users/bytedance/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/family-finance-structure-analysis
python3 /Users/bytedance/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/family-finance-planning
```

If `PyYAML` is missing, install it in a local validation environment or use an available Python environment with YAML support, then rerun.

- [ ] **Step 3: Run read-only lark-cli smoke checks**

Run:

```bash
lark-cli --version
node skills/family-finance/scripts/check-env.mjs --json
```

Expected: reports `lark-cli >= 1.0.39`.

- [ ] **Step 4: Commit validation fixes**

Run:

```bash
git add .
git commit -m "Validate family finance skill suite"
```

Only commit if validation required changes.
