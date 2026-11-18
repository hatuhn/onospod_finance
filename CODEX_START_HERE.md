# COPY THIS TO CODEX (Frontend-first)

I have a working production Onospod system and want to implement a NEW Finance admin frontend **using JSON fixtures first**. Backend/API work is **not part of this phase**.

Read these files in order:
1. `AGENTS.md` — repository safety and implementation boundaries
2. `AGENT.md` — step-by-step delivery plan
3. `SPEC.md` — **canonical 15-screen functional specification**
4. `DESIGN.md` — **canonical Apple-inspired design tokens, layout, interaction and accessibility**
5. `DATA_CONTRACT_QUICK_REFERENCE.md` — money, dates and entity relationships
6. `reference/onospod_finance_v214_reference.html` — visual/behavior reference
7. `mock-data/*.json`, `messages/*.json`, and `scripts/validate_mock_data.py`

The older `ONOSPOD_FINANCE_NEXTJS_SPEC.md` is included for backward compatibility only; follow `SPEC.md` as the canonical spec.

**Instructions:**
- Audit the current Next.js repository and existing finance routes before modifying anything. Never replace running Finance pages or API routes without approval.
- Implement all 15 Finance screens across 3 sidebar groups, following `DESIGN.md` for Apple-inspired UI, 110% typography, bilingual VI/EN and horizontally scrolling date bar. Reuse app conventions; no new monolithic dashboard framework.
- Use Tailwind + shadcn/ui, TanStack Table, Apache ECharts, TanStack Query, a small mock FinanceRepository interface and validated integer-cent selectors. Adapt to already-installed libraries.
- Wire every visible component (KPI, tables, line charts, filters, actions, drawers, exports) to the **same JSON fixture repository**. No API access, no MongoDB changes, no live financial actions.
- Implement Overview line chart with Revenue / By SKU tabs, four departments/colors; Order P&L with original-order Invoice ID search, All/Has/No Invoice and Refunds in Period tab; Wallet Topup Approve/Reject; production payments by factory; VI/EN.
- Ensure customer Debit is negative balance of the ONE shared Wallet; use approved-only ledger postings; no double counting production cost/factory payout.
- Implement code and Playwright/Vitest tests. Treat each screen/page as unfinished until its own fixtures, filters, actions and empty states have been inspected. Run `python scripts/validate_mock_data.py` before and after. Render screenshots, test all 15 screens in VI and EN, confirm filter, modal and approval behaviors.
- Finish with a concise description of changed files, how to run the frontend locally, which tests passed, and a list of known limitations.

**Stop after frontend mock is functional.** Do not implement NestJS finance endpoints or backfill live accounting data until explicitly authorized.
