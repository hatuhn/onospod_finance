'use client';

import {Component, useEffect, useState, useSyncExternalStore, type ReactNode} from 'react';
import {
  Activity, ArrowDownRight, ArrowDownToLine, ArrowDownUp, ArrowLeft, ArrowUpRight, Banknote, BarChart3, Boxes, CalendarDays, ChartNoAxesCombined,
  ChevronRight, CircleDollarSign, Eye, FileText, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, ReceiptText, RotateCcw, Search, Truck, Users, Wallet, X,
} from 'lucide-react';
import {base, navigation, pages, type Screen} from './routes';
import {asOf, byId, dateRange, distinct, MockFinanceRepository, presets, type Dataset, type FinanceRepository, type Filter, type Preset} from './repository';
import {currency, details, getView, precedingPeriod, userScope, type Entity, type Locale, type Metric, type Table} from './views';
import {language, type Language} from './i18n';
import {Cell, DataTable, csvText, display, referenceName, Segment, type Open} from './ui';
import {Trend} from './trend';
import {WorkspaceSwitcher} from './workspaces';
import {OverviewBreakdowns} from './overview-breakdowns';
import {OrderInvoiceList} from './order-invoices';
import {ProductionInvoices} from './production-invoices';
import {SkuDashboard} from './sku-dashboard';
import {PartyTable} from './party-table';
import {expenseCustomers} from './expense-customers';
import {Button} from '../components/ui/button';
import {Input, inputVariants} from '../components/ui/input';
import {Textarea} from '../components/ui/textarea';
import {Dialog} from '../components/ui/dialog';
import {Card} from '../components/ui/card';

const icons = {
  overview: LayoutDashboard, orders: ChartNoAxesCombined, 'order-invoices': FileText, customers: Users, balances: Banknote, wallet: Wallet,
  transactions: ArrowDownUp, reports: BarChart3, debit: CircleDollarSign, 'debt-orders': ReceiptText, invoices: FileText,
  payments: Banknote, 'production-sku': BarChart3, 'production-invoices': ReceiptText, 'production-expenses': ReceiptText, shipping: Truck,
};
const metricIcons = [CircleDollarSign, ReceiptText, Activity, Wallet, Banknote, ArrowDownRight, ArrowDownToLine, CalendarDays, Boxes];
const globalKeys = ['period', 'from', 'to', 'factory', 'user', 'tier', 'type', 'search', 'lang'];
const locationEvent = 'finance-location';
const subscribe = (fn: () => void) => {
  window.addEventListener('popstate', fn);
  window.addEventListener(locationEvent, fn);
  return () => {
    window.removeEventListener('popstate', fn);
    window.removeEventListener(locationEvent, fn);
  };
};
const readLocation = () => window.location.pathname + window.location.search;
const setLocation = (url: string, replace = false) => {
  if (url === readLocation()) return;
  if (replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.dispatchEvent(new Event(locationEvent));
};
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function FinanceApp({initialScreen, initialLocation}: {initialScreen: Screen; initialLocation: string}) {
  const snapshot = useSyncExternalStore(subscribe, readLocation, () => initialLocation);
  const [path, query] = snapshot.split('?');
  const id = path.slice(base.length + 1);
  const screen = Object.hasOwn(pages, id) ? id as Screen : initialScreen;
  const [repository] = useState<FinanceRepository>(() => new MockFinanceRepository());
  const [data, setData] = useState(() => repository.snapshot());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [role, setRole] = useState('finance_manager');
  const [notice, setNotice] = useState('');
  const params = new URLSearchParams(query);
  const locale: Locale = params.get('lang') === 'vi' ? 'vi' : 'en';
  const l = language(locale);
  const title = l.navigation[pages[screen]];
  const preset = presets.includes(params.get('period') as Preset) ? params.get('period') as Preset : 'thisMonth';
  const dates = dateRange(preset, params.get('from'), params.get('to'));
  const invalid = !validDate(dates.from) || !validDate(dates.to) || dates.from > dates.to || dates.to > asOf;
  const narrowedFactory = !['transactions'].includes(screen);
  const queryValue = (key: string) => params.get(key) ?? '';
  const filter: Filter = {
    ...dates, factory: narrowedFactory ? queryValue('factory') : '', user: queryValue('user'), tier: queryValue('tier'),
    type: screen === 'debit' || screen === 'debt-orders' ? 'debit' : queryValue('type'), search: queryValue('search'),
    invoice: screen === 'orders' || screen === 'debt-orders' ? queryValue('invoice') : '',
    presence: screen === 'orders' ? queryValue('presence') : '',
    status: ['wallet', 'invoices', 'order-invoices', 'payments'].includes(screen) ? queryValue('status') : '',
  };
  const tab = queryValue('tab');
  const mode = queryValue('trend') === 'sku' ? 'sku' : 'revenue';
  const actor = data.users.find(user => user.role === 'finance_manager')!;
  const tabKey = (key: string) => screen + '.' + key;
  const localQuery = (key: string) => queryValue(tabKey(key));

  useEffect(() => {document.documentElement.lang = locale;}, [locale]);
  useEffect(() => {
    if (!mobileMenu) return;
    const trigger = document.querySelector<HTMLButtonElement>('.menu-toggle');
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileMenu(false);
      trigger?.focus();
    };
    document.querySelector<HTMLAnchorElement>('.sidebar a[aria-current="page"]')?.focus();
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [mobileMenu]);

  const urlFor = (target: Screen) => {
    const next = new URLSearchParams();
    for (const [key, value] of params.entries()) {
      if (globalKeys.includes(key) || key.includes('.')) next.set(key, value);
    }
    for (const key of ['tab', 'status', 'invoice', 'presence', 'trend']) {
      const value = queryValue(key);
      if (value) next.set(tabKey(key), value);
      const remembered = next.get(target + '.' + key);
      if (remembered) next.set(key, remembered);
    }
    if (userScope(screen) !== userScope(target)) {
      if (filter.user) next.set('user.' + userScope(screen), filter.user);
      const user = next.get('user.' + userScope(target));
      if (user) next.set('user', user);
      else next.delete('user');
    }
    return base + '/' + target + (next.size ? '?' + next : '');
  };

  const update = (changes: Record<string, string>, replace = false) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
      if (['tab', 'status', 'invoice', 'presence', 'trend'].includes(key)) {
        if (value) next.set(tabKey(key), value);
        else next.delete(tabKey(key));
      }
      if (key === 'user') {
        if (value) next.set('user.' + userScope(screen), value);
        else next.delete('user.' + userScope(screen));
      }
    }
    setLocation(path + (next.size ? '?' + next : ''), replace);
  };

  const clear = () => setLocation(path + (params.has('lang') ? '?lang=' + locale : ''));
  const navigate = (target: Screen) => {
    setLocation(urlFor(target));
    setMobileMenu(false);
    window.scrollTo(0, 0);
  };
  const detail = queryValue('detail');
  const [detailHistory, setDetailHistory] = useState<{entity: Entity; id: string}[]>([]);
  const [entity, recordId] = detail.split(':') as [Entity, string];
  const detailOpen = !!recordId && (Object.hasOwn(data, entity) || entity === 'production-invoices') && !!details(data, entity, recordId, filter.to, filter);
  const open: Open = (target, targetId) => {
    if (detailOpen && (target !== entity || targetId !== recordId)) setDetailHistory(history => [...history, {entity, id: recordId}]);
    else if (!detailOpen) setDetailHistory([]);
    update({detail: target + ':' + targetId});
  };
  const close = () => { setDetailHistory([]); update({detail: ''}); };
  const back = () => {
    const previous = detailHistory.at(-1);
    if (previous) {
      setDetailHistory(history => history.slice(0, -1));
      update({detail: previous.entity + ':' + previous.id}, true);
    }
  };
  const announce = (key: string) => setNotice(key);
  const reset = () => {repository.reset(); setData(repository.snapshot()); close(); announce('demoReset');};
  const statusChoices = ['invoices', 'order-invoices'].includes(screen) ? ['draft', 'paid', 'partially_paid', 'unpaid', 'overdue'] : ['pending', 'approved', 'rejected'];
  const userOptions = data.users.filter(user => userScope(screen) === 'manager' ? user.role === 'account_manager' : userScope(screen) === 'production' ? user.role === 'production' : user.role.startsWith('finance'));
  const options = (ids: string[], key: string) => ids.map(id => ({id, label: key === 'status' ? l.status(id) : l.t(id)}));
  const invoiceTool = screen === 'orders' || screen === 'debt-orders';

  return <div className="app-shell" data-workspace="onospod" data-sidebar-collapsed={sidebarCollapsed}>
    {mobileMenu && <button className="mobile-scrim" aria-label={l.t('close')} onClick={() => setMobileMenu(false)}/>}
    <aside id="finance-sidebar" className={'sidebar' + (mobileMenu ? ' mobile-open' : '')}>
      <div className="brand"><span className="mark">O</span><div className="sidebar-label">Onospod <small>{l.t('workspace')}</small></div></div>
      <nav aria-label={l.t('workspace')}>
        {Object.entries(navigation).map(([group, links]) => <div className="nav-group" key={group}><h2 className="sidebar-label">{l.navigation[group as keyof typeof navigation]}</h2>
          {Object.entries(links).map(([key, label]) => {
            const target = key as Screen;
            const Icon = icons[target];
            return <a key={target} href={urlFor(target)} title={sidebarCollapsed ? l.navigation[label] : undefined} aria-current={target === screen ? 'page' : undefined} onClick={event => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
              event.preventDefault(); navigate(target);
            }}><Icon size={18} strokeWidth={1.75}/><span className="sidebar-label">{l.navigation[label]}</span></a>;
          })}
        </div>)}
      </nav>
      <div className="sidebar-bottom"><Button title={sidebarCollapsed ? l.t('resetDemo') : undefined} onClick={reset}><RotateCcw size={15}/><span className="sidebar-label">{l.t('resetDemo')}</span></Button></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">
        <Button size="icon" className="sidebar-toggle" aria-label={l.t(sidebarCollapsed ? 'expandSidebar' : 'collapseSidebar')} aria-controls="finance-sidebar" aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed(collapsed => !collapsed)}>
          {sidebarCollapsed ? <PanelLeftOpen size={19}/> : <PanelLeftClose size={19}/>}
        </Button>
        <Button size="icon" className="menu-toggle" aria-label={l.t('menu')} aria-controls="finance-sidebar" aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}><Menu size={19}/></Button>
        <span>ONOSPOD</span><ChevronRight size={13}/><strong>{title}</strong>
      </div><div className="top-right">
        <WorkspaceSwitcher active="onospod" locale={locale} location={snapshot}/><span className="sample"><i/>{l.t('sample')}</span>
        <Segment label={l.t('language')} value={locale} change={lang => update({lang})} options={[{id: 'en', label: 'EN'}, {id: 'vi', label: 'VI'}]}/>
      </div></header>
      <main className={screen === 'order-invoices' ? 'order-invoices-page' : screen === 'overview' || screen === 'reports' || screen === 'production-sku' ? 'report-page' : undefined}>
        <Boundary key={screen} l={l}>
          <div className="page-heading">
            <div><h1>{title}</h1><p>{l.t(getView(data, screen, filter, tab, locale).basis, {date: l.date(dates.to)})}</p></div>
            {screen !== 'order-invoices' && <Button className="export" disabled={invalid} onClick={() => {
              const {tables} = getView(data, screen, filter, tab, locale);
              const blob = new Blob([csvText(tables, data, locale, l)], {type: 'text/csv;charset=utf-8'});
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = [screen, filter.from, filter.to, filter.factory, filter.user, filter.tier].filter(Boolean).join('_') + '.csv';
              link.click();
              window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}><ArrowDownToLine size={16}/>{l.actions.exportCsv}</Button>}
          </div>

          <section className="filter-panel" aria-label={l.t('dateRange')}>
            <div className="period-top"><span className="period-caption"><CalendarDays size={15}/>{l.t('dateRange')}</span><span>{l.date(dates.from)} – {l.date(dates.to)}</span></div>
            <div className="presets" role="group" aria-label={l.t('datePresets')} tabIndex={0}>
              {presets.map(key => <button key={key} aria-pressed={preset === key} onClick={() => update(key === 'customRange' ? {period: key, from: dates.from, to: dates.to} : {period: key, from: '', to: ''})}>{l.dates[key]}</button>)}
            </div>
            {preset === 'customRange' && <div className="fields custom-dates">
              <label>{l.t('from')}<Input size="sm" aria-invalid={invalid || undefined} type="date" value={dates.from} max={asOf} onChange={event => update({from: event.target.value})}/></label>
              <label>{l.t('to')}<Input size="sm" aria-invalid={invalid || undefined} type="date" value={dates.to} max={asOf} onChange={event => update({to: event.target.value})}/></label>
            </div>}
            <div className="fields">
              <Select label={l.t('factory')} all={l.filters.allFactories} value={queryValue('factory')} disabled={!narrowedFactory} hint={!narrowedFactory ? l.t('factoryUnavailable') : undefined} change={value => update({factory: value})} options={data.factories.map(row => ({id: row.id, label: locale === 'vi' ? row.name_vi : row.name_en}))}/>
              <Select label={l.t(userScope(screen) === 'production' ? 'productionUser' : userScope(screen) === 'manager' ? 'manager' : 'actor')} all={l.filters.allUsers} value={filter.user} change={value => update({user: value})} options={userOptions.map(row => ({id: row.id, label: row.name}))}/>
              <Select label={l.t('tier')} all={l.filters.allVipLevels} value={filter.tier} change={value => update({tier: value})} options={distinct(data.customers.map(row => row.tier)).map(id => ({id, label: id}))}/>
              <Select label={l.t('type')} all={l.filters.allAccountTypes} value={filter.type} disabled={screen === 'debit' || screen === 'debt-orders'} change={value => update({type: value})} options={[{id: 'prepaid', label: l.t('prepaid')}, {id: 'debit', label: l.t('debitType')}]}/>
              <label className="search"><span>{l.t('searchLabel')}</span><div><Search size={16}/><Input size="sm" type="search" placeholder={l.filters.search} value={filter.search} onChange={event => update({search: event.target.value}, true)}/></div></label>
              {(params.has('period') || filter.factory || filter.user || filter.tier || queryValue('type') || filter.search || filter.invoice || filter.presence || filter.status) && <Button size="sm" onClick={clear}>{l.t('clear')}</Button>}
            </div>
            {invalid && <p role="alert" className="negative">{l.t('dateError')}</p>}
          </section>

          {screen === 'orders' && <div className="section-tools"><Segment label={title} value={tab || 'orders'} change={value => update({tab: value})} options={[{id: 'orders', label: l.t('ordersCreated')}, {id: 'refunds', label: l.t('refundsPeriod')}]}/></div>}
          {invoiceTool && <div className="section-tools filters-extra">
            <label>{l.filters.invoiceId}<Input size="sm" type="search" placeholder="INV-2026…" value={filter.invoice} onChange={e => update({invoice: e.target.value}, true)}/></label>
            {screen === 'orders' && <Segment label={l.filters.invoiceId} value={filter.presence || 'all'} change={value => update({presence: value === 'all' ? '' : value})} options={[{id: 'all', label: l.filters.all}, {id: 'has', label: l.filters.hasInvoice}, {id: 'none', label: l.filters.noInvoice}]}/>}
          </div>}
          {['wallet', 'invoices', 'order-invoices', 'payments'].includes(screen) && <div className="section-tools">
            <Segment label={l.t('status')} value={filter.status || 'all'} change={value => update({status: value === 'all' ? '' : value})} options={[{id: 'all', label: l.filters.all}, ...options(statusChoices, 'status')]}/>
            {screen === 'wallet' && <Select label={l.t('role')} value={role} change={setRole} options={options(['finance_manager', 'viewer'], 'role')}/>}
          </div>}
          {!invalid && <ViewContent data={data} screen={screen} filter={filter} tab={tab || localQuery('tab')} locale={locale} l={l} mode={mode} open={open} clear={clear} navigate={navigate} changeTab={value => update({tab:value})} trend={value => update({trend: value})}/>}
        </Boundary>
      </main>
      <footer>{l.t('miscFoot', {date: l.date(asOf)})}</footer>
    </div>
    {notice && <div role="status" className="toast"><span>{l.t(notice)}</span><Button size="icon" aria-label={l.t('close')} onClick={() => setNotice('')}><X size={15}/></Button></div>}
    {detailOpen && <DetailDrawer key={entity + ':' + recordId} entity={entity} id={recordId} to={invalid ? asOf : filter.to} filter={filter} data={data} locale={locale} l={l} open={open} close={close} back={detailHistory.length ? back : undefined} actor={actor} canEdit={role === 'finance_manager'} review={(decision, reason) => {
      const ok = repository.reviewTopup({id: recordId, actor: actor.id, decision, reason});
      if (ok) setData(repository.snapshot());
      announce(ok ? 'reviewSuccess' : 'reviewError');
      return ok;
    }} override={(cents, reason) => {
      const ok = repository.overrideCost(recordId, cents, actor.id, reason);
      if (ok) {setData(repository.snapshot()); announce('costSaved');}
      return ok;
    }}/>}
  </div>;
}

function Select({label, all, value, options, change, disabled, hint}: {label: string; all?: string; value: string; options: {id: string; label: string}[]; change: (value: string) => void; disabled?: boolean; hint?: string}) {
  return <label title={hint}>{label}<select data-slot="select" className={inputVariants({size: 'sm'})} value={value} disabled={disabled} onChange={event => change(event.target.value)}>{all && <option value="">{all}</option>}{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select>{hint && <small>{hint}</small>}</label>;
}

function ViewContent({data, filter, screen, tab, locale, l, mode, open, clear, navigate, trend, changeTab}: {data: Dataset; filter: Filter; screen: Screen; tab: string; locale: Locale; l: Language; mode: 'revenue' | 'sku'; open: Open; clear: () => void; navigate: (target: Screen) => void; trend: (mode: string) => void; changeTab: (tab: string) => void}) {
  const view = getView(data, screen, filter, tab, locale);
  const prior = precedingPeriod(data, filter);
  const previousMetrics = prior ? getView(data, screen, prior, tab, locale).metrics : [];
  const previousByKey = new Map(previousMetrics.map(metric => [metric.key, metric.value]));
  const tableProps = {l, locale, data, open, clear};
  const renderTable = (table: Table) => {
    if (screen !== 'production-expenses') return <DataTable key={table.title + JSON.stringify(filter)} table={table} {...tableProps} rowActions={screen === 'orders' && table.title === 'orders' ? row => {
      const id = row.id;
      return id && typeof id === 'object' ? <Button size="sm" className="order-view-action" onClick={() => open('orders',id.ids[0])}><Eye size={14}/>{l.t('viewOrder')}</Button> : null;
    } : undefined}/>;
    const debit = table.title === 'payables';
    const parties = expenseCustomers(data,table).filter(party => party.accountType === (debit ? 'debit' : 'prepaid'));
    const matchingIds = new Set(parties.flatMap(party => party.rowIds));
    const rows = table.rows.filter(row => row.id !== null && typeof row.id === 'object' && row.id.ids.some(id => matchingIds.has(id)));
    return <PartyTable key={table.title + JSON.stringify(filter)} table={{...table,rows}} {...tableProps} parties={parties} heading={l.t(debit ? 'debitCustomerList' : 'prepaidCustomerList')}/>;
  };
  const card = (item: Metric, index: number) => {
    const Icon = metricIcons[index % metricIcons.length];
    const amount = display(item.value, item.key, l);
    const previous = previousByKey.get(item.key);
    const delta = previous === undefined ? null : item.value - previous;
    const ratio = delta === 0 ? 0 : previous && delta !== null ? delta / Math.abs(previous) : null;
    const lowerIsBetter = /cost|expense|outstanding|cancelled|overdue|debtBalance/i.test(item.key);
    const tone = !delta ? '' : (delta < 0) === lowerIsBetter ? 'good' : 'bad';
    const period = prior && previous !== undefined
      ? l.t('priorRange', {from: l.date(prior.from), to: l.date(prior.to)})
      : l.t('priorUnavailable');
    const content = <>
      <span className="metric-top"><span className="metric-icon"><Icon size={17}/></span>{item.target && <ArrowUpRight className="metric-arrow" size={15}/>}</span>
      <span className="metric-label">{l.t(screen === 'overview' && item.key === 'revenue' ? 'orderRevenue' : item.key)}</span>
      <strong className={item.value < 0 ? 'negative' : ['profit', 'positiveWallet', 'productionContribution'].includes(item.key) && item.value > 0 ? 'positive' : ''}>{amount.replace(/\u00a0/g, ' ')}</strong>
      <small>{l.t(item.basis ?? 'period', {date: l.date(filter.to)})}</small>
      <span className="metric-change">
        {ratio !== null && <span className={'metric-delta ' + tone}>{delta !== null && delta !== 0 && (delta > 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>)}{l.signedPercent(ratio)}</span>}
        <span title={previous === undefined ? undefined : display(previous, item.key, l)}>{period}</span>
        {previous === 0 && delta !== 0 && <span>{l.t('priorZero')}</span>}
      </span>
    </>;
    return item.target ? <button className="metric card" key={item.key} onClick={() => navigate(item.target!)}>{content}</button> : <div className="metric card" key={item.key}>{content}</div>;
  };
  return <>
    {screen === 'order-invoices' ? <OrderInvoiceList data={data} view={view} locale={locale} l={l} open={open} clear={clear}/> : <>
    <div className="metric-grid">{view.metrics.slice(0, 4).map(card)}</div>
    {view.metrics.length > 4 && <details className="more-metrics">
      <summary>{l.t('moreMetrics')} ({view.metrics.length - 4})</summary>
      <div className="metric-grid">{view.metrics.slice(4).map(card)}</div>
    </details>}
    {['production-expenses', 'factories', 'reports'].includes(screen) && <p className="scope-note">{l.t('payoutScope')}</p>}
    {screen === 'overview' ? <>
      <Trend data={data} filter={filter} locale={locale} l={l} mode={mode} change={trend} clear={clear}/>
      <OverviewBreakdowns view={view} l={l} open={open} clear={clear}/>
    </> : <>
      {screen === 'production-sku' && <SkuDashboard view={view} l={l} mode={tab === 'revenue' ? 'revenue' : 'units'} change={changeTab} clear={clear}/>}
      {screen === 'production-invoices' ? <ProductionInvoices view={view} {...tableProps}/> : view.tables.map(renderTable)}
    </>}
    </>}
  </>;
}

function DetailDrawer({entity, id, to, filter, data, locale, l, open, close, back, canEdit, actor, review, override}: {
  entity: Entity; id: string; to: string; filter: Filter; data: Dataset; locale: Locale; l: Language; open: Open; close: () => void; back?: () => void;
  canEdit: boolean; actor: {id: string; name: string}; review: (decision: 'approved' | 'rejected', reason: string) => boolean; override: (cents: number, reason: string) => boolean;
}) {
  const [action, setAction] = useState<'approved' | 'rejected' | 'cost' | null>(null);
  const [formError, setFormError] = useState(false);
  const content = details(data, entity, id, to, filter)!;
  const pending = entity === 'topups' && content.fields.status === 'pending';
  const item = entity === 'items' ? byId(data.items, id) : undefined;
  const heading = referenceName(data, locale, entity, id);
  const closeForm = () => {setAction(null); setFormError(false);};
  const actionLabel = action === 'cost' ? 'costOverride' : action === 'approved' ? 'approveTopup' : 'rejectTopup';
  return <Dialog title={l.t('detailsFor', {id})} onClose={close} className="drawer">
    <div className="drawer-heading">
      <div><span className="sample"><i/>{l.t('sample')}</span><h2>{heading}</h2>{heading !== id && <p>{id}</p>}</div>
      <div className="controls">{back && <Button size="icon" aria-label={l.t('back')} onClick={back}><ArrowLeft size={17}/></Button>}<Button size="icon" aria-label={l.t('close')} onClick={close}><X size={20}/></Button></div>
    </div>
    <div className="drawer-content">
      {(entity === 'invoices' || entity === 'production-invoices') && <div className="section-tools"><Button onClick={() => window.print()}>{l.t('statement')}</Button></div>}
      <Card className="facts"><dl>{Object.entries(content.fields).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => <div key={key}><dt>{l.t(key)}</dt><dd><Cell value={value} field={key} data={data} locale={locale} l={l} open={open}/></dd></div>)}</dl></Card>
      {entity === 'topups' && <Card className="facts"><h3>{l.t('proof')}</h3><p>{l.t('proofPlaceholder')}</p></Card>}
      {content.tables.map(table => <Card className="facts" key={table.title}><h3>{l.t(table.title)}</h3>
        <div className="table-scroll" tabIndex={0} role="region" aria-label={l.t(table.title)}><table>
          <thead><tr>{table.columns.map(column => <th key={column} scope="col" className={currency.has(column) ? 'numeric' : ''}>{l.t(column)}</th>)}</tr></thead>
          <tbody>{table.rows.map((row, index) => <tr key={index}>{table.columns.map(column => <td key={column} className={currency.has(column) ? 'numeric' : ''}><Cell value={row[column] ?? null} field={column} data={data} locale={locale} l={l} open={open}/></td>)}</tr>)}</tbody>
        </table></div>
      </Card>)}
      {content.links.map(link => <Card className="facts" key={link.title}><h3>{l.t(link.title)}</h3><Cell value={link.value} field={link.title} data={data} locale={locale} l={l} open={open}/></Card>)}
      {(content.fields.approvedBy || item?.override) && <Card className="facts"><h3>{l.t('audit')}</h3>
        {content.fields.approvedBy && <p>{String(content.fields.approvedBy)} · {display(content.fields.approvedAt, 'approvedAt', l)} · {display(content.fields.status, 'status', l)}</p>}
        {item?.override && <p>{byId(data.users, item.override.actor)?.name} · {l.date(item.override.at)} · {l.t('originalCost')} {l.cash(item.override.original)} · {item.override.reason}</p>}
      </Card>}
      {(pending || item) && <div className="drawer-actions">
        {pending && <><Button variant="default" disabled={!canEdit} onClick={() => setAction('approved')}>{l.t('approveTopup')}</Button><Button variant="destructive" disabled={!canEdit} onClick={() => setAction('rejected')}>{l.t('rejectTopup')}</Button></>}
        {item && <Button disabled={!canEdit} onClick={() => setAction('cost')}>{l.t('costOverride')}</Button>}
        {!canEdit && <small>{l.t('viewer')}</small>}
      </div>}
    </div>
    {action && <Dialog title={l.t(actionLabel)} onClose={closeForm} className="confirm">
      <form onSubmit={event => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const reason = String(values.get('reason') ?? '').trim();
        const amount = String(values.get('cost') ?? '');
        const [whole, fraction = ''] = amount.split('.');
        const cents = /^\d+(\.\d{1,2})?$/.test(amount) ? Number(whole) * 100 + Number(fraction.padEnd(2, '0')) : NaN;
        const ok = action === 'cost' ? override(cents, reason) : review(action, reason);
        if (ok) closeForm();
        else setFormError(true);
      }}>
        <h2>{l.t(actionLabel)}</h2><p>{id}{entity === 'topups' && ' · ' + l.cash(Number(content.fields.amount))}</p><p>{l.t('actingAs')} <strong>{actor.name}</strong></p>
        {action === 'cost' && <label>{l.t('newCost')}<Input aria-invalid={formError || undefined} name="cost" inputMode="decimal" defaultValue={((item?.production_cost_cents ?? 0) / 100).toFixed(2)} required/></label>}
        <label>{l.actions.reason}<Textarea aria-invalid={formError || undefined} name="reason" maxLength={250} required={action !== 'approved'}/></label>
        {formError && <p role="alert" className="negative">{l.t(action === 'cost' ? 'costError' : 'reviewError')}</p>}
        <div className="controls"><Button onClick={closeForm}>{l.actions.cancel}</Button><Button variant={action === 'rejected' ? 'destructive' : 'default'} type="submit">{l.actions.confirm}</Button></div>
      </form>
    </Dialog>}
  </Dialog>;
}

class Boundary extends Component<{l: Language; children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}
  render() {
    if (!this.state.failed) return this.props.children;
    return <div className="card empty" role="alert"><p>{this.props.l.t('error')}</p><Button onClick={() => this.setState({failed: false})}>{this.props.l.t('retry')}</Button></div>;
  }
}
