'use client';

import {useState,useSyncExternalStore,type FormEvent} from 'react';
import {ArrowDownToLine,ArrowDownUp,Eye,FileText,LayoutDashboard,Pencil,Plus,RotateCcw,Users,X} from 'lucide-react';
import {Area,AreaChart,CartesianGrid,Tooltip,XAxis,YAxis} from 'recharts';
import {PartnershipShell} from './workspace-shell';
import {base} from './routes';
import {useBrowserQuery} from './browser-query';
import {asOf,dateRange} from './repository';
import {MockPartnershipRepository,centsFromInput,partnershipView,partnerLevels,partnerResources,partnerCategories,type PartnershipData,type PartnerCustomer,type PartnerContract,type PartnerTransaction} from './partnership-repository';
import {language,type Language} from './i18n';
import {DataTable,csvText} from './ui';
import {seed} from './repository';
import type {Locale,Table} from './views';
import {Card} from '../components/ui/card';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Textarea} from '../components/ui/textarea';
import {Badge} from '../components/ui/badge';
import {Dialog} from '../components/ui/dialog';
import {ChartContainer,ChartTooltipContent} from '../components/ui/chart';

type Editor = {kind:'customer'|'contract'|'transaction';id?:string};
const root=base+'/workspaces/partnership';
const resourceKey=(resource:string)=>'partnerResource'+resource[0].toUpperCase()+resource.slice(1);
const dateValid=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;

export function PartnershipApp({page,query:initialQuery}:{page:string;query:string}) {
  const [repo]=useState(()=>new MockPartnershipRepository());
  const data=useSyncExternalStore(repo.subscribe,repo.snapshot,repo.serverSnapshot);
  const [editor,setEditor]=useState<Editor|null>(null);
  const [detail,setDetail]=useState<Editor|null>(null);
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [reset,setReset]=useState(false);
  const query=useBrowserQuery(initialQuery);
  const params=new URLSearchParams(query);const locale:Locale=params.get('lang')==='vi'?'vi':'en';const l=language(locale);
  const range={from:params.get('from')??dateRange('thisMonth').from,to:params.get('to')??asOf};
  const invalid=!dateValid(range.from)||!dateValid(range.to)||range.from>range.to||range.to>asOf;
  const view=partnershipView(data,{...range,customer:params.get('customer')??'',search:params.get('search')??'',level:params.get('level')??''});
  const customerName=(id:string)=>data.customers.find(row=>row.id===id)?.custom_sku??id;
  const links=[{id:'overview',key:'partnerOverview',Icon:LayoutDashboard},{id:'customers',key:'partnerCustomers',Icon:Users},{id:'contracts',key:'partnerContracts',Icon:FileText},{id:'cashflow',key:'partnerCashflow',Icon:ArrowDownUp}];
  const title=l.t(links.find(row=>row.id===page)!.key);
  const href=(target:string,changes:Record<string,string>={})=>{const next=new URLSearchParams(query);for(const [key,value] of Object.entries(changes)){if(value)next.set(key,value);else next.delete(key);}return root+'/'+target+(next.size?'?'+next:'');};
  const location=href(page);const clear=()=>window.location.assign(root+'/'+page+'?lang='+locale);
  const create=(kind:Editor['kind'],id?:string)=>{setError('');setEditor({kind,id});setDetail(null);};
  const totals=(id:string)=>{const rows=view.transactions.filter(row=>row.customer_id===id);const cashIn=rows.filter(row=>row.direction==='income').reduce((sum,row)=>sum+row.amount_cents,0);const cashOut=rows.filter(row=>row.direction==='expense').reduce((sum,row)=>sum+row.amount_cents,0);return {cashIn,cashOut,netCash:cashIn-cashOut};};
  const customerTable:Table={title:'partnerCustomers',columns:['customSku','customer','partnerLevel','email','company','contractCount','resources','cashIn','cashOut','netCash'],rows:view.customers.map(row=>({id:row.id,customSku:row.custom_sku,customer:row.name,partnerLevel:row.level,email:row.email,company:row.company,contractCount:data.contracts.filter(contract=>contract.customer_id===row.id).length,resources:Array.from(new Set(data.contracts.filter(contract=>contract.customer_id===row.id).flatMap(contract=>contract.resources))).map(resource=>l.t(resourceKey(resource))).join(' · '),...totals(row.id)}))};
  const contractTable:Table={title:'partnerContracts',columns:['id','partnerTitle','customer','resources','startDate','endDate','monthlyFee','status','recordedBy','updatedAt'],rows:view.contracts.map(row=>({id:row.id,partnerTitle:row.title,customer:customerName(row.customer_id),resources:row.resources.map(resource=>l.t(resourceKey(resource))).join(' · '),startDate:row.start_date,endDate:row.end_date,monthlyFee:row.monthly_fee_cents,status:row.status,recordedBy:row.actor,updatedAt:row.updated_at}))};
  const cashTable:Table={title:'partnerCashflow',columns:['id','date','customer','contract','direction','category','amount','bankReference','recordedBy','createdAt'],rows:[...view.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.created_at.localeCompare(a.created_at)).map(row=>({id:row.id,date:row.date,customer:customerName(row.customer_id),contract:row.contract_id,direction:l.t('partner'+(row.direction==='income'?'Income':'Expense')),category:l.t(resourceKey(row.category)),amount:row.amount_cents,bankReference:row.reference,recordedBy:row.actor,createdAt:row.created_at}))};
  const table=page==='contracts'?contractTable:page==='cashflow'?cashTable:customerTable;
  const kind:Editor['kind']=page==='contracts'?'contract':page==='cashflow'?'transaction':'customer';
  const detailRecord=detail?.kind==='customer'?data.customers.find(row=>row.id===detail.id):detail?.kind==='contract'?data.contracts.find(row=>row.id===detail.id):detail?data.transactions.find(row=>row.id===detail.id):null;
  const save=(form:FormData)=>{
    if(!editor)return false;
    const text=(key:string)=>String(form.get(key)??'').trim();
    try {
      if(editor.kind==='customer')repo.saveCustomer({custom_sku:text('custom_sku').toUpperCase(),name:text('name'),level:text('level'),email:text('email'),phone:text('phone'),company:text('company'),notes:text('notes')},editor.id);
      if(editor.kind==='contract'){
        const fee=centsFromInput(text('monthly_fee'));if(fee===null)throw new Error('partnerInvalidAmount');
        repo.saveContract({customer_id:text('customer_id'),title:text('title'),start_date:text('start_date'),end_date:text('end_date'),resources:form.getAll('resources').map(String),monthly_fee_cents:fee,status:text('status'),terms:text('terms')},editor.id);
      }
      if(editor.kind==='transaction'){
        const cents=centsFromInput(text('amount'));if(cents===null||cents<=0)throw new Error('partnerInvalidAmount');
        repo.addTransaction({customer_id:text('customer_id'),contract_id:text('contract_id'),date:text('date'),direction:text('direction'),category:text('category'),amount_cents:cents,reference:text('reference'),notes:text('notes')});
      }
      setEditor(null);setNotice('partnerSaved');return true;
    }catch(error){const code=error instanceof Error&&error.message.startsWith('partner')?error.message:'partnerSaveFailed';setError(code);return false;}
  };
  const exportCsv=()=>{const blob=new Blob([csvText([table],seed,locale,l)],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`partnership-${page}-${range.from}-${range.to}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return <PartnershipShell title={title} page={page} locale={locale} location={location} l={l} links={links.map(row=>({...row,label:l.t(row.key),href:href(row.id)}))} changeLanguage={lang=>window.location.assign(href(page,{lang}))}>
    <div className="page-heading"><div><h1>{title}</h1><p>{l.t('partnerBasis')}</p></div><div className="controls"><Button onClick={exportCsv} disabled={invalid}><ArrowDownToLine size={16}/>{l.actions.exportCsv}</Button><Button variant="default" className="partner-primary" onClick={()=>create(kind)}><Plus size={16}/>{l.t(kind==='customer'?'partnerAddCustomer':kind==='contract'?'partnerAddContract':'partnerAddTransaction')}</Button></div></div>
    <p className="scope-note">{l.t('partnerDemoStorage')}</p>
    {notice&&<div className="partner-notice" role="status">{l.t(notice)}<button type="button" aria-label={l.t('close')} onClick={()=>setNotice('')}><X size={16}/></button></div>}
    <form className="filter-panel partner-filters" action={root+'/'+page} method="get"><input type="hidden" name="lang" value={locale}/><label>{l.t('from')}<Input type="date" name="from" defaultValue={range.from} max={asOf}/></label><label>{l.t('to')}<Input type="date" name="to" defaultValue={range.to} max={asOf}/></label><label>{l.t('customer')}<select name="customer" defaultValue={params.get('customer')??''}><option value="">{l.t('allCustomers')}</option>{data.customers.map(row=><option key={row.id} value={row.id}>{row.custom_sku} · {row.name}</option>)}</select></label><label>{l.t('partnerLevel')}<select name="level" defaultValue={params.get('level')??''}><option value="">{l.t('partnerAllLevels')}</option>{partnerLevels.map(level=><option key={level} value={level}>{l.t('partnerLevel'+level)}</option>)}</select></label><label>{l.t('searchLabel')}<Input type="search" name="search" defaultValue={params.get('search')??''} placeholder={l.t('partnerSearch')}/></label><Button type="submit">{l.t('applyFilters')}</Button><Button type="button" onClick={clear}>{l.t('clear')}</Button></form>
    {invalid?<p role="alert">{l.t('invalidDateRange')}</p>:<>
      <div className="metric-grid">{Object.entries(view.metrics).map(([key,value])=><div className="metric card" key={key}><span className="metric-label">{l.t(key)}</span><strong className={key==='netCash'?value<0?'negative':'positive':undefined}>{key==='activeContracts'?l.count(value):l.cash(value)}</strong><small>{l.t('partnerPeriodBasis')}</small></div>)}</div>
      {page==='overview'&&<Card className="express-chart"><div className="card-heading"><div><h2>{l.t('partnerCashTrend')}</h2><p>{l.t('partnerCashTrendHint')}</p></div></div>{view.daily.length?<ChartContainer loadingLabel={l.t('chartLoading')}><AreaChart data={view.daily} accessibilityLayer margin={{top:20,right:8,bottom:8,left:0}}><CartesianGrid vertical={false} stroke="var(--chart-grid)"/><XAxis dataKey="date" tickFormatter={l.shortDate} tickLine={false} axisLine={false}/><YAxis width={60} tickFormatter={value=>l.compact(value/100)} axisLine={false} tickLine={false}/><Tooltip content={({active,payload,label})=>active?<ChartTooltipContent title={l.date(String(label))}>{payload?.map(row=><span key={String(row.dataKey)}>{l.t(String(row.dataKey))}<b>{l.cash(Number(row.value))}</b></span>)}</ChartTooltipContent>:null}/><Area type="monotone" dataKey="cashIn" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={.1} isAnimationActive={false}/><Area type="monotone" dataKey="cashOut" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={.08} isAnimationActive={false}/></AreaChart></ChartContainer>:<p>{l.t('empty')}</p>}<div className="partner-chart-legend"><span>{l.t('cashIn')}</span><span>{l.t('cashOut')}</span></div></Card>}
      <DataTable key={page+query} table={table} data={seed} locale={locale} l={l} clear={clear} open={()=>{}} rowActions={row=><div className="controls"><Button size="sm" onClick={()=>setDetail({kind,id:String(row.id)})}><Eye size={14}/>{l.t('viewOrder')}</Button>{kind!=='transaction'&&<Button size="sm" onClick={()=>create(kind,String(row.id))}><Pencil size={14}/>{l.t('partnerEdit')}</Button>}</div>}/>
    </>}
    <div className="partner-footer"><span>{l.t('partnerAuditActor',{actor:'Minh Tran'})}</span><Button size="sm" onClick={()=>setReset(true)}><RotateCcw size={14}/>{l.t('resetDemo')}</Button></div>
    {editor&&<PartnerEditor key={editor.kind+editor.id} editor={editor} data={data} l={l} save={save} error={error} close={()=>setEditor(null)}/>}
    {detail&&detailRecord&&<Dialog title={l.t('detailsFor',{id:detail.id??''})} onClose={()=>setDetail(null)} className="drawer"><div className="drawer-heading"><h2>{l.t('detailsFor',{id:detail.id??''})}</h2><Button size="icon" aria-label={l.t('close')} onClick={()=>setDetail(null)}><X size={18}/></Button></div><div className="drawer-content"><PartnerDetails record={detailRecord} kind={detail.kind} data={data} l={l}/>{detail.kind!=='transaction'&&<Button onClick={()=>create(detail.kind,detail.id)}><Pencil size={15}/>{l.t('partnerEdit')}</Button>}</div></Dialog>}
    {reset&&<Dialog title={l.t('resetDemo')} onClose={()=>setReset(false)} className="confirm"><h2>{l.t('resetDemo')}</h2><p>{l.t('partnerResetConfirm')}</p><div className="controls"><Button onClick={()=>setReset(false)}>{l.t('cancel')}</Button><Button variant="destructive" onClick={()=>{try{repo.reset();setReset(false);setNotice('demoReset');}catch{setNotice('partnerSaveFailed');}}}>{l.t('resetDemo')}</Button></div></Dialog>}
  </PartnershipShell>;
}

function PartnerEditor({editor,data,l,save,error,close}:{editor:Editor;data:PartnershipData;l:Language;save:(form:FormData)=>boolean;error:string;close:()=>void}) {
  const customer=data.customers.find(row=>editor.kind==='customer'&&row.id===editor.id);
  const contract=data.contracts.find(row=>editor.kind==='contract'&&row.id===editor.id);
  const [customerId,setCustomerId]=useState(contract?.customer_id??data.customers[0]?.id??'');
  const [saving,setSaving]=useState(false);
  const title=l.t(editor.kind==='customer'?'partnerAddCustomer':editor.kind==='contract'?'partnerAddContract':'partnerAddTransaction');
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();if(saving)return;setSaving(true);if(!save(new FormData(event.currentTarget)))setSaving(false);};
  return <Dialog title={title} onClose={close} className="partner-editor"><form onSubmit={submit}>
    <div className="card-heading"><h2>{editor.id?l.t('partnerEdit'):title}</h2><Button size="icon" aria-label={l.t('close')} onClick={close}><X size={18}/></Button></div>
    <p>{l.t('partnerFormHint')}</p>
    {error&&<p className="negative" role="alert">{l.t(error)}</p>}
    <div className="partner-form-grid">
      {editor.kind==='customer'?<>
        <label>{l.t('customSku')}<Input name="custom_sku" required pattern={"[A-Za-z0-9_\\-]{2,24}"} maxLength={24} defaultValue={customer?.custom_sku} autoFocus/></label>
        <label>{l.t('name')}<Input name="name" required maxLength={120} defaultValue={customer?.name}/></label>
        <label>{l.t('partnerLevel')}<select name="level" defaultValue={customer?.level??'Standard'}>{partnerLevels.map(level=><option key={level} value={level}>{l.t('partnerLevel'+level)}</option>)}</select></label>
        <label>{l.t('email')}<Input name="email" type="email" required maxLength={160} defaultValue={customer?.email}/></label>
        <label>{l.t('phone')}<Input name="phone" type="tel" maxLength={40} defaultValue={customer?.phone}/></label>
        <label className="partner-full">{l.t('company')}<Input name="company" maxLength={160} defaultValue={customer?.company}/></label>
        <label className="partner-full">{l.t('notes')}<Textarea name="notes" maxLength={2000} defaultValue={customer?.notes}/></label>
      </>:<>
        <label className="partner-full">{l.t('customer')}<select name="customer_id" required value={customerId} onChange={event=>setCustomerId(event.target.value)}>{data.customers.map(row=><option key={row.id} value={row.id}>{row.custom_sku} · {row.name}</option>)}</select></label>
        {editor.kind==='contract'?<>
          <label className="partner-full">{l.t('partnerTitle')}<Input name="title" required maxLength={160} defaultValue={contract?.title}/></label>
          <label>{l.t('startDate')}<Input name="start_date" type="date" required defaultValue={contract?.start_date??asOf}/></label>
          <label>{l.t('endDate')}<Input name="end_date" type="date" required defaultValue={contract?.end_date??'2027-11-16'}/></label>
          <fieldset className="partner-full partner-resources"><legend>{l.t('resources')}</legend>{partnerResources.map(resource=><label key={resource}><input type="checkbox" name="resources" value={resource} defaultChecked={contract?.resources.includes(resource)}/>{l.t(resourceKey(resource))}</label>)}</fieldset>
          <label>{l.t('monthlyFee')} (USD)<Input name="monthly_fee" inputMode="decimal" required pattern="[0-9]+(\.[0-9]{1,2})?" defaultValue={((contract?.monthly_fee_cents??0)/100).toFixed(2)}/></label>
          <label>{l.t('status')}<select name="status" defaultValue={contract?.status??'draft'}>{['draft','active','ended'].map(status=><option key={status} value={status}>{l.status(status)}</option>)}</select></label>
          <label className="partner-full">{l.t('partnerTerms')}<Textarea name="terms" maxLength={8000} rows={5} defaultValue={contract?.terms}/></label>
        </>:<>
          <label className="partner-full">{l.t('contract')}<select key={customerId} name="contract_id" required defaultValue=""><option value="" disabled>{l.t('partnerSelectContract')}</option>{data.contracts.filter(row=>row.customer_id===customerId).map(row=><option key={row.id} value={row.id}>{row.id} · {row.title}</option>)}</select></label>
          <label>{l.t('date')}<Input name="date" type="date" required defaultValue={asOf} max={asOf}/></label>
          <label>{l.t('direction')}<select name="direction" defaultValue="income"><option value="income">{l.t('partnerIncome')}</option><option value="expense">{l.t('partnerExpense')}</option></select></label>
          <label>{l.t('category')}<select name="category" defaultValue="sales">{partnerCategories.map(category=><option key={category} value={category}>{l.t(resourceKey(category))}</option>)}</select></label>
          <label>{l.t('amount')} (USD)<Input name="amount" required inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" placeholder="0.00"/></label>
          <label className="partner-full">{l.t('bankReference')}<Input name="reference" required maxLength={80} placeholder="DEMO-REF-…"/></label>
          <label className="partner-full">{l.t('notes')}<Textarea name="notes" maxLength={2000}/></label>
        </>}
      </>}
    </div>
    <p className="partner-audit-note">{l.t('partnerAuditActor',{actor:'Minh Tran'})}</p>
    <div className="controls partner-form-actions"><Button onClick={close}>{l.t('cancel')}</Button><Button variant="default" className="partner-primary" type="submit" disabled={saving}>{l.t('partnerSave')}</Button></div>
  </form></Dialog>;
}

function PartnerDetails({record,kind,data,l}:{record:PartnerCustomer|PartnerContract|PartnerTransaction;kind:Editor['kind'];data:PartnershipData;l:Language}) {
  const customer='customer_id' in record?data.customers.find(row=>row.id===record.customer_id):record as PartnerCustomer;
  const fields:Record<string,string|number>={};
  if(kind==='customer'){
    const row=record as PartnerCustomer;Object.assign(fields,{customSku:row.custom_sku,name:row.name,partnerLevel:l.t('partnerLevel'+row.level),email:row.email,phone:row.phone,company:row.company,notes:row.notes});
  } else if(kind==='contract'){
    const row=record as PartnerContract;Object.assign(fields,{customer:customer?.name??row.customer_id,partnerTitle:row.title,resources:row.resources.map(resource=>l.t(resourceKey(resource))).join(' · '),startDate:l.date(row.start_date),endDate:l.date(row.end_date),monthlyFee:l.cash(row.monthly_fee_cents),status:l.status(row.status),partnerTerms:row.terms,updatedAt:l.date(row.updated_at)});
  } else {
    const row=record as PartnerTransaction;Object.assign(fields,{customer:customer?.name??row.customer_id,contract:row.contract_id,date:l.date(row.date),direction:l.t(row.direction==='income'?'partnerIncome':'partnerExpense'),category:l.t(resourceKey(row.category)),amount:l.cash(row.amount_cents),bankReference:row.reference,notes:row.notes});
  }
  Object.assign(fields,{recordedBy:record.actor,createdAt:l.date(record.created_at)});
  return <Card className="facts partner-detail-facts"><dl>{Object.entries(fields).map(([key,value])=><div key={key}><dt>{l.t(key)}</dt><dd>{key==='partnerLevel'?<Badge className={'partner-level partner-level-'+(record as PartnerCustomer).level.toLowerCase()}>{String(value)}</Badge>:key==='status'?<Badge>{String(value)}</Badge>:value||'—'}</dd></div>)}</dl></Card>;
}
