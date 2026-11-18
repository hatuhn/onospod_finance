import metadata from '../../mock-data/metadata.json';
import customers from '../../mock-data/customers.json';
import factories from '../../mock-data/factories.json';
import payees from '../../mock-data/factory_payees.json';
import departments from '../../mock-data/departments.json';
import users from '../../mock-data/users.json';
import carriers from '../../mock-data/carriers.json';
import skus from '../../mock-data/skus.json';
import orders from '../../mock-data/orders.json';
import items from '../../mock-data/order_items.json';
import shipments from '../../mock-data/shipments.json';
import refunds from '../../mock-data/refunds.json';
import invoices from '../../mock-data/invoices.json';
import topups from '../../mock-data/topups.json';
import payments from '../../mock-data/debt_payments.json';
import allocations from '../../mock-data/payment_allocations.json';
import ledger from '../../mock-data/wallet_ledger.json';
import payables from '../../mock-data/factory_payables.json';
import payouts from '../../mock-data/factory_payouts.json';

export const asOf = metadata.as_of_date;
export const timeZone = metadata.timezone;
export const presets = ['today', 'yesterday', 'last7Days', 'thisMonth', 'lastMonth', 'last3Months', 'last6Months', 'thisYear', 'customRange'] as const;
export type Preset = typeof presets[number];
const iso = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);

export function dateRange(preset: Preset, from?: string | null, to?: string | null) {
  const [year, month, day] = asOf.split('-').map(Number);
  const start = iso(year, month, 1);
  switch (preset) {
    case 'today': return {from: asOf, to: asOf};
    case 'yesterday': return {from: iso(year, month, day - 1), to: iso(year, month, day - 1)};
    case 'last7Days': return {from: iso(year, month, day - 6), to: asOf};
    case 'lastMonth': return {from: iso(year, month - 1, 1), to: iso(year, month, 0)};
    case 'last3Months': return {from: iso(year, month - 2, 1), to: asOf};
    case 'last6Months': return {from: iso(year, month - 5, 1), to: asOf};
    case 'thisYear': return {from: iso(year, 1, 1), to: asOf};
    case 'customRange': return {from: from ?? start, to: to ?? asOf};
    default: return {from: start, to: asOf};
  }
}

type Topup = typeof topups[number] & {review_reason?: string};
type Order = typeof orders[number];
type Item = typeof items[number] & {override?: {original: number; actor: string; at: string; reason: string}};
export const seed = {customers, factories, payees, departments, users, carriers, skus, orders, items: items as Item[], shipments, refunds, invoices, topups: topups as Topup[], payments, allocations, ledger, payables, payouts};
export type Dataset = typeof seed;
export type Review = {id: string; actor: string; decision: 'approved' | 'rejected'; reason: string};
export interface FinanceRepository {
  snapshot(): Dataset;
  reviewTopup(input: Review): boolean;
  overrideCost(id: string, cents: number, actor: string, reason: string): boolean;
  reset(): void;
}

// A future API adapter can provide the same fixture-independent read models and transitions.
export class MockFinanceRepository implements FinanceRepository {
  private data = seed;

  snapshot() { return this.data; }

  reviewTopup({id, actor, decision, reason}: Review) {
    const entry = this.data.topups.find(topup => topup.id === id);
    const reviewer = users.find(user => user.id === actor);
    if (!entry || entry.status !== 'pending' || !reviewer || !['finance_manager', 'admin'].includes(reviewer.role)) return false;
    if (decision === 'rejected' && !reason.trim()) return false;
    const event = {
      id: 'DEMO-' + id, customer_id: entry.customer_id, event_date: asOf, event_type: 'topup',
      amount_cents: entry.amount_cents, reference_type: 'topup', reference_id: id, reference: id,
      balance_after_cents: wallet(this.data, entry.customer_id, asOf) + entry.amount_cents,
    };
    this.data = {
      ...this.data,
      topups: this.data.topups.map(topup => topup.id === id ? {...topup, status: decision, approved_by: actor, approved_at: asOf + 'T12:00:00+07:00', review_reason: reason.trim()} : topup),
      ledger: decision === 'approved' ? [...this.data.ledger, event] : this.data.ledger,
    };
    return true;
  }

  overrideCost(id: string, cents: number, actor: string, reason: string) {
    const item = byId(this.data.items, id);
    const user = byId(users, actor);
    if (!item || !user || !['finance_manager', 'admin'].includes(user.role) || !Number.isSafeInteger(cents) || cents < 0 || cents > 100000000 || !reason.trim()) return false;
    const override = {original: item.override?.original ?? item.production_cost_cents, actor, at: asOf + 'T12:00:00+07:00', reason: reason.trim()};
    this.data = {...this.data, items: this.data.items.map(row => row.id === id ? {...row, production_cost_cents: cents, override} : row)};
    return true;
  }

  reset() { this.data = seed; }
}

export type Filter = ReturnType<typeof dateRange> & {
  factory: string; user: string; tier: string; type: string; search: string;
  invoice: string; presence: string; status: string;
};
export const matchesDate = (date: string | null, {from, to}: Pick<Filter, 'from' | 'to'>) => Boolean(date && date.slice(0, 10) >= from && date.slice(0, 10) <= to);
export const sum = <T>(rows: readonly T[], amount: (row: T) => number) => rows.reduce((total, row) => total + amount(row), 0);
export const byId = <T extends {id: string}>(rows: T[], id: string | null) => rows.find(row => row.id === id);
export const distinct = (values: string[]) => [...new Set(values)];
export const moneyFields = {
  productionRevenue: 0, shippingRevenue: 0, taxFeeRevenue: 0, revenue: 0,
  productionCosts: 0, shippingCosts: 0, taxFeeCosts: 0, otherCosts: 0, directCosts: 0, profit: 0,
};

export function pnl(lines: Dataset['items'], freight: Dataset['shipments']) {
  const productionRevenue = sum(lines, row => row.production_revenue_cents);
  const productionCosts = sum(lines, row => row.production_cost_cents);
  const shippingRevenue = sum(freight, row => row.shipping_revenue_cents);
  const shippingCosts = sum(freight, row => row.shipping_cost_cents);
  const taxFeeRevenue = sum(freight, row => row.tax_fee_revenue_cents);
  const taxFeeCosts = sum(freight, row => row.tax_fee_cost_cents);
  const otherCosts = sum(freight, row => row.other_cost_cents);
  const revenue = productionRevenue + shippingRevenue + taxFeeRevenue;
  const directCosts = productionCosts + shippingCosts + taxFeeCosts + otherCosts;
  return {productionRevenue, shippingRevenue, taxFeeRevenue, revenue, productionCosts, shippingCosts, taxFeeCosts, otherCosts, directCosts, profit: revenue - directCosts};
}

export const linesFor = (data: Dataset, order: string) => data.items.filter(row => row.order_id === order);
export const freightFor = (data: Dataset, order: string) => data.shipments.filter(row => row.order_id === order);
export const orderPnl = (data: Dataset, order: string) => pnl(linesFor(data, order), freightFor(data, order));
export const wallet = (data: Dataset, customer: string, to: string) => sum(data.ledger.filter(row => row.customer_id === customer && row.event_date <= to), row => row.amount_cents);
export const refundImpact = (row: Dataset['refunds'][number]) => row.status === 'approved' ? row.recovered_cost_cents - row.refund_amount_cents : 0;

export function receivable(data: Dataset, orders: string[], to: string, invoice?: string) {
  const gross = sum(orders, id => {
    const order = byId(data.orders, id);
    return order && order.created_at <= to ? orderPnl(data, id).revenue : 0;
  });
  const credits = sum(data.refunds.filter(row => orders.includes(row.order_id) && row.status === 'approved' && row.refund_method === 'wallet_credit' && row.refund_date <= to), row => row.refund_amount_cents);
  const paid = sum(data.allocations.filter(row => orders.includes(row.order_id) && (!invoice || row.invoice_id === invoice)), row => {
    const payment = byId(data.payments, row.payment_id);
    return payment?.status === 'approved' && payment.approved_at && payment.approved_at.slice(0, 10) <= to ? row.amount_cents : 0;
  });
  return {gross, credits, paid, remaining: gross - credits - paid};
}

export function select(data: Dataset, filter: Filter, userScope: 'production' | 'manager' | 'actor' | 'none') {
  const query = filter.search.trim().toLocaleLowerCase();
  const search = (...values: (string | null | undefined)[]) => values.some(value => value?.toLocaleLowerCase().includes(query));
  const customerMatch = (id: string, tier?: string, type?: string) => {
    const customer = byId(data.customers, id);
    return !!customer && (!filter.tier || filter.tier === (tier ?? customer.tier)) &&
      (!filter.type || filter.type === (type ?? customer.account_type)) &&
      (userScope !== 'manager' || !filter.user || filter.user === customer.account_manager_id);
  };
  const lineMatch = (line: Dataset['items'][number]) => (!filter.factory || line.factory_id === filter.factory) &&
    (userScope !== 'production' || !filter.user || line.production_user_id === filter.user);
  const orderMatch = (order: Order, extra?: string) => {
    const customer = byId(data.customers, order.customer_id);
    const lines = linesFor(data, order.id);
    const freight = freightFor(data, order.id);
    const requiresLine = userScope === 'production' && filter.user;
    return customerMatch(order.customer_id, order.customer_tier_at_order, order.account_type_at_order) &&
      (!(filter.factory || requiresLine) || lines.some(lineMatch) || (!requiresLine && freight.some(row => row.factory_id === filter.factory))) &&
      search(order.id, customer?.name, order.customer_id, ...order.invoice_ids, ...lines.map(line => line.sku_id), ...freight.map(row => row.tracking_number), extra);
  };
  const invoiceMatch = (order: Order) =>
    (filter.presence !== 'has' || order.invoice_ids.length > 0) &&
    (filter.presence !== 'none' || order.invoice_ids.length === 0) &&
    (!filter.invoice || order.invoice_ids.some(id => id.toLowerCase().includes(filter.invoice.trim().toLowerCase())));
  const orderRows = data.orders.filter(row => matchesDate(row.created_at, filter) && orderMatch(row) && invoiceMatch(row));
  const refundRows = data.refunds.filter(row => {
    const order = byId(data.orders, row.order_id);
    return order && matchesDate(row.refund_date, filter) && orderMatch(order, row.id) && invoiceMatch(order);
  });
  const lineRows = data.items.filter(row => orderRows.some(order => order.id === row.order_id) && lineMatch(row));
  const shipmentMatch = (row: Dataset['shipments'][number]) => {
    const order = byId(data.orders, row.order_id);
    return order && orderMatch(order, row.id) && (!filter.factory || row.factory_id === filter.factory) &&
      (userScope !== 'production' || !filter.user || linesFor(data, row.order_id).some(line => line.factory_id === row.factory_id && lineMatch(line)));
  };
  const customerRows = data.customers.filter(row => customerMatch(row.id) && search(row.id, row.name) &&
    (!filter.factory || data.orders.some(order => order.customer_id === row.id && order.created_at <= filter.to && orderMatch(order))));
  const cashMatch = (row: Topup | Dataset['payments'][number]) =>
    customerMatch(row.customer_id) && (!filter.factory || customerRows.some(customer => customer.id === row.customer_id)) &&
    (userScope !== 'actor' || !filter.user || [row.recorded_by, row.approved_by].includes(filter.user)) &&
    search(row.id, row.customer_id, byId(data.customers, row.customer_id)?.name, row.bank_reference);
  const topupRows = data.topups.filter(row => cashMatch(row) && matchesDate(row.status === 'approved' ? row.approved_at : row.created_at, filter) && (!filter.status || row.status === filter.status));
  const paymentRows = data.payments.filter(row => cashMatch(row) && matchesDate(row.payment_date, filter) && (!filter.status || row.status === filter.status));
  return {orderRows, refundRows, lineRows, customerRows, topupRows, paymentRows, orderMatch, customerMatch, search, shipmentMatch};
}
