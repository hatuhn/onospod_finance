'use client';

import {Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis} from 'recharts';
import {Card} from '../components/ui/card';
import {ChartContainer, ChartTooltipContent} from '../components/ui/chart';
import {Empty, Segment} from './ui';
import type {View} from './views';
import type {Language} from './i18n';

export function SkuDashboard({view, l, mode, change, clear}: {
  view: View; l: Language; mode: 'units' | 'revenue'; change: (mode: string) => void; clear: () => void;
}) {
  const key = mode === 'units' ? 'completedUnits' : 'productionRevenue';
  const rows = view.tables[0].rows;
  const ranked = [...rows].filter(row => Number(row[key]) > 0)
    .sort((a,b) => Number(b[key]) - Number(a[key]) || String(a.sku).localeCompare(String(b.sku))).slice(0,10);
  const format = mode === 'units' ? l.count : l.cash;
  const title = l.t(mode === 'units' ? 'skuChartUnits' : 'skuChartRevenue');
  const chartRows = ranked.map(row => ({sku:String(row.sku),product:String(row.product),value:Number(row[key])}));
  const leader = chartRows[0];

  const departments = Array.from(new Set(rows.map(row => String(row.department)))).map((name,index) => ({
    name, value: rows.filter(row => row.department === name).reduce((total,row) => total + Number(row.productionRevenue),0), color: `var(--chart-${index % 5 + 1})`,
  })).filter(row => row.value > 0);
  const total = departments.reduce((value,row) => value + row.value,0);

  return <div className="sku-dashboard-grid">
    <Card className="sku-dashboard department-share">
      <div className="card-heading"><div><h2>{l.t('departmentRevenueShare')}</h2><p>{l.t('departmentRevenueShareBasis')}</p></div></div>
      {total > 0 ? <>
        <div role="region" aria-label={l.t('departmentRevenueShare')}>
          <ChartContainer loadingLabel={l.t('chartLoading')}>
            <PieChart accessibilityLayer>
              <Pie data={departments} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={3} stroke="var(--card)" isAnimationActive={false}>
                {departments.map(row => <Cell key={row.name} fill={row.color}/>)}
              </Pie>
              <Tooltip content={({active,payload}) => {
                const entry = payload?.[0]?.payload as typeof departments[number] | undefined;
                return active && entry ? <ChartTooltipContent title={entry.name}><span>{l.cash(entry.value)}<b>{l.percent(entry.value / total * 100)}</b></span></ChartTooltipContent> : null;
              }}/>
            </PieChart>
          </ChartContainer>
        </div>
        <div className="department-share-total"><span>{l.t('productionRevenue')}</span><strong>{l.cash(total)}</strong></div>
        <ul className="department-share-legend">{departments.map(row => <li key={row.name}>
          <span className="department-share-name"><i style={{background:row.color}}/>{row.name}</span>
          <span>{l.cash(row.value)}</span><strong>{l.percent(row.value / total * 100)}</strong>
        </li>)}</ul>
      </> : <div className="chart-stage chart-placeholder"><p>{l.t('noSkuRevenue')}</p><Empty l={l} clear={clear}/></div>}
    </Card>
    <Card className="sku-dashboard sku-ranking">
    <div className="card-heading">
      <div><h2>{l.t('skuRanking')}</h2><p>{l.t('skuRankBasis')}</p></div>
      <Segment label={l.t('skuRanking')} value={mode} change={change} options={[
        {id:'units',label:l.t('mostProduced')}, {id:'revenue',label:l.t('highestRevenue')},
      ]}/>
    </div>
    {leader && <div className="sku-leader">
      <span>{l.t('leadingSku')}</span><strong>{leader.product}</strong><span>{leader.sku}</span><b>{format(leader.value)}</b>
    </div>}
    {chartRows.length ? <>
      <div role="region" aria-label={title} className="sku-chart">
        <ChartContainer loadingLabel={l.t('chartLoading')}>
          <BarChart data={chartRows} layout="vertical" accessibilityLayer aria-label={title} margin={{top:8,right:24,bottom:8,left:0}}>
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)"/>
            <XAxis type="number" tickLine={false} axisLine={false} tickCount={5} allowDecimals={mode === 'revenue'} tick={{fill:'var(--chart-axis)'}} tickFormatter={value=>l.compact(mode === 'revenue' ? value/100 : value)}/>
            <YAxis type="category" dataKey="sku" width={118} tickLine={false} axisLine={false} tick={{fill:'var(--chart-axis)'}}/>
            <Tooltip cursor={{fill:'var(--muted)'}} content={({active,payload}) => {
              const entry = payload?.[0]?.payload as typeof chartRows[number] | undefined;
              return active && entry ? <ChartTooltipContent title={entry.product}><span>{entry.sku}<b>{format(entry.value)}</b></span></ChartTooltipContent> : null;
            }}/>
            <Bar dataKey="value" name={title} fill="var(--chart-1)" radius={[0,6,6,0]} maxBarSize={32} isAnimationActive={false}/>
          </BarChart>
        </ChartContainer>
      </div>
      <details className="trend-data"><summary>{l.t('chartData')}</summary>
        <div className="table-scroll"><table><thead><tr><th>{l.t('sku')}</th><th>{l.t('product')}</th><th className="numeric">{l.t(key)}</th></tr></thead>
          <tbody>{chartRows.map(row=><tr key={row.sku}><th scope="row">{row.sku}</th><td>{row.product}</td><td className="numeric">{format(row.value)}</td></tr>)}</tbody>
        </table></div>
      </details>
    </> : <div className="chart-stage chart-placeholder"><p>{l.t(mode === 'units' ? 'noCompleted' : 'noSkuRevenue')}</p><Empty l={l} clear={clear}/></div>}
  </Card><FactoryRevenueChart view={view} l={l} clear={clear}/></div>;
}


export function FactoryRevenueChart({view, l, clear}: {view: View; l: Language; clear: () => void}) {
  const rows = view.tables[1].rows.filter(row => Number(row.productionRevenue) > 0).map(row => ({
    name: String(row.factoryName), revenue: Number(row.productionRevenue), share: Number(row.revenueShare),
  }));
  return <Card className="sku-dashboard factory-revenue-chart">
    <div className="card-heading"><div><h2>{l.t('factoryRevenueChart')}</h2><p>{l.t('factoryRevenueBasis')}</p></div></div>
    {rows.length ? <div role="region" aria-label={l.t('factoryRevenueChart')}>
      <ChartContainer loadingLabel={l.t('chartLoading')}>
        <BarChart data={rows} accessibilityLayer margin={{top:20,right:12,bottom:8,left:0}}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)"/>
          <XAxis type="category" dataKey="name" height={90} interval={0} angle={-35} textAnchor="end" tickLine={false} axisLine={false} tick={{fill:'var(--chart-axis)',fontSize:11}}/>
          <YAxis type="number" width={48} tickLine={false} axisLine={false} tick={{fill:'var(--chart-axis)'}} tickFormatter={value => l.compact(value / 100)}/>
          <Tooltip cursor={{fill:'var(--muted)'}} content={({active,payload}) => {
            const entry = payload?.[0]?.payload as typeof rows[number] | undefined;
            return active && entry ? <ChartTooltipContent title={entry.name}><span>{l.cash(entry.revenue)}<b>{l.percent(entry.share)}</b></span></ChartTooltipContent> : null;
          }}/>
          <Bar dataKey="revenue" name={l.t('productionRevenue')} fill="var(--chart-2)" radius={[6,6,0,0]} maxBarSize={48} isAnimationActive={false}/>
        </BarChart>
      </ChartContainer>
    </div> : <div className="chart-placeholder"><p>{l.t('noSkuRevenue')}</p><Empty l={l} clear={clear}/></div>}
  </Card>;
}
