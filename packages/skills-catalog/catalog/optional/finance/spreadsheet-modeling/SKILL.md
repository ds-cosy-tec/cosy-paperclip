---
name: spreadsheet-modeling
description: Build and review financial spreadsheets — inputs/calc/outputs layout, formula clarity, assumption tracking, scenario toggles, and self-checking totals — so a reviewer can audit the model end to end.
key: paperclipai/optional/finance/spreadsheet-modeling
recommendedForRoles:
  - finance
  - analyst
  - operator
tags:
  - finance
  - modeling
  - spreadsheet
  - forecasting
---

# Spreadsheet Modeling

Produce financial models that a reviewer can audit without asking the author what cells mean. The bar is: every assumption is named, every formula is traceable, every total cross-checks itself, and changing one input updates the model coherently.

## When to use

- Building a pricing, forecast, budget, runway, fundraising, or scenario model.
- Reviewing someone else's model before a decision relies on it.
- Adapting a template to a new business with different revenue or cost shape.

## When not to use

- The question can be answered with one calculation. A spreadsheet is overkill — write the math in the doc.
- The structure is genuinely tabular data, not a model. Use a database or BI tool.
- A reviewer has explicitly asked for code (a notebook, a script). Models in spreadsheets are reviewable by non-technical operators; that is their advantage, but not always the right one.

## Layout: three zones

Every model has exactly three zones, separated visually (different sheet tabs or banded color):

1. **Inputs.** All numeric assumptions a user can change. One cell per assumption. Named ranges or clear labels.
2. **Calculations.** All derived numbers. No hard-coded values inside formulas — every constant comes from Inputs.
3. **Outputs.** Summary numbers and charts the reader cares about. Pure references to Calculations; no math here.

Hard-coded numbers in calculation cells are the #1 source of audit failures. If a value is constant by policy, give it an Input row labeled "Constant — <reason>".

## Formula discipline

- Each formula on one row should be the same formula across all columns (drag-fillable). If column N uses a different shape than column M with no explanation, that is a bug or an exception worth a comment.
- Avoid stretching formulas across multiple sheets when one sheet would do.
- Prefer named ranges for inputs (`tax_rate`, `headcount`) over cell references (`B7`). Reviewers should not have to chase cell coordinates.
- Use `IFERROR(<formula>, NA())` to make broken precedents visible, not to silently zero them out.
- Date arithmetic uses date functions (`EOMONTH`, `EDATE`), not assumed-30-day fudges.

## Assumption tracking

For each Input, include in the same row:

- The label.
- The value.
- The unit (USD, %, persons, months).
- The source (`internal estimate — see <doc>`, `vendor quote 2025-09`, `analyst consensus`).
- The last-reviewed date.

Reviewers should be able to challenge any number by following its source.

## Scenario design

- Have at least three scenarios: pessimistic, base, optimistic.
- Switch via a single dropdown that all calculations reference.
- Each scenario's input set lives in its own column or its own Inputs sheet section.
- Do not let scenarios diverge in structure — same row labels, same units. Only the values differ.

## Self-checking totals

Every model should include explicit reconciliation rows that should equal zero or hit a known target. Examples:

- Sources of cash − uses of cash = ending cash change (must reconcile to balance sheet movement).
- Sum of monthly figures = annual total (catches off-by-one cell ranges).
- Headcount growth + attrition = headcount delta.

Color these rows. If they go non-zero, the reader sees it immediately.

## Review pass on someone else's model

1. Skim the Inputs sheet. Every value should be a number, not a formula. Every value should have a source.
2. Pick three derived numbers and trace them back to inputs. Flag any hard-coded constant you find in a calculation cell.
3. Toggle scenarios. The outputs should change coherently. Nothing should `#REF!` or `#DIV/0!`.
4. Set a key driver to zero. Outputs should react in a way that matches intuition (e.g., zero customers → zero revenue).
5. Set a key driver to an absurd value. Outputs should not silently clip — they should either reflect the absurdity or warn.
6. Inspect the reconciliation rows. They should already be at the expected target.

## Anti-patterns

- "Magic" numbers in formulas (`*1.32`, `-7500`) with no Input row.
- One giant calculation sheet with no labels. Operators cannot review what they cannot read.
- Hidden sheets that contain real assumptions. Hide for visual cleanliness, never to obscure logic.
- Scenarios implemented by editing inputs in place. The previous scenario is lost.
- Cross-workbook links the reviewer cannot follow. Inline the source numbers instead.
