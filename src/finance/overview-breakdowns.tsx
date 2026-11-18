'use client';

import {ArrowUpRight} from 'lucide-react';
import {Card} from '../components/ui/card';
import {Badge, type BadgeVariant} from '../components/ui/badge';
import {Empty, type Open} from './ui';
import {isRef, type View} from './views';
import type {Language} from './i18n';

const variant = (tier: string): BadgeVariant => tier.startsWith('Super') ? 'super' : tier.startsWith('Partner') ? 'partner' : 'seller';

export function OverviewBreakdowns({view,l,open,clear}: {view: View; l: Language; open: Open; clear: () => void}) {
  const customers = view.tables[0].rows.slice(0,5);
  const tiers = [...view.tables[1].rows].sort((a,b) => Number(b.revenue) - Number(a.revenue) || String(a.tier).localeCompare(String(b.tier)));
  const total = tiers.reduce((sum,row) => sum + Number(row.revenue),0);
  const share = (revenue: number) => total > 0 ? revenue / total * 100 : 0;
  return <div className="overview-breakdowns">
    <Card className="overview-breakdown top-customers">
      <div className="card-heading"><div><h2>{l.t('topCustomers')}</h2><p>{l.t('topCustomersHint')}</p></div><span className="breakdown-period">{l.t('period')}</span></div>
      {customers.length ? <ol className="top-customer-list">{customers.map((row,index) => <li key={String(row.customerSku)}>
        <span className="customer-rank">{index + 1}</span>
        <div className="top-customer-main"><div className="top-customer-heading">
          <button type="button" onClick={() => {if (isRef(row.customer)) open('customers',row.customer.ids[0]);}}><strong>{String(row.customerSku)}</strong><ArrowUpRight size={14}/></button>
          <Badge variant={variant(String(row.tier))}>{String(row.tier)}</Badge>
        </div><span className="top-customer-name">{String(row.name)}</span><small>{String(row.email)}</small>
          <div className="breakdown-track" aria-hidden="true"><span style={{width:`${Math.max(0,share(Number(row.revenue)))}%`}}/></div>
        </div>
        <div className="breakdown-amount"><strong>{l.cash(Number(row.revenue))}</strong><span>{l.percent(share(Number(row.revenue)))}</span><small>{l.t('customerOrderCount',{count:l.count(Number(row.orders))})}</small></div>
      </li>)}</ol> : <Empty l={l} clear={clear}/>}
    </Card>
    <Card className="overview-breakdown tier-revenue">
      <div className="card-heading"><div><h2>{l.t('tierRevenue')}</h2><p>{l.t('tierRevenueHint')}</p></div></div>
      {tiers.length ? <>
        <div className="tier-revenue-total"><strong>{l.cash(total)}</strong><span>{l.t('orderRevenue')}</span></div>
        <div className="tier-distribution" aria-hidden="true">{tiers.map((row,index) => <span key={String(row.tier)} style={{width:`${Math.max(0,share(Number(row.revenue)))}%`,background:`var(--chart-${index % 5 + 1})`}}/>)}</div>
        <ul className="tier-revenue-list">{tiers.map((row,index) => <li key={String(row.tier)}>
          <div><span className="tier-label"><i style={{background:`var(--chart-${index % 5 + 1})`}}/><Badge variant={variant(String(row.tier))}>{String(row.tier)}</Badge></span><strong>{l.cash(Number(row.revenue))}</strong><span className="tier-share">{l.percent(share(Number(row.revenue)))}</span></div>
          <div className="breakdown-track" aria-hidden="true"><span style={{width:`${Math.max(0,share(Number(row.revenue)))}%`,background:`var(--chart-${index % 5 + 1})`}}/></div>
        </li>)}</ul>
      </> : <Empty l={l} clear={clear}/>}
    </Card>
  </div>;
}
