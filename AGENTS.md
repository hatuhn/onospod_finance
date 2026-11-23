# AGENTS.md — Codex instructions for Onospod Finance frontend

Read `SPEC.md`, `DESIGN.md`, and `AGENT.md` first. `SPEC.md` is the canonical implementation spec; `DESIGN.md` is the UI contract; `AGENT.md` is the task playbook. The user's project is an **existing running Next.js/NestJS system**. Work **only on the new Finance frontend prototype**.

## Scope
- Use static fixture JSON in `mock-data/*.json`; no backend service, no MongoDB write, no payment/network integration. Keep **mock UI isolated** from production routes.
- Preserve the existing Onospod app layout and code style where possible. Respect **15 screens**, 3 menu groups, Apple-inspired style, 110% fonts, VI/EN, shared date filters, VIP chips.
- Default mock as-of date is **2026-11-17**. Use integer cents for all finance calculations.
- Do not add a second Debit Wallet: Debit debt is negative balance of the existing one Wallet.
- Do not bring back removed Payment Approvals sidebar or Recent Orders panel.
- Do not add paid/unpaid invoice-status filter inside Order P&L; use `All/Has Invoice/No Invoice` + Invoice ID search.
- Refund report filters by `refund_date`, not `order.created_at`.
- Factory performance uses item/shipment allocations; one order can span multiple factories.
- Every menu and row action must work with synthetic data; use a mock repository interface for later API swap.

## Before editing
1. Inspect project conventions and dependencies; read `DESIGN.md`, `SPEC.md`, `AGENT.md` and `DATA_CONTRACT_QUICK_REFERENCE.md` completely.
2. Run `python scripts/validate_mock_data.py` and review `mock-data/expected_totals.json`.
3. Locate current finance routes/components to avoid collisions.

## As you work
- Keep data derived from common selectors, not per-page random numbers.
- Test changes to balances, invoices, refunds, payouts and filtering.
- Provide error/empty states; guard duplicate approvals; show actor and audit timestamp.
- Keep user-visible wording translated via locale dictionary, not direct DOM replace. Match `DESIGN.md` visual tokens and the source HTML reference.
- Reuse shared UI components rather than duplicate page-specific copies.

## Before declaring complete
- Run lint/build, Vitest, Playwright smoke tests for **all 15 pages** in VI/EN, validate fixture script.
- Prove no real API calls or database changes.
- Provide a local frontend URL, screenshots and a brief list of any unimplemented mock actions.
