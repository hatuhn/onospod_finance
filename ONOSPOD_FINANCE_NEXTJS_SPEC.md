# ONOSPOD FINANCE — NEXT.JS UI IMPLEMENTATION SPECIFICATION (legacy filename)

> Prefer **`SPEC.md`** for the canonical, updated specification and **`DESIGN.md`** for visual details. This file remains for backwards compatibility.

**Version:** Frontend Mock v1.0 / Reference design HTML v2.14  
**Date / fixture clock:** 2026-11-17 (Asia/Bangkok)  
**Primary audience:** Codex implementing inside the **existing** Onospod codebase  
**Implementation phase:** **Frontend first, JSON mock data only. NO real NestJS APIs, NO MongoDB changes, NO live charge/topup/refund actions.**

> Read `AGENTS.md` and this document before writing code. Start by inspecting the repository. Treat `reference/onospod_finance_v214_reference.html` as the established product/UI reference, not as React-ready production source. Rebuild components in Next.js rather than injecting its HTML or scripts.

## 0. Outcome and non-negotiable boundaries

Recreate and improve the current Onospod Finance admin within existing Next.js App Router architecture. It has **15 pages in 3 sidebar groups**, bilingual English/Vietnamese, Apple-inspired minimal desktop-first admin UI, 110% base typography, linked JSON fixtures, configurable filters, and working interactive **mock** actions. Keep the current system running, reuse its conventions, and do not modify existing production finance flows.

- Do **not** connect to `qc.onospod.com`, real Onospod databases, real payment providers, or existing production charge endpoints in phase 1.
- Do **not** invent a separate Debit Wallet. Both customer types use **one Wallet Balance**. Debit customers may go negative up to the approved credit limit. Negative wallet = net customer debt.
- Do **not** treat topup/debt repayment as additional order revenue, or factory payout as an additional production expense after production cost has already been recognized.
- Show **illustrative mock data** clearly; all screens, rows, KPI, charts, drawers and exports derive from the **same repository and fixture files**, never hardcoded mismatched KPI numbers.
- Use amount **integer cents** in JSON/TypeScript, display in USD with currency formatting. No binary float arithmetic for money.
- Same query/filter state must flow into KPI, tables, charts and CSV/Excel exports. Customer Balance snapshots explicitly show **as-of date**; do not present stock balance as period flow.
- Read-only admin can navigate and inspect; mutating buttons run **mock-only** state transitions with validation, confirmation and activity log. Provide **Reset Demo** control.
- Build and validate in small increments. Do not mark completed when any sidebar menu is empty or a button is inert.

## 1. Project integration instructions for Codex

1. Inspect existing Next.js version, routing, Tailwind setup, dependencies, auth layout, design tokens, locales and folder naming conventions. Preserve the existing repository's architecture unless there is a compelling reason otherwise.
2. Add a route group such as `app/[locale]/(admin)/finance/...` **only if it fits** the current routing structure. Avoid breaking current `/admin` routes.
3. Implement `FinanceRepository` interface with a `MockFinanceRepository` adapter over `mock-data/*.json`. All components and hooks depend on this interface, **not** on imports of JSON in the page itself.
4. Add `NEXT_PUBLIC_FINANCE_DATA_SOURCE=mock` or the existing feature flag equivalent. For this phase only implement `mock`; leave a TODO documenting how a future API adapter could implement the same interface.
5. Use typed selectors/aggregators from line-item and transaction-level fixtures. Derived totals must be recalculated after mock mutation, filtering, refund approval or topup approval.
6. Build one shared app shell (header, sidebar, filter bar, table, chart, drawer, empty/loading/error states). Reuse across all 15 screens.
7. Respect the current finance permissions when known; in standalone demo emulate `viewer`, `finance_staff`, `finance_manager`, `admin` roles, but do not claim demo authorization equals server-side authorization.
8. Deliver browser-test evidence plus instructions for local run and screenshot QA in both VI and EN.

### Recommended open-source stack

| Concern | Choice | Reason |
|---|---|---|
| Application | Existing **Next.js App Router + TypeScript** | Reuse current application instead of a second dashboard app |
| Styling | **Tailwind CSS + shadcn/ui** | Accessible low-level UI elements, easy control over Apple-like styling |
| Data tables | **TanStack Table** | Sorting, filtering, visibility, row selection, expansion, pagination |
| Charts | **Apache ECharts** with React wrapper or isolated client wrapper | Multi-series line charts, tooltips, legends, zoom, export, responsive |
| Queries and mutations | **TanStack Query** | Unified `useQuery`/`useMutation`, mock today and API later |
| Form state | **React Hook Form + Zod** | Typed validation in topup approval, invoice filters, expense forms |
| Dates | **date-fns** or existing date utility | Consistent period handling and Asia/Bangkok display |
| Locales | **next-intl**, unless repo already has an established i18n tool | Translate menus, tables, charts, modal content, status, exports |
| Icons | **lucide-react** | Consistent action icons |
| Export | **CSV** using shared selector; `exceljs` optional for XLSX | Reuse underlying view rows and filters, never separate report math |
| PDF mock print | Browser print CSS initially; `@react-pdf/renderer` if proper layout required | Show monthly statement mock without real tax invoice issuance |
| Unit tests | **Vitest** | Test selectors, formulae and mock transitions |
| UI tests | **Playwright** | Test navigation, filters, drawers, EN/VI, approvals, exports |

Review installed versions and APIs before coding (TanStack Table has evolved; follow the installed version's documentation, not an outdated snippet). Avoid installing several overlapping dashboard frameworks. No Ant Design/MUI migration is needed if using shadcn/ui.

Official references:
- Next.js: https://nextjs.org/docs/app
- shadcn/ui: https://ui.shadcn.com/docs
- TanStack Table: https://tanstack.com/table/latest/docs
- Apache ECharts: https://echarts.apache.org/en/index.html
- TanStack Query: https://tanstack.com/query/latest
- next-intl: https://next-intl.dev/docs
- Playwright: https://playwright.dev/docs/intro

## 2. Design language — Apple-like Onospod Finance

**This is an ERP admin, not an Apple marketing website.** Clean, quiet, legible and data-dense.

| Token | Value |
|---|---|
| Canvas | `#F5F5F7` |
| Card / sidebar | `#FFFFFF` |
| Primary text | `#1D1D1F` |
| Secondary text | `#74747B` |
| Hairline border | `#E5E5E9` |
| Primary action | `#0066CC` |
| Positive amount | `#168052` |
| Negative amount | `#C73744` |
| Warning | `#AD6A05` |
| Font stack | `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| Font scale | 110% relative to reference base; prefer `rem` and design tokens |
| Money | Right-aligned, tabular figures, negatives use minus sign and red |
| Layout | Sticky sidebar, sticky filter/header when sensible, cards with subtle border, 12–16px radius |
| Spacing | 4/8/12/16/24/32px system, consistent across components |
| Responsiveness | Large table horizontal scroll with sticky Order ID/Customer column; mobile drawer navigation |

**Customer VIP labels:** distinguish `Super`, `Partner VIP`, `Seller VIP` via colored chips; keep individual Level visible. Color not the only status indicator.

**Department line chart colors (exact):**

| Department | Color |
|---|---|
| May Mặc / Apparel | `#007AFF` |
| 2D | `#AF52DE` |
| Handmade | `#F59E0B` |
| Thêu / Embroidery | `#16A085` |

Drawers for row details; Dialog for approvals/confirmations; Tooltip for financial field definitions; Toast for mock success/failure. Charts should expose a data table fallback and accessible labels. Keep forms compact without tiny text.

## 3. Sidebar — precisely 3 groups, 15 screens

### A. Financial Operations / Vận Hành Tài Chính — 7 screens

1. `overview` — Finance Overview / Tổng quan tài chính
2. `orders` — Order Profit & Loss / Lãi lỗ đơn hàng
3. `customers` — Customers Finance / Tài chính khách hàng
4. `balances` — Customer Balances / Số dư khách hàng (**must be in this group**)
5. `wallet` — Wallet & Topup / Ví & Nạp tiền
6. `transactions` — Transactions / Lịch sử giao dịch
7. `reports` — Monthly Reports / Báo cáo tháng

### B. Debt & Receivables / Kiểm Tra Công Nợ — 4 screens

8. `debit` — Debit & Receivables / Debit & Công nợ
9. `debtorders` — Debt by Order / Công nợ theo đơn
10. `invoices` — Monthly Invoices / Hóa đơn tháng
11. `payments` — Payment Records / Giao dịch thanh toán

**Do NOT add a standalone `Payment Approvals` sidebar menu**; it was intentionally removed as duplicate. Topup Approve/Reject lives in Wallet & Topup. Debt payment records may show their own review details/approval actions if the demo defines it, without separate navigation.

### C. Manufacturing / Sản Xuất — 4 screens

12. `production` — Production Finance / Tài chính sản xuất
13. `productionpayables` — Production Expenses / Chi phí sản xuất
14. `shipping` — Shipping & Tax / Vận chuyển & Thuế phí
15. `factories` — Factory Performance / Hiệu quả nhà máy

Never leave an empty placeholder screen. All 15 pages must render relevant synthetic records and report figures.

## 4. Global filters (shared across pages)

Toolbar must display horizontal date presets (scroll horizontally on narrow viewports):

`Today | Yesterday | Last 7 Days | This Month | Last Month | Last 3 Months | Last 6 Months | This Year | Custom Range`

Translate labels for Vietnamese, preserve ordering and horizontal treatment. `Custom Range` reveals From/To date pickers, inclusive dates. Use **fixture clock 2026-11-17**, not host computer time, in mock mode. `Last 3 Months` means current month plus previous two calendar months through mock as-of date (2026-09-01..2026-11-17). `Last 6 Months` similarly. Define date range conversion in one pure function, with tests.

Other filters: Factory (all / 4), User (production owner or account manager **depending page**; label scope clearly), Customer Level (8 labels), Customer Type (Prepaid/Debit), Search. Store applicable filters in URL query parameters; preserve them while switching screens. Use per-screen filters for Invoice ID, Invoice Presence, Refund tab, payment/Topup status. Paginate tables, reset pagination on filter change.

**Date semantics are page-dependent** — never apply `order.created_at` blindly to all datasets:

| Report type | Date field |
|---|---|
| Orders Created | `orders.created_at` |
| Refunds in Period | `refunds.refund_date` |
| Production activity | `order_items` through order production dates; fixture simplified via `orders.created_at`, show label |
| Factory payouts | `factory_payouts.payment_date` |
| Shipments | `shipments.shipped_at` or cost posting date when known |
| Topups | approved/recorded date by selected metric; specify in KPI label |
| Debt payments | `debt_payments.payment_date` |
| Monthly Invoice | `invoices.period_month` / `issued_at`, choose explicitly |
| Customer Balances | snapshot **as of** date; compute ledger events up to end date |

On pages where some global filters are irrelevant, label them unavailable/disabled with explanation instead of silently misfiltering values. Factory filter on an Order with multiple factories means **include the Order when any item/shipment matches**; whole-order amount is shown in Order Listing. Factory Performance uses **allocated line-level amounts** and therefore adds to company total without double-counting.

## 5. Finance rules and formulas — frontend selectors, mock only

### 5.1 Order-level revenue, direct cost and profit

- `production_revenue = Σ order_items.production_revenue_cents`
- `shipping_revenue = Σ shipments.shipping_revenue_cents`
- `tax_fee_revenue = Σ shipments.tax_fee_revenue_cents` (earned fees only; taxes held on behalf of government must be tracked separately)
- `order_revenue = production_revenue + shipping_revenue + tax_fee_revenue`
- `production_cost = Σ order_items.production_cost_cents`
- `shipping_cost = Σ shipments.shipping_cost_cents`
- `tax_fee_cost = Σ shipments.tax_fee_cost_cents`
- `other_cost = Σ shipments.other_cost_cents`
- `direct_cost = production_cost + shipping_cost + tax_fee_cost + other_cost`
- `order_profit = order_revenue - direct_cost`
- `order_margin_pct = order_revenue > 0 ? 100 × order_profit / order_revenue : null`

These are **order contribution profits**, not company net profit. Mark `cost_status=estimated` for in-production orders and `actual` for closed cost snapshots. For cancelled orders, customer charge may be zero while sunk cost remains; negative profit is valid. Currency all integer cents.

### 5.2 Refund events (critically important)

Orders Created tab filters **order creation date**. Refunds in Period tab filters **refund event date**, irrespective of original order month. Example: August Order refunded in November appears in November Refund tab. It must not appear as a second November Order.

`refund_profit_impact = -approved_refund_amount + recovered_cost`.

Show `refund_id`, `refund_date`, `original_order_id`, `original_order_date`, `invoice_id` (if any), Customer, factory, refundable amount, recovery, profit impact, approved_by. Multiple refunds per Order must be allowed in type contracts. Historical Order P&L can show a refund timeline, but month aggregations count refund **once** by event date.

**Do not label Order Gross Profit + Refunds issued this month as a recognized accounting P&L** unless revenue recognition and period policies are formally defined. UI may show "Operational period adjustment" with description. The frontend stage visualizes the agreed data; final accounting treatment awaits API/business validation.

### 5.3 Debit and same Wallet

- Customer has `account_type = prepaid | debit`; both share the **same wallet ledger**.
- `wallet_balance_as_of = Σ approved wallet ledger events up to date`.
- `outstanding_debt = max(0, -wallet_balance_as_of)`.
- `positive_wallet = max(0, wallet_balance_as_of)`.
- `available_credit = max(0, debit_limit + wallet_balance_as_of - pending_credit_exposure)` for debit; mock `pending_credit_exposure = 0`.
- For prepaid, a negative Wallet is invalid.
- Approved topup increases Wallet; unapproved topup has no ledger entry.
- Approved debt payment increases the **same** Wallet (toward zero) and is allocated to Orders/Invoices; no separate Debit Wallet.
- Approved refund issued as wallet credit also increases Wallet; it reduces related Order/Invoice outstanding.
- Do not offset one customer's positive wallet against another customer's debt. Company-wide `Total Positive` and `Total Negative` are distinct sums.

The sample dataset is constructed such that all debit payments are fully allocated, allowing `sum(Debt by Order outstanding)` to reconcile with `max(0,-Wallet)` per debit customer. Future APIs must support unallocated bank receipts and opening balances explicitly rather than forcing equality.

### 5.4 Monthly Invoice vs payment

Each monthly Invoice is a **customer debt statement**, not automatically an official tax/VAT invoice. Its `order_ids` link to the source orders. In current sample, debit orders get one monthly statement and prepaid orders have no monthly debt Invoice.

`invoice_remaining = invoice_gross - invoice_approved_refund_credits - Σ approved_payment_allocations`. Keep payment records linked by allocation IDs. Overdue calculation uses `due_at` and as-of date.

**Order Profit & Loss Invoice filter:** `All | Has Invoice | No Invoice`; keep Invoice ID text search. **Do not include Paid/Partially Paid/Unpaid status filter** on this page: user expressly requested only Invoice ID and presence. Invoice statuses remain in Receivables group.

### 5.5 Manufacturing costs and payouts are separate

`Production Cost` is the expense arising from producing goods, attributed by order item, factory and production user. `Factory Payout` is a bank payment to the factory/payee (e.g. **Onos Factory**). Payout is **NOT another addition** to cost of sales.

For each factory-month `payable.production_cost = Σ item production costs` (fixture uses order creation month for simplicity), `payable_remaining = production_cost - approved_factory_payouts`. Pending payout is not cash paid. Permit payout records with recorded_by, approved_by, bank_reference, status and Factory, User filter semantics.

### 5.6 Shipping and taxes

Separate amounts **charged to customer** from amounts **paid to carrier**. One Order may have many Shipments/Tracking IDs; one Order can have multiple factories. Include carrier shipping costs, carrier fees, additional charges. Pass-through tax collected on behalf of authorities is not business revenue. For phase 1 the JSON fixture sets pass-through tax to zero to remove ambiguity; the contract retains the field.

### 5.7 Monthly reports

Present separate sections for: Orders gross revenue by creation month; production direct cost; shipping and taxes direct cost; event-date refunds; operational profit after refund adjustment; Topups/Receivables cash movement; Customer debit snapshot; factory payables and disbursements. Avoid double adding shipping or production module totals to Orders revenue. Display basis, date and status on all key financial metrics.

## 6. Screen-by-screen functional requirements

### 6.1 Finance Overview

**KPI**: Order Revenue, Total Direct Cost, Order Profit, Outstanding Debt, Positive Wallet, Approved Topups, Debt Collected, Cancelled Orders. Status note: debt and wallet are snapshot figures, while revenue/topups are period flows. Optional refunds card shows Refund Impact by event date.

**Below cards**: Factory Contribution and Customer Tier Revenue, then **Department Trends line chart** replacing the old "Recent Orders" block. Exactly two tabs:

- **Revenue:** production revenue series by May Mặc, 2D, Handmade, Thêu; group by period buckets and filter.
- **By SKU:** count **distinct SKU IDs** in each bucket by department (not units), with tooltip naming metric.

Four stable colors per spec above. Visible legend, tooltip (bucket/value), hover, empty state, nice axis labels, responsive sizing, accessible data table below chart on demand. Factory filter is by order_items, avoid attributing full multi-factory order revenue to two factories.

### 6.2 Order Profit & Loss

Two tabs: `Orders Created` / `Refunds in Period`.

**Orders Listing columns:** Order ID, Order Date, Invoice ID (clickable, `—` if absent), Customer, VIP Level, User, Factory (show multiple factory chips), SKU(s), Units, Production Revenue, Shipping Revenue, Tax/Fee Revenue, Total Revenue, Production Cost, Shipping Cost, Tax/Fee Cost, Other Cost, Total Direct Cost, Profit, Margin, Order Status, Estimated/Final badge, Actions.

**Filters:** global filters + Invoice ID search + segmented `All | Has Invoice | No Invoice` + status and profitability toggle if helpful. No invoice payment status filter here.

**Refund Listing columns:** Refund ID, refund date, original order/date, original invoice IDs, Customer, Factory, Refund Amount, Cost Recovery, Profit Impact, Approved By. All applicable filters use **refund date**.

**Click Order:** right drawer with P&L breakdown, itemized production by factory, shipment cost breakdown, historical Refunds, linked Invoice IDs and transactions, internal audit info. Demo cost override allowed only in local mock state with reason, original amount and audit entry. All displayed totals recompute.

### 6.3 Customers Finance

List customers with tier chip, account type, Orders, Units, Revenue, Direct Costs, Order Profit, Profit Margin, Topup / Debt info; ranking and drilldown to profile. Tier recorded at order time for historic revenue; current customer tier shown separately. User filter means **account manager** on this screen, not production worker.

### 6.4 Customer Balances

Snapshot as-of date. KPI Total Positive Wallet, Total Negative Wallet, Debit Customers, Credit Available. Table Customer, Tier, Type, Wallet Balance (+/-), Debit Limit, Outstanding Debt, Available Credit, Last Approved Topup, Last Approved Debt Payment, detail. Debit customer negatives red; prepaid positive green. Snapshot computed from ledger; selecting a month uses balance as of last selected day, not sum of period.

### 6.5 Wallet & Topup

Topup table with Topup ID, Customer, Amount, date, bank ref, Recorded By, Status, Approved By, Approved At, Actions. Filters `All / Pending / Approved / Rejected` and global selectors. Row drawer contains proof placeholder, audit and note.

`Approve`/`Reject` available only for Pending and role `finance_manager/admin` in demo. Confirmation Dialog. On approve: status Approved, approved_by, approved_at, add **one** positive wallet ledger record, refresh balance, KPI and transactions. Idempotent: double-click cannot credit twice, no edit to approved record. Reject changes status only, records reviewer/reason, no wallet movement. For unapproved payments no effect. Toast, audit trail; Reset Demo restores fixture.

### 6.6 Transactions

Unified Wallet Ledger: Event ID, Event Date, Customer, Event Type (`order_charge`, `topup`, `debt_payment`, `refund_wallet_credit`), reference, signed amount, running balance, linked detail. Filtering/export. No hidden mutation; balance and report totals derived from approved events.

### 6.7 Monthly Reports

Monthly table (2026-08 through 2026-11 in fixtures) with Orders, Production Revenue, Shipping Revenue, Fee Revenue, Total, Production Cost, Shipping Cost, Fee Cost, Other Cost, Direct Cost, Order Profit, Refunds **by refund month**, Refund Impact, Approved Topup, Approved Debt Collection, Factory Cost and Approved Payout. Filter by month, Factory, User, Customer Tier; export CSV. Separate stock metrics (wallet/debt as-of) from period flows. CSV matches visible filter state.

### 6.8 Debit & Receivables

Customer Type Debit only; KPI Outstanding, Overdue, Current, Available Credit. Table Customer, VIP, Debit Limit, Wallet Balance (negative possible), Debt, Available Credit, Order outstanding, Invoice balance, Next Due, Account Manager. Drilldown statement; no second wallet balance.

### 6.9 Debt by Order

Order ID, Customer, Invoice ID, Order Charge, Refund Credit, Approved Allocated Payments, Remaining Debt, Age Bucket, Due Date; filter by Customer/Invoice/Date/Factory. For prepaid, keep out of AR/debt listing unless explicitly toggled. Click into payment allocations and Invoice. Fully reconcile to debit-wallet snapshot for this fixture.

### 6.10 Monthly Invoices

Invoice ID, period, customer, VIP, Order count, Gross Charge, Refund Credits, Payments Applied, Balance, Due, Status, Created By, Approved By. Drawer shows linked Order rows, allocations and refund events. Generate/Approve/Print actions may be **mock only**; do not issue legal tax invoices. Print-friendly statement preview.

### 6.11 Payment Records

Bank Transfer ID, Date, Customer, Amount, Bank Ref, Recorded By, Approved By, Approved At, Status, Allocated Amount, linked Invoice(s). Drawer with allocations and audit info. There is **no separate Payment Approvals sidebar**. If adding Approve/Reject in Payments, use the same guard/idempotence pattern as Topup and ensure all allocations/Wallet post atomically in mock state.

### 6.12 Production Finance

KPI Production Revenue, Production Cost, Units completed, Units cancelled, SKU count. Breakdown by Department (May Mặc, 2D, Handmade, Thêu), Product, SKU and Factory. Each row with quantity, cancelled units, production costs, margin; click drilldown Orders and Order Items.

### 6.13 Production Expenses

**Manufacturing Expenses** group: Factory, Payee (e.g. Onos Factory), period, Production Cost recognized, Approved Factory Payouts, Outstanding Payable, Pending Payout, production User, approval users, bank reference. Show payables and payout table separately. Factory/production-user filters apply to underlying item costs; payout/user attribution must be explicit to avoid ambiguity. No double counting between Production Cost and payout.

### 6.14 Shipping & Tax

Shipping Revenue vs Carrier Shipping Cost; chargeable Tax/Fee Revenue vs Tax/Fee Cost; Other Cost; Shipping Contribution; Shipment count. Table Shipment/Tracking, Order, Factory, Carrier, Customer, Ship Revenue, Carrier Cost, Fee Revenue, Fee Paid, Tax Collected as Agent, Margin/Contribution, Shipping Status. Group by Carrier, Factory, country if shipping region data later. All sums item/shipment based.

### 6.15 Factory Performance

Table/chart by Factory: produced items, units, SKU count, allocated Production Revenue, Production Cost, production contribution, Shipping Revenue/Cost from originating shipments, Payee/Approved Payouts/Payable Balance, Returns/Refund attribution, User breakdown. **Never duplicate entire Order revenue across multiple factories**. Compare all factories and click through to their transactions/items.

## 7. Shared components, actions and overlays

Required UI primitives: `FinanceShell`, `FinanceSidebar`, `FinanceGlobalFilters`, `PeriodPresetBar`, `SearchFilter`, `CustomerTierBadge`, `AccountTypeBadge`, `CurrencyCell`, `StatCard`, `FinanceDataTable`, `FinanceEmptyState`, `FinanceLineChart`, `OrderDetailDrawer`, `CustomerDetailDrawer`, `InvoiceDetailDrawer`, `TopupDetailDrawer`, `PaymentDetailDrawer`, `FactoryPayableDrawer`, `ApproveRejectDialog`, `ExportButton`, `ResetDemoButton`, `BilingualToggle`, `AuditTimeline`, `LoadingSkeleton`, `PermissionGate`.

**Actions must be functional in mock mode:** switch page; select date preset; custom range; Factory/User/Level/Type filter; Invoice ID search and presence; tab Orders/Refunds; chart Revenue/By SKU; sorting; pagination; expand/download; open/close drawer; language toggle; Topup Approve/Reject; optional payment/payout approval only if implemented correctly; export; reset demo. For buttons whose business rules are not yet specified, use disabled label with a helpful explanation, **not an inert clickable button**.

**Modal rules:** Escape to close, focus trap, keyboard accessible; confirm amount/reference and acting user before approval; display audit identity. Error/empty/loading states must not crash the app. A visible banner labels all finance numbers "Sample data / Dữ liệu minh họa".

## 8. Mock repository contract — essential architecture

Suggested simplified TypeScript contract (Codex should flesh out types under `src/features/finance/types`):

```ts
type FinanceFilter = {
  from: string;
  to: string;
  factoryId?: string;
  userId?: string;
  customerTier?: string;
  customerType?: 'debit' | 'prepaid';
  search?: string;
};
type Page<T> = { rows: T[]; totalRows: number; page: number; pageSize: number };
type ApprovalInput = { id: string; actorUserId: string; reason?: string };

interface FinanceRepository {
  getOverview(filters: FinanceFilter): Promise<OverviewView>;
  getOrders(filters: FinanceFilter & { invoicePresence?: 'all'|'has'|'none'; invoiceId?: string }, page: number): Promise<Page<OrderRow>>;
  getRefunds(filters: FinanceFilter, page: number): Promise<Page<RefundRow>>;
  getOrder(id: string): Promise<OrderDetail>;
  getCustomers(filters: FinanceFilter): Promise<CustomerRow[]>;
  getCustomerBalances(asOf: string, filters: FinanceFilter): Promise<CustomerBalanceRow[]>;
  getTopups(filters: FinanceFilter): Promise<TopupRow[]>;
  approveTopup(input: ApprovalInput): Promise<TopupRow>;
  rejectTopup(input: ApprovalInput): Promise<TopupRow>;
  getDebitAccounts(filters: FinanceFilter): Promise<DebitRow[]>;
  getDebtOrders(filters: FinanceFilter): Promise<DebtOrderRow[]>;
  getInvoices(filters: FinanceFilter): Promise<InvoiceRow[]>;
  getDebtPayments(filters: FinanceFilter): Promise<DebtPaymentRow[]>;
  getWalletLedger(filters: FinanceFilter): Promise<LedgerRow[]>;
  getProduction(filters: FinanceFilter): Promise<ProductionReport>;
  getProductionExpenses(filters: FinanceFilter): Promise<ProductionExpenseReport>;
  getShipping(filters: FinanceFilter): Promise<ShippingReport>;
  getFactories(filters: FinanceFilter): Promise<FactoryReport>;
  getMonthlyReports(filters: FinanceFilter): Promise<MonthlyReport[]>;
  resetDemo(): Promise<void>;
}
```

`MockFinanceRepository` should import static JSON as seed, clone it into an in-memory transactional store, and expose the methods above as async Promises. **Mutations should update only mock store**. If persistence is desired, use explicit sandboxed localStorage key for UI-demo-only state, namespaced by version; provide clear Reset. Do not pretend localStorage equals secure finance audit persistence.

Keep components independent of the repository implementation. Future `ApiFinanceRepository` must reuse selectors/view models and interfaces where possible; switch by factory/feature flag, not a rewrite of all screens. Avoid importing MongoDB types/models into frontend.

Suggested client composition:

```text
App Router page -> useFinanceQuery(filters) -> FinanceRepository
                                   |-> MockFinanceRepository (PHASE 1)
                                   |-> ApiFinanceRepository (PHASE 2 - not built)
Component event -> useMutation -> mock state transition -> query invalidation -> rendered totals
```

## 9. Suggested folder organization (adapt to existing codebase)

```text
src/
  app/[locale]/(admin)/finance/
    layout.tsx
    page.tsx                         # redirect/overview
    overview/page.tsx
    orders/page.tsx
    customers/page.tsx
    balances/page.tsx
    wallet/page.tsx
    transactions/page.tsx
    reports/page.tsx
    debit/page.tsx
    debt-orders/page.tsx
    invoices/page.tsx
    payments/page.tsx
    production/page.tsx
    production-expenses/page.tsx
    shipping/page.tsx
    factories/page.tsx
  features/finance/
    components/{shell,filters,tables,charts,dialogs,drawers}/
    hooks/
    repositories/{finance-repository.ts,mock-finance-repository.ts}/
    selectors/{order-profit.ts,refunds.ts,wallet.ts,invoices.ts,factories.ts,monthly.ts}/
    types/
    mock-data/                      # copy JSON from this pack
    i18n/
    tests/
  messages/{en.json,vi.json}        # integrate existing i18n if present
```

If current app already has admin routing and shared components, place files in equivalent existing locations instead of creating duplicate layouts/components. Add only packages not already installed.

## 10. Fixture data dictionary

All mock files live in `mock-data/`, created reproducibly via `scripts/generate_mock_data.py`. Use `mock-data/expected_totals.json` as fixture-level test oracle (not a hardcoded runtime dashboard). IDs are stable and foreign keys are explicit.

| File | Key fields / relationships |
|---|---|
| `metadata.json` | `as_of_date`, currency, timezone, sample flag |
| `customers.json` | `id`, tier, account_type, debit_limit_cents, wallet_balance_snapshot_cents |
| `factories.json` / `factory_payees.json` | Factory and payment recipient IDs |
| `departments.json` / `skus.json` | SKU -> department + line colors |
| `users.json` / `carriers.json` | Production/finance user and carrier references |
| `orders.json` | Order ID, customer ID, time, status, line/shipment IDs, invoice IDs, reported totals |
| `order_items.json` | Order, SKU, department, factory, user, units, production charge/cost |
| `shipments.json` | Order, factory, carrier, tracking, charged shipping, carrier costs, tax/fee breakdown |
| `refunds.json` | Refund event date, original Order, amount, cost recovery, approval |
| `invoices.json` | Customer/month Order IDs, gross/refund/paid/remaining cents |
| `topups.json` | Pending/Approved/Rejected topup + approver |
| `debt_payments.json` | Bank payments for debit customers, status and reviewer |
| `payment_allocations.json` | Payment ID -> Order ID -> Invoice ID -> allocated cents |
| `wallet_ledger.json` | Signed financial wallet movements, current running balance |
| `factory_payables.json` | Per Factory/Month production liability and settled amount |
| `factory_payouts.json` | Factory payout approvals and bank transfers |
| `expected_totals.json` | Exact fixture totals for regression assertions |

**Important:** The frontend should compute runtime metrics from items/shipments/ledger/allocations, then assert they match fixture's stored aggregate fields. Do not simply trust `orders.total_*` or `customers.wallet_balance_snapshot_*` if detail differs.

### Examples of referential behavior

- Click Invoice ID in Orders -> Invoice drawer resolves `order.invoice_ids` -> `invoices.id`.
- Click Refund row -> original Order -> Invoice ID(s) -> customer.
- Approve Topup -> append exactly one `wallet_ledger` entry -> Customer Balance and transaction view change.
- A Debit payment may allocate across multiple Orders/Invoices; never assume one payment equals one invoice.
- Factory-level Production Cost uses `order_items.factory_id`; shipping uses `shipments.factory_id`.

## 11. Acceptance criteria and tests

**Must pass before presenting demo:**

1. Exactly **15** sidebar pages, **3** correct groups, no separate Payment Approvals, Customer Balances in Financial Operations.
2. VI and EN render all headings, status, filters, chart descriptions and drawer actions; locale switch preserves state.
3. All pages show non-empty relevant rows from JSON fixtures under suitable period/filter; empty result explains applied filters.
4. Global date presets horizontally arranged; same filter context applies to charts/tables/KPI and export. Date rules match section 4.
5. Orders row financial columns and P&L arithmetic equal sum of item and shipment costs (integer cents).
6. Order filter Invoice: All, Has Invoice, No Invoice, search by Invoice ID; correct count; prepaid absent is not falsely marked unpaid.
7. Refund tab shows **historical orders refunded during current month**; order created in August, refund in November appears in November refund view.
8. Overview Revenue/By SKU chart shows four series/colors and filters, and **does not show Recent Orders**.
9. Customer Balances reflect approved-only wallet ledger; debit is negative wallet, prepaid never negative; company totals do not net one account against another.
10. Approved Topup posts wallet **once**; Pending/Rejected have no effect; reviewer identity/time and audit visible.
11. Invoice gross = sum linked orders; refund credits = linked approved refunds; paid = linked approved allocations; remaining equals difference; invoice drawer works.
12. `Σ Debit Order Remaining` = `Σ Negative Debit Wallet` for this fully allocated fixture (test per customer).
13. Factory payables reconcile to production costs; Approved Payouts reduce payable, do **not** double count expenses.
14. Multi-factory orders render multiple factory chips; Factory Performance sums item allocations rather than duplicated whole Orders.
15. All buttons/drawers/tabs/filters reachable by keyboard and pointer; no browser console exceptions; Playwright smoke tests across all 15 pages.
16. CSV output (and XLSX if implemented) has correct date/Factory/User/Level filters, all financial columns, escaped CSV values, no injected formulas on CSV import.
17. `scripts/validate_mock_data.py` passes; run unit tests for cents math and edge cases (cancelled, pending topup, old refund, multiple shipments, duplicate approval).
18. No network calls to production API; no wallet mutation outside mock store; no changes to existing NestJS/MongoDB/backend code.

## 12. Implementation milestones, ordered

**Phase A — Foundation:** audit repo, i18n, layout, sidebar, global filter, mock repository/types, fixture validator. **No API.**

**Phase B — Financial Operations:** Overview charts, Orders/Refunds, Customers, Balances, Wallet approval, Transactions, Monthly Reports. Verify interactions and mobile table behavior.

**Phase C — Debt:** Debit/Receivables, Debt by Order, Monthly Invoices, Payment Records, invoice/order/refund navigation, print preview; reconcile wallet.

**Phase D — Manufacturing:** Production, Production Expenses, Shipping & Tax, Factory Performance; line-level factory allocation; user filters; payout distinctions.

**Phase E — QA and handoff:** screenshots for both locales, automated browser tests, full mock data validation, Lighthouse/a11y pass, README for running, list of Phase 2 data endpoints but **DO NOT implement API integration yet**.

### Phase 2 — explicitly not in current request

Later, after UI approval and audit of live backend, define DTOs, API contracts, auth/audit rules and migrations. Map current Wallet/Charge to repository adapter. Changes to actual finance transactions require authorization, idempotency keys, ledger consistency, historical balance and atomicity guarantees. Do not guess live schema from mock JSON.

---

### Notes for the assistant/Codex

- Design source: `reference/onospod_finance_v214_reference.html` (UI interaction reference only, not necessarily correct business logic).
- The synthetic seed is **not a replica of Onospod's live ledger**. Do not market it as real.
- Existing Finance V2.14 HTML has 15 menus and mock interactions; respect more recent requirements expressed in this document over inconsistent legacy behavior.
- If a requested interaction cannot be safely simulated, visibly disable it with reason rather than pretending to commit live financial changes.
- Produce incremental, reviewable commits; report deviations and data reconciliation outputs.
