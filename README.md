# Onospod Finance Next.js Frontend-First Handoff

Codex-ready design and data package based on the latest Finance V2.14 demo (2026-11-17). **All financial data here are synthetic**.

## Current workspace prototype

This is a standalone frontend demo. All routes remain isolated under `/admin/finance-demo`.

| Workspace | Entry route | Included features |
| --- | --- | --- |
| Onospod | `/admin/finance-demo/overview` | Finance reports, order P&L, invoices, balances and production SKU reporting |
| OnosExpress | `/admin/finance-demo/workspaces/onosexpress/overview` | Shipping dashboard, shipments, carrier reports and CSV exports |
| Warehouse | `/admin/finance-demo/workspaces/warehouse/overview` | Workspace shell; inventory workflows are not implemented |
| Partnership | `/admin/finance-demo/workspaces/partnership/overview` | Customer profiles, Standard/Silver/Gold/Diamond levels, resource contracts and customer cashflow |

The workspace switcher remembers the last page in each workspace. Append `?lang=vi` or `?lang=en` to select a language.

The login form is at `/admin/finance-demo/login`. Email sign-in and the Google button are **local demo flows**, not live authentication. Use the publicly documented fixture credentials in `mock-data/auth_demo.json`, or choose **Fill demo account**. Passwords are not persisted. Prototype routes remain directly accessible.

Partnership records persist in browser local storage and are separate from the Onospod ledger. Demo sign-in sessions use session storage. No backend, database, Google OAuth or carrier/payment API is connected. Contracts are sample records, without signing or real transactions.

## Contents
- **`SPEC.md`** — canonical full functional specification, finance rules, all 15 screens, acceptance tests
- **`DESIGN.md`** — canonical design system (Apple-style colors, fonts at 110%, components, layouts, charts, responsive and VI/EN)
- **`AGENT.md`** — delivery playbook and ordered tasks for Codex
- **`AGENTS.md`** — executable repository-level guardrails Codex recognizes
- `ONOSPOD_FINANCE_NEXTJS_SPEC.md` — retained legacy-name copy for prior handoffs
- `CODEX_START_HERE.md` — prompt to paste into Codex
- `reference/onospod_finance_v214_reference.html` — existing HTML design reference
- `mock-data/*.json` — connected, validated sample datasets
- `messages/en.json` and `messages/vi.json` — sample locale dictionaries
- `mock-data/expected_totals.json` — audit/check totals
- `scripts/generate_mock_data.py` — deterministic fixture generator
- `scripts/validate_mock_data.py` — financial and relational integrity checks

## Use with an existing Next.js project
1. Unzip/copy files into a staging folder in the repository, e.g. `docs/finance-prototype/`.
2. Give Codex the `CODEX_START_HERE.md` text, with the folder path. **Note:** an `AGENTS.md` nested under `docs/finance-prototype/` may not govern edits elsewhere in the repo automatically; explicitly ask Codex to read it, or place a scoped `AGENTS.md` at the directory actually being edited.
3. Codex should audit current app, then implement a new frontend route using `mock-data/*.json`.
4. Review all 15 screens and all interactive actions with both locales in browser; only after UI approval begin planning the NestJS adapter.

## Verify fixtures

```bash
python3 scripts/validate_mock_data.py
```

`generate_mock_data.py` is reproducible. If rerun, it regenerates all JSON files with same IDs and amounts.

## Important
The HTML reference alone is an interactive **single-file demo**, not a secure finance app. Do not deploy it as a real finance service or use it for actual approvals. The future API must implement transaction-level accounting guarantees independently from this UI.

## Document responsibilities / precedence

`SPEC.md` is the **behavioral source of truth**; `DESIGN.md` owns visual UX; `AGENT.md` controls the task workflow; `AGENTS.md` defines guardrails. The reference HTML is a **prototype example**, not a source of production financial logic. In case of conflict, prefer the latest user instruction, then `SPEC.md` for behavior, then `DESIGN.md` for visual presentation.

## Run the Finance prototype

Use Node.js 20.9 or newer and npm:

```sh
npm ci
NEXT_TELEMETRY_DISABLED=1 npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open http://127.0.0.1:3100/admin/finance-demo. The initial screen is English. Use the language switch or append `?lang=vi` to open Vietnamese directly. Dashboard links preserve the active reporting context in the URL.

- `src/app/admin/finance-demo/` owns the isolated Next.js route.
- `src/finance/repository.ts` reads the fixture JSON and applies demo mutations in memory.
- `src/finance/views.ts` computes integer-cent reporting and detail view models.
- `src/finance/finance-app.tsx`, `ui.tsx`, `trend.tsx` and `src/app/style.css` provide the shared UI.
- The demo uses Tailwind CSS v4 and local shadcn/ui components in `src/components/ui/`. Radix provides the detail drawer and confirmation dialog. Tables retain the shared React controls and charts use Recharts. It has no runtime service configuration.

Topup review and production item cost overrides persist while you navigate within the open page. Reloading or selecting **Reset Demo** restores fixture values. An invoice can be inspected and printed as a sample statement. Invoice creation and approval, debt payment approval, and factory payout confirmation are outside the implemented demo actions.

### Verification

```sh
python3 scripts/validate_mock_data.py
npm run lint
npm run typecheck
npm test
NEXT_TELEMETRY_DISABLED=1 npm run build
npx playwright install chromium
NEXT_TELEMETRY_DISABLED=1 npm run test:e2e
```

Set `PLAYWRIGHT_CHROME` to a local Chrome executable if it is already installed. The smoke tests cover finance and workspace routes in both languages, enforce local GET-only traffic during navigation, and save screenshots under `test-results/screenshots` by default.
