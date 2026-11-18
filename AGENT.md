# AGENT.md — Implementation playbook for Codex

This document describes the **delivery plan and agent responsibilities**. `AGENTS.md` remains the canonical repository-level instructions that Codex can automatically discover; `SPEC.md` is the functionality contract; `DESIGN.md` is the visual/interaction contract.

## Mission

Build a fully navigable and testable **frontend-only** Onospod Finance Admin in the **existing Next.js repository**, using the shipped interconnected sample JSON. **Do not call live API endpoints, change MongoDB, change Wallet/Charge services or deploy financial transactions.** Preserve running production workflows.

## Source order and decision hierarchy

1. Explicit latest user request in the current conversation/task.
2. `SPEC.md`: business flow and acceptance behavior.
3. `DESIGN.md`: layout, visual tokens, accessibility, bilingual UX.
4. `DATA_CONTRACT_QUICK_REFERENCE.md` and `mock-data/*.json`: fixture fields and arithmetic.
5. `reference/onospod_finance_v214_reference.html`: visual inspiration and legacy interaction examples; **not** reusable production React code.
6. Existing repo conventions when not conflicting with above.

If file names differ in repo, discover exact location. If existing app standards conflict, report the conflict and adapt; never silently rewrite live finance modules.

## Agent responsibilities (can be one Codex agent sequentially)

| Role | Output | Done when |
|---|---|---|
| Repository Auditor | Existing Next.js routes/libs, safe isolated route plan, conflict log | No live backend changes required |
| UI Foundation Builder | Theme tokens, shell, 3 sidebar groups, date filter, i18n, reusable UI | Navigable shell EN/VI |
| Mock Data Integrator | Typed JSON adapter, repository contract, pure finance selectors | Fixture validator and unit tests pass |
| Financial Operations Builder | 7 pages including Orders/Refunds, Wallet approvals and Overview chart | Screens populated; actions testable |
| Debt Builder | 4 debt screens, Invoice link navigation, allocation display | Debt and Wallet reconcile |
| Manufacturing Builder | 4 manufacturing pages, Factory/User filters, payouts | Factory allocations reconcile |
| QA Reviewer | Browser tests, visual screenshots, totals/export audit | All 15 pages and high-risk actions pass |

## Working method for Codex

**Stage 0 — Inspect without changing:** `pwd`, inspect `package.json`, `app/`, existing localization, design tokens, finance routes, auth boundary. Run fixture validator. Document existing stack and decisions.

**Stage 1 — Create isolated frontend route:** use an appropriately named route group, e.g. `/admin/finance-demo`, unless repo conventions dictate otherwise. Ensure no collision with production finance. Keep fixtures reachable in app build, never fetched from an external server.

**Stage 2 — Build data contracts first:** TypeScript types, currency helpers using **integer USD cents**, typed `FinanceRepository` and `MockFinanceRepository`, derived selectors. Use state store only for mock transient approvals. Never generate random numbers inside components.

**Stage 3 — Build design primitives:** app shell, sidebar, DateRangeBar, filters, `Money`, `TierBadge`, `StatusBadge`, `KpiCard`, `FinanceDataTable`, `DetailSheet`, `ConfirmDialog`, `FinanceTrendChart`, `MockModeNotice`.

**Stage 4 — Implement pages by groups:** 7 Financial Operations → 4 Debt & Receivables → 4 Manufacturing. Populate all with existing JSON. Add row-to-row detail links and current-view CSV exports.

**Stage 5 — Review and test:** unit test selectors and high-risk approval guards, browser test all menu links, VI/EN, small viewport, sorting/filtering/tab switching, historical refunds and CSV, then visually compare with HTML reference.

## High-risk business rules

- One shared Wallet for Prepaid and Debit. Negative Wallet is customer's net debt; **no separate Debit Wallet**.
- Only Approved topup/payment events change Wallet; Approve twice posts once, Reject never posts.
- Topup (cash movement) is **not revenue**; Factory payout (cash outflow) is **not another production cost**.
- Order created in August and refunded in November must appear in **November refund report**, not as November-created order.
- Invoice availability in Order Profit is `All / Has Invoice / No Invoice`, plus Invoice ID search; **do not use Paid/Unpaid status filter here**.
- Factory reporting aggregates allocated line items and shipments; filter must not duplicate order revenue across factories.
- Date filters are horizontal on **all** pages and use a fixed mock as-of date in sample mode.
- Remove old Recent Orders and separate Payment Approvals sidebar menu.

## Definition of Done

1. The exact three sidebar groups and **15** screens are accessible and populated.
2. Every control has an outcome: tab selection, pagination, filter, export, drawer, dialog, mocked approval or explicitly disabled reason.
3. `python3 scripts/validate_mock_data.py` passes and no screen invents unrelated totals.
4. Unit tests verify money calculation, invoice/payment reconciliation, refunds, debit balance, factory payables and idempotence.
5. Playwright sees no runtime exceptions through all 15 pages in EN and VI; screenshots generated.
6. Build/lint/typecheck pass with project's scripts.
7. No real APIs, writes or external finance side effects.
8. Reviewer receives local URL, changed files, command to run, test evidence and known limitations.

## Example final Codex report

```text
Implemented frontend mock at: /admin/finance-demo
Data source: local mock-data/*.json; server API disabled
Pages: 15/15; localizations: EN + VI
Validated: fixture script, TypeScript, unit tests, Playwright smoke
Finance reconciliation: [pass/fail + exceptions]
Known limitations: [explicit list]
Backend modified: NO
```

If unable to complete a screen, report it as incomplete, do not label a placeholder production-ready.
