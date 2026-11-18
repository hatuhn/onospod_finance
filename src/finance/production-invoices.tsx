'use client';

import {Eye, FileDown} from 'lucide-react';
import {Button} from '../components/ui/button';
import {DataTable, csvText, type Open} from './ui';
import {isRef, type Locale, type View} from './views';
import type {Dataset} from './repository';
import type {Language} from './i18n';

export function ProductionInvoices({view, data, locale, l, open, clear}: {
  view: View; data: Dataset; locale: Locale; l: Language; open: Open; clear: () => void;
}) {
  const table = view.tables[0];
  return <DataTable table={table} data={data} locale={locale} l={l} open={open} clear={clear}
    rowActions={row => {
      if (!isRef(row.id)) return null;
      const id = row.id.ids[0];
      return <div className="controls">
        <Button size="sm" onClick={() => open('production-invoices', id)}><Eye size={14}/>{l.t('showInvoice')}</Button>
        <Button size="sm" onClick={() => {
          const invoice = table.rows.find(value => isRef(value.id) && value.id.ids[0] === id);
          if (!invoice) return;
          const blob = new Blob([csvText([{...table, rows:[invoice]}], data, locale, l)], {type:'text/csv;charset=utf-8'});
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = id + '.csv';
          link.click();
          setTimeout(() => URL.revokeObjectURL(url),1000);
        }}><FileDown size={14}/>{l.t('downloadInvoice')}</Button>
      </div>;
    }}/>;
}
