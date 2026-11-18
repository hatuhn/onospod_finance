'use client';

import {useState, type ComponentProps} from 'react';
import {Card} from '../components/ui/card';
import {DataTable} from './ui';
import {Badge} from '../components/ui/badge';
import {Input} from '../components/ui/input';
import {Search, X} from 'lucide-react';

export type TableParty = {id: string; name: string; subtitle: string; searchText?: string; tier?: string; accountType?: string; rowIds: string[]};

export function PartyTable({parties, heading, ...props}: ComponentProps<typeof DataTable> & {
  parties: TableParty[]; heading: string;
}) {
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase(props.locale);
  const visible = parties.filter(party => [party.name,party.subtitle,party.searchText ?? '',party.id].some(value => value.toLocaleLowerCase(props.locale).includes(search)));
  const active = visible.find(party => party.id === selected);
  const matching = new Set((active ? [active] : visible).flatMap(party => party.rowIds));
  const reset = () => {setSelected(''); setQuery('');};
  const rows = active || search ? props.table.rows.filter(row => {
    const id = row.id;
    return typeof id === 'object' && id !== null && id.ids.some(value => matching.has(value));
  }) : props.table.rows;
  return <div className="party-table-layout">
    <Card className="table-party-list">
      <h3 className="sr-only">{heading}</h3>
      <div className="party-search"><Search size={16} aria-hidden="true"/>
        <Input type="search" aria-label={`${props.l.t('searchCustomers')} · ${heading}`} placeholder={props.l.t('searchCustomers')} value={query} onChange={event => {setQuery(event.target.value);setSelected('');}}/>
      </div>
      <div className="party-search-status"><span>{props.l.t('customerResults',{count:visible.length})}</span>
        {(active || query) && <button type="button" onClick={reset}><X size={13}/>{props.l.t('clearCustomerFilter')}</button>}
      </div>
      <div role="group" aria-label={heading}>
        {visible.map(party => <button type="button" key={party.id} aria-pressed={active?.id === party.id} onClick={() => setSelected(selected === party.id ? '' : party.id)} className="table-party-option">
          <span className="table-party-info"><span className="table-party-name-line"><strong>{party.name}</strong><span className="table-party-badges">{party.tier && <Badge variant={party.tier.startsWith('Super') ? 'super' : party.tier.startsWith('Partner') ? 'partner' : 'seller'}>{party.tier}</Badge>}{party.accountType && <Badge className={party.accountType === 'debit' ? 'party-account-debit' : 'party-account-prepaid'} variant={party.accountType === 'debit' ? 'red' : 'green'}>{props.l.t(party.accountType === 'debit' ? 'debitChip' : party.accountType)}</Badge>}</span></span><small>{party.subtitle}</small></span><b>{props.l.count(party.rowIds.length)}</b>
        </button>)}
        {!visible.length && <p>{props.l.t('empty')}</p>}
      </div>
    </Card>
    <div className="party-table-content">{active && <p className="scope-note">{props.l.t('customerFactoryScope',{name:active.name})}</p>}<DataTable key={selected + query} {...props} table={{...props.table,rows}} clear={() => {if (active || query) reset(); else props.clear();}}/></div>
  </div>;
}
