'use client';

import {useEffect,useState} from 'react';
import {ArrowDownToLine,BarChart3,Boxes,CalendarDays,Eye,LayoutDashboard,Menu,Package,PanelLeftClose,PanelLeftOpen,Truck,Warehouse,X} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Tooltip,XAxis,YAxis} from 'recharts';
import {WorkspaceSwitcher} from './workspaces';
import {base} from './routes';
import {asOf,dateRange,MockFinanceRepository,presets,type Preset} from './repository';
import {expressView} from './express-repository';
import {language} from './i18n';
import {Cell,DataTable,Segment,csvText,type Open} from './ui';
import {details,type Entity,type Locale} from './views';
import {Card} from '../components/ui/card';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Dialog} from '../components/ui/dialog';
import {ChartContainer,ChartTooltipContent} from '../components/ui/chart';

export function OperationsApp({workspace,page,query}: {workspace:'onosexpress'|'warehouse';page:string;query:string}) {
  const [repository] = useState(()=>new MockFinanceRepository());
  const [data] = useState(()=>repository.snapshot());
  const [collapsed,setCollapsed] = useState(false);
  const [menu,setMenu] = useState(false);
  const [detail,setDetail] = useState<{entity:Entity;id:string}|null>(null);
  const params = new URLSearchParams(query);
  const locale: Locale = params.get('lang') === 'vi' ? 'vi' : 'en';
  const l = language(locale);
  const express = workspace === 'onosexpress';
  const name = express ? 'OnosExpress' : 'Warehouse';
  const root = base + '/workspaces/' + workspace;
  const location = root + '/' + page + (query ? '?' + query : '');
  const preset = presets.includes(params.get('period') as Preset) ? params.get('period') as Preset : 'thisMonth';
  const range = dateRange(preset,params.get('from'),params.get('to'));
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
  const invalid = !valid(range.from) || !valid(range.to) || range.from > range.to || range.to > asOf;
  const view = expressView(data,{...range,carrier:params.get('carrier') ?? '',search:params.get('search') ?? '',status:params.get('status') ?? ''},locale);
  const links = express ? [{id:'overview',key:'expressOverview',Icon:LayoutDashboard},{id:'shipments',key:'expressShipments',Icon:Package},{id:'carriers',key:'expressCarriers',Icon:Truck}] : [{id:'overview',key:'warehouseOverview',Icon:Warehouse}];
  const title = l.t(links.find(link=>link.id===page)!.key);
  const href = (target: string,changes:Record<string,string>={}) => {
    const next = new URLSearchParams(query);
    for (const [key,value] of Object.entries(changes)) {if(value)next.set(key,value);else next.delete(key);}
    return root + '/' + target + (next.size ? '?' + next : '');
  };
  const update = (changes:Record<string,string>) => window.location.assign(href(page,changes));
  const clear = () => window.location.assign(root + '/' + page + '?lang=' + locale);
  const open: Open = (entity,id)=>setDetail({entity,id});
  const content = detail ? details(data,detail.entity,detail.id,invalid ? asOf : range.to) : null;
  const tableProps = {l,locale,data,open,clear};
  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  useEffect(()=>{
    if(!menu)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenu(false);};
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[menu]);
  const exportCsv = () => {
    const blob=new Blob([csvText(page==='carriers' ? [view.carrierTable] : [view.shipmentTable],data,locale,l)],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`onosexpress-${page}-${range.from}-${range.to}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  return <div className="app-shell" data-workspace={workspace} data-sidebar-collapsed={collapsed}>
    {menu && <button className="mobile-scrim" aria-label={l.t('close')} onClick={()=>setMenu(false)}/>}
    <aside id="operations-sidebar" className={'sidebar'+(menu?' mobile-open':'')}>
      <div className="brand"><span className="mark">{express?<Truck size={21}/>:<Warehouse size={21}/>}</span><div className="sidebar-label">{name}<small>{l.t(express?'shippingWorkspace':'warehouseWorkspace')}</small></div></div>
      <nav aria-label={name}><div className="nav-group"><h2 className="sidebar-label">{l.t(express?'shippingOperations':'warehouseOperations')}</h2>
        {links.map(({id,key,Icon})=><a key={id} href={href(id)} aria-current={page===id?'page':undefined} title={l.t(key)}><Icon size={18}/><span className="sidebar-label">{l.t(key)}</span></a>)}
      </div></nav>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">
        <Button size="icon" className="sidebar-toggle" aria-label={l.t(collapsed?'expandSidebar':'collapseSidebar')} aria-expanded={!collapsed} aria-controls="operations-sidebar" onClick={()=>setCollapsed(!collapsed)}>{collapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}</Button>
        <Button size="icon" className="menu-toggle" aria-label={l.t('menu')} aria-expanded={menu} aria-controls="operations-sidebar" onClick={()=>setMenu(!menu)}><Menu size={19}/></Button><strong>{title}</strong>
      </div><div className="top-right"><WorkspaceSwitcher active={workspace} locale={locale} location={location}/><span className="sample"><i/>{l.t('sample')}</span><Segment label={l.t('language')} value={locale} change={lang=>update({lang})} options={[{id:'en',label:'EN'},{id:'vi',label:'VI'}]}/></div></header>
      <main>
        <div className="page-heading"><div><h1>{title}</h1><p>{l.t(express?'expressBasis':'warehouseBasis')}</p></div>{express&&<Button onClick={exportCsv} disabled={invalid}><ArrowDownToLine size={16}/>{l.actions.exportCsv}</Button>}</div>
        {express ? <>
          <form className="filter-panel" method="get" action={root+'/'+page}>
            <input type="hidden" name="lang" value={locale}/>
            <div className="period-top"><span className="period-caption"><CalendarDays size={15}/>{l.t('dateRange')}</span>{valid(range.from)&&valid(range.to)&&<span>{l.date(range.from)} – {l.date(range.to)}</span>}</div>
            <div className="presets" role="group" aria-label={l.t('datePresets')}>{presets.map(key=><button type="button" key={key} aria-pressed={preset===key} onClick={()=>update({period:key,from:key==='customRange'?range.from:'',to:key==='customRange'?range.to:''})}>{l.dates[key]}</button>)}</div>
            <input type="hidden" name="period" value={preset}/>
            <div className="fields operations-filters">
              {preset==='customRange'&&<><label>{l.t('from')}<Input type="date" name="from" defaultValue={range.from} max={asOf}/></label><label>{l.t('to')}<Input type="date" name="to" defaultValue={range.to} max={asOf}/></label></>}
              <label>{l.t('carrier')}<select name="carrier" defaultValue={params.get('carrier')??''}><option value="">{l.t('allCarriers')}</option>{data.carriers.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
              <label>{l.t('status')}<select name="status" defaultValue={params.get('status')??''}><option value="">{l.filters.all}</option>{Array.from(new Set(data.shipments.map(row=>row.status))).map(status=><option key={status} value={status}>{l.status(status)}</option>)}</select></label>
              <label>{l.t('searchLabel')}<Input name="search" type="search" defaultValue={params.get('search')??''} placeholder={l.t('expressSearch')}/></label>
              <Button type="submit">{l.t('applyFilters')}</Button><Button type="button" onClick={clear}>{l.t('clearFilters')}</Button>
            </div>
          </form>
          {invalid ? <p role="alert" className="scope-note">{l.t('invalidDateRange')}</p> : <>
            <div className="metric-grid">{Object.entries(view.metrics).map(([key,value])=><div className="metric card" key={key}><span className="metric-top"><span className="metric-icon"><Truck size={17}/></span></span><span className="metric-label">{l.t(key)}</span><strong className={key==='shippingContribution' ? value<0?'negative':'positive' : undefined}>{key==='shipments'?l.count(value):l.cash(value)}</strong><small>{l.t(key==='shippingContribution'?'expressProfitBasis':'period')}</small></div>)}</div>
            {page==='overview'&&<Card className="express-chart"><div className="card-heading"><div><h2>{l.t('expressCarrierRevenue')}</h2><p>{l.t('expressCarrierHint')}</p></div><BarChart3 size={18}/></div>
              {view.shipments.length ? <ChartContainer loadingLabel={l.t('chartLoading')}><BarChart data={view.carrierTable.rows} accessibilityLayer margin={{top:24,right:12,bottom:8,left:0}}><CartesianGrid vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="carrier" tickLine={false} axisLine={false}/><YAxis width={55} tickFormatter={value=>l.compact(value/100)} tickLine={false} axisLine={false}/><Tooltip content={({active,payload,label})=>active?<ChartTooltipContent title={label}>{payload?.map(row=><span key={String(row.dataKey)}>{l.t(String(row.dataKey))}<b>{l.cash(Number(row.value))}</b></span>)}</ChartTooltipContent>:null}/><Bar dataKey="shippingRevenue" fill="var(--chart-1)" radius={[5,5,0,0]} isAnimationActive={false}/><Bar dataKey="shippingCosts" fill="var(--chart-2)" radius={[5,5,0,0]} isAnimationActive={false}/></BarChart></ChartContainer>:<p>{l.t('empty')}</p>}
              <div className="express-legend"><span><i/>{l.t('shippingRevenue')}</span><span><i/>{l.t('shippingCosts')}</span></div>
            </Card>}
            <DataTable table={page==='carriers'?view.carrierTable:view.shipmentTable} {...tableProps} rowActions={page==='carriers'?row=><Button size="sm" onClick={()=>window.location.assign(href('shipments',{carrier:String(row.id)}))}><Eye size={14}/>{l.t('expressViewShipments')}</Button>:undefined}/>
          </>}
        </> : <Card className="warehouse-placeholder"><Warehouse size={48}/><h2>{l.t('warehouseComingSoon')}</h2><p>{l.t('warehousePlaceholder')}</p><a className="text-link" href={base+'/overview?lang='+locale}><Boxes size={16}/>{l.t('backToFinance')}</a></Card>}
      </main>
    </div>
    {detail&&content&&<Dialog title={l.t('detailsFor',{id:detail.id})} onClose={()=>setDetail(null)} className="drawer"><div className="drawer-heading"><h2>{l.t('detailsFor',{id:detail.id})}</h2><Button size="icon" aria-label={l.t('close')} onClick={()=>setDetail(null)}><X size={18}/></Button></div><div className="drawer-content"><div className="facts"><dl>{Object.entries(content.fields).map(([key,value])=><div key={key}><dt>{l.t(key)}</dt><dd><Cell value={value} field={key} {...tableProps}/></dd></div>)}</dl></div>{content.tables.map(table=><DataTable key={table.title} table={table} {...tableProps}/>)}</div></Dialog>}
  </div>;
}
