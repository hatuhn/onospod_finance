'use client';

import {Component, useId, type ReactNode} from 'react';
import {CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis} from 'recharts';
import {Card} from '../components/ui/card';
import {Button} from '../components/ui/button';
import {ChartContainer, ChartTooltipContent} from '../components/ui/chart';
import {departmentTrend, precedingPeriod} from './views';
import {timeZone, type Dataset, type Filter} from './repository';
import {Empty, Segment} from './ui';
import type {Language} from './i18n';
import type {Locale} from './views';

class ChartBoundary extends Component<{children: ReactNode; l: Language}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}

  render() {
    if (!this.state.failed) return this.props.children;
    const {l} = this.props;
    return <div className="chart-stage chart-placeholder" role="alert">
      <p>{l.t('chartError')}</p>
      <Button size="sm" onClick={() => this.setState({failed: false})}>{l.t('retryChart')}</Button>
    </div>;
  }
}

export function Trend({data, filter, locale, l, mode, change, clear}: {data: Dataset; filter: Filter; locale: Locale; l: Language; mode: 'revenue' | 'sku'; change: (mode: string) => void; clear: () => void}) {
  const id = useId();
  const {buckets, series, comparison} = departmentTrend(data, filter);
  const prior = precedingPeriod(data, filter);
  const format = mode === 'revenue' ? l.cash : l.count;
  const label = mode === 'revenue' ? l.charts.revenue : l.charts.distinctSku;
  const name = (department: typeof series[number]) => locale === 'vi' ? department.name_vi : department.name_en;
  const color = (index: number) => 'var(--chart-' + (index + 1) + ')';
  const showPrior = comparison.length > 0;
  const dataRows = buckets.map((bucket, index) => ({
    bucket,
    previous: comparison[index]?.[mode],
    ...Object.fromEntries(series.map(department => [department.id, department.values[index][mode]])),
  }));
  const period = prior ? l.t('priorRange', {from: l.date(prior.from), to: l.date(prior.to)}) : l.t('priorUnavailable');

  return <Card className="trend" aria-labelledby={id}>
    <div className="card-heading">
      <div><h2 id={id}>{l.t('trends')}</h2><p>{l.t('trendBasis', {zone: timeZone})}</p></div>
      <Segment label={l.t('trends')} options={[{id: 'revenue', label: l.charts.revenue}, {id: 'sku', label: l.charts.bySku}]} value={mode} change={change}/>
    </div>
    {series.length ? <>
      <div className="legend">{series.map((department, index) => <div key={department.id}><span><i style={{background: color(index)}}/>{name(department)}</span><strong>{format(department[mode])}</strong></div>)}</div>
      <p className="chart-period">{showPrior && <span className="chart-compare-swatch" aria-hidden="true"/>}{showPrior ? l.t('priorTotal') + ' · ' : ''}{period}</p>
      <div className="chart-scroll" tabIndex={0} role="region" aria-label={label}>
        <ChartBoundary l={l}>
          <ChartContainer loadingLabel={l.t('chartLoading')}>
            <LineChart<object> data={dataRows} accessibilityLayer aria-label={label} margin={{top: 8, right: 18, bottom: 4, left: 0}}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)"/>
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} tickMargin={10} minTickGap={28} interval="preserveStartEnd" tick={{fill:'var(--chart-axis)'}} tickFormatter={bucket => bucket.length === 7 ? l.date(bucket) : l.shortDate(bucket)}/>
              <YAxis width={54} axisLine={false} tickLine={false} tickCount={5} allowDecimals={mode === 'revenue'} tick={{fill:'var(--chart-axis)'}} tickFormatter={value => l.compact(mode === 'revenue' ? value / 100 : value)}/>
              <Tooltip cursor={{stroke:'var(--chart-grid)'}} content={({active, payload, label: bucket}) => active && payload?.length && bucket
                ? <ChartTooltipContent title={l.date(String(bucket))}>
                  {payload.map(entry => <span key={String(entry.dataKey)}><i style={{background:entry.color}}/>{entry.name}<b>{format(Number(entry.value))}</b></span>)}
                </ChartTooltipContent> : null}/>
              {series.map((department, index) => <Line key={department.id} name={name(department)} type="monotone" dataKey={department.id} stroke={color(index)} strokeWidth={2} dot={buckets.length === 1} activeDot={{r:4, strokeWidth:2, stroke:'var(--card)'}} isAnimationActive={false}/>)}
              {showPrior && <Line name={l.t('priorTotal')} dataKey="previous" stroke="var(--chart-compare)" strokeDasharray="4 4" strokeWidth={1.5} type="monotone" dot={buckets.length === 1} isAnimationActive={false}/>}
            </LineChart>
          </ChartContainer>
        </ChartBoundary>
      </div>
      <details className="trend-data">
        <summary>{l.t('trendData')}</summary>
        <div className="table-scroll"><table>
          <caption>{label}</caption>
          <thead><tr><th>{l.t('date')}</th>{series.map((department, index) => <th className="numeric" key={department.id}><i style={{background:color(index)}}/> {name(department)}</th>)}{showPrior && <th className="numeric">{l.t('priorTotal')}</th>}</tr></thead>
          <tbody>{buckets.map((bucket, index) => <tr key={bucket}><th scope="row">{l.date(bucket)}</th>{series.map(department => <td className="numeric" key={department.id}>{format(department.values[index][mode])}</td>)}{showPrior && <td className="numeric">{format(comparison[index][mode])}</td>}</tr>)}</tbody>
        </table></div>
      </details>
    </> : <div className="chart-stage chart-placeholder"><Empty l={l} clear={clear} message={l.t('trendEmpty')}/></div>}
  </Card>;
}
