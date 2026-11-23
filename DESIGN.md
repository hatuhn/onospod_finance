# DESIGN.md — Onospod Finance UI Design System

**Status:** Canonical visual and interaction specification for the **frontend-only JSON mock**.  
**Product:** Onospod Finance Admin — Shadcnblocks-inspired **ERP**, not an Apple marketing page.  
**Design baseline:** `reference/onospod_finance_v214_reference.html`; follow `SPEC.md` where its updated business rules differ from old HTML behavior.  
**Languages:** English (`en`) and Vietnamese (`vi`); both first-class.  
**Typography:** approximately **110% of the original admin baseline**, with deliberate readable table density.

## 1. Design goals and hierarchy

1. Show finance truth first: **Revenue / Cost / Profit / Wallet Balance / Outstanding Debt**. Use labels identifying **period flow**, **as-of snapshot**, **estimated**, or **finalized**.
2. Allow users to move from KPI → filtered rows → **Order, Invoice, Customer, Payment or Factory** detail in at most two meaningful interactions.
3. Build the same shell, actions, feedback patterns, and filters across all 15 screens. Do not make each page a different dashboard.
4. Preserve enterprise density: data tables are compact and legible. Never hide critical columns without a scroll indication or column-selection control.
5. Never imply a real approval, bank payment, production cost change, or refund occurred: this phase uses deterministic JSON fixtures and local mock state only.

## Dashboard container and sidebar update

Measured from https://shadcnblocks-admin.vercel.app/ecommerce/dashboard-1 on 2026-11-18. This update supersedes the earlier 1440px maximum.

- Main and footer fill the remaining workspace width. There is no fixed maximum width or centered outer margin.
- Main gutters are 24px on desktop, 16px on tablet and 12px on phones.
- Sidebar remains 256px wide when expanded and uses the existing 64px icon rail when collapsed.
- Sidebar items use Inter 14px / 20px, normal letter spacing and weight 400. The active item uses weight 500.
- Navigation icons are 16px. Item gap is 8px, horizontal padding 8px and minimum height 32px.
- Group captions use 12px / 16px at weight 500 inside a 32px row with 8px horizontal padding.

## Form and typography update from the shipping editor

Measured from the live Shadcnblocks Admin Kit shipping editor on 2026-11-18. These values supersede earlier Apple control sizes and pill button styling in this document. Finance uses the fluid dashboard container described above, sidebar icon rail, chart comparison behavior and financial semantics.

Reference — https://shadcnblocks-admin.vercel.app/ecommerce/edit-shipping

| Element | Observed style | Finance implementation |
|---|---|---|
| Font | Inter, regular 400, medium 500, semibold 600 | Locally bundled Inter Variable, including Vietnamese |
| Page heading | 30px / 36px, 600, tracking -0.75px | `text-title-1` |
| Section heading | 20px / 28px, 600, tracking -0.5px | `text-headline` |
| Body and input value | 14px / 20px, 400, normal tracking | `text-body` and `text-callout` |
| Label | 14px, 500, about 20px line height | Shared form label |
| Meta and helper | 12–14px, muted | `text-caption` or `text-callout` |
| Input and select | 36px tall, 12px horizontal padding, 8px corners, 1px border | Standard and compact field variants |
| Input adornments | Weight and dimension units share the field border | Standalone Finance fields retain their existing semantics |
| Textarea | 112px minimum height, padding 8px 12px, 8px corners | Shared Textarea |
| Button | 36px tall, padding 8px 16px, 14px / 20px, 500, 8px corners | Standard Button; square icon control 36px |
| Focus | One-pixel ring with visible border | Keyboard focus ring with semantic invalid state |
| Field spacing | Label to control 12px; vertical field groups 28px; two-column gap 16px | Labels, dialog forms and filter groups |
| Section spacing | Card-to-card gap 24px; header title-description gap 4px | Shared form sections and page heading |
| Card | White surface, 1px neutral border, 18px corners | Shared Card |
| Card padding | 24px header; content 24px sides and bottom | Cards and detail drawers |
| Form layout | Desktop main and supporting columns about 1.35fr / 0.78fr, gap 24px | Existing Finance report columns adapt to the available width |
| Neutral controls | White canvas, near-black primary, light-gray borders, muted secondary text | Neutral light/dark theme variables; finance status and chart colors remain semantic |
| Main layout | 256px sidebar, page gutters 24px | Finance uses a fluid container and 24px desktop gutters |

The first numeric input in the reference sits in a compound input group. Its inner control has zero corner radius while the group provides the rounded border. Use 8px corners on standalone inputs.

## 2. Brand and visual tokens

Finance uses Tailwind CSS v4 and shadcn/ui. The Apple admin palette and type scale below come from the supplied design reference. `src/app/style.css` implements these tokens with `@theme`. Use the named tokens in components and reserve semantic colors for status, financial direction and the data series listed below.

### Bảng màu Apple

| Tên | Light | Dark | Ghi chú |
|---|---|---|---|
| Ink (chữ chính) | `#1d1d1f` | `#f5f5f7` | Không bao giờ dùng `#000` cho chữ ở light mode |
| Ink secondary | `#6e6e73` | `#a1a1a6` | Mô tả, label phụ |
| Ink tertiary | `#86868b` | `#86868b` | Placeholder, icon mờ, disabled text |
| Canvas | `#f5f5f7` | `#000000` | Nền trang (vùng ngoài card) |
| Surface | `#ffffff` | `#1d1d1f` | Card, input, dialog, sidebar |
| Surface raised | `#fbfbfd` | `#2c2c2e` | Hover hàng bảng, popover |
| Fill | `#e8e8ed` | `#3a3a3c` | Nút secondary, track switch, nền chip |
| Separator | `#d2d2d7` | `#424245` | Viền input, đường kẻ bảng, divider |
| Separator subtle | `#e8e8ed` | `#2c2c2e` | Viền card, divider nhạt |
| Blue (primary) | `#0071e3` | `#2997ff` | Nút chính, focus, checkbox bật |
| Blue hover | `#0077ed` | `#47a6ff` | |
| Blue pressed | `#006edb` | `#1a8cff` | |
| Link | `#0066cc` | `#2997ff` | Link văn bản |
| Red (destructive) | `#e30000` | `#ff453a` | Lỗi, xoá |
| Red tint | `#fff5f5` | `#3a1210` | Nền input lỗi, alert lỗi |
| Green (success) | `#008009` | `#30d158` | |
| Orange (warning) | `#b64400` | `#ff9f0a` | |

### Biến shadcn/ui

| Biến | Light | Dark |
|---|---|---|
| `--background` | `#f5f5f7` | `#000000` |
| `--foreground` | `#1d1d1f` | `#f5f5f7` |
| `--card` | `#ffffff` | `#1d1d1f` |
| `--popover` | `#ffffff` | `#2c2c2e` |
| `--card-foreground` / `--popover-foreground` | `#1d1d1f` | `#f5f5f7` |
| `--primary` | `#0071e3` | `#2997ff` |
| `--primary-foreground` | `#ffffff` | `#1d1d1f` |
| `--secondary` | `#e8e8ed` | `#3a3a3c` |
| `--secondary-foreground` | `#1d1d1f` | `#f5f5f7` |
| `--muted` | `#f5f5f7` | `#2c2c2e` |
| `--muted-foreground` | `#6e6e73` | `#a1a1a6` |
| `--accent` | `#f5f5f7` | `#2c2c2e` |
| `--accent-foreground` | `#1d1d1f` | `#f5f5f7` |
| `--destructive` | `#e30000` | `#ff453a` |
| `--destructive-foreground` | `#ffffff` | `#1d1d1f` |
| `--border` | `#e8e8ed` | `#2c2c2e` |
| `--input` | `#d2d2d7` | `#424245` |
| `--ring` | `#0071e3` | `#2997ff` |

Thêm ngoài shadcn: `--tertiary`, `--link`, `--success`, `--warning`, `--destructive-tint`, `--surface-raised`, `--fill`.

Theme follows the system color preference. The root classes `.light` and `.dark` can override it. Components use the same semantic classes in both themes. Keep the dark foreground on filled primary and destructive controls for contrast.

### Report chart tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `chart-1` | `#0071e3` | `#2997ff` | Apparel / May Mặc and primary chart series |
| `chart-2` | `#30b0c7` | `#40c8e0` | 2D Printing |
| `chart-3` | `#5856d6` | `#5e5ce6` | Handmade |
| `chart-4` | `#ff9500` | `#ff9f0a` | Embroidery / Thêu |
| `chart-5` | `#ff2d55` | `#ff375f` | Fifth categorical group |
| `chart-compare` | `#aeaeb2` | `#636366` | Dashed previous period |
| `chart-grid` | `#e8e8ed` | `#2c2c2e` | Horizontal grid |
| `chart-axis` | `#86868b` | `#86868b` | Axis labels |
| `chart-positive` / `chart-negative` | `#008009` / `#e30000` | `#30d158` / `#ff453a` | Favorable and unfavorable change |

Assign department colors in fixture order and retain the assignment across filters and metric changes. Tooltips, legend and accessible chart table use those same theme variables. Sequential and muted chart colors are defined in the stylesheet for density and series emphasis.

### Customer tier chips

- `Super 0`, `Super 1`, `Super 2`: lavender surface `#EEE7FF`, text `#6937BB`.
- `Partner VIP 1`, `Partner VIP 2`, `Partner VIP 3`: cyan surface `#E4F4FB`, text `#006C93`.
- `Seller VIP 3`, `Seller VIP 4`: amber surface `#FFF0DF`, text `#A45A08`.
- Always show full Level text and semantic grouping; do not rely on color alone.

### State chips

| State | Visual treatment | Secondary information |
|---|---|---|
| Approved / Finalized | Light green + green text | Reviewer/time when financial event |
| Pending / Estimated | Light amber + amber text | Still not posted to wallet |
| Rejected / Loss / Overdue | Light red + red text | Distinct reason/time where relevant |
| Neutral / Not applicable | Light gray | Use `—` for missing Invoice ID |

**Beware:** `Has Invoice` means invoice reference exists, **not** paid status. `No Invoice` does not mean unpaid; Prepaid Orders may have no monthly debt Invoice.

## 3. Typography / numeric presentation

Use locally bundled Inter Variable with system fallbacks. The form reference uses Inter. Use the classes below as a unit so size, line height and letter spacing stay consistent. Use 400 for body, 500 for controls, 600 for headings and 700 for large financial values. Apply `text-title-1` to desktop page titles, `text-title-3` to compact page titles and large dialogs, and `text-headline` to primary card headings. KPI amounts use `text-title-2` on desktop `text-title-3` on compact screens and `text-headline` on narrow phones to fit Vietnamese USD formats.

### Display

| Token | Size | Line-height | Letter-spacing | Weight | Dùng cho |
|---|---|---|---|---|---|
| `text-display-lg` | 48px | 1.08349 | -0.003em | 600 | Màn hình trống / onboarding |
| `text-display` | 40px | 1.1 | 0 | 600 | Số KPI lớn (dashboard) |
| `text-title-1` | 30px | 1.2 | -0.025em | 600 | Tiêu đề trang (H1) |
| `text-title-2` | 28px | 1.14286 | 0.007em | 600 | Tiêu đề section lớn |
| `text-title-3` | 24px | 1.16667 | 0.009em | 600 | Tiêu đề card lớn / dialog lớn |
| `text-headline` | 20px | 1.4 | -0.025em | 600 | Tiêu đề card, dialog |

### UI

| Token | Size | Line-height | Letter-spacing | Weight mặc định | Dùng cho |
|---|---|---|---|---|---|
| `text-body-lg` | 17px | 1.47059 | -0.022em | 400 | Đoạn văn dài, mô tả trong trang chi tiết, **giá trị input** |
| `text-body` | 14px | 1.428571 | 0 | 400 | Nội dung chính trong admin, menu sidebar, nút cỡ thường |
| `text-callout` | 14px | 1.428571 | 0 | 400 | Ô bảng, label form, tab, badge lớn |
| `text-caption` | 12px | 1.33337 | -0.01em | 400 | Helper text, lỗi form, timestamp, header bảng |
| `text-micro` | 11px | 1.27273 | 0.006em | 500 | Badge nhỏ, counter, kbd |

- Currency: `font-variant-numeric: tabular-nums`, right-aligned in numeric columns, **integer cents in data**, localized formatting at display boundary.
- Consistent precision: two decimals for USD money, percentage to two decimals unless a chart axis needs a rounded tick, count as integer; show minus sign for negative balances.
- Display `—` only for missing references, never for a real zero; show `$0.00` for known zero.
- English and Vietnamese text wrap naturally. Do not clip Vietnamese diacritics or truncate invoice/order IDs without accessible full tooltip.

## 4. Spacing, corners, borders and elevation

- Use the 4px spacing scale. The main content is centered at a full remaining workspace width. Allow denser spacing in filters and on small screens.
- Use 18px for cards, 12px for confirmation dialogs, 8px for inputs and buttons, and pill corners for badges.
- Separate surfaces with a thin border. Reserve shadows for overlays and selected segments. The top bar uses a translucent card surface with blur.
- The expanded sidebar is 256px. Its collapsed desktop rail is 64px and keeps all navigation icons and their accessible names. Narrow screens open the full sidebar from a menu button.

### Shared component tokens

| Component | Contract |
|---|---|
| Text input and date fields | 36px standard and in filter bars. Use `border-input`, `bg-card` and `text-body-lg` or compact `text-callout`. Focus uses a one-pixel focus ring. Use `aria-invalid` for invalid entries. |
| Select | Match the compact input. Finance uses a native select for the existing keyboard and platform picker behavior. |
| Textarea | 112px minimum, 12px radius, and the same focus and invalid state as text inputs. |
| Button | 8px corners. Standard and icon controls use 36px. The compact button beside filters uses 36px to align with its field. |
| Table | 40px headers, 48px body rows, tabular numbers and a separate horizontal scroll region. |
| Tabs and date presets | Use pills with a visible selected state. Preserve the preset order and scroll on narrow screens. |
| Dialog, drawer and toast | Use semantic surfaces and a dimmed overlay. Preserve Radix focus restoration and keyboard dismissal. |
| Badge | Use 24px pills. Keep neutral and semantic variants and the three distinct VIP group colors. |
| Icons | Use Lucide with consistent sizes for navigation and controls. Active navigation uses the primary color on the icon. |

New Tailwind components should use `text-body`, `text-callout` or `text-caption` in place of framework defaults. Add new colors and type sizes to the theme only when the design calls for a reusable token. Use the section 2 chart tokens for report visuals.

## 5. Application shell and navigation

### Sidebar (exactly 3 groups / 15 screens)

**Financial Operations / VẬN HÀNH TÀI CHÍNH (7):**
1. Finance Overview / Tổng quan tài chính
2. Order Profit & Loss / Lãi lỗ đơn hàng
3. Customers Finance / Tài chính khách hàng
4. Customer Balances / Số dư khách hàng
5. Wallet & Topup / Ví & Nạp tiền
6. Transactions / Lịch sử giao dịch
7. Monthly Reports / Báo cáo tháng

**Debt & Receivables / KIỂM TRA CÔNG NỢ (4):**
8. Debit & Receivables / Debit & Công nợ
9. Debt by Order / Công nợ theo đơn
10. Monthly Invoices / Hóa đơn tháng
11. Payment Records / Giao dịch thanh toán

**Manufacturing / SẢN XUẤT (4):**
12. Production Finance / Tài chính sản xuất
13. Production Expenses / Chi phí sản xuất
14. Shipping & Tax / Vận chuyển & Thuế phí
15. Factory Performance / Hiệu quả nhà máy

**Prohibited legacy menus/panels:** no standalone `Payment Approvals` sidebar entry; no `Recent Orders` on Overview; no status filter Paid/Partially Paid/Unpaid in Order P&L Invoice filter. Keep Topup approval **inside Wallet & Topup**.

### Shell layout

```text
Desktop 1440px+
┌────────────────┬──────────────────────────────────────────────────┐
│ Brand          │ Topbar: page context · EN/VI · mock/demo badge  │
│ Financial Ops  ├──────────────────────────────────────────────────┤
│ Debt           │ Title + definition + controls / Export           │
│ Manufacturing  │ Horizontal date preset row (overflow scroll)    │
│                │ Factory · User · VIP/Customer filters            │
│                │ KPI grid (2–4 columns)                            │
│                │ Trends / breakdown / data table                   │
│                │ Details in right-side drawer                      │
└────────────────┴──────────────────────────────────────────────────┘
```

At tablet width sidebar may collapse. On small screens use an accessible menu/drawer (not an unreadably narrow sidebar), KPI 2 columns or 1 column, tables horizontal scroll with sticky identifier column. On mobile the date presets remain a **horizontal row** that scrolls; never stack into multiple rows.

## 6. Global filters: stable, contextual, predictable

Render the same `DateRangeBar` on every screen:

`Today · Yesterday · Last 7 Days · This Month · Last Month · Last 3 Months · Last 6 Months · This Year · Custom Range`

- In VI, translate text; **maintain sequence and horizontal treatment**. Default `This Month`.
- Custom Range shows `From` / `To` date pickers with inclusive dates and validation.
- Mock clock is 2026-11-17 (Asia/Bangkok), not `new Date()` at runtime. Current month runs through the mock clock.
- Global controls: Factory, User, Customer Level; Customer Type/Search where meaningful. Explain when a filter does not apply.
- URL query reflects filters, so shareable internal navigation or browser Back restores state. Avoid losing filter selection on tab switch.
- A filter affects **KPI + chart + table + CSV export** using one shared selector. A visible empty result shows which filters are active and a Clear Filters action.
- Date anchor by screen must be explicit: Orders `created_at`, Refunds `refund_date`, Wallet snapshot as-of end date, Invoice billing period, Factory payouts payment date, Topup posted/approval date when applicable.

### Invoice filter in Order P&L

Keep **Invoice ID text input** and **one segmented control**: `All | Has Invoice | No Invoice`. For Refunds, match the **original Order's Invoice ID**. No payment status control on this page. Clickable Invoice IDs open details. Missing reference displays `—`.

## 7. Page patterns, actions and drilldowns

| Pattern | Preferred component | Rules |
|---|---|---|
| KPI summary | `FinanceKpiCard` | Clear title, value, currency, time basis, trend only when grounded |
| Detailed rows | TanStack Table + shadcn Table | Sorting, filter, pagination, column visibility, loading/empty, accessible row actions |
| Detail panel | shadcn `Sheet` on right | Order P&L, production/shipping lines, invoice links, audit; reversible navigation |
| Critical confirmation | shadcn `AlertDialog` | Approve/Reject Topup, credit changes, mock payout confirmation |
| Form or allocation input | shadcn `Dialog` + React Hook Form + Zod | Validation, reason/actor, Cancel/Save, no silent submission |
| Status / warning feedback | `Badge` + toast | Explicit text; toast not sole record of financial operation |
| Help text / definitions | Tooltip / Popover | Explain debt versus Wallet and snapshot-versus-period |
| Chart | Apache ECharts client component | Responsive, legend + tooltip + keyboard-accessible table fallback |
| Report download | CSV action | Export **current filtered rows**; display period/filters in filename or report header |
| Statement | Sheet + print CSS | Clearly mark DEMO, not a legally issued tax invoice |

- Use descriptive action names: `View Order`, `View Invoice`, `Approve Topup`, `Reject Topup`, `Export CSV`, not anonymous icon-only controls without labels.
- Every row action must lead somewhere meaningful; absent references are plain em dashes, not clickable dead links.
- Approve topup requires status Pending and demo manager/admin role; confirmation dialog; one wallet ledger credit at most; reviewer, timestamp and audit trail visible afterwards.
- Reject does not post wallet funds. Approved cannot be re-approved; double clicks should not duplicate posts.
- Mock edits must show an obvious `Demo Data / No Real Transaction` indicator. Provide reset to pristine fixture state.

## 8. Chart contract and reporting visuals

### Report layout and comparisons

- Show the shared filters first, up to four primary KPIs, the main chart, breakdowns, and accessible detail tables in that order. The disclosure below the KPI row contains additional metrics and their original drilldowns.
- Compare against the immediately preceding range with the same number of calendar days and the same non-date filters. A snapshot compares end dates. Show the comparison dates. If the preceding range starts before the fixture coverage, show that the comparison is unavailable. If the previous value is zero and the current value differs, explain the zero baseline without showing a percentage.
- Show signed changes alongside directional icons. Costs, debt balances, overdue items and cancelled orders reverse the favorable color. Keep the amount formatting in the shared VI/EN formatters with integer USD cents as the source.
- Use the local shadcn-style Chart container with Recharts 3 for line charts. The main chart is 360px tall on desktop and 280px on compact screens. Keep a stable chart area for empty data, show a retry action for rendering errors, and allow direct inspection through the accompanying data table. Horizontal grid lines, compact Y-axis numbers, theme-aware tooltips, a legend above the chart and hidden axis borders follow the updated design.
- Use a horizontal ranking list for factory contribution and customer tier revenue. Charts render from local selectors. The reporting design also lists TanStack Query, nuqs, TanStack Table, ECharts, Tremor and ExcelJS as options for reports that need their capabilities. The Finance prototype uses its existing local dataset, URL filters, table controls and CSV export.

### Overview: Department Trends (instead of Recent Orders)

- Two tabs: `Revenue / Doanh thu` and `By SKU / Theo SKU`.
- Show four current department lines using section 2 colors and an optional dashed line for the total of all departments in the preceding period. Align comparison buckets by elapsed days. In SKU mode the previous total counts distinct SKU IDs across departments.
- Revenue shows **production revenue**, not total order revenue or Topup. By SKU shows **count of distinct SKU IDs** per bucket, not units.
- X buckets depend on date range (day/week/month); selection must not reorder colors. Tooltip shows formatted bucket + department + correct metric/unit.
- Empty filters produce empty state, not invented flat-line zeros. Include readable legend cards; a data table view gives nonvisual access to values.
- Show the time zone in the chart subtitle and the bucket date in its tooltip.

### Order profitability and factory charts

- Always distinguish **Revenue (charged to customer)**, **Cost (incurred)**, **Payout (cash paid)** and **Profit (revenue minus cost)**.
- Factory comparisons must aggregate **allocated order item amounts**, not multiply full order revenue into every matching factory.
- Refund effects group by refund event date and appear separately from booked Orders.
- Avoid pie charts with many tiny slices for VIP/Factory comparisons; use horizontal bar chart/table for comparisons.
- Colors on financial metrics follow semantic positive/negative status, not department series mapping.

## 9. Localization and accessibility

- Use `messages/en.json` / `messages/vi.json` and `next-intl` or existing project i18n; no runtime string replacement of raw DOM.
- Locale switch in topbar retains screen, filters, tab, selected Order and mock changes where feasible.
- Translate **all** labels: sidebar, filter presets, status, empty states, drawer fields, validation errors, chart tooltips, CSV headers if locale-specific.
- Use `Intl.NumberFormat` with consistent USD formatting; date `dd/MM/yyyy` in VI and locale-appropriate English while storing ISO YYYY-MM-DD.
- WCAG AA-friendly text contrast, focus-visible outline, keyboard navigation, row action labels, ESC closes drawer/dialog, focus restoration, screen-reader titles for modals.
- Offer `aria-live` or toast announcement on successful mock approve/reject, and include visible changed record status.
- Ensure horizontal table/date overflow is usable by keyboard and touch.

## 10. Screen quality checklist (15/15)

- [ ] Each screen has a page title, explanation/metric basis, global filters, working data grid or visual, and meaningful demo content.
- [ ] No duplicate sidebars or orphaned page links; correct three groups.
- [ ] Every money field right-aligned and computed from shared fixture selectors.
- [ ] Positive Wallet and Negative Wallet shown separately; Debt is the negative Wallet amount for Debit customers.
- [ ] Orders supports Invoice ID filter, Invoice availability, and Refunds in Period tab.
- [ ] Overview trend tabs with four fixed department colors.
- [ ] Production Expenses distinguishes **factory payable** from **factory payout** and filters by Factory/User.
- [ ] Topup approval shows approved_by and approved_at, protects against duplicate posting.
- [ ] Tables have row details, sorting, pagination, empty state and error state.
- [ ] Every page renders in EN/VI at desktop/tablet/mobile; no clipped overlay, truncated key identifiers, invisible actions or contrast failures.
- [ ] `scripts/validate_mock_data.py` passes; fixtures must remain a single source of truth.
- [ ] Playwright screenshots and interactions completed before calling UI finished.

## 11. What to hand back for review

Provide the working **local Next.js route**, screenshots for Overview, Order Profit, Wallet/Topup, Invoice, Manufacturing in VI and EN, a list of component paths, any changed tokens, and tests. Do not claim pixel-perfect fidelity if real browser screenshots weren't compared. No production API integration in this phase.


## Order Invoices extension — 2026-11-18

The requested Order Invoices screen extends Financial Operations to eight entries and the prototype to sixteen screens across the existing three groups. Route `/admin/finance-demo/order-invoices` uses the Invoice List 2 reference layout with a centered title, inline summary strip and invoice table. It reads the existing monthly statements and their linked order/customer data. The metrics show past-due balance, balance due in the next 30 days, invoice count and settled statement volume. Global filters apply before local amount filtering and sorting. Row actions open the invoice detail and download CSV. List CSV exports the locally filtered rows. The summary strip describes the globally filtered statement set. English and Vietnamese are supported.

Reference — https://shadcnblocks-admin.vercel.app/payment-processor/invoice-list-2



## Weekly Production Invoices extension — 2026-11-18

Manufacturing now includes Production Invoices at `/admin/finance-demo/production-invoices`. The prototype contains seventeen screens across three menu groups.

A draft sample production invoice groups positively charged production items by customer and Monday–Sunday week. The fixture uses order creation date for production activity. Totals use integer cents from `order_items.production_revenue_cents`. Quantity subtracts cancelled units. Factory filters select item allocations, and the user filter selects account managers. Invoice search matches customer, linked orders and the stable weekly invoice identifier. A partially selected week shows the included date bounds in its detail. Each row offers Show and Download. Show resolves the itemized production charges, linked customer and source orders. Download exports the current invoice summary as CSV. Detail printing creates a sample statement.

