import {expressView} from '../src/finance/express-repository';
import {expenseCustomers} from '../src/finance/expense-customers';
import {describe, expect, it} from 'vitest';
import expected from '../mock-data/expected_totals.json';
import {asOf, dateRange, MockFinanceRepository, orderPnl, receivable, refundImpact, seed, sum, wallet, type Filter} from '../src/finance/repository';
import {departmentTrend, getView, isRef, precedingPeriod, weeklyProductionInvoices, details} from '../src/finance/views';
import {language} from '../src/finance/i18n';
import {csvText} from '../src/finance/ui';

const filter = (range = dateRange('thisYear'), extra: Partial<Filter> = {}): Filter => ({
  ...range, factory: '', user: '', tier: '', type: '', search: '', invoice: '', presence: '', status: '', ...extra,
});
const manager = seed.users.find(user => user.role === 'finance_manager')!.id;
const pending = seed.topups.find(row => row.status === 'pending')!;

describe('mock finance selectors', () => {
  it('anchors presets to the fixture clock', () => {
    expect(dateRange('thisMonth')).toEqual({from: '2026-11-01', to: asOf});
    expect(dateRange('last3Months')).toEqual({from: '2026-09-01', to: asOf});
    expect(dateRange('lastMonth')).toEqual({from: '2026-10-01', to: '2026-10-31'});
    expect(dateRange('last7Days')).toEqual({from: '2026-11-11', to: asOf});
  });

  it('aligns the previous period without changing factory scope', () => {
    const factory = seed.factories[0].id;
    const current = filter(dateRange('thisMonth'), {factory});
    const prior = precedingPeriod(seed, current);
    expect(prior).toMatchObject({from: '2026-10-15', to: '2026-10-31', factory});
    const trend = departmentTrend(seed, current);
    const expected = departmentTrend(seed, prior!);
    expect(trend.comparison).toHaveLength(trend.buckets.length);
    expect(sum(trend.comparison, bucket => bucket.revenue)).toBe(sum(expected.series, series => series.revenue));
    expect(precedingPeriod(seed, filter())).toBeNull();
  });

  it('derives cents from item and shipment amounts, including cancelled and multi-shipment orders', () => {
    const amounts = seed.orders.map(order => orderPnl(seed, order.id));
    expect(sum(amounts, row => row.revenue)).toBe(expected.total_order_charge_cents);
    expect(sum(amounts, row => row.directCosts)).toBe(expected.total_direct_cost_cents);
    expect(sum(amounts, row => row.profit)).toBe(expected.total_order_profit_cents);
    const cancelled = seed.orders.find(order => order.status === 'cancelled')!;
    expect(orderPnl(seed, cancelled.id).revenue).toBe(0);
    expect(orderPnl(seed, cancelled.id).profit).toBeLessThan(0);
    const multi = seed.orders.find(order => order.shipment_ids.length > 1)!;
    expect(orderPnl(seed, multi.id).revenue).toBe(multi.total_charge_cents);
  });

  it('uses refund event date and the original invoice reference', () => {
    const historic = seed.refunds.find(row => row.id === 'RF-0013')!;
    const order = seed.orders.find(order => order.id === historic.order_id)!;
    const refunds = getView(seed, 'orders', filter(dateRange('thisMonth')), 'refunds', 'en').tables[0].rows;
    expect(refunds.some(row => isRef(row.id) && row.id.ids[0] === historic.id && row.orderDate === order.created_at)).toBe(true);
    expect(sum(seed.refunds, refundImpact)).toBe(expected.total_refund_profit_impact_cents);
    const without = getView(seed, 'orders', filter(undefined, {presence: 'none'}), '', 'en').tables[0].rows;
    expect(without.length).toBeGreaterThan(0);
    expect(without.every(row => isRef(row.invoice) && row.invoice.ids.length === 0)).toBe(true);
    const invoice = seed.invoices[0];
    const withInvoice = getView(seed, 'orders', filter(undefined, {presence: 'has', invoice: invoice.id}), '', 'en').tables[0].rows;
    expect(withInvoice.length).toBe(invoice.order_ids.length);
  });

  it('reconciles Wallet and receivables by customer and invoice', () => {
    for (const customer of seed.customers) {
      const balance = wallet(seed, customer.id, asOf);
      expect(balance).toBe(customer.wallet_balance_snapshot_cents);
      if (customer.account_type === 'debit') {
        const orders = seed.orders.filter(order => order.customer_id === customer.id).map(order => order.id);
        expect(receivable(seed, orders, asOf).remaining).toBe(Math.max(0, -balance));
      } else expect(balance).toBeGreaterThanOrEqual(0);
    }
    for (const invoice of seed.invoices) {
      const totals = receivable(seed, invoice.order_ids, asOf, invoice.id);
      expect(totals).toEqual({gross: invoice.gross_amount_cents, credits: invoice.refund_credit_cents, paid: invoice.paid_cents, remaining: invoice.remaining_cents});
    }
  });

  it('partitions factory item costs and payouts without duplicating orders', () => {
    const report = getView(seed, 'factories', filter(), '', 'en').tables[0].rows;
    expect(sum(report, row => Number(row.productionCosts))).toBe(expected.total_factory_production_cost_cents);
    expect(sum(report, row => Number(row.approvedPayout))).toBe(expected.total_approved_factory_payout_cents);
    expect(sum(report, row => Number(row.factoryPayable))).toBe(expected.total_factory_production_cost_cents - expected.total_approved_factory_payout_cents);
    expect(sum(report, row => Number(row.refundImpact))).toBe(expected.total_refund_profit_impact_cents);
    const trend = departmentTrend(seed, filter(undefined, {factory: seed.factories[0].id}));
    expect(trend.series.map(row => row.chart_color)).toEqual(['#007AFF', '#AF52DE', '#F59E0B', '#16A085']);
    expect(sum(trend.series, row => row.revenue)).toBe(sum(seed.items.filter(row => row.factory_id === seed.factories[0].id), row => row.production_revenue_cents));
  });

  it('exports safe CSV text and numeric negative money', () => {
    const text = csvText([{title: 'orders', columns: ['id', 'profit'], rows: [{id: '=1+1', profit: -123}]}], seed, 'en', language('en'));
    expect(text).toContain('"\'=1+1",-1.23');
  });
});

describe('mock repository transitions', () => {
  it('posts one approved credit, records the reviewer, and resets', () => {
    const mock = new MockFinanceRepository();
    const input = {id: pending.id, actor: manager, decision: 'approved' as const, reason: ''};
    const before = wallet(mock.snapshot(), pending.customer_id, asOf);
    expect(mock.reviewTopup({...input, actor: 'USR-01'})).toBe(false);
    expect(mock.reviewTopup(input)).toBe(true);
    expect(mock.reviewTopup(input)).toBe(false);
    expect(wallet(mock.snapshot(), pending.customer_id, asOf)).toBe(before + pending.amount_cents);
    expect(mock.snapshot().ledger.filter(row => row.reference_id === pending.id)).toHaveLength(1);
    expect(mock.snapshot().topups.find(row => row.id === pending.id)).toMatchObject({approved_by: manager, approved_at: expect.stringContaining(asOf)});
    mock.reset();
    expect(wallet(mock.snapshot(), pending.customer_id, asOf)).toBe(before);
  });

  it('requires a rejection reason and makes no ledger entry', () => {
    const mock = new MockFinanceRepository();
    const input = {id: pending.id, actor: manager, decision: 'rejected' as const, reason: ''};
    expect(mock.reviewTopup(input)).toBe(false);
    expect(mock.reviewTopup({...input, reason: 'Duplicate request'})).toBe(true);
    expect(mock.snapshot().ledger).toEqual(seed.ledger);
  });

  it('records the original cost and propagates an audited override', () => {
    const mock = new MockFinanceRepository();
    const item = seed.items[0];
    const baseline = orderPnl(seed, item.order_id);
    expect(mock.overrideCost(item.id, item.production_cost_cents + 100, manager, 'Test adjustment')).toBe(true);
    expect(orderPnl(mock.snapshot(), item.order_id).profit).toBe(baseline.profit - 100);
    expect(mock.snapshot().items[0].override?.original).toBe(item.production_cost_cents);
  });
});


describe('weekly production invoices', () => {
  it('bills each production line once within a customer week', () => {
    const invoices = weeklyProductionInvoices(seed, filter());
    expect(sum(invoices, invoice => invoice.amount)).toBe(sum(seed.items, item => item.production_revenue_cents));
    expect(new Set(invoices.map(invoice => invoice.id)).size).toBe(invoices.length);
    for (const invoice of invoices) {
      expect(new Date(invoice.weekStart).getUTCDay()).toBe(1);
      expect(new Date(invoice.weekEnd).getUTCDay()).toBe(0);
      for (const id of invoice.orderIds) {
        const order = seed.orders.find(order => order.id === id)!;
        expect(order.customer_id).toBe(invoice.customerId);
        expect(order.created_at >= invoice.weekStart && order.created_at <= invoice.weekEnd).toBe(true);
      }
    }
  });

  it('keeps factory filtering and the detail amount reconciled', () => {
    const selected = filter(dateRange('thisMonth'), {factory:seed.factories[0].id});
    const invoices = weeklyProductionInvoices(seed, selected);
    expect(invoices.length).toBeGreaterThan(0);
    const first = invoices[0];
    expect(first.lines.every(line => line.factory_id === selected.factory)).toBe(true);
    const detail = details(seed, 'production-invoices', first.id, selected.to, selected)!;
    expect(detail.fields.productionRevenue).toBe(first.amount);
    expect(sum(detail.tables[0].rows, row => Number(row.productionRevenue))).toBe(first.amount);
    const search = weeklyProductionInvoices(seed, {...selected,search:first.id});
    expect(search.map(invoice=>invoice.id)).toEqual([first.id]);
  });
});


describe('SKU production dashboard', () => {
  it('allocates multi-factory order revenue only to the matching factory items', () => {
    const report = getView(seed,'production-sku',filter(),'units','en');
    const rows = report.tables[1].rows;
    expect(sum(rows,row => Number(row.productionRevenue))).toBe(sum(report.tables[0].rows,row => Number(row.productionRevenue)));
    expect(sum(rows,row => Number(row.revenueShare))).toBeCloseTo(100);
    for (const factory of seed.factories) {
      const row = rows.find(row => isRef(row.factory) && row.factory.ids[0] === factory.id)!;
      expect(row.productionRevenue).toBe(sum(seed.items.filter(item => item.factory_id === factory.id),item => item.production_revenue_cents));
    }
  });

  it('reconciles SKU revenue and completed units to filtered items', () => {
    const selected = filter(dateRange('thisMonth'), {factory: seed.factories[0].id});
    const report = getView(seed,'production-sku',selected,'units','en');
    const orders = seed.orders.filter(order => order.created_at >= selected.from && order.created_at <= selected.to);
    const items = seed.items.filter(item => item.factory_id === selected.factory && orders.some(order => order.id === item.order_id));
    expect(sum(report.tables[0].rows,row => Number(row.productionRevenue))).toBe(sum(items,item => item.production_revenue_cents));
    const completed = items.filter(item => seed.orders.find(order => order.id === item.order_id)!.status === 'completed');
    expect(sum(report.tables[0].rows,row => Number(row.completedUnits))).toBe(sum(completed,item => item.quantity-item.cancelled_units));
    expect(report.metrics.find(metric => metric.key === 'productionRevenue')!.value).toBe(sum(items,item => item.production_revenue_cents));
    expect(report.tables[0].rows.every(row=>Number(row.completedUnits)>=0)).toBe(true);
    expect(report.tables[1].rows).toHaveLength(1);
    expect(sum(report.tables[1].rows,row => Number(row.productionRevenue))).toBe(sum(items,item => item.production_revenue_cents));
    expect(report.tables[1].rows[0].revenueShare).toBe(100);
  });
});


describe('production expense customer filters', () => {
  it('links payouts through payable item allocations to customers', () => {
    const report = getView(seed,'production-expenses',filter(dateRange('thisMonth')),'','en');
    for (const table of report.tables) {
      const parties = expenseCustomers(seed,table);
      expect(parties.length).toBeGreaterThan(0);
      for (const party of parties) {
        const customer = seed.customers.find(row => row.id === party.id)!;
        expect(party.name).toBe(customer.custom_sku);
        expect(party.subtitle).toBe(customer.email);
        for (const rowId of party.rowIds) {
          const payableId = table.title === 'payables' ? rowId : seed.payouts.find(row => row.id === rowId)!.factory_payable_id;
          const payable = seed.payables.find(row => row.id === payableId)!;
          expect(payable.order_item_ids.some(id => {
            const item = seed.items.find(row => row.id === id)!;
            return seed.orders.find(row => row.id === item.order_id)!.customer_id === party.id;
          })).toBe(true);
        }
      }
    }
  });
});


describe('overview revenue breakdowns', () => {
  it('reconciles customer and historical tier revenue with overview revenue', () => {
    const view = getView(seed,'overview',filter(dateRange('thisMonth')),'','en');
    const revenue = view.metrics.find(row => row.key === 'revenue')!.value;
    expect(view.tables[0].title).toBe('topCustomers');
    expect(sum(view.tables[0].rows,row => Number(row.revenue))).toBe(revenue);
    expect(sum(view.tables[1].rows,row => Number(row.revenue))).toBe(revenue);
    expect(view.tables[0].rows.map(row=>Number(row.revenue))).toEqual(view.tables[0].rows.map(row=>Number(row.revenue)).sort((a,b)=>b-a));
  });
});


describe('shipping workspace selectors', () => {
  it('uses shipment dates and reconciles carrier totals to shipping metrics', () => {
    const range = dateRange('thisMonth');
    const view = expressView(seed,{...range,carrier:'',search:'',status:''},'en');
    const shipments = seed.shipments.filter(row=>row.shipped_at && row.shipped_at >= range.from && row.shipped_at <= range.to);
    expect(view.metrics.shippingRevenue).toBe(sum(shipments,row=>row.shipping_revenue_cents));
    expect(sum(view.carrierTable.rows,row=>row.shippingRevenue)).toBe(view.metrics.shippingRevenue);
    expect(sum(view.carrierTable.rows,row=>row.shipments)).toBe(shipments.length);
    const first = shipments[0];
    const filtered = expressView(seed,{...range,carrier:first.carrier_id,search:first.tracking_number,status:''},'en');
    expect(filtered.shipments.map(row=>row.id)).toEqual([first.id]);
  });
});
