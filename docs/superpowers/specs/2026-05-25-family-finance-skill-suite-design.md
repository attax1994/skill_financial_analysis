# Family Finance Skill Suite Design

## Goal

Build a maintainable Codex skill suite for family financial planning. The suite helps users create and maintain a long-running Feishu spreadsheet ledger, update it from monthly summary data, export Excel backups or reports, and run read-only financial analysis.

The first version targets monthly summary data, not transaction-level bookkeeping. Special income, special expenses, asset conversion notes, and asset change notes remain supported through the template's "other" and explanation fields.

## Skill Suite Shape

Use a main skill plus three analysis sub-skills:

- `family-finance`: ledger lifecycle, templates, profile configuration, Feishu read/write, import/export, write previews, confirmations, and reminder setup.
- `family-finance-health-check`: basic monthly financial health analysis.
- `family-finance-structure-analysis`: asset allocation, debt, liquidity, and concentration analysis.
- `family-finance-planning`: forward-looking planning, budgeting, rebalancing, debt payoff, and risk scenarios.

The current repository is the source of truth. The suite should later be installed with `npx skills`. Shared assets, scripts, and references live under the main skill. Sub-skills reference the main skill's shared data model instead of duplicating it.

## Proposed Repository Layout

```text
skills/
  family-finance/
    SKILL.md
    agents/openai.yaml
    assets/
      family-finance-template.xlsx
      family-finance-template.manifest.json
    scripts/
      check-env.mjs
      validate-snapshot.mjs
      build-write-preview.mjs
      import-monthly-snapshots.mjs
      export-ledger.mjs
    references/
      data-model.md
      manifest.md
      lark-cli-workflows.md
      template-policy.md

  family-finance-health-check/
    SKILL.md
    agents/openai.yaml

  family-finance-structure-analysis/
    SKILL.md
    agents/openai.yaml

  family-finance-planning/
    SKILL.md
    agents/openai.yaml
```

## Template Assets

The main skill ships with a local `.xlsx` template and a machine-readable manifest. The online Feishu template is only the source used during development; installed users must not depend on access to that online document.

The local template should be generalized, not fully blank:

- Preserve headers, formulas, formatting, merged cells, frozen rows/columns, and generic instructions.
- Remove all real personal amounts.
- Replace personal labels with generic examples, such as `成员A工资`, `成员B工资`, `公司股权/RSU`, `车辆资产`, `贷款备还金`, `宽基基金账户`, and `海外指数账户`.
- Preserve formula cells and protect them through manifest metadata.

The manifest records:

- Template version.
- Sheet roles and expected names.
- Standard fields and their cell/column mappings.
- User-writable regions.
- Formula and summary regions that must not be overwritten.
- Renderable seed definitions for reconstruction, including values, formulas, styles, merged ranges, frozen rows/columns, dimensions, dropdowns, and other supported sheet features needed by the local template.
- Unit policy, defaulting to 万元.
- Annual sheet group creation rules.
- Config recovery fields.
- Light customization fields, including display names, recurring income fields, asset/debt item names, target allocations, and reminder cadence.

## Feishu Ledger Structure

The long-running ledger is one Feishu spreadsheet containing multiple annual sheet groups:

```text
_config
_snapshots
_imports
_template_cashflow
_template_balance
2026现金流
2026资产负债
2027现金流
2027资产负债
...
```

System sheets are visible, not hidden. Their first rows should warn users that these sheets are managed by the skill, can be inspected and carefully edited, and may break automation if schema versions, sheet IDs, field mappings, or formula regions are changed incorrectly.

`_config` stores a copy of the local profile so a user can recover after losing local state. `_snapshots` stores optional balance sheet history. `_imports` stores import metadata, validation summaries, month ranges, and write outcomes without preserving unnecessary sensitive raw input.

`_template_cashflow` and `_template_balance` are visible seed sheets used for annual rollover. They contain generalized labels, formulas, formatting, and no real user values. Annual sheets should be created by copying these seed sheets inside the same spreadsheet when possible, because `lark-cli sheets +copy-sheet` can operate within an existing spreadsheet. If seed copying fails or is unavailable, the implementation falls back to manifest-driven reconstruction with `+create-sheet`, `+write`, `+update-sheet`, `+merge-cells`, `+set-style`, and dimension commands.

## Sheet Creation Protocol

The first implementation must treat Feishu sheet creation as a tested protocol, not an assumption.

Initial ledger creation uses this order:

1. Create an empty Feishu spreadsheet with `lark-cli sheets +create`.
2. Inspect the default sheet created with the new spreadsheet and either reuse it for the first system/seed sheet, rename it, or delete it after replacement. Do not leave an unmanaged default sheet.
3. Create visible system and seed sheets with `lark-cli sheets +create-sheet`.
4. Populate seed sheets from the local manifest using `lark-cli sheets +write`.
5. Apply frozen rows/columns and sheet protection metadata with `lark-cli sheets +update-sheet`.
6. Apply merged cells, styles, dimensions, and dropdowns with the corresponding `lark-cli sheets +*` commands where supported.
7. Create the first annual sheet group by copying seed sheets with `lark-cli sheets +copy-sheet`.
8. Populate `_config` after the annual sheet IDs are known.

Annual rollover uses this order:

1. Read `_config` and verify seed sheet IDs still exist.
2. Copy `_template_cashflow` to `<year>现金流`.
3. Copy `_template_balance` to `<year>资产负债`.
4. Clear or initialize writable data ranges according to the manifest.
5. Verify the copied sheets by reading formulas with `--value-render-option Formula`, checking sheet metadata with `lark-cli sheets +info`, and comparing required ranges, formulas, frozen rows/columns, and merge counts against the manifest.
6. Update `_config` only after verification passes.

If `+copy-sheet` cannot preserve required formulas or formatting, the implementation must switch that ledger to the manifest reconstruction path and record the degraded creation mode in `_config`. The degraded mode must still pass formula, writable-range, and protected-range checks before accepting writes.

## Local Profile

The main skill also stores a lightweight local profile. It must avoid storing full financial values. It may store:

- Profile name.
- Feishu spreadsheet token or URL.
- Sheet IDs by year and role.
- Display-name mappings.
- Template version.
- Last sync or update timestamp.

If local state is missing, the user can provide a Feishu spreadsheet URL and the skill can rebuild the local profile from `_config`.

Profile data is not a secret, but it is private. Never store Feishu access tokens, refresh tokens, app secrets, cookies, keychain material, or raw authentication output in either local profile files or `_config`. The profile may store document identifiers that are already implied by access to the ledger, such as spreadsheet token, spreadsheet URL, sheet IDs, template version, display-name mappings, and target allocation settings. Full backup exports include these fields; report-only exports should omit `_config`, `_imports`, and raw profile metadata by default.

## Data Model

Use a shared model across natural language, JSON, YAML, CSV, Excel import, and analysis flows:

- `FamilyFinanceProfile`: ledger location, sheet map, display names, unit settings, template version, target allocations, and reminder settings.
- `MonthlySnapshot`: one year/month of income, expenses, asset conversions, asset changes, and explanation fields.
- `BalanceSheetSnapshot`: current asset/debt state and optional historical snapshot metadata.
- `WritePreview`: proposed writes, conflicts, original values, normalized values, target cells, explanations, and unresolved items.

Default unit is 万元. If users omit a unit, treat values as 万元. If users explicitly use 元, 千元, or 万元, normalize to 万元 and show both original and normalized values in the preview.

The implementation must create canonical schemas before writing production scripts. JSON Schema is preferred because it can validate JSON input without TypeScript compilation. Reference docs should also include TypeScript-like interfaces and golden examples.

Minimum schema rules:

- Month keys use `YYYY-MM`.
- Numeric ledger values are decimal numbers in 万元 after normalization.
- Store normalized values with at most four decimal places unless a field explicitly needs more precision.
- Preserve `null` as "unknown/not provided" and `0` as an explicit zero.
- Allow negative values only where semantically valid, such as refunds, reversals, asset losses, or liability reductions, and require an explanation note.
- Keep currency separate from unit. Default currency is the user's ledger currency, initially CNY. Non-CNY values require an exchange-rate assumption in the input or preview.
- Use stable enum keys for standard fields and separate them from user-facing display labels.
- Map "other" numeric fields to their paired explanation fields, so extra context is not lost.
- Standardize validation errors with code, message, field path, severity, and suggested fix.

## Monthly Update Flow

The main skill follows this flow:

1. Load local profile or recover from Feishu `_config`.
2. Read target year sheets and existing values.
3. Parse user input into `MonthlySnapshot`.
4. Validate field mappings, units, month/year, and formula protection.
5. Generate `WritePreview`.
6. Show preview and request user confirmation.
7. After confirmation, write with `lark-cli sheets +write`.
8. Optionally record a balance sheet snapshot in `_snapshots`.
9. Offer read-only analysis through the relevant sub-skill.

Natural language parsing is model-assisted but transparent. Clear fields map directly. Common items may be classified heuristically: year-end bonus and tax refunds as other income, vehicle insurance and property fees as special expenses, mortgage principal and long-term account deposits as asset conversions, and RSU or asset depreciation as asset changes. Ambiguous items go to `unresolved_items` and are not written until clarified.

Structured input is supported for batch import. JSON is the core zero-extra-dependency path. CSV, YAML, and XLSX import are optional enhancements that may require npm packages.

## Write Safety Protocol

Every write must be based on a concrete preview. A preview contains:

- `preview_id`, generated from a stable hash of profile ID, spreadsheet token, target ranges, normalized snapshot data, original cell values, and timestamp.
- `read_revision` or the closest revision-like metadata returned by `lark-cli sheets +read`.
- Original cell values for every numeric and explanation target.
- Target ranges and values.
- Conflict decisions explicitly approved by the user.

Immediately before writing, the skill must re-read every target cell and compare it with the preview's original values. If any value changed, the write is rejected as stale and a fresh preview is required. This protects against concurrent manual edits and stale chat confirmations.

Writes should be grouped by contiguous ranges where possible, but correctness is more important than fewer API calls. After each write group, re-read the written range and verify that the expected values are present. If a later group fails, do not pretend rollback succeeded unless a compensating write was actually verified. Instead, record a partial failure record in `_imports` or a dedicated operation log with:

- Operation ID and preview ID.
- Started/finished timestamps.
- Target profile, year, month, and ranges.
- Status: `planned`, `confirmed`, `writing`, `verified`, `partial_failed`, `failed`, or `stale_rejected`.
- Per-range write and verification result.
- Human-readable recovery instructions.

If recording the failure to Feishu also fails, write a local recovery record next to the local profile and tell the user the exact path. The next run must surface unresolved local recovery records before attempting additional writes to the same ledger.

Single-month updates and batch imports both use this protocol. Batch imports should write month by month so a partial failure can be isolated. Retrying a failed operation must compare the current cells against the failed operation's verified state and produce a new preview.

## Conflict Policy

Never silently overwrite numeric fields. If a target numeric cell already has a value, the preview must show the conflict and require explicit user confirmation or a requested merge method.

Explanation fields may append by default, separated by newlines, but the preview must show the final text. If the user says they are supplementing an item, the skill may suggest merging into an "other" or "special" numeric field, but still requires confirmation.

## Annual Rollover and Snapshots

Use one sheet group per year. If the user updates a year that does not exist, show a preview for creating the annual sheet group before writing data. Prefer copying or recreating from the local template and manifest.

The balance sheet defaults to the latest snapshot. Users may optionally record monthly or quarterly snapshots in `_snapshots` for later trend analysis.

## Analysis Sub-Skills

All analysis sub-skills are read-only and should not write analysis results back to Feishu.

`family-finance-health-check` outputs monthly income, expenses, savings rate, cash surplus, cumulative cash flow, net-worth movement, cash safety buffer, and unusual items.

`family-finance-structure-analysis` outputs allocation across defense, Beta, Alpha, non-current assets, debt structure, target allocation drift, concentration, liquidity, and payoff priority.

`family-finance-planning` outputs future cash-flow planning, budgeting, rebalancing, debt payoff, risk scenarios, and annual path recommendations. It may give simple, diversified, low-complexity examples: cash and short-duration instruments for defense, broad index ETFs such as VOO or QQQ for Beta examples, and no specific stock picks for Alpha. Alpha guidance should focus on position limits, concentration, discipline, and risk budget.

Default analysis uses only ledger data. If users ask for current market context, the planning skill may look up public market data and must cite source, date, and assumptions. Analysis sub-skills must not write market data or assumptions into the ledger. If the user explicitly asks to save a market assumption, route that write through the main `family-finance` skill and its preview/confirmation protocol.

Planning output must include advice boundaries. The skill can provide educational analysis, scenario planning, and low-complexity examples, but it must not present recommendations as personalized regulated financial advice. It should ask for risk tolerance, time horizon, liquidity needs, tax jurisdiction, and currency assumptions when those materially affect the answer. It must refuse or redirect requests for specific Alpha-layer individual stock buy/sell calls and instead discuss concentration limits, review discipline, and risk budgets.

## Lark CLI Dependency

The suite depends on `lark-cli` for Feishu spreadsheet operations. The main skill should check:

- `lark-cli --version`.
- Configuration and user login state.
- Read, write, create, and export capabilities as needed.

Missing permissions should be handled with least-privilege guidance, such as asking the user to run an appropriate `lark-cli auth login --scope ...` command. Do not request broad scopes up front.

Core flows should require only Node.js built-ins plus `lark-cli`. Optional enhancements may prompt for npm dependencies only when invoked.

The install contract should be explicit in `SKILL.md` and `references/lark-cli-workflows.md`:

- Require a maintained Node.js runtime; Node.js 20+ is the recommended baseline unless testing proves a lower version works.
- Require `lark-cli` to be on `PATH`; if missing, point users to the official `lark-cli` installation and AI Agent quick-start documentation.
- Require `lark-cli` version 1.0.39 or newer unless compatibility testing expands the range.
- Require user identity for personal Feishu ledger access; bot identity is not the default path.
- Verify that sub-skills can locate the main skill by relative suite layout after `npx skills` installation. If this is not reliable, sub-skills must instruct Codex to locate the installed `family-finance` skill by name and read its references/assets from that folder.
- Optional npm dependencies must be detected at runtime by feature, not installed silently. Error messages should name the feature, missing package, and a safe install command.

## Reminder Flow

The suite supports reminder-style monthly updates. It does not automatically write financial data.

Default cadence is after the natural month ends or on the first day of the next month. In ordinary environments, the skill gives reminder instructions. In Codex environments that support automations, and only when the user explicitly asks, it may create a monthly reminder that wakes the user to provide the prior month summary.

## Export Strategy

Support two export modes:

- Full backup: export the complete Feishu spreadsheet, including annual sheets, `_config`, `_snapshots`, and `_imports`.
- Report-only: export user-readable financial reports while excluding or de-emphasizing system management sheets.

The first implementation may prioritize full backup through `lark-cli sheets +export`. Report-only export can be an optional enhancement if it requires additional Node dependencies.

## Validation Plan

Implementation should validate:

1. Template extraction from the online Feishu source is read-only.
2. Local template contains no real personal amounts or specific personal asset names.
3. Manifest matches template sheets, writable regions, and protected formula regions.
4. `lark-cli` can create, read, write, and export a test spreadsheet.
5. JSON monthly input creates a correct preview.
6. Unit conversion works for 元, 千元, and 万元.
7. Numeric conflicts require confirmation.
8. Explanation fields append as expected.
9. Sub-skills are read-only.
10. Skill validation passes for all four skill folders.

Additional end-to-end tests should cover:

- Recovery from Feishu `_config` when the local profile is missing.
- Missing, renamed, duplicated, or manually edited system sheets.
- Template and manifest version mismatch.
- Annual rollover through `+copy-sheet` and through manifest reconstruction.
- Stale preview rejection after a manual cell edit.
- Partial write failure and operation-log recovery guidance.
- Permission-denied responses for read, write, create, and export flows.
- Optional dependency missing paths for CSV, YAML, and XLSX import.
- Full backup export privacy review and report-only export omitting system metadata.
- Market-data lookup paths with source/date citation when planning requests current data.

## Initial Implementation Order

1. Initialize the four skill folders with required metadata and agent UI files.
2. Create shared references for data model, manifest, Lark CLI workflows, and template policy.
3. Extract and generalize the Feishu template into local `.xlsx` and manifest assets.
4. Implement environment checks and snapshot validation scripts.
5. Implement write preview generation for JSON input.
6. Implement Feishu read/write workflows with explicit confirmation gates.
7. Implement import/export helpers.
8. Write the three analysis sub-skills.
9. Run validation and forward-test realistic usage prompts.
