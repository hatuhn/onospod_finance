'use client';

import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight,Boxes,Eye,EyeOff,Handshake,LockKeyhole,ShieldCheck,Truck,Warehouse,X} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {Dialog} from '../components/ui/dialog';
import {Segment} from './ui';
import {language} from './i18n';
import {base} from './routes';
import {demoAuth,demoCredentials,safeLoginReturn} from './demo-auth';
import type {Locale} from './views';

function GoogleMark(){return <span className="google-mark" aria-hidden="true">G</span>;}
export function LoginPage({locale,returnTo}:{locale:Locale;returnTo:string|null}) {
  const l=language(locale);const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [visible,setVisible]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [google,setGoogle]=useState(false);
  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  const destination=safeLoginReturn(returnTo,locale);
  const finish=(provider:'email'|'google')=>{
    if(busy)return;setError('');setBusy(true);
    try{if(provider==='email')demoAuth.loginEmail(email,password);else demoAuth.loginGoogleDemo();window.location.assign(destination);}
    catch(error){setError(error instanceof Error?error.message:'authStorageError');setBusy(false);}
  };
  const submit=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();finish('email');};
  const changeLocale=(lang:string)=>{const params=new URLSearchParams({lang});if(returnTo)params.set('returnTo',returnTo);window.location.assign(base+'/login?'+params);};
  return <div className="login-page">
    <section className="login-story" aria-label={l.t('authEcosystem')}>
      <a href={base+'/overview?lang='+locale} className="login-brand"><span className="mark">O</span><strong>Onos<span>{l.t('authEcosystem')}</span></strong></a>
      <div className="login-story-content"><span className="login-eyebrow">ONOS WORKSPACE</span><h1>{l.t('authHero')}</h1><p>{l.t('authHeroHint')}</p>
        <div className="login-workspaces">{[{name:'Onospod',Icon:Boxes,key:'authOnospod',color:'blue'},{name:'OnosExpress',Icon:Truck,key:'authExpress',color:'orange'},{name:'Warehouse',Icon:Warehouse,key:'authWarehouse',color:'purple'},{name:'Partnership',Icon:Handshake,key:'authPartnership',color:'teal'}].map(({name,Icon,key,color})=><div key={name}><span className={'login-workspace-icon '+color}><Icon size={20}/></span><div><strong>{name}</strong><small>{l.t(key)}</small></div></div>)}</div>
      </div><p className="login-story-footer"><ShieldCheck size={16}/>{l.t('authDemoEnvironment')}</p>
    </section>
    <section className="login-main"><div className="login-language"><Segment label={l.t('language')} value={locale} change={changeLocale} options={[{id:'en',label:'EN'},{id:'vi',label:'VI'}]}/></div>
      <div className="login-form-container"><span className="login-form-icon"><LockKeyhole size={23}/></span><h2>{l.t('authLogin')}</h2><p className="login-intro">{l.t('authWelcome')}</p>
        <div className="login-demo-note">{l.t('authPrototypeNotice')}</div>
        <Button className="google-login-button" onClick={()=>{setError('');setGoogle(true);}} disabled={busy}><GoogleMark/>{l.t('authContinueGoogle')}</Button>
        <div className="login-divider"><span>{l.t('authOrEmail')}</span></div>
        <form onSubmit={submit} className="login-form" autoComplete="off">
          {error&&!google&&<p role="alert" className="login-error">{l.t(error)}</p>}
          <label htmlFor="login-email">{l.t('email')}</label><Input id="login-email" type="email" inputMode="email" autoComplete="off" required placeholder="demo@onos.example.test" value={email} onChange={event=>setEmail(event.target.value)} disabled={busy}/>
          <label htmlFor="login-password">{l.t('authPassword')}</label><div className="login-password"><Input id="login-password" type={visible?'text':'password'} autoComplete="off" required placeholder={l.t('authPasswordPlaceholder')} value={password} onChange={event=>setPassword(event.target.value)} disabled={busy}/><button type="button" aria-label={l.t(visible?'authHidePassword':'authShowPassword')} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
          <Button type="submit" className="login-submit" disabled={busy}>{l.t(busy?'authSigningIn':'authLogin')}<ArrowRight size={16}/></Button>
        </form>
        <div className="login-demo-credentials"><div><strong>{l.t('authDemoAccount')}</strong><button type="button" onClick={()=>{setEmail(demoCredentials.email);setPassword(demoCredentials.password);setError('');}}>{l.t('authFillDemo')}</button></div><span>{demoCredentials.email}</span><span>{l.t('authPassword')}: <code>{demoCredentials.password}</code></span></div>
        <p className="login-prototype-footer">{l.t('authGoogleSetup')}</p>
      </div>
      <footer className="login-footer">Onos · {l.t('sample')}</footer>
    </section>
    {google&&<Dialog title={l.t('authGoogleDemoTitle')} onClose={()=>{if(!busy)setGoogle(false);}} className="confirm login-google-dialog"><div className="card-heading"><GoogleMark/><Button size="icon" aria-label={l.t('close')} onClick={()=>setGoogle(false)} disabled={busy}><X size={18}/></Button></div><h2>{l.t('authGoogleDemoTitle')}</h2><p>{l.t('authGoogleDemoHint')}</p>{error&&<p role="alert" className="login-error">{l.t(error)}</p>}<div className="login-google-account"><span>O</span><div><strong>{demoCredentials.name}</strong><small>{demoCredentials.google_email}</small></div></div><Button className="login-submit" disabled={busy} onClick={()=>finish('google')}>{l.t('authUseGoogleDemo')}<ArrowRight size={16}/></Button></Dialog>}
  </div>;
}
