import fixture from '../../mock-data/auth_demo.json';
import {base,pages} from './routes';
import type {Locale} from './views';

export const demoCredentials=fixture;
export type DemoSession={name:string;email:string;provider:'email'|'google';signedInAt:string;demo:true};
const key='onospod.demo.session.v1';
const eventName='onospod-demo-auth';
export function parseDemoSession(value:string):DemoSession|null {
  try {const session=JSON.parse(value);return session?.demo===true&&typeof session.name==='string'&&typeof session.email==='string'&&typeof session.signedInAt==='string'&&['email','google'].includes(session.provider)?session:null;}catch{return null;}
}
export function safeLoginReturn(value:string|null,locale:Locale) {
  const fallback=base+'/overview?lang='+locale;
  if(!value)return fallback;
  try {
    const url=new URL(value,'http://demo.local');
    if(url.origin!=='http://demo.local'||url.username||url.password)return fallback;
    const path=url.pathname.replace(/\/$/,'');
    const finance=path===base||Object.hasOwn(pages,path.slice(base.length+1))&&path.startsWith(base+'/');
    const workspaces:Record<string,string[]>= {onosexpress:['overview','shipments','carriers'],warehouse:['overview'],partnership:['overview','customers','contracts','cashflow']};
    const relative=path.startsWith(base+'/workspaces/')?path.slice((base+'/workspaces/').length).split('/'):[];
    const match=relative.length===2?relative:null;
    if(!finance&&!(match&&workspaces[match[0]]?.includes(match[1])))return fallback;
    url.searchParams.set('lang',locale);return path+'?'+url.searchParams;
  }catch{return fallback;}
}
export interface DemoAuthRepository {
  snapshot():string;
  subscribe(listener:()=>void):()=>void;
  loginEmail(email:string,password:string):DemoSession;
  loginGoogleDemo():DemoSession;
  logout():void;
}
export class MockAuthRepository implements DemoAuthRepository {
  snapshot=()=>{if(typeof window==='undefined')return '';try{return sessionStorage.getItem(key)??'';}catch{return '';}};
  subscribe=(listener:()=>void)=>{window.addEventListener(eventName,listener);window.addEventListener('storage',listener);return()=>{window.removeEventListener(eventName,listener);window.removeEventListener('storage',listener);};};
  private save(provider:DemoSession['provider']) {
    const session:DemoSession={name:fixture.name,email:provider==='google'?fixture.google_email:fixture.email,provider,signedInAt:new Date().toISOString(),demo:true};
    try{sessionStorage.setItem(key,JSON.stringify(session));window.dispatchEvent(new Event(eventName));}catch{throw new Error('authStorageError');}return session;
  }
  loginEmail=(email:string,password:string)=>{if(email.trim().toLowerCase()!==fixture.email||password!==fixture.password)throw new Error('authInvalidCredentials');return this.save('email');};
  loginGoogleDemo=()=>this.save('google');
  logout=()=>{try{sessionStorage.removeItem(key);window.dispatchEvent(new Event(eventName));}catch{throw new Error('authStorageError');}};
}
export const demoAuth:DemoAuthRepository=new MockAuthRepository();
