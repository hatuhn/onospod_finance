#!/usr/bin/env python3
"""Fail fast when any fixture relationships or finance equations drift. Standard library only."""
import json
from pathlib import Path
from collections import defaultdict
P=Path(__file__).resolve().parents[1]/'mock-data'
load=lambda n:json.loads((P/(n+'.json')).read_text(encoding='utf-8'))
d={n:load(n) for n in ['metadata','departments','users','factories','factory_payees','carriers','customers','skus','orders','order_items','shipments','refunds','invoices','topups','debt_payments','payment_allocations','factory_payables','factory_payouts','wallet_ledger','expected_totals']}
errors=[]; checks=0
def check(condition,msg):
 global checks
 checks+=1
 if not condition:errors.append(msg)
def index(name):
 xs=d[name];ids=[x['id'] for x in xs];check(len(ids)==len(set(ids)),f'{name}: duplicate IDs');return {x['id']:x for x in xs}
by={n:index(n) for n in d if isinstance(d[n],list) and n not in ['departments']}
by['departments']={x['id']:x for x in d['departments']}
for n in ['departments']:check(len(by[n])==len(d[n]),f'{n}: duplicate ID')
for o in d['orders']:
 its=[by['order_items'].get(i) for i in o['order_item_ids']]; shps=[by['shipments'].get(i) for i in o['shipment_ids']]
 check(all(its) and all(shps),f'{o["id"]}: broken item/shipment refs')
 check(o['customer_id'] in by['customers'],f'{o["id"]}: unknown customer')
 for it in its:
  check(it['order_id']==o['id'],f'bad item order ref {it["id"]}')
  check(it['sku_id'] in by['skus'] and it['factory_id'] in by['factories'] and it['production_user_id'] in by['users'],f'bad item FK {it["id"]}')
  check(it['department_id']==by['skus'][it['sku_id']]['department_id'],f'bad department {it["id"]}')
 for s in shps:
  check(s['order_id']==o['id'] and s['carrier_id'] in by['carriers'] and s['factory_id'] in by['factories'],f'bad shipment {s["id"]}')
 total=sum(x['production_revenue_cents'] for x in its)+sum(x['shipping_revenue_cents']+x['tax_fee_revenue_cents'] for x in shps)
 costs=sum(x['production_cost_cents'] for x in its)+sum(x['shipping_cost_cents']+x['tax_fee_cost_cents']+x['other_cost_cents'] for x in shps)
 check(o['total_charge_cents']==total,f'{o["id"]} revenue inconsistent')
 check(o['total_direct_cost_cents']==costs,f'{o["id"]} cost inconsistent')
 check(len(o['invoice_ids'])<2,f'{o["id"]}: multiple fixture invoice refs not supported')
 check(o['account_type_at_order']==by['customers'][o['customer_id']]['account_type'],f'{o["id"]}: account type mismatch')
 for iv in o['invoice_ids']:
  check(iv in by['invoices'] and o['id'] in by['invoices'][iv]['order_ids'],f'{o["id"]}: invoice backref')
refunded=defaultdict(int)
for r in d['refunds']:
 check(r['order_id'] in by['orders'],f'{r["id"]}: unknown order')
 o=by['orders'][r['order_id']]
 check(r['customer_id']==o['customer_id'],f'{r["id"]}: customer mismatch')
 check(r['refund_date']>o['created_at'],f'{r["id"]}: refund before order')
 check(r['approved_by'] in by['users'] and r['recorded_by'] in by['users'],f'{r["id"]}: unknown reviewer')
 refunded[o['id']]+=r['refund_amount_cents']
for oid,amount in refunded.items():check(amount<=by['orders'][oid]['total_charge_cents'],f'{oid}: over-refunded')
paid_by_order=defaultdict(int);paid_by_invoice=defaultdict(int);paid_by_payment=defaultdict(int)
for a in d['payment_allocations']:
 check(a['payment_id'] in by['debt_payments'] and a['order_id'] in by['orders'] and a['invoice_id'] in by['invoices'],f'{a["id"]} missing link')
 p=by['debt_payments'][a['payment_id']];o=by['orders'][a['order_id']];inv=by['invoices'][a['invoice_id']]
 check(p['status']=='approved' and p['customer_id']==o['customer_id']==inv['customer_id'],f'{a["id"]} cross-customer allocation')
 check(a['order_id'] in inv['order_ids'],f'{a["id"]}: order not in invoice')
 paid_by_order[o['id']]+=a['amount_cents'];paid_by_invoice[inv['id']]+=a['amount_cents'];paid_by_payment[p['id']]+=a['amount_cents']
for p in d['debt_payments']:
 check(p['customer_id'] in by['customers'],f'bad payment customer {p["id"]}')
 check(p['status']!='approved' or p['amount_cents']==paid_by_payment[p['id']],f'{p["id"]}: payment not fully allocated')
 check(p['status']=='approved' or paid_by_payment[p['id']]==0,f'{p["id"]} pending/rejected allocated')
for o in d['orders']:
 check(paid_by_order[o['id']]+refunded[o['id']]<=o['total_charge_cents'],f'{o["id"]}: overpaid after refund')
for inv in d['invoices']:
 os=[by['orders'][x] for x in inv['order_ids']]
 check(all(o['account_type_at_order']=='debit' and o['customer_id']==inv['customer_id'] for o in os),f'{inv["id"]}: invoice customer/type')
 check(inv['gross_amount_cents']==sum(o['total_charge_cents'] for o in os),f'{inv["id"]} invoice gross')
 check(inv['refund_credit_cents']==sum(refunded[o['id']] for o in os),f'{inv["id"]}: refund credit')
 check(inv['paid_cents']==paid_by_invoice[inv['id']],f'{inv["id"]}: payment mismatch')
 check(inv['remaining_cents']==inv['gross_amount_cents']-inv['refund_credit_cents']-inv['paid_cents'],f'{inv["id"]} remaining')
 check(inv['remaining_cents']>=0,f'{inv["id"]}: negative due')
for t in d['topups']:
 check(t['customer_id'] in by['customers'],f'{t["id"]}: customer')
 check(t['status']!='approved' or t['approved_by'] in by['users'],f'{t["id"]}: approval missing')
 check(t['status']!='pending' or t['approved_by'] is None,f'{t["id"]}: pending with approval')
for pa in d['factory_payables']:
 its=[by['order_items'][id] for id in pa['order_item_ids']]
 check(all(it['factory_id']==pa['factory_id'] for it in its),f'{pa["id"]}: wrong factory items')
 check(sum(it['production_cost_cents'] for it in its)==pa['production_cost_cents'],f'{pa["id"]}: costs')
 paid=sum(x['amount_cents'] for x in d['factory_payouts'] if x['factory_payable_id']==pa['id'] and x['status']=='approved')
 check(pa['approved_payout_cents']==paid and pa['outstanding_cents']==pa['production_cost_cents']-paid,f'{pa["id"]}: balance')
for payout in d['factory_payouts']:
 check(payout['factory_payable_id'] in by['factory_payables'],f'{payout["id"]} missing payable')
 check(payout['status']!='pending' or payout['approved_by'] is None,f'{payout["id"]} pending approved')
# Ledger is the source of truth for each customer's current Wallet, including debit negatives.
ledger_events=defaultdict(list);running=defaultdict(int)
for e in d['wallet_ledger']:
 check(e['customer_id'] in by['customers'],f'{e["id"]}: customer')
 running[e['customer_id']]+=e['amount_cents'];ledger_events[(e['reference_type'],e['reference_id'])].append(e)
 check(running[e['customer_id']]==e['balance_after_cents'],f'{e["id"]} running balance')
for c in d['customers']:
 bal=running[c['id']];check(bal==c['wallet_balance_snapshot_cents'],f'{c["id"]} wallet balance')
 if c['account_type']=='prepaid':check(bal>=0,f'{c["id"]} prepaid wallet negative')
 else:
  outstanding=sum(by['orders'][oid]['total_charge_cents']-refunded[oid]-paid_by_order[oid] for oid in by['orders'] if by['orders'][oid]['customer_id']==c['id'])
  check(max(0,-bal)==outstanding,f'{c["id"]}: debit balance not equal to order debt')
  check(outstanding<=c['debit_limit_cents'],f'{c["id"]}: debit limit breached')
for t in d['topups']:
 check(len(ledger_events[('topup',t['id'])])==(1 if t['status']=='approved' else 0),f'{t["id"]}: wallet posting')
for p in d['debt_payments']:
 check(len(ledger_events[('payment',p['id'])])==(1 if p['status']=='approved' else 0),f'{p["id"]}: debt wallet posting')
for r in d['refunds']:
 check(len(ledger_events[('refund',r['id'])])==(1 if r['status']=='approved' else 0),f'{r["id"]}: refund wallet posting')
expected=d['expected_totals']
for field,name in [('orders','orders'),('order_items','order_items'),('shipments','shipments'),('refunds','refunds'),('invoices','invoices'),('topups','topups'),('debt_payments','debt_payments')]:
 check(expected[field]==len(d[name]),f'expected count {field}')
check(expected['total_order_charge_cents']==sum(o['total_charge_cents'] for o in d['orders']),'expected revenue')
check(expected['total_direct_cost_cents']==sum(o['total_direct_cost_cents'] for o in d['orders']),'expected costs')
check(expected['total_order_profit_cents']==expected['total_order_charge_cents']-expected['total_direct_cost_cents'],'expected profit')
check(expected['wallet_negative_total_cents']==sum(max(0,-c['wallet_balance_snapshot_cents']) for c in d['customers']),'expected debt')
check(expected['wallet_positive_total_cents']==sum(max(0,c['wallet_balance_snapshot_cents']) for c in d['customers']),'expected wallet positive')
if errors:
 print(f'FAIL: {len(errors)} of {checks} checks failed')
 for e in errors[:40]:print(' -',e)
 raise SystemExit(1)
print(f'PASS: {checks} consistency checks; {len(d["orders"])} orders; {len(d["invoices"])} invoices; {len(d["refunds"])} refunds; wallets and production payables reconcile.')
