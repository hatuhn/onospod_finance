'use client';

import {useEffect} from 'react';
import {Boxes, Truck, Warehouse, Handshake} from 'lucide-react';
import {base} from './routes';
import {language} from './i18n';
import {AuthControl} from './auth-control';
import type {Locale} from './views';

export type Workspace = 'onospod' | 'onosexpress' | 'warehouse' | 'partnership';
export const workspaceRoot = (id: Workspace) => id === 'onospod' ? base + '/overview' : base + '/workspaces/' + id + '/overview';
const entries = [{id:'onospod',name:'Onospod',Icon:Boxes},{id:'onosexpress',name:'OnosExpress',Icon:Truck},{id:'warehouse',name:'Warehouse',Icon:Warehouse},{id:'partnership',name:'Partnership',Icon:Handshake}] as const;

export function WorkspaceSwitcher({active,locale,location}: {active: Workspace; locale: Locale; location: string}) {
  useEffect(() => {
    try {sessionStorage.setItem('onospod.workspace.' + active,location);} catch { /* Workspace links still work when storage is disabled. */ }
  },[active,location]);
  return <><div className="workspace-switcher" role="group" aria-label={language(locale).t('switchWorkspace')}>
    {entries.map(({id,name,Icon}) => {
      const [path,query] = workspaceRoot(id).split('?');
      const params = new URLSearchParams(query);params.set('lang',locale);
      return <a key={id} data-workspace={id} href={path + '?' + params} onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        try {
          const saved = sessionStorage.getItem('onospod.workspace.' + id);
          const prefix = id === 'onospod' ? base + '/' : base + '/workspaces/' + id + '/';
          if (saved?.startsWith(prefix) && (id !== 'onospod' || !saved.startsWith(base + '/workspaces/'))) {
            const [savedPath,savedQuery] = saved.split('?');const next = new URLSearchParams(savedQuery);next.set('lang',locale);
            event.preventDefault();window.location.assign(savedPath + '?' + next);
          }
        } catch { /* Use the default link. */ }
      }} aria-current={active === id ? 'page' : undefined} title={name} aria-label={name}><Icon size={18}/><span>{name}</span></a>;
    })}
  </div><AuthControl locale={locale} location={location}/></>;
}
