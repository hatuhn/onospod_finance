import {asOf, byId, distinct, freightFor, linesFor, matchesDate, moneyFields, orderPnl, pnl, receivable, refundImpact, select, sum, wallet, type Dataset, type Filter} from './repository';
import type {Screen} from './routes';

export type Locale = 'vi' | 'en';
export type Entity = 'production-invoices' | 'orders' | 'refunds' | 'customers' | 'topups' | 'ledger' | 'invoices' | 'payments' | 'items' | 'shipments' | 'factories' | 'payables' | 'payouts';
export type Reference = {entity: Entity; ids: string[]};
export type Value = string | number | null | Reference;
export type Row = Record<string, Value>;
export type Table = {title: string; rows: Row[]; columns: string[]};
export type Metric = {key: string; value: number; basis?: string; target?: Screen};
export type View = {tables: Table[]; metrics: Metric[]; basis: string};
export const ref = (entity: Entity, ...ids: string[]): Reference => ({entity, ids});
export const isRef = (value: Value): value is Reference => value !== null && typeof value === 'object';
const table = (title: string, columns: string[], rows: Row[]): Table => ({title, columns, rows});
const metrics = (row: Record<string, number>, basis?: string): Metric[] => Object.entries(row).map(([key, value]) => ({key, value, basis}));
const money = Object.keys(moneyFields);
export const currency = new Set([...money, 'balance', 'limit', 'outstanding', 'available', 'positiveWallet', 'negativeWallet', 'approvedTopups', 'debtCollected', 'amount', 'gross', 'credits', 'paid', 'remaining', 'recovered', 'refundImpact', 'approvedPayout', 'pendingPayout', 'factoryPayable', 'taxAgent', 'shippingContribution', 'productionContribution', 'refundAmount', 'overdueDebt', 'currentDebt', 'invoiceBalance', 'orderBalance', 'adjustment', 'allocated', 'dueNext30', 'settledVolume','cashIn','cashOut','netCash','monthlyFee']);
export const userScope = (screen: Screen) => {
  if (['customers', 'balances', 'debit', 'debt-orders', 'invoices', 'order-invoices', 'production-invoices'].includes(screen)) return 'manager';
  if (['wallet', 'transactions', 'payments'].includes(screen)) return 'actor';
  return 'production';
};

export function weeklyProductionInvoices(data: Dataset, filter: Filter) {
  const selected = select(data, {...filter, search: '', invoice: '', presence: ''}, 'manager');
  const groups = new Map<string, {customerId: string; weekStart: string; lines: Dataset['items']}>();
  for (const line of selected.lineRows) {
    const order = byId(data.orders, line.order_id)!;
    if (line.production_revenue_cents <= 0) continue;
    const date = new Date(order.created_at + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    const weekStart = date.toISOString().slice(0, 10);
    const id = 'PINV-' + weekStart + '-' + order.customer_id;
    const group = groups.get(id) ?? {customerId: order.customer_id, weekStart, lines: []};
    group.lines.push(line);
    groups.set(id, group);
  }
  const query = filter.search.trim().toLowerCase();
  return [...groups.entries()].flatMap(([id, group]) => {
    const customer = byId(data.customers, group.customerId)!;
    const orderIds = distinct(group.lines.map(line => line.order_id));
    if (query && ![id, customer.name, customer.id, ...orderIds].some(value => value.toLowerCase().includes(query))) return [];
    const weekEnd = new Date(Date.parse(group.weekStart) + 6 * 86400000).toISOString().slice(0, 10);
    const coveredFrom = group.weekStart < filter.from ? filter.from : group.weekStart;
    const coveredTo = weekEnd > filter.to ? filter.to : weekEnd;
    return [{
      id, customerId: customer.id, customerName: customer.name, tier: customer.tier, type: customer.account_type,
      weekStart: group.weekStart, weekEnd, coveredFrom, coveredTo, orderIds, lines: group.lines,
      units: sum(group.lines, line => line.quantity - line.cancelled_units),
      amount: sum(group.lines, line => line.production_revenue_cents),
      partial: coveredFrom !== group.weekStart || coveredTo !== weekEnd,
    }];
  }).sort((a,b) => b.weekStart.localeCompare(a.weekStart) || a.customerName.localeCompare(b.customerName));
}

function invoiceStatus(due: string, end: string, remaining: number, paid: number, approvedBy: string | null) {
  if (!approvedBy) return 'draft';
  if (remaining <= 0) return 'paid';
  if (due < end) return 'overdue';
  return paid > 0 ? 'partially_paid' : 'unpaid';
}

export function getView(data: Dataset, screen: Screen | 'production' | 'factories', filter: Filter, tab: string, locale: Locale): View {
  const f = select(data, filter, userScope(screen as Screen));
  const {orderRows, refundRows, lineRows, customerRows, topupRows, paymentRows} = f;
  const person = (id: string | null) => byId(data.users, id)?.name ?? null;
  const factory = (id: string) => byId(data.factories, id)?.[locale === 'vi' ? 'name_vi' : 'name_en'] ?? id;
  const department = (id: string) => byId(data.departments, id)?.[locale === 'vi' ? 'name_vi' : 'name_en'] ?? id;
  const customer = (id: string) => ({customer: ref('customers', id), tier: byId(data.customers, id)?.tier ?? null});
  const totalOrders = (rows: Dataset['orders']) => pnl(data.items.filter(row => rows.some(order => order.id === row.order_id)), data.shipments.filter(row => rows.some(order => order.id === row.order_id)));
  const approved = <T extends {status: string; amount_cents: number}>(rows: T[]) => sum(rows.filter(row => row.status === 'approved'), row => row.amount_cents);
  const pct = (profit: number, revenue: number) => revenue ? profit * 100 / revenue : null;
  const balanceRows = customerRows.map(row => {
    const balance = wallet(data, row.id, filter.to);
    const debit = row.account_type === 'debit';
    const lastCredit = (event: string) => data.ledger.filter(movement => movement.customer_id === row.id && movement.event_type === event && movement.event_date <= filter.to).at(-1)?.event_date ?? null;
    return {id: ref('customers', row.id), tier: row.tier, type: row.account_type, balance, limit: row.debit_limit_cents, outstanding: debit ? Math.max(0, -balance) : 0, available: debit ? Math.max(0, row.debit_limit_cents + balance) : 0, lastTopup: lastCredit('topup'), lastPayment: lastCredit('debt_payment'), manager: person(row.account_manager_id)};
  });
  const walletTotals = {
    positiveWallet: sum(balanceRows, row => Math.max(0, row.balance)),
    negativeWallet: sum(balanceRows, row => Math.min(0, row.balance)),
    outstanding: sum(balanceRows, row => row.outstanding),
    available: sum(balanceRows, row => row.available),
  };
  const sales = totalOrders(orderRows);
  const shippingRows = data.shipments.filter(row => matchesDate(row.shipped_at, filter) && f.shipmentMatch(row));
  const payouts = data.payouts.filter(row => (!filter.factory || row.factory_id === filter.factory) && matchesDate(row.payment_date, filter));
  const relevantPayables = data.payables.filter(row => (!filter.factory || row.factory_id === filter.factory) && row.period_month >= filter.from.slice(0, 7) && row.period_month <= filter.to.slice(0, 7));
  const payableRows = relevantPayables.map(row => {
    const lines = lineRows.filter(line => row.order_item_ids.includes(line.id));
    const cost = sum(lines, line => line.production_cost_cents);
    const associated = payouts.filter(payout => payout.factory_payable_id === row.id);
    const paid = approved(associated);
    return {id: ref('payables', row.id), factory: factory(row.factory_id), month: row.period_month, payee: byId(data.payees, row.payee_id)?.name ?? null, productionCosts: cost, approvedPayout: paid, factoryPayable: filter.user || filter.tier || filter.type || filter.search ? null : cost - paid, pendingPayout: sum(associated.filter(payout => payout.status === 'pending'), payout => payout.amount_cents), productionUser: distinct(lines.flatMap(line => person(line.production_user_id) ?? [])).join(', ')};
  });
  const refunds = refundRows.map(row => {
    const order = byId(data.orders, row.order_id)!;
    return {id: ref('refunds', row.id), date: row.refund_date, order: ref('orders', row.order_id), orderDate: order.created_at, invoice: ref('invoices', ...order.invoice_ids), ...customer(row.customer_id), factory: distinct(linesFor(data, order.id).map(line => factory(line.factory_id))).join(' · '), amount: row.refund_amount_cents, recovered: row.recovered_cost_cents, refundImpact: refundImpact(row), approvedBy: person(row.approved_by), status: row.status};
  });
  const factoryRows = data.factories.filter(row => !filter.factory || row.id === filter.factory).flatMap(row => {
    const lines = lineRows.filter(line => line.factory_id === row.id);
    const shipments = shippingRows.filter(shipment => shipment.factory_id === row.id);
    const linked = payableRows.filter(payable => payable.factory === factory(row.id));
    if (!lines.length && !shipments.length && !linked.some(payable => payable.approvedPayout || payable.pendingPayout)) return [];
    const amounts = pnl(lines, shipments);
    const allocatedRefund = sum(refundRows, refund => {
      const all = linesFor(data, refund.order_id);
      const selected = all.filter(line => line.factory_id === row.id && (!filter.user || line.production_user_id === filter.user));
      const revenue = sum(all, line => line.production_revenue_cents);
      if (!revenue) return 0;
      let weight = 0;
      const impact = refundImpact(refund);
      return sum(all, line => {
        const before = Math.trunc(impact * weight / revenue);
        weight += line.production_revenue_cents;
        return selected.includes(line) ? Math.trunc(impact * weight / revenue) - before : 0;
      });
    });
    return [{id: ref('factories', row.id), items: lines.length, units: sum(lines, line => line.quantity - line.cancelled_units), skus: distinct(lines.map(line => line.sku_id)).length, ...amounts, productionContribution: amounts.productionRevenue - amounts.productionCosts, payee: byId(data.payees, row.payee_id)?.name ?? null, approvedPayout: sum(linked, payable => payable.approvedPayout), factoryPayable: linked.some(payable => payable.factoryPayable === null) ? null : sum(linked, payable => payable.factoryPayable ?? 0), refundImpact: allocatedRefund, productionUser: distinct(lines.flatMap(line => person(line.production_user_id) ?? [])).join(', ')}];
  });
  const factoryTable = table('factoryContribution', ['id', 'items', 'units', 'skus', 'productionRevenue', 'productionCosts', 'productionContribution', 'shippingRevenue', 'shippingCosts', 'payee', 'approvedPayout', 'factoryPayable', 'refundImpact', 'productionUser'], factoryRows);

  switch (screen) {
    case 'overview': {
      const tierRows = distinct(orderRows.map(row => row.customer_tier_at_order)).map(tier => {
        const orders = orderRows.filter(row => row.customer_tier_at_order === tier);
        const amounts = totalOrders(orders);
        return {tier, orders: orders.length, revenue: amounts.revenue, profit: amounts.profit};
      });
      const topCustomers = customerRows.map(row => {
        const orders = orderRows.filter(order => order.customer_id === row.id);
        return {customer: ref('customers',row.id), customerSku: row.custom_sku, name: row.name, email: row.email, tier: row.tier, orders: orders.length, ...totalOrders(orders)};
      }).filter(row => row.orders > 0).sort((a,b) => b.revenue - a.revenue || a.customerSku.localeCompare(b.customerSku));
      const cards = [...metrics({revenue: sales.revenue, directCosts: sales.directCosts, profit: sales.profit}, 'period'), ...metrics({outstanding: walletTotals.outstanding, positiveWallet: walletTotals.positiveWallet}, 'snapshot'), ...metrics({approvedTopups: approved(topupRows), debtCollected: approved(paymentRows), cancelledOrders: orderRows.filter(row => row.status === 'cancelled').length}, 'period')];
      const targets: Screen[] = ['orders', 'orders', 'orders', 'debit', 'balances', 'wallet', 'payments', 'orders'];
      return {basis: 'overviewBasis', metrics: cards.map((card, index) => ({...card, target: targets[index]})), tables: [table('topCustomers',['customer','customerSku','name','email','tier','orders','revenue','profit'],topCustomers), table('tierRevenue', ['tier', 'orders', 'revenue', 'profit'], tierRows)]};
    }
    case 'orders': {
      const rows = orderRows.map(row => {
        const lines = linesFor(data, row.id);
        const amounts = orderPnl(data, row.id);
        return {id: ref('orders', row.id), date: row.created_at, invoice: ref('invoices', ...row.invoice_ids), ...customer(row.customer_id), tier: row.customer_tier_at_order, productionUser: distinct(lines.flatMap(line => person(line.production_user_id) ?? [])).join(', '), factory: distinct([...lines, ...freightFor(data, row.id)].map(line => factory(line.factory_id))).join(' · '), sku: distinct(lines.map(line => line.sku_id)).join(' · '), units: sum(lines, line => line.quantity), ...amounts, margin: pct(amounts.profit, amounts.revenue), status: row.status, costStatus: row.cost_status};
      });
      if (tab === 'refunds') return {basis: 'refundBasis', metrics: metrics({refundAmount: sum(refundRows.filter(row => row.status === 'approved'), row => row.refund_amount_cents), recovered: sum(refundRows.filter(row => row.status === 'approved'), row => row.recovered_cost_cents), refundImpact: sum(refundRows, refundImpact), refunds: refundRows.length}), tables: [table('refunds', ['id', 'date', 'order', 'orderDate', 'invoice', 'customer', 'tier', 'factory', 'amount', 'recovered', 'refundImpact', 'approvedBy', 'status'], refunds)]};
      return {basis: 'orderBasis', metrics: metrics({revenue: sales.revenue, directCosts: sales.directCosts, profit: sales.profit, orders: rows.length}), tables: [table('orders', ['id', 'date', 'customer', 'tier', 'units', ...money.filter(key => key !== 'directCosts'), 'margin'], rows)]};
    }
    case 'customers': {
      const customers = data.customers.filter(row => customerRows.includes(row) || orderRows.some(order => row.id === order.customer_id));
      const rows = customers.map(row => {
        const orders = orderRows.filter(order => order.customer_id === row.id);
        const amounts = totalOrders(orders);
        return {id: ref('customers', row.id), tier: row.tier, historicTier: distinct(orders.map(order => order.customer_tier_at_order)).join(' · '), type: row.account_type, orders: orders.length, units: sum(lineRows.filter(line => orders.some(order => order.id === line.order_id)), line => line.quantity), ...amounts, margin: pct(amounts.profit, amounts.revenue), approvedTopups: approved(topupRows.filter(topup => topup.customer_id === row.id)), outstanding: Math.max(0, -wallet(data, row.id, filter.to))};
      }).sort((a, b) => b.revenue - a.revenue);
      return {basis: 'customerBasis', metrics: metrics({customers: rows.length, revenue: sales.revenue, profit: sales.profit, outstanding: sum(rows, row => row.outstanding)}), tables: [table('customers', ['id', 'tier', 'historicTier', 'type', 'orders', 'units', 'revenue', 'directCosts', 'profit', 'margin', 'approvedTopups', 'outstanding'], rows)]};
    }
    case 'balances':
      return {basis: 'snapshot', metrics: metrics({positiveWallet: walletTotals.positiveWallet, negativeWallet: walletTotals.negativeWallet, debitCustomers: balanceRows.filter(row => row.type === 'debit').length, available: walletTotals.available}, 'snapshot'), tables: [table('balances', ['id', 'tier', 'type', 'balance', 'limit', 'outstanding', 'available', 'lastTopup', 'lastPayment'], balanceRows)]};
    case 'wallet':
      return {basis: 'topupBasis', metrics: metrics({approvedTopups: approved(topupRows), pending: topupRows.filter(row => row.status === 'pending').length, rejected: topupRows.filter(row => row.status === 'rejected').length, topups: topupRows.length}), tables: [table('topups', ['id', 'customer', 'tier', 'amount', 'date', 'bankReference', 'recordedBy', 'status', 'approvedBy', 'approvedAt'], topupRows.map(row => ({id: ref('topups', row.id), ...customer(row.customer_id), amount: row.amount_cents, date: row.created_at, bankReference: row.bank_reference, recordedBy: person(row.recorded_by), status: row.status, approvedBy: person(row.approved_by), approvedAt: row.approved_at})))]};
    case 'transactions': {
      const rows = data.ledger.filter(row => {
        const source = row.reference_type === 'topup' ? byId(data.topups, row.reference_id) : row.reference_type === 'payment' ? byId(data.payments, row.reference_id) : row.reference_type === 'refund' ? byId(data.refunds, row.reference_id) : null;
        return matchesDate(row.event_date, filter) && f.customerMatch(row.customer_id) &&
          (!filter.user || (source && [source.recorded_by, source.approved_by].includes(filter.user))) &&
          f.search(row.id, row.reference_id, row.customer_id, byId(data.customers, row.customer_id)?.name);
      }).map(row => {
        const entity = ({topup: 'topups', payment: 'payments', refund: 'refunds', order: 'orders'} as const)[row.reference_type as 'topup' | 'payment' | 'refund' | 'order'];
        return {id: ref('ledger', row.id), date: row.event_date, ...customer(row.customer_id), event: row.event_type, reference: entity ? ref(entity, row.reference_id) : row.reference_id, amount: row.amount_cents, balance: row.balance_after_cents};
      }).reverse();
      return {basis: 'ledgerBasis', metrics: metrics({transactions: rows.length, amount: sum(rows, row => row.amount)}), tables: [table('transactions', ['id', 'date', 'customer', 'tier', 'event', 'reference', 'amount', 'balance'], rows)]};
    }
    case 'reports': {
      const months = distinct(data.orders.map(row => row.created_at.slice(0, 7))).filter(month => month >= filter.from.slice(0, 7) && month <= filter.to.slice(0, 7));
      const rows = months.map(month => {
        const orders = orderRows.filter(row => row.created_at.startsWith(month));
        const monthlyRefunds = refundRows.filter(row => row.refund_date.startsWith(month) && row.status === 'approved');
        const amounts = totalOrders(orders);
        const impact = sum(monthlyRefunds, refundImpact);
        return {month, orders: orders.length, ...amounts, refunds: monthlyRefunds.length, refundAmount: sum(monthlyRefunds, row => row.refund_amount_cents), refundImpact: impact, adjustment: amounts.profit + impact, approvedTopups: approved(topupRows.filter(row => row.approved_at?.startsWith(month))), debtCollected: approved(paymentRows.filter(row => row.payment_date.startsWith(month))), approvedPayout: approved(payouts.filter(row => row.payment_date.startsWith(month)))};
      });
      return {basis: 'reportBasis', metrics: [...metrics({revenue: sales.revenue, profit: sales.profit, refundImpact: sum(refundRows, refundImpact)}, 'period'), ...metrics({outstanding: walletTotals.outstanding, positiveWallet: walletTotals.positiveWallet}, 'snapshot')], tables: [table('months', ['month', 'orders', ...money, 'refunds', 'refundAmount', 'refundImpact', 'adjustment', 'approvedTopups', 'debtCollected', 'approvedPayout'], rows)]};
    }
    case 'debit': {
      const rows = balanceRows.filter(row => row.type === 'debit').map(row => {
        const orders = data.orders.filter(order => order.customer_id === row.id.ids[0] && order.created_at <= filter.to);
        const statements = data.invoices.filter(invoice => invoice.customer_id === row.id.ids[0] && invoice.period_month <= filter.to.slice(0, 7)).map(invoice => ({...invoice, ...receivable(data, invoice.order_ids, filter.to, invoice.id)})).filter(invoice => invoice.remaining > 0);
        const overdue = sum(statements.filter(invoice => invoice.due_at < filter.to), invoice => invoice.remaining);
        return {...row, orderBalance: receivable(data, orders.map(order => order.id), filter.to).remaining, invoiceBalance: sum(statements, invoice => invoice.remaining), overdueDebt: overdue, due: statements.map(invoice => invoice.due_at).sort()[0] ?? null};
      });
      const outstanding = sum(rows, row => row.outstanding);
      const overdueDebt = sum(rows, row => row.overdueDebt);
      return {basis: 'snapshot', metrics: metrics({outstanding, overdueDebt, currentDebt: outstanding - overdueDebt, available: sum(rows, row => row.available)}, 'snapshot'), tables: [table('debit', ['id', 'tier', 'limit', 'balance', 'outstanding', 'available', 'orderBalance', 'invoiceBalance', 'due', 'manager'], rows)]};
    }
    case 'debt-orders': {
      const rows = orderRows.filter(row => row.account_type_at_order === 'debit' && row.invoice_ids.length).map(row => {
        const due = byId(data.invoices, row.invoice_ids[0])?.due_at ?? null;
        const amounts = receivable(data, [row.id], filter.to);
        const age = due && amounts.remaining > 0 ? Math.max(0, Math.round((Date.parse(filter.to) - Date.parse(due)) / 86400000)) : 0;
        return {id: ref('orders', row.id), ...customer(row.customer_id), invoice: ref('invoices', ...row.invoice_ids), date: row.created_at, ...amounts, age: age === 0 ? 'current' : age <= 30 ? '1–30' : age <= 60 ? '31–60' : '61+', due};
      });
      return {basis: 'debtOrderBasis', metrics: metrics({gross: sum(rows, row => row.gross), credits: sum(rows, row => row.credits), paid: sum(rows, row => row.paid), remaining: sum(rows, row => row.remaining)}), tables: [table('debtOrders', ['id', 'customer', 'tier', 'invoice', 'date', 'gross', 'credits', 'paid', 'remaining', 'age', 'due'], rows)]};
    }
    case 'order-invoices':
    case 'invoices': {
      const rows = data.invoices.filter(row => row.period_month >= filter.from.slice(0, 7) && row.period_month <= filter.to.slice(0, 7) && f.customerMatch(row.customer_id) &&
        row.order_ids.some(id => {
          const order = byId(data.orders, id);
          return order && f.orderMatch(order, row.id);
        })).map(row => {
        const amounts = receivable(data, row.order_ids, filter.to, row.id);
        const status = invoiceStatus(row.due_at, filter.to, amounts.remaining, amounts.paid, row.approved_by);
        return {id: ref('invoices', row.id), month: row.period_month, ...customer(row.customer_id), orders: row.order_ids.length, ...amounts, due: row.due_at, status, recordedBy: person(row.created_by), approvedBy: person(row.approved_by)};
      }).filter(row => !filter.status || row.status === filter.status);
      if (screen === 'order-invoices') {
        const nextMonth = new Date(Date.parse(filter.to) + 30 * 86400000).toISOString().slice(0, 10);
        return {
          basis: 'invoiceBasis',
          metrics: metrics({
            overdueDebt: sum(rows.filter(row => row.due < filter.to), row => Math.max(0, row.remaining)),
            dueNext30: sum(rows.filter(row => row.due >= filter.to && row.due <= nextMonth), row => Math.max(0, row.remaining)),
            invoiceCount: rows.length,
            settledVolume: sum(rows.filter(row => row.remaining <= 0), row => row.gross - row.credits),
          }),
          tables: [table('orderInvoices', ['id', 'customer', 'gross', 'status', 'remaining', 'due'], rows)],
        };
      }
      return {basis: 'invoiceBasis', metrics: metrics({gross: sum(rows, row => row.gross), credits: sum(rows, row => row.credits), paid: sum(rows, row => row.paid), remaining: sum(rows, row => row.remaining)}), tables: [table('invoices', ['id', 'month', 'customer', 'tier', 'orders', 'gross', 'credits', 'paid', 'remaining', 'due', 'status', 'recordedBy', 'approvedBy'], rows)]};
    }
    case 'payments': {
      const rows = paymentRows.map(row => {
        const allocations = data.allocations.filter(allocation => allocation.payment_id === row.id);
        return {id: ref('payments', row.id), date: row.payment_date, ...customer(row.customer_id), amount: row.amount_cents, bankReference: row.bank_reference, recordedBy: person(row.recorded_by), approvedBy: person(row.approved_by), approvedAt: row.approved_at, status: row.status, allocated: sum(allocations, allocation => allocation.amount_cents), invoice: ref('invoices', ...distinct(allocations.map(allocation => allocation.invoice_id)))};
      });
      return {basis: 'paymentBasis', metrics: metrics({debtCollected: approved(paymentRows), allocated: sum(rows, row => row.allocated), payments: rows.length}), tables: [table('payments', ['id', 'date', 'customer', 'tier', 'amount', 'bankReference', 'recordedBy', 'approvedBy', 'approvedAt', 'status', 'allocated', 'invoice'], rows)]};
    }
    case 'production-sku': {
      const rows = distinct(lineRows.map(line => line.sku_id)).map(skuId => {
        const lines = lineRows.filter(line => line.sku_id === skuId);
        const sku = byId(data.skus, skuId)!;
        const amounts = pnl(lines, []);
        const completed = lines.filter(line => byId(data.orders,line.order_id)?.status === 'completed');
        const working = lines.filter(line => byId(data.orders,line.order_id)?.status === 'in_production');
        return {
          sku: skuId, product: sku.name, department: department(sku.department_id),
          completedUnits: sum(completed,line => line.quantity - line.cancelled_units),
          inProductionUnits: sum(working,line => line.quantity - line.cancelled_units),
          cancelledUnits: sum(lines,line => line.cancelled_units),
          ...amounts, margin: pct(amounts.profit,amounts.productionRevenue),
          orders: distinct(lines.map(line => line.order_id)).length,
          order: ref('orders',...distinct(lines.map(line => line.order_id))),
        };
      }).sort((a,b) => b.productionRevenue - a.productionRevenue || a.sku.localeCompare(b.sku));
      const factoryRevenue = distinct(lineRows.map(line => line.factory_id)).map(factoryId => {
        const lines = lineRows.filter(line => line.factory_id === factoryId);
        const amounts = pnl(lines, []);
        return {
          factory: ref('factories',factoryId), factoryName: factory(factoryId),
          completedUnits: sum(lines.filter(line => byId(data.orders,line.order_id)?.status === 'completed'),line => line.quantity - line.cancelled_units),
          units: sum(lines,line => line.quantity - line.cancelled_units),
          skus: distinct(lines.map(line => line.sku_id)).length,
          orders: distinct(lines.map(line => line.order_id)).length,
          ...amounts, margin: pct(amounts.profit,amounts.productionRevenue),
          revenueShare: pct(amounts.productionRevenue,sum(rows,row => row.productionRevenue)),
          order: ref('orders',...distinct(lines.map(line => line.order_id))),
        };
      }).sort((a,b) => b.productionRevenue - a.productionRevenue || a.factoryName.localeCompare(b.factoryName));
      return {
        basis: 'skuDashboardBasis',
        metrics: metrics({
          productionRevenue: sum(rows,row => row.productionRevenue),
          completedUnits: sum(rows,row => row.completedUnits),
          skus: rows.length,
          productionContribution: sum(rows,row => row.profit),
        }),
        tables: [table('skuPerformance',['sku','product','department','completedUnits','inProductionUnits','cancelledUnits','productionRevenue','productionCosts','profit','margin','orders','order'],rows), table('factoryRevenueStatistics',['factory','productionRevenue','revenueShare','completedUnits','units','skus','orders','productionCosts','profit','margin','order'],factoryRevenue)],
      };
    }
    case 'production-invoices': {
      const invoices = weeklyProductionInvoices(data, filter);
      const rows = invoices.map(invoice => ({
        id: ref('production-invoices', invoice.id),
        weekStart: invoice.weekStart, weekEnd: invoice.weekEnd, coveredFrom: invoice.coveredFrom, coveredTo: invoice.coveredTo,
        customer: ref('customers', invoice.customerId), tier: invoice.tier, type: invoice.type,
        orders: invoice.orderIds.length, units: invoice.units, productionRevenue: invoice.amount,
        status: 'draft', coverage: invoice.partial ? 'partialWeek' : 'fullWeek',
      }));
      return {
        basis: 'productionInvoiceBasis',
        metrics: metrics({productionRevenue: sum(invoices, invoice => invoice.amount), invoiceCount: invoices.length,
          customers: distinct(invoices.map(invoice => invoice.customerId)).length, units: sum(invoices, invoice => invoice.units)}),
        tables: [table('productionInvoices', ['id','weekStart','weekEnd','customer','tier','type','orders','units','productionRevenue','status','coverage'], rows)],
      };
    }
    case 'production': {
      const key = tab === 'factory' ? 'factory_id' : tab === 'sku' || tab === 'product' ? 'sku_id' : 'department_id';
      const groups = distinct(lineRows.map(row => row[key]));
      const rows = groups.map(id => {
        const lines = lineRows.filter(row => row[key] === id);
        const amounts = pnl(lines, []);
        const group = tab === 'factory' ? ref('factories', id) : tab === 'product' ? byId(data.skus, id)?.name ?? id : tab === 'sku' ? id : department(id);
        return {group, order: ref('orders', ...distinct(lines.map(line => line.order_id))), units: sum(lines, line => line.quantity), cancelledUnits: sum(lines, line => line.cancelled_units), ...amounts, margin: pct(amounts.profit, amounts.revenue)};
      });
      const amounts = pnl(lineRows, []);
      return {basis: 'productionBasis', metrics: metrics({productionRevenue: amounts.productionRevenue, productionCosts: amounts.productionCosts, completedUnits: sum(lineRows.filter(row => byId(data.orders, row.order_id)?.status === 'completed'), row => row.quantity - row.cancelled_units), cancelledUnits: sum(lineRows, row => row.cancelled_units), skus: distinct(lineRows.map(line => line.sku_id)).length}), tables: [table('production', ['group', 'units', 'cancelledUnits', 'productionRevenue', 'productionCosts', 'profit', 'margin', 'order'], rows)]};
    }
    case 'production-expenses': {
      const rows = payouts.map(row => ({id: ref('payouts', row.id), payable: ref('payables', row.factory_payable_id), factory: factory(row.factory_id), payee: byId(data.payees, row.payee_id)?.name ?? null, date: row.payment_date, amount: row.amount_cents, status: row.status, bankReference: row.bank_reference, recordedBy: person(row.recorded_by), approvedBy: person(row.approved_by), approvedAt: row.approved_at}));
      return {basis: 'expenseBasis', metrics: metrics({productionCosts: sum(payableRows, row => row.productionCosts), approvedPayout: approved(payouts), pendingPayout: sum(payableRows, row => row.pendingPayout), ...(!payableRows.some(row => row.factoryPayable === null) ? {factoryPayable: sum(payableRows, row => row.factoryPayable ?? 0)} : {})}), tables: [table('payables', ['id', 'factory', 'payee', 'month', 'productionCosts', 'approvedPayout', 'factoryPayable', 'pendingPayout', 'productionUser'], payableRows), table('payouts', ['id', 'payable', 'factory', 'payee', 'date', 'amount', 'status', 'bankReference', 'recordedBy', 'approvedBy', 'approvedAt'], rows)]};
    }
    case 'shipping': {
      const rows = shippingRows.map(row => {
        const amounts = pnl([], [row]);
        return {id: ref('shipments', row.id), tracking: row.tracking_number, date: row.shipped_at, order: ref('orders', row.order_id), factory: factory(row.factory_id), carrier: byId(data.carriers, row.carrier_id)?.name ?? null, ...customer(byId(data.orders, row.order_id)!.customer_id), ...amounts, taxAgent: row.tax_collected_as_agent_cents, shippingContribution: amounts.profit, status: row.status};
      });
      const amounts = pnl([], shippingRows);
      return {basis: 'shippingBasis', metrics: metrics({shippingRevenue: amounts.shippingRevenue, shippingCosts: amounts.shippingCosts, taxFeeRevenue: amounts.taxFeeRevenue, taxFeeCosts: amounts.taxFeeCosts, otherCosts: amounts.otherCosts, shippingContribution: amounts.profit, shipments: rows.length}), tables: [table('shipments', ['id', 'tracking', 'date', 'order', 'factory', 'carrier', 'customer', 'shippingRevenue', 'shippingCosts', 'taxFeeRevenue', 'taxFeeCosts', 'otherCosts', 'taxAgent', 'shippingContribution', 'status'], rows)]};
    }
    case 'factories':
      return {basis: 'factoryBasis', metrics: metrics({productionRevenue: sum(factoryRows, row => row.productionRevenue), productionCosts: sum(factoryRows, row => row.productionCosts), productionContribution: sum(factoryRows, row => row.productionContribution), approvedPayout: sum(factoryRows, row => row.approvedPayout)}), tables: [factoryTable]};
  }
}

const dayMs = 86_400_000;
const isoDate = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

export function precedingPeriod(data: Dataset, filter: Filter) {
  const start = Date.parse(filter.from);
  const duration = Date.parse(filter.to) - start + dayMs;
  const firstOrder = data.orders.reduce((first, order) => order.created_at < first ? order.created_at : first, asOf);
  const previousStart = start - duration;
  if (duration <= 0 || !Number.isFinite(previousStart) || previousStart < Date.parse(firstOrder)) return null;
  return {...filter, from: isoDate(previousStart), to: isoDate(start - dayMs)};
}

export function departmentTrend(data: Dataset, filter: Filter) {
  const lines = select(data, filter, 'production').lineRows;
  const start = filter.from < '2026-08-01' ? '2026-08-01' : filter.from;
  const days = Math.round((Date.parse(filter.to) - Date.parse(start)) / 86400000) + 1;
  if (!lines.length || !Number.isFinite(days) || days < 1) return {buckets: [], series: [], comparison: []};
  const granularity = days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';
  const key = (day: string) => {
    if (granularity === 'month') return day.slice(0, 7);
    if (granularity === 'day') return day;
    const date = new Date(day + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    return date.toISOString().slice(0, 10);
  };
  const buckets = distinct(Array.from({length: days}, (_, i) => key(new Date(Date.parse(start) + i * 86400000).toISOString().slice(0, 10))));
  const series = data.departments.map(department => {
    const selected = lines.filter(line => line.department_id === department.id);
    const values = buckets.map(bucket => {
      const rows = selected.filter(line => key(byId(data.orders, line.order_id)!.created_at) === bucket);
      return {revenue: sum(rows, row => row.production_revenue_cents), sku: distinct(rows.map(row => row.sku_id)).length};
    });
    return {...department, values, revenue: sum(selected, row => row.production_revenue_cents), sku: distinct(selected.map(row => row.sku_id)).length};
  });
  const prior = precedingPeriod(data, filter);
  const priorLines = prior ? select(data, prior, 'production').lineRows : [];
  const offset = prior ? Date.parse(filter.from) - Date.parse(prior.from) : 0;
  const priorBuckets = new Map<string, Dataset['items']>();
  for (const line of priorLines) {
    const date = byId(data.orders, line.order_id)!.created_at;
    const aligned = key(isoDate(Date.parse(date) + offset));
    const rows = priorBuckets.get(aligned) ?? [];
    rows.push(line);
    priorBuckets.set(aligned, rows);
  }
  const comparison = prior ? buckets.map(bucket => {
    const rows = priorBuckets.get(bucket) ?? [];
    return {revenue: sum(rows, row => row.production_revenue_cents), sku: distinct(rows.map(row => row.sku_id)).length};
  }) : [];
  return {buckets, series, comparison};
}

export function details(data: Dataset, entity: Entity, id: string, to = asOf, filter?: Filter): {fields: Row; links: {title: string; value: Reference}[]; tables: Table[]} | undefined {
  if (entity === 'production-invoices') {
    const match = /^PINV-(\d{4}-\d{2}-\d{2})-(CUS-\d+)$/.exec(id);
    if (!match || !filter) return;
    const invoice = weeklyProductionInvoices(data, filter).find(invoice => invoice.id === id);
    if (!invoice) return;
    return {
      fields: {id, customer: ref('customers', invoice.customerId), weekStart: invoice.weekStart, weekEnd: invoice.weekEnd,
        coveredFrom: invoice.coveredFrom, coveredTo: invoice.coveredTo, orders: invoice.orderIds.length, units: invoice.units,
        productionRevenue: invoice.amount, status: 'draft', coverage: invoice.partial ? 'partialWeek' : 'fullWeek'},
      links: [{title: 'orders', value: ref('orders', ...invoice.orderIds)}],
      tables: [table('productionInvoiceLines', ['order','date','sku','factory','units','productionRevenue'], invoice.lines.map(line => ({
        order: ref('orders', line.order_id), date: byId(data.orders,line.order_id)!.created_at, sku: line.sku_id,
        factory: ref('factories',line.factory_id), units: line.quantity - line.cancelled_units, productionRevenue: line.production_revenue_cents,
      })))],
    };
  }
  const record = byId(data[entity] as ({id: string} & Record<string, string | number | string[] | null>)[], id);
  if (!record) return;
  const links: {title: string; value: Reference}[] = [];
  const fields: Row = {id};
  const tables: Table[] = [];
  const add = (title: string, target: Entity, ids: string[]) => {
    if (ids.length) links.push({title, value: ref(target, ...distinct(ids))});
  };
  if (typeof record.customer_id === 'string') add('customer', 'customers', [record.customer_id]);
  if (typeof record.order_id === 'string') add('order', 'orders', [record.order_id]);
  if (typeof record.factory_id === 'string') add('factory', 'factories', [record.factory_id]);
  const person = (key: string) => typeof record[key] === 'string' ? byId(data.users, record[key])?.name ?? null : null;
  Object.assign(fields, {status: record.status, date: record.created_at ?? record.refund_date ?? record.event_date ?? record.payment_date ?? record.shipped_at, month: record.period_month, tier: record.tier ?? record.customer_tier_at_order, type: record.account_type ?? record.account_type_at_order, quantity: record.quantity, sku: record.sku_id, tracking: record.tracking_number, bankReference: record.bank_reference, recordedBy: person('recorded_by') ?? person('created_by'), approvedBy: person('approved_by'), approvedAt: record.approved_at, reason: record.review_reason ?? record.reason, amount: record.amount_cents, due: record.due_at, event: record.event_type, costStatus: record.cost_status, productionRevenue: record.production_revenue_cents, productionCosts: record.production_cost_cents, shippingRevenue: record.shipping_revenue_cents, shippingCosts: record.shipping_cost_cents, taxFeeRevenue: record.tax_fee_revenue_cents, taxFeeCosts: record.tax_fee_cost_cents, otherCosts: record.other_cost_cents});
  const lineTable = (orders: string[]) => table('items', ['id', 'sku', 'factory', 'quantity', 'productionRevenue', 'productionCosts', 'costStatus'],
    data.items.filter(row => orders.includes(row.order_id)).map(row => ({
      id: ref('items', row.id), sku: row.sku_id, factory: ref('factories', row.factory_id), quantity: row.quantity,
      productionRevenue: row.production_revenue_cents, productionCosts: row.production_cost_cents, costStatus: row.cost_status,
    })));
  const allocationTable = (rows: Dataset['allocations']) => table('allocations', ['id', 'payment', 'order', 'invoice', 'amount'], rows.map(row => ({
    id: row.id, payment: ref('payments', row.payment_id), order: ref('orders', row.order_id),
    invoice: ref('invoices', row.invoice_id), amount: row.amount_cents,
  })));
  switch (entity) {
    case 'orders': {
      Object.assign(fields, orderPnl(data, id), receivable(data, [id], to));
      add('invoices', 'invoices', record.invoice_ids as string[]);
      tables.push(lineTable([id]));
      tables.push(table('shipments', ['id', 'tracking', 'factory', 'shippingRevenue', 'shippingCosts', 'taxFeeRevenue', 'taxFeeCosts', 'otherCosts'],
        freightFor(data, id).map(row => ({
          id: ref('shipments', row.id), tracking: row.tracking_number, factory: ref('factories', row.factory_id), ...pnl([], [row]),
        }))));
      tables.push(allocationTable(data.allocations.filter(row => row.order_id === id)));
      add('refunds', 'refunds', data.refunds.filter(row => row.order_id === id).map(row => row.id));
      add('transactions', 'ledger', data.ledger.filter(row => row.reference_id === id).map(row => row.id));
      add('payments', 'payments', data.allocations.filter(row => row.order_id === id).map(row => row.payment_id));
      break;
    }
    case 'refunds': {
      const refund = byId(data.refunds, id)!;
      fields.amount = refund.refund_amount_cents;
      fields.recovered = refund.recovered_cost_cents;
      fields.refundImpact = refundImpact(refund);
      add('invoices', 'invoices', byId(data.orders, refund.order_id)?.invoice_ids ?? []);
      break;
    }
    case 'customers': {
      const balance = wallet(data, id, to);
      fields.balance = balance;
      fields.outstanding = Math.max(0, -balance);
      fields.limit = record.debit_limit_cents as number;
      fields.manager = person('account_manager_id');
      fields.available = record.account_type === 'debit' ? Math.max(0, fields.limit + balance) : 0;
      add('invoices', 'invoices', data.invoices.filter(row => row.customer_id === id && row.period_month <= to.slice(0, 7)).map(row => row.id));
      add('orders', 'orders', data.orders.filter(row => row.customer_id === id && row.created_at <= to).map(row => row.id));
      add('transactions', 'ledger', data.ledger.filter(row => row.customer_id === id && row.event_date <= to).map(row => row.id));
      break;
    }
    case 'invoices': {
      const ids = record.order_ids as string[];
      Object.assign(fields, receivable(data, ids, to, id));
      fields.status = invoiceStatus(fields.due as string, to, fields.remaining as number, fields.paid as number, record.approved_by as string | null);
      tables.push(table('orders', ['id', 'date', 'gross', 'credits', 'paid', 'remaining'], ids.flatMap(id => {
        const order = byId(data.orders, id);
        return order ? [{id: ref('orders', id), date: order.created_at, ...receivable(data, [id], to)}] : [];
      })));
      tables.push(allocationTable(data.allocations.filter(row => row.invoice_id === id)));
      add('refunds', 'refunds', data.refunds.filter(row => ids.includes(row.order_id)).map(row => row.id));
      add('payments', 'payments', data.allocations.filter(row => row.invoice_id === id).map(row => row.payment_id));
      break;
    }
    case 'payments': {
      const allocations = data.allocations.filter(row => row.payment_id === id);
      fields.allocated = sum(allocations, row => row.amount_cents);
      tables.push(allocationTable(allocations));
      break;
    }
    case 'ledger': {
      fields.balance = record.balance_after_cents as number;
      const target = ({order: 'orders', topup: 'topups', payment: 'payments', refund: 'refunds'} as const)[record.reference_type as 'order' | 'topup' | 'payment' | 'refund'];
      if (target) add('reference', target, [record.reference_id as string]);
      break;
    }
    case 'topups':
      add('transactions', 'ledger', data.ledger.filter(row => row.reference_id === id).map(row => row.id));
      break;
    case 'factories':
      add('items', 'items', data.items.filter(row => row.factory_id === id).map(row => row.id));
      add('shipments', 'shipments', data.shipments.filter(row => row.factory_id === id).map(row => row.id));
      add('payables', 'payables', data.payables.filter(row => row.factory_id === id).map(row => row.id));
      add('payouts', 'payouts', data.payouts.filter(row => row.factory_id === id).map(row => row.id));
      break;
    case 'payables': {
      const items = record.order_item_ids as string[];
      const payouts = data.payouts.filter(row => row.factory_payable_id === id);
      fields.productionCosts = sum(data.items.filter(row => items.includes(row.id)), row => row.production_cost_cents);
      fields.approvedPayout = sum(payouts.filter(row => row.status === 'approved'), row => row.amount_cents);
      fields.factoryPayable = fields.productionCosts - fields.approvedPayout;
      add('items', 'items', items);
      add('payouts', 'payouts', payouts.map(row => row.id));
      break;
    }
    case 'payouts':
      add('payables', 'payables', [record.factory_payable_id as string]);
      break;
  }
  return {fields, links, tables: tables.filter(table => table.rows.length)};
}
