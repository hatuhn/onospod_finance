#!/usr/bin/env python3
"""Reproducible, deterministic mock fixture generator. No external packages required."""
import json, random, calendar
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

OUT=Path(__file__).resolve().parents[1]/'mock-data';OUT.mkdir(exist_ok=True)
rng=random.Random(20261117)
AS_OF=date(2026,11,17)
def iso(d):return d.isoformat()
def C(dollars):return int(round(dollars*100))
def write(name,data):
    (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(name,len(data) if isinstance(data,list) else '-')

departments=[{'id':key,'name_vi':vi,'name_en':en,'chart_color':color} for key,vi,en,color in [
 ('may_mac','May Mặc','Apparel','#007AFF'),('two_d','2D','2D Printing','#AF52DE'),
 ('handmade','Handmade','Handmade','#F59E0B'),('theu','Thêu','Embroidery','#16A085')]]
users=[{'id':f'USR-{i:02d}','name':name,'role':role} for i,(name,role) in enumerate([
 ('Minh Tran','production'),('Mai Pham','finance'),('Linh Nguyen','finance_manager'),('Quang Le','production'),
 ('Thu Ha','production'),('Khanh Nguyen','production'),('Vy Le','account_manager'),('Huy Pham','account_manager')],1)]
FACTS=[('FAC-HN','Hanoi Factory','Nhà máy Hà Nội','PAYEE-ONOS'),('FAC-HCM','Ho Chi Minh Factory','Nhà máy TP.HCM','PAYEE-SOUTH'),('FAC-DN','Da Nang Factory','Nhà máy Đà Nẵng','PAYEE-CENTRAL'),('FAC-PARTNER','Partner Factory','Nhà máy đối tác','PAYEE-PARTNER')]
fac=[{'id':i,'name_en':en,'name_vi':vi,'payee_id':payee} for i,en,vi,payee in FACTS]
payees=[{'id':'PAYEE-ONOS','name':'Onos Factory'},{'id':'PAYEE-SOUTH','name':'Onos South Factory'},{'id':'PAYEE-CENTRAL','name':'Onos Central Factory'},{'id':'PAYEE-PARTNER','name':'Partner Production Co.'}]
carriers=[{'id':k,'name':n} for k,n in [('CAR-USPS','USPS'),('CAR-UPS','UPS'),('CAR-DHL','DHL eCommerce'),('CAR-ONOS','OnosExpress')]]
tiers=['Super 0','Super 1','Super 2','Partner VIP 1','Partner VIP 2','Partner VIP 3','Seller VIP 3','Seller VIP 4']
names=['Northstar Apparel','Urban Bird Studio','Pinewood Merch','Retro Prints LLC','Blueberry Outlet','Coastal Tee Co','Cloudline Gifts','Evergreen Designs','Sunrise Seller Hub','Oak & Ember','Athletic Mint','Nova Merch Studio','Riverbend Boutique','Wander Threads','Olive Leaf Crafts','Merch Harbor']
customers=[]
for i,name in enumerate(names):
    kind='debit' if i%2==0 else 'prepaid'
    customers.append({'id':f'CUS-{i+1:03d}','name':name,'tier':tiers[i%8], 'account_type':kind,
      'debit_limit_cents':C(120000) if kind=='debit' else 0,'account_manager_id':users[6+i%2]['id'], 'currency':'USD'})

catalog_names=[
 ('APP-HOODIE','All-Over Print Hoodie','may_mac',21,12),('APP-POLO','3D Polo Shirt','may_mac',18,10),('APP-JERSEY','Sports Jersey','may_mac',16,9),
 ('2D-TSHIRT','DTG T-Shirt','two_d',11,6),('2D-TOTE','Printed Tote Bag','two_d',9,5),('2D-MUG','Printed Mug','two_d',10,6),
 ('HM-WOOD','Wood Ornament','handmade',13,8),('HM-ACRYLIC','Acrylic Sign','handmade',17,11),('HM-COIN','UV Commemorative Coin','handmade',12,7),
 ('EM-CAP','Embroidered Cap','theu',15,9),('EM-PATCH','Embroidered Patch','theu',8,4),('EM-SWEATER','Embroidered Sweatshirt','theu',24,15)]
skus=[{'id':k,'name':n,'department_id':d,'base_price_cents':C(sell),'base_cost_cents':C(cost)} for k,n,d,sell,cost in catalog_names]
sku_index={x['id']:x for x in skus}
orders=[];order_items=[];shipments=[]
for n in range(160):
    month=8+n//40; day=(1+(n*7)% (17 if month==11 else 28)); od=date(2026,month,day)
    c=customers[(n*5+n//9)%len(customers)]; status='cancelled' if n%23==0 else ('in_production' if n%17==0 else 'completed')
    order_id=f'ON-{11001+n}'; item_count=2 if n%5==0 else 1; current_items=[];current_ships=[]
    for j in range(item_count):
        sku=skus[(n*7+j*5+n//11)%len(skus)]
        fac_id=fac[(n//3+j*2+n%3)%len(fac)]['id'] if j else fac[n%len(fac)]['id']
        if j and fac_id==current_items[0]['factory_id']:fac_id=fac[(n+1)%len(fac)]['id']
        qty=1+((n*11+j*7)%25); charge=sku['base_price_cents']*qty; cost=sku['base_cost_cents']*qty+((n+j)%3)*37
        if status=='cancelled':charge=0;cost=cost//4 if n%2==0 else 0
        itm={'id':f'OI-{n+1:04d}-{j+1}','order_id':order_id,'sku_id':sku['id'],'department_id':sku['department_id'],
             'factory_id':fac_id,'production_user_id':users[(n+j)%4*2 % 8]['id'],
             'quantity':qty,'cancelled_units':qty if status=='cancelled' else 0,
             'production_revenue_cents':charge,'production_cost_cents':cost,'cost_status':'estimated' if status=='in_production' else 'actual'}
        current_items.append(itm);order_items.append(itm)
    if status!='cancelled':
        for j,itm in enumerate(current_items):
            qty=itm['quantity'];ship_rev=C(3.75)+qty*63+((n+j)%5)*45;ship_cost=C(3.10)+qty*56+((n+j)%6)*25
            fee_rev=C(.65)+((n+j)%4)*38;fee_cost=C(.5)+((n+j)%5)*34;other=C(.5)+qty*16
            ship={'id':f'SHIP-{n+1:04d}-{j+1}','order_id':order_id,'factory_id':itm['factory_id'],
                'carrier_id':carriers[(n+j)%len(carriers)]['id'],'tracking_number':f'DEMO{n+1:06d}{j+1}',
                'status':'label_created' if status=='in_production' else 'shipped','shipped_at':None if status=='in_production' else iso(min(AS_OF,od+timedelta(days=3))),
                'shipping_revenue_cents':ship_rev,'shipping_cost_cents':ship_cost,
                'tax_fee_revenue_cents':fee_rev,'tax_fee_cost_cents':fee_cost,'other_cost_cents':other,
                'tax_collected_as_agent_cents':0}
            current_ships.append(ship);shipments.append(ship)
    revenue=sum(x['production_revenue_cents'] for x in current_items)+sum(x['shipping_revenue_cents']+x['tax_fee_revenue_cents'] for x in current_ships)
    cost=sum(x['production_cost_cents'] for x in current_items)+sum(x['shipping_cost_cents']+x['tax_fee_cost_cents']+x['other_cost_cents'] for x in current_ships)
    orders.append({'id':order_id,'customer_id':c['id'],'customer_tier_at_order':c['tier'], 'account_type_at_order':c['account_type'],
       'account_manager_id':c['account_manager_id'],'created_at':iso(od),'status':status,'currency':'USD',
       'invoice_ids':[],'total_charge_cents':revenue,'total_direct_cost_cents':cost,'cost_status':'estimated' if status=='in_production' else 'actual',
       'order_item_ids':[x['id'] for x in current_items], 'shipment_ids':[x['id'] for x in current_ships]})
orders.sort(key=lambda o:(o['created_at'],o['id']));order_index={o['id']:o for o in orders}
# Refunds are distinct accounting events; earlier orders may be refunded during the current month.
refunds=[];already_refunded=set()
for month,count in [(9,5),(10,7),(11,18)]:
    eligible=[o for o in orders if o['status']=='completed' and int(o['created_at'][5:7])<month and o['id'] not in already_refunded]
    rng.shuffle(eligible)
    for j,o in enumerate(eligible[:count]):
        already_refunded.add(o['id']);rd=date(2026,month, 2+(j*3)% (15 if month==11 else 26))
        amt=o['total_charge_cents']*(100 if j%7==0 else [25,35,50,65][j%4])//100
        refund={'id':f'RF-{len(refunds)+1:04d}','order_id':o['id'],'customer_id':o['customer_id'],
          'refund_date':iso(rd),'refund_amount_cents':amt,'recovered_cost_cents':amt//25 if j%5==0 else 0,
          'kind':'full' if amt==o['total_charge_cents'] else 'partial','reason':['quality','late_delivery','customer_claim','duplicate_charge'][j%4],
          'status':'approved','recorded_by':'USR-02','approved_by':'USR-03','approved_at':iso(rd),'refund_method':'wallet_credit'}
        refunds.append(refund)
refund_by_order=defaultdict(int)
for r in refunds:refund_by_order[r['order_id']]+=r['refund_amount_cents']

invoices=[]
for c in customers:
    if c['account_type']!='debit':continue
    for month in range(8,12):
        os=[o for o in orders if o['customer_id']==c['id'] and int(o['created_at'][5:7])==month and o['total_charge_cents']>0]
        if not os:continue
        id=f'INV-2026-{month:02d}-{c["id"]}'
        issue=min(AS_OF,date(2026,month,calendar.monthrange(2026,month)[1]));due=issue+timedelta(days=15)
        for o in os:o['invoice_ids'].append(id)
        invoices.append({'id':id,'customer_id':c['id'],'invoice_type':'monthly_statement', 'period_month':f'2026-{month:02d}',
          'issued_at':iso(issue),'due_at':iso(due),'order_ids':[o['id'] for o in os],
          'gross_amount_cents':sum(o['total_charge_cents'] for o in os), 'refund_credit_cents':sum(refund_by_order[o['id']] for o in os),
          'paid_cents':0,'remaining_cents':0,'status':'draft' if month==11 else 'issued',
          'created_by':'USR-02','approved_by':'USR-03' if month!=11 else None})
inv_index={i['id']:i for i in invoices}

topups=[]
for c in customers:
    if c['account_type']!='prepaid':continue
    for month in range(8,12):
        os=[o for o in orders if o['customer_id']==c['id'] and int(o['created_at'][5:7])==month]
        if not os:continue
        amount=sum(o['total_charge_cents'] for o in os)+C(60+(month%4)*11)
        topups.append({'id':f'TOP-{len(topups)+1:04d}','customer_id':c['id'],'created_at':f'2026-{month:02d}-01',
          'amount_cents':amount,'bank_reference':f'BANK-TOP-{month:02d}-{c["id"]}', 'status':'approved',
          'recorded_by':'USR-02','approved_by':'USR-03','approved_at':f'2026-{month:02d}-01', 'method':'bank_transfer'})
for idx,status in enumerate(['pending','pending','pending','rejected']):
    topups.append({'id':f'TOP-DEMO-{idx+1:02d}','customer_id':customers[2*idx+1]['id'], 'created_at':f'2026-11-{14+idx:02d}',
      'amount_cents':C([1245,860,420,375][idx]),'bank_reference':f'BANK-DEMO-TOP-{idx+1:03d}',
      'status':status,'recorded_by':'USR-02','approved_by':'USR-03' if status=='rejected' else None,
      'approved_at':'2026-11-17' if status=='rejected' else None,'method':'bank_transfer'})

payments=[];allocations=[]
for c in customers:
    if c['account_type']!='debit':continue
    os=[o for o in orders if o['customer_id']==c['id'] and o['total_charge_cents']>0]
    os.sort(key=lambda o:(o['created_at'],o['id']))
    paid_by_order=defaultdict(int)
    for month in [9,10,11]:
        paid_at=date(2026,month,16 if month==11 else 25)
        eligible=[o for o in os if o['created_at']<=iso(paid_at)]
        available=sum(max(0,o['total_charge_cents']-refund_by_order[o['id']]-paid_by_order[o['id']]) for o in eligible)
        target=int(available*[0.37,0.34,0.31][month-9]);if_has=target>0
        if not if_has:continue
        payid=f'PAY-{len(payments)+1:04d}';left=target; allocated=0
        for o in eligible:
            if left<=0:break
            rest=max(0,o['total_charge_cents']-refund_by_order[o['id']]-paid_by_order[o['id']]); take=min(left,rest)
            if take==0:continue
            paid_by_order[o['id']]+=take;left-=take;allocated+=take
            allocations.append({'id':f'ALOC-{len(allocations)+1:05d}','payment_id':payid,'order_id':o['id'],
              'invoice_id':o['invoice_ids'][0], 'amount_cents':take})
        payments.append({'id':payid,'customer_id':c['id'],'payment_date':iso(paid_at),'amount_cents':allocated,
          'bank_reference':f'BANK-DEBT-{c["id"]}-{month:02d}', 'status':'approved','recorded_by':'USR-02',
          'approved_by':'USR-03','approved_at':iso(paid_at),'method':'bank_transfer'})
for k,status in enumerate(['pending','pending','rejected']):
    c=[x for x in customers if x['account_type']=='debit'][k]
    payments.append({'id':f'PAY-DEMO-{k+1:02d}','customer_id':c['id'],'payment_date':f'2026-11-{15+k:02d}',
      'amount_cents':C([520,325,180][k]), 'bank_reference':f'BANK-DEMO-DEBT-{k+1}', 'status':status,
      'recorded_by':'USR-02','approved_by':'USR-03' if status=='rejected' else None,
      'approved_at':'2026-11-17' if status=='rejected' else None, 'method':'bank_transfer'})

paid_by_invoice=defaultdict(int)
for a in allocations:paid_by_invoice[a['invoice_id']]+=a['amount_cents']
for invoice in invoices:
    invoice['paid_cents']=paid_by_invoice[invoice['id']]
    invoice['remaining_cents']=invoice['gross_amount_cents']-invoice['refund_credit_cents']-invoice['paid_cents']
    if invoice['remaining_cents']==0:invoice['status']='paid'
    elif invoice['due_at']<iso(AS_OF):invoice['status']='overdue'
    elif invoice['paid_cents']>0:invoice['status']='partially_paid'
    elif invoice['status']!='draft':invoice['status']='unpaid'

payables=[];factory_payouts=[]
for factory in fac:
    for month in range(8,12):
        parts=[it for it in order_items if it['factory_id']==factory['id'] and order_index[it['order_id']]['created_at'][5:7]==f'{month:02d}']
        cost=sum(it['production_cost_cents'] for it in parts)
        if cost==0:continue
        payable_id=f'FPB-{factory["id"]}-{month:02d}'
        payables.append({'id':payable_id,'factory_id':factory['id'],'payee_id':factory['payee_id'],'period_month':f'2026-{month:02d}',
          'order_item_ids':[it['id'] for it in parts], 'production_cost_cents':cost,'approved_payout_cents':0,
          'outstanding_cents':cost,'recorded_by':'USR-02'})
        value=int(cost*(0.53 if month==11 else .84))
        factory_payouts.append({'id':f'FPO-{len(factory_payouts)+1:04d}','factory_payable_id':payable_id,
          'factory_id':factory['id'],'payee_id':factory['payee_id'], 'payment_date':f'2026-{month:02d}-{15 if month==11 else 25}',
          'amount_cents':value,'status':'approved','recorded_by':'USR-02','approved_by':'USR-03',
          'approved_at':f'2026-{month:02d}-{15 if month==11 else 25}','bank_reference':f'BANK-FACT-{factory["id"]}-{month:02d}'})
        if month==11:
            factory_payouts.append({'id':f'FPO-PENDING-{factory["id"]}','factory_payable_id':payable_id,
              'factory_id':factory['id'],'payee_id':factory['payee_id'],'payment_date':'2026-11-17',
              'amount_cents':(cost-value)//2,'status':'pending','recorded_by':'USR-02','approved_by':None,
              'approved_at':None,'bank_reference':f'BANK-FACT-PENDING-{factory["id"]}'})
fp_per_payable=defaultdict(int)
for p in factory_payouts:
    if p['status']=='approved':fp_per_payable[p['factory_payable_id']]+=p['amount_cents']
for pa in payables:
    pa['approved_payout_cents']=fp_per_payable[pa['id']]
    pa['outstanding_cents']=pa['production_cost_cents']-pa['approved_payout_cents']

ledger=[]
def led(ref,event_date,cid,event_type,amount,ref_entity,ref_id):
    ledger.append({'id':f'LED-{len(ledger)+1:05d}','customer_id':cid,'event_date':event_date,
     'event_type':event_type,'amount_cents':amount,'reference_type':ref_entity,'reference_id':ref_id, 'reference':ref})
for o in orders:
    if o['total_charge_cents']:led(o['id'],o['created_at'],o['customer_id'],'order_charge',-o['total_charge_cents'],'order',o['id'])
for t in topups:
    if t['status']=='approved':led(t['bank_reference'],t['approved_at'],t['customer_id'],'topup',t['amount_cents'],'topup',t['id'])
for p in payments:
    if p['status']=='approved':led(p['bank_reference'],p['approved_at'],p['customer_id'],'debt_payment',p['amount_cents'],'payment',p['id'])
for r in refunds:
    if r['status']=='approved':led(r['id'],r['refund_date'],r['customer_id'],'refund_wallet_credit',r['refund_amount_cents'],'refund',r['id'])
ledger.sort(key=lambda e:(e['event_date'],e['id']))
for n,e in enumerate(ledger,1):e['id']=f'LED-{n:05d}'
balance=defaultdict(int)
for e in ledger:
    balance[e['customer_id']]+=e['amount_cents'];e['balance_after_cents']=balance[e['customer_id']]
for c in customers:c['wallet_balance_snapshot_cents']=balance[c['id']]

metadata={
 'dataset_id':'onospod-finance-sample-2026-11-v1', 'source_reference':'onospod_finance_v214_reference.html',
 'description':'Synthetic illustrative dataset for a frontend-only Next.js prototype. No live Onospod financial information.',
 'as_of_date':iso(AS_OF),'timezone':'Asia/Bangkok','currency':'USD','money_unit':'integer_cents',
 'default_date_filter':'this_month','default_locale':'en','locales':['en','vi'],
 'fixed_snapshot':True, 'readme':'Use the repository interface in ONOSPOD_FINANCE_NEXTJS_SPEC.md. Never connect backend during phase one.'}
for filename,data in [('metadata.json',metadata),('departments.json',departments),('users.json',users),('factories.json',fac),('factory_payees.json',payees),('carriers.json',carriers),('customers.json',customers),('skus.json',skus),('orders.json',orders),('order_items.json',order_items),('shipments.json',shipments),('refunds.json',refunds),('invoices.json',invoices),('topups.json',topups),('debt_payments.json',payments),('payment_allocations.json',allocations),('factory_payables.json',payables),('factory_payouts.json',factory_payouts),('wallet_ledger.json',ledger)]:write(filename,data)

summary={
 'as_of_date':iso(AS_OF), 'customers':len(customers),'orders':len(orders),'order_items':len(order_items),
 'shipments':len(shipments),'refunds':len(refunds),'invoices':len(invoices),'topups':len(topups),
 'debt_payments':len(payments),'payment_allocations':len(allocations),
 'factory_payables':len(payables),'factory_payouts':len(factory_payouts),
 'total_order_charge_cents':sum(o['total_charge_cents'] for o in orders),
 'total_direct_cost_cents':sum(o['total_direct_cost_cents'] for o in orders),
 'total_order_profit_cents':sum(o['total_charge_cents']-o['total_direct_cost_cents'] for o in orders),
 'total_approved_refund_cents':sum(r['refund_amount_cents'] for r in refunds if r['status']=='approved'),
 'total_refund_profit_impact_cents':sum(-r['refund_amount_cents']+r['recovered_cost_cents'] for r in refunds if r['status']=='approved'),
 'total_approved_topups_cents':sum(t['amount_cents'] for t in topups if t['status']=='approved'),
 'total_approved_debt_payments_cents':sum(p['amount_cents'] for p in payments if p['status']=='approved'),
 'wallet_positive_total_cents':sum(max(0,c['wallet_balance_snapshot_cents']) for c in customers),
 'wallet_negative_total_cents':sum(max(0,-c['wallet_balance_snapshot_cents']) for c in customers),
 'total_factory_production_cost_cents':sum(it['production_cost_cents'] for it in order_items),
 'total_approved_factory_payout_cents':sum(p['amount_cents'] for p in factory_payouts if p['status']=='approved')}
write('expected_totals.json',summary)
