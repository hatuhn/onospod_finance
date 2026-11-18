'use client';
import {useSyncExternalStore} from 'react';
const subscribe=(callback:()=>void)=>{window.addEventListener('popstate',callback);return()=>window.removeEventListener('popstate',callback);};
const read=()=>window.location.search.slice(1);
export function useBrowserQuery(initial:string){return useSyncExternalStore(subscribe,read,()=>initial);}
