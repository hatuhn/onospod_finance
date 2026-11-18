'use client';

import {useState} from 'react';
import {ChevronLeft, ChevronRight, Eye, FileDown, SlidersHorizontal} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {byId, type Dataset} from './repository';
import {Cell, csvText, display, Empty, type Open} from './ui';
import {currency, isRef, type Locale, type View} from './views';
import type {Language} from './i18n';

export function OrderInvoiceList({data, view, locale, l, open, clear}: {
  data: Dataset; view: View; locale: Locale; l: Language; open: Open; clear: () => void;
}) {
  const [sort, setSort] = useState('newestDue');
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const rows = view.tables[0].rows;
  const invalid = minimum !== '' && maximum !== '' && Number(maximum) < Number(minimum);
  const filtered = rows.filter(row => (!minimum || Number(row.gross) >= Math.round(Number(minimum) * 100)) &&
    (!maximum || Number(row.gross) <= Math.round(Number(maximum) * 100)));
  const sorted = [...filtered].sort((a, b) => sort === 'largestTotal'
    ? Number(b.gross) - Number(a.gross)
    : String(a.due).localeCompare(String(b.due)) * (sort === 'oldestDue' ? 1 : -1));
  const current = Math.min(page, Math.max(0, Math.ceil(sorted.length / size) - 1));
  const visible = invalid ? [] : sorted.slice(current * size, (current + 1) * size);

  const download = (id?: string) => {
    const selected = id ? rows.filter(row => isRef(row.id) && row.id.ids[0] === id) : sorted;
    if (!selected.length) return;
    const blob = new Blob([csvText([{...view.tables[0], rows:selected}], data, locale, l)], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (id ?? 'order-invoices') + '.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <section className="invoice-list" aria-label={l.t('orderInvoices')}>
    <div className="invoice-summary">{view.metrics.map(metric => <div key={metric.key}>
      <span>{l.t(metric.key)}</span><strong>{display(metric.value, metric.key, l)}</strong>
    </div>)}</div>
    <div className="invoice-list-body">
      <div className="invoice-toolbar">
        <label className="sr-only" htmlFor="invoice-sort">{l.t('sortInvoices')}</label>
        <select id="invoice-sort" value={sort} onChange={event => {setSort(event.target.value);setPage(0);}}>
          {['newestDue','oldestDue','largestTotal'].map(value => <option value={value} key={value}>{l.t(value)}</option>)}
        </select>
        <details className="invoice-total-filter">
          <summary><SlidersHorizontal size={14}/>{l.t('totalFilter')}</summary>
          <div>
            <label>{l.t('minTotal')}<Input type="number" min="0" step="0.01" value={minimum} onChange={event => {setMinimum(event.target.value);setPage(0);}}/></label>
            <label>{l.t('maxTotal')}<Input type="number" min="0" step="0.01" value={maximum} aria-invalid={invalid || undefined} onChange={event => {setMaximum(event.target.value);setPage(0);}}/></label>
            <Button size="sm" onClick={() => {setMinimum('');setMaximum('');setPage(0);}}>{l.t('resetTotal')}</Button>
          </div>
        </details>
        <Button disabled={invalid || !sorted.length} onClick={() => download()}><FileDown size={14}/>{l.actions.exportCsv}</Button>
        <span className="invoice-count">{l.t('count',{shown:visible.length,total:sorted.length})}</span>
      </div>
      {invalid && <p className="negative" role="alert">{l.t('totalRangeError')}</p>}
      {!visible.length ? <Empty l={l} clear={() => {setMinimum('');setMaximum('');clear();}}/> : <div className="table-scroll" tabIndex={0} role="region" aria-label={l.t('orderInvoices')}>
        <table><thead><tr>{['invoice','customer','gross','status','remaining','due','actions'].map(field => <th scope="col" key={field} className={currency.has(field) ? 'numeric' : ''}>{l.t(field)}</th>)}</tr></thead>
          <tbody>{visible.map(row => {
            const id = isRef(row.id) ? row.id.ids[0] : String(row.id);
            const invoice = byId(data.invoices, id)!;
            return <tr key={id}>
              <td><Cell value={row.id} field="id" data={data} locale={locale} l={l} open={open}/><small>{invoice.period_month} · {invoice.order_ids.length} {l.t('orders')}</small></td>
              <td><Cell value={row.customer} field="customer" data={data} locale={locale} l={l} open={open}/><small>{String(row.tier)}</small></td>
              {['gross','status','remaining','due'].map(field => <td className={currency.has(field) ? 'numeric' : ''} key={field}><Cell value={row[field]} field={field} data={data} locale={locale} l={l} open={open}/></td>)}
              <td className="invoice-action-cell">
                <div className="controls">
                  <Button size="sm" onClick={() => open('invoices',id)}><Eye size={14}/>{l.t('showInvoice')}</Button>
                  <Button size="sm" onClick={() => download(id)}><FileDown size={14}/>{l.t('downloadInvoice')}</Button>
                </div>
              </td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
      <div className="table-footer"><span>{l.t('count',{shown:Math.min((current + 1) * size, sorted.length),total:sorted.length})}</span>
        <div className="controls"><select aria-label={l.t('rowsPerPage')} value={size} onChange={event => {setSize(Number(event.target.value));setPage(0);}}>{[10,20,50].map(value => <option key={value} value={value}>{value} / {l.t('page')}</option>)}</select>
          <Button size="icon" disabled={current === 0} aria-label={l.t('previous')} onClick={() => setPage(current-1)}><ChevronLeft size={16}/></Button>
          <span>{current + 1} / {Math.max(1,Math.ceil(sorted.length/size))}</span>
          <Button size="icon" disabled={(current+1)*size >= sorted.length} aria-label={l.t('next')} onClick={() => setPage(current+1)}><ChevronRight size={16}/></Button>
        </div>
      </div>
    </div>
  </section>;
}
