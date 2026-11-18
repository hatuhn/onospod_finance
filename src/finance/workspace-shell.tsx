'use client';

import {useEffect,useState,type ReactNode} from 'react';
import {Handshake,Menu,PanelLeftClose,PanelLeftOpen,type LucideIcon} from 'lucide-react';
import {Button} from '../components/ui/button';
import {WorkspaceSwitcher} from './workspaces';
import {Segment} from './ui';
import type {Language} from './i18n';
import type {Locale} from './views';

export function PartnershipShell({title,page,locale,location,l,links,changeLanguage,children}: {title:string;page:string;locale:Locale;location:string;l:Language;links:{id:string;label:string;href:string;Icon:LucideIcon}[];changeLanguage:(locale:string)=>void;children:ReactNode}) {
  const [collapsed,setCollapsed]=useState(false);const [menu,setMenu]=useState(false);
  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  useEffect(()=>{
    if(!menu)return;
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenu(false);};
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);
  },[menu]);
  return <div className="app-shell" data-workspace="partnership" data-sidebar-collapsed={collapsed}>
    {menu&&<button className="mobile-scrim" aria-label={l.t('close')} onClick={()=>setMenu(false)}/>}
    <aside id="partnership-sidebar" className={'sidebar'+(menu?' mobile-open':'')}>
      <div className="brand"><span className="mark"><Handshake size={22}/></span><div className="sidebar-label">Partnership<small>{l.t('partnerManagement')}</small></div></div>
      <nav aria-label="Partnership"><div className="nav-group"><h2 className="sidebar-label">{l.t('partnerOperations')}</h2>{links.map(({id,label,href,Icon})=><a key={id} href={href} aria-current={id===page?'page':undefined} title={label}><Icon size={18}/><span className="sidebar-label">{label}</span></a>)}</div></nav>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb">
      <Button size="icon" className="sidebar-toggle" aria-label={l.t(collapsed?'expandSidebar':'collapseSidebar')} aria-expanded={!collapsed} aria-controls="partnership-sidebar" onClick={()=>setCollapsed(!collapsed)}>{collapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}</Button>
      <Button size="icon" className="menu-toggle" aria-label={l.t('menu')} aria-expanded={menu} aria-controls="partnership-sidebar" onClick={()=>setMenu(!menu)}><Menu size={19}/></Button><strong>{title}</strong>
    </div><div className="top-right"><WorkspaceSwitcher active="partnership" locale={locale} location={location}/><span className="sample"><i/>{l.t('sample')}</span><Segment label={l.t('language')} value={locale} change={changeLanguage} options={[{id:'en',label:'EN'},{id:'vi',label:'VI'}]}/></div></header><main>{children}</main></div>
  </div>;
}
