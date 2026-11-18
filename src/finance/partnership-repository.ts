import {asOf} from './repository';
import fixture from '../../mock-data/partnership.json';

export type PartnerCustomer = typeof fixture.customers[number];
export type PartnerContract = typeof fixture.contracts[number];
export type PartnerTransaction = typeof fixture.transactions[number];
export type PartnershipData = typeof fixture;
export const partnershipSeed: PartnershipData = fixture;
const copy = () => structuredClone(partnershipSeed);
const storageKey = 'onospod.partnership.demo.v1';
export const partnerLevels = ['Standard','Silver','Gold','Diamond'] as const;
export const partnerResources = ['production','shipping','warehouse','team'] as const;
export const partnerCategories = ['sales','production','shipping','warehouse','team','other'] as const;
export function centsFromInput(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole,decimal=''] = value.split('.');
  const cents = Number(whole)*100 + Number(decimal.padEnd(2,'0'));
  return Number.isSafeInteger(cents) ? cents : null;
}
export interface PartnershipRepository {
  subscribe(listener: () => void): () => void;
  snapshot(): PartnershipData;
  serverSnapshot(): PartnershipData;
  saveCustomer(value: Omit<PartnerCustomer,'id'|'created_at'|'actor'>, id?: string): string;
  saveContract(value: Omit<PartnerContract,'id'|'created_at'|'updated_at'|'actor'>, id?: string): string;
  addTransaction(value: Omit<PartnerTransaction,'id'|'created_at'|'actor'>): string;
  reset(): void;
}
const validDate = (date:string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date;
export class MockPartnershipRepository implements PartnershipRepository {
  private data: PartnershipData | null = null;
  private listeners = new Set<()=>void>();
  constructor(private persist = true) {}
  snapshot = (): PartnershipData => {
    if (!this.data) {
      this.data = copy();
      if (this.persist && typeof window !== 'undefined') {
        try {
          const stored = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
          if (stored?.version === 1 && Array.isArray(stored.customers) && Array.isArray(stored.contracts) && Array.isArray(stored.transactions)
            && stored.customers.every((row:PartnerCustomer)=>typeof row.id==='string'&&typeof row.custom_sku==='string'&&typeof row.email==='string')
            && stored.contracts.every((row:PartnerContract)=>Array.isArray(row.resources)&&Number.isSafeInteger(row.monthly_fee_cents))
            && stored.transactions.every((row:PartnerTransaction)=>Number.isSafeInteger(row.amount_cents)&&row.amount_cents>0&&['income','expense'].includes(row.direction))) this.data = {...stored,customers:stored.customers.map((row:PartnerCustomer)=>({...row,level:partnerLevels.includes(row.level as typeof partnerLevels[number])?row.level:'Standard'}))};
        } catch { /* Keep the static fixture if saved demo data cannot be read. */ }
      }
    }
    return this.data!;
  };
  serverSnapshot = () => partnershipSeed;
  subscribe = (listener:()=>void) => {this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private commit(data:PartnershipData) {
    if(this.persist && typeof window !== 'undefined') localStorage.setItem(storageKey,JSON.stringify(data));
    this.data=data;this.listeners.forEach(listener=>listener());
  }
  saveCustomer(value:Omit<PartnerCustomer,'id'|'created_at'|'actor'>,id?:string) {
    const data=structuredClone(this.snapshot());
    if(!partnerLevels.includes(value.level as typeof partnerLevels[number]) || !value.name.trim() || !/^[A-Z0-9_-]{2,24}$/.test(value.custom_sku) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))throw new Error('partnerInvalidCustomer');
    if(data.customers.some(row=>row.id!==id&&(row.custom_sku===value.custom_sku||row.email.toLowerCase()===value.email.toLowerCase())))throw new Error('partnerDuplicateCustomer');
    const existing=id?data.customers.find(row=>row.id===id):null;
    if(id&&!existing)throw new Error('partnerMissingRecord');
    const next={...value,id:existing?.id??'PC-'+crypto.randomUUID().slice(0,8),created_at:existing?.created_at??new Date().toISOString(),actor:'Minh Tran'};
    if(existing)data.customers=data.customers.map(row=>row.id===id?next:row);else data.customers.push(next);
    this.commit(data);return next.id;
  }
  saveContract(value:Omit<PartnerContract,'id'|'created_at'|'updated_at'|'actor'>,id?:string) {
    const data=structuredClone(this.snapshot());
    if(!data.customers.some(row=>row.id===value.customer_id)||!value.title.trim()||!validDate(value.start_date)||!validDate(value.end_date)||value.start_date>value.end_date||!value.resources.length||value.resources.some(resource=>!partnerResources.includes(resource as typeof partnerResources[number]))||!Number.isSafeInteger(value.monthly_fee_cents)||value.monthly_fee_cents<0||!['draft','active','ended'].includes(value.status))throw new Error('partnerInvalidContract');
    const existing=id?data.contracts.find(row=>row.id===id):null;if(id&&!existing)throw new Error('partnerMissingRecord');
    if(existing && existing.customer_id!==value.customer_id && data.transactions.some(row=>row.contract_id===existing.id))throw new Error('partnerContractCustomerLocked');
    const next={...value,id:existing?.id??'PCT-'+crypto.randomUUID().slice(0,8),created_at:existing?.created_at??new Date().toISOString(),updated_at:new Date().toISOString(),actor:'Minh Tran'};
    if(existing)data.contracts=data.contracts.map(row=>row.id===id?next:row);else data.contracts.push(next);
    this.commit(data);return next.id;
  }
  addTransaction(value:Omit<PartnerTransaction,'id'|'created_at'|'actor'>) {
    const data=structuredClone(this.snapshot());
    if(!data.customers.some(row=>row.id===value.customer_id)||!data.contracts.some(row=>row.id===value.contract_id&&row.customer_id===value.customer_id)||!validDate(value.date)||value.date>asOf||!Number.isSafeInteger(value.amount_cents)||value.amount_cents<=0||!['income','expense'].includes(value.direction)||!partnerCategories.includes(value.category as typeof partnerCategories[number])||!value.reference.trim())throw new Error('partnerInvalidTransaction');
    if(data.transactions.some(row=>row.reference.trim().toLowerCase()===value.reference.trim().toLowerCase()))throw new Error('partnerDuplicateReference');
    if(!Number.isSafeInteger(data.transactions.reduce((sum,row)=>sum+row.amount_cents,0)+value.amount_cents))throw new Error('partnerInvalidAmount');
    const id='PCF-'+crypto.randomUUID().slice(0,8);
    data.transactions.push({...value,id,created_at:new Date().toISOString(),actor:'Minh Tran'});this.commit(data);return id;
  }
  reset=()=>this.commit(copy());
}
export function partnershipView(data:PartnershipData,filter:{from:string;to:string;customer:string;search:string;level?:string}) {
  const search=filter.search.trim().toLowerCase();
  const customers=data.customers.filter(row=>(!filter.customer||row.id===filter.customer)&&(!filter.level||row.level===filter.level)&&[row.custom_sku,row.name,row.email,row.company].join(' ').toLowerCase().includes(search));
  const ids=new Set(customers.map(row=>row.id));
  const contracts=data.contracts.filter(row=>ids.has(row.customer_id));
  const transactions=data.transactions.filter(row=>ids.has(row.customer_id)&&row.date>=filter.from&&row.date<=filter.to);
  const cashIn=transactions.filter(row=>row.direction==='income').reduce((sum,row)=>sum+row.amount_cents,0);
  const cashOut=transactions.filter(row=>row.direction==='expense').reduce((sum,row)=>sum+row.amount_cents,0);
  const daily=Array.from(new Set(transactions.map(row=>row.date))).sort().map(date=>({date,cashIn:transactions.filter(row=>row.date===date&&row.direction==='income').reduce((sum,row)=>sum+row.amount_cents,0),cashOut:transactions.filter(row=>row.date===date&&row.direction==='expense').reduce((sum,row)=>sum+row.amount_cents,0)}));
  return {customers,contracts,transactions,metrics:{cashIn,cashOut,netCash:cashIn-cashOut,activeContracts:contracts.filter(row=>row.status==='active'&&row.start_date<=filter.to&&row.end_date>=filter.from).length},daily};
}
