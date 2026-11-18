'use client';

import {Button} from '../components/ui/button';
import {Card} from '../components/ui/card';
import {Badge, type BadgeVariant} from '../components/ui/badge';
import {useState, type ReactNode} from 'react';
import {ArrowDown, ArrowUp, ChevronsUpDown, ChevronLeft, ChevronRight, Columns3, Maximize2, Minimize2} from 'lucide-react';
import {byId, type Dataset} from './repository';
import {currency, isRef, type Locale, type Reference, type Table, type Value} from './views';
import type {Language} from './i18n';

export type Open = (entity: Reference['entity'], id: string) => void;
export function referenceName(data: Dataset, locale: Locale, entity: Reference['entity'], id: string) {
  if (entity === 'customers') return byId(data.customers, id)?.name ?? id;
  if (entity === 'factories') return byId(data.factories, id)?.[locale === 'vi' ? 'name_vi' : 'name_en'] ?? id;
  return id;
}
export function display(value: Value, key: string, l: Language) {
  if (value === null || value === undefined || value === '') return '—';
  if (isRef(value)) return value.ids.join(' · ') || '—';
  if (typeof value === 'number') return currency.has(key) ? l.cash(value) : ['margin','revenueShare'].includes(key) ? l.percent(value) : l.count(value);
  if (/^\d{4}-\d{2}($|-\d{2})/.test(value)) return l.date(value);
  if (key === 'partnerLevel') return l.t('partnerLevel'+value);
  if (key === 'type') return l.t(value === 'debit' ? 'debitType' : value);
  if (key === 'status' || key === 'costStatus') return value === 'actual' ? l.t('actual') : l.status(value);
  if (['event', 'age', 'reason', 'coverage'].includes(key)) return l.t(value);
  return value;
}
const colors: Record<string, BadgeVariant> = {
  active: 'green', approved: 'green', actual: 'green', paid: 'green', completed: 'green', delivered: 'green',
  pending: 'amber', estimated: 'amber', partially_paid: 'amber', in_production: 'amber',
  rejected: 'red', cancelled: 'red', overdue: 'red', unpaid: 'red',
};

export function Cell({value, field, data, locale, l, open}: {value: Value; field: string; data: Dataset; locale: Locale; l: Language; open: Open}) {
  if (isRef(value)) {
    if (!value.ids.length) return '—';
    const link = (id: string) => <button type="button" key={id} className="text-link" title={id} aria-label={l.t('detailsFor', {id})} onClick={() => open(value.entity, id)}>{referenceName(data, locale, value.entity, id)}</button>;
    return <span className="refs">{value.ids.slice(0, 4).map(link)}{value.ids.length > 4 && <details><summary>+{value.ids.length - 4}</summary><span className="refs">{value.ids.slice(4).map(link)}</span></details>}</span>;
  }
  const label = display(value, field, l);
  if (value && field === 'tier' && typeof value === 'string') {
    const tierColors: Record<string, BadgeVariant> = {Super: 'super', Partner: 'partner', Seller: 'seller'};
    return <Badge variant={tierColors[value.split(' ')[0]]}>{label}</Badge>;
  }
  if (field === 'partnerLevel') return <Badge className={'partner-level partner-level-'+String(value).toLowerCase()}>{label}</Badge>;
  if (value && ['status', 'costStatus', 'type'].includes(field)) return <Badge variant={colors[String(value)]}>{label}</Badge>;
  if (field === 'factory' && typeof value === 'string') return <span className="refs">{value.split(' · ').map(name => <Badge key={name}>{name}</Badge>)}</span>;
  return <span className={typeof value === 'number' && currency.has(field) && value < 0 ? 'negative' : typeof value === 'number' && ['profit', 'balance', 'productionContribution', 'shippingContribution'].includes(field) && value > 0 ? 'positive' : ''}>{label}</span>;
}

export function Segment({options, value, change, label}: {options: {id: string; label: string}[]; value: string; change: (id: string) => void; label: string}) {
  return <div className="segment" role="group" aria-label={label}>{options.map(option => <button type="button" key={option.id} aria-pressed={value === option.id} onClick={() => change(option.id)}>{option.label}</button>)}</div>;
}

export function Empty({l, clear, message = l.t('empty')}: {l: Language; clear: () => void; message?: string}) {
  return <div className="empty"><strong>{message}</strong><p>{l.t('filtered')}</p><Button onClick={clear}>{l.t('clear')}</Button></div>;
}

export function DataTable({table, l, locale, data, open, clear, rowActions}: {rowActions?: (row: Table['rows'][number]) => ReactNode; table: Table; l: Language; locale: Locale; data: Dataset; open: Open; clear: () => void}) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{key: string; ascending: boolean}>();
  const [hidden, setHidden] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const pageSize = expanded ? 30 : 10;
  const shown = table.columns.filter(column => !hidden.includes(column));
  const rows = sort ? [...table.rows].sort((a, b) => {
    const first = a[sort.key];
    const second = b[sort.key];
    const text = (v: Value) => isRef(v) ? v.ids.map(id => referenceName(data, locale, v.entity, id)).join(' ') : String(v ?? '');
    const result = typeof first === 'number' && typeof second === 'number' ? first - second : text(first).localeCompare(text(second), locale, {numeric: true});
    return sort.ascending ? result : -result;
  }) : table.rows;
  const current = Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
  const pageRows = rows.slice(current * pageSize, (current + 1) * pageSize);
  return <Card className="table-card" aria-label={l.t(table.title)}>
    <div className="card-heading"><div><h2>{l.t(table.title)}</h2><p>{l.t('columnsHint')}</p></div>
      <div className="controls">
        <details className="column-menu"><summary><Columns3 size={15}/>{l.t('columns')}</summary><div>{table.columns.slice(1).map(column => <label key={column}><input type="checkbox" checked={!hidden.includes(column)} onChange={() => setHidden(values => values.includes(column) ? values.filter(value => value !== column) : [...values, column])}/>{l.t(column)}</label>)}</div></details>
        <Button size="icon" title={l.t(expanded ? 'collapse' : 'expand')} aria-label={l.t(expanded ? 'collapse' : 'expand')} onClick={() => {setExpanded(!expanded); setPage(0);}}>{expanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</Button>
      </div>
    </div>
    {!rows.length ? <Empty l={l} clear={clear}/> : <>
      <div className="table-scroll" tabIndex={0} role="region" aria-label={l.t(table.title)}><table>
        <thead><tr>{shown.map(column => {
          const Icon = sort?.key !== column ? ChevronsUpDown : sort.ascending ? ArrowUp : ArrowDown;
          return <th key={column} scope="col" className={currency.has(column) || ['margin','revenueShare'].includes(column) ? 'numeric' : ''} aria-sort={sort?.key === column ? sort.ascending ? 'ascending' : 'descending' : undefined}><button aria-label={l.t('sort', {column: l.t(column)})} onClick={() => {setSort({key: column, ascending: sort?.key === column ? !sort.ascending : true}); setPage(0);}}>{l.t(column)}<Icon size={12}/></button></th>;
        })}{rowActions && <th scope="col">{l.t('actions')}</th>}</tr></thead>
        <tbody>{pageRows.map((row, index) => <tr key={index}>{shown.map(column => <td key={column} className={typeof row[column] === 'number' || currency.has(column) ? 'numeric' : ''}><Cell value={row[column] ?? null} field={column} data={data} locale={locale} l={l} open={open}/></td>)}{rowActions && <td>{rowActions(row)}</td>}</tr>)}</tbody>
      </table></div>
      <div className="table-footer"><span>{l.t('count', {shown: l.count(Math.min((current + 1) * pageSize, rows.length)), total: l.count(rows.length)})}</span><div className="controls"><Button size="icon" aria-label={l.t('previous')} disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft size={16}/></Button><span>{current + 1} / {Math.ceil(rows.length / pageSize)}</span><Button size="icon" aria-label={l.t('next')} disabled={(current + 1) * pageSize >= rows.length} onClick={() => setPage(current + 1)}><ChevronRight size={16}/></Button></div></div>
    </>}
  </Card>;
}

export function Bars({title, entries, l, clear}: {title: string; entries: {label: ReactNode; value: number}[]; l: Language; clear: () => void}) {
  const max = Math.max(1, ...entries.map(entry => Math.abs(entry.value)));
  return <Card className="comparison"><h2>{l.t(title)}</h2>{entries.length ? <ul>{entries.map((entry, index) => <li key={index}><div>{entry.label}<strong className={entry.value < 0 ? 'negative' : ''}>{l.cash(entry.value)}</strong></div><div className="track" aria-hidden="true"><span className={entry.value < 0 ? 'loss' : undefined} style={{width: Math.abs(entry.value) * 100 / max + '%'}}/></div></li>)}</ul> : <Empty l={l} clear={clear}/>}</Card>;
}

export function csvText(tables: Table[], data: Dataset, locale: Locale, l: Language) {
  const csv = (value: string | number) => typeof value === 'number' ? String(value) : '"' + (/^[\s\uFEFF]*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
  return '\uFEFF' + tables.map(table => [
    ...(tables.length > 1 ? [csv(l.t(table.title))] : []),
    table.columns.map(column => csv(l.t(column))).join(','),
    ...table.rows.map(row => table.columns.map(column => {
      const value = row[column];
      if (isRef(value)) return csv(value.ids.map(id => referenceName(data, locale, value.entity, id)).join(' · '));
      if (typeof value === 'number' && currency.has(column)) return (value / 100).toFixed(2);
      return csv(typeof value === 'number' ? value : display(value, column, l));
    }).join(',')),
  ].join('\r\n')).join('\r\n\r\n');
}
