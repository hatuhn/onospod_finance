'use client';

import {useState,useSyncExternalStore} from 'react';
import {CircleUserRound,LogOut} from 'lucide-react';
import {demoAuth,parseDemoSession} from './demo-auth';
import {language} from './i18n';
import {base} from './routes';
import type {Locale} from './views';
import {Button} from '../components/ui/button';

export function AuthControl({locale,location}:{locale:Locale;location:string}) {
  const raw=useSyncExternalStore(demoAuth.subscribe,demoAuth.snapshot,()=> '');
  const session=parseDemoSession(raw);const l=language(locale);const [error,setError]=useState(false);
  const href=base+'/login?'+new URLSearchParams({lang:locale,returnTo:location});
  if(!session)return <a href={href} className="auth-control auth-login" title={l.t('authLogin')} aria-label={l.t('authLogin')}><CircleUserRound size={19}/></a>;
  return <details className="auth-control auth-account"><summary title={session.email} aria-label={l.t('authAccount')}><CircleUserRound size={19}/><i/></summary><div className="auth-account-panel"><strong>{session.name}</strong><span>{session.email}</span><small>{l.t('authDemoSession')}</small>{error&&<p role="alert">{l.t('authStorageError')}</p>}<Button size="sm" onClick={()=>{try{demoAuth.logout();window.location.assign(href);}catch{setError(true);}}}><LogOut size={14}/>{l.t('authLogout')}</Button></div></details>;
}
