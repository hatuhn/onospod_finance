import {describe,it,expect} from 'vitest';
import {centsFromInput,MockPartnershipRepository,partnershipView,partnershipSeed} from '../src/finance/partnership-repository';

const filter={from:'2026-11-01',to:'2026-11-17',customer:'',search:''};
describe('Partnership mock repository',()=>{
  it('reconciles cashflow and customer filters using integer cents',()=>{
    const view=partnershipView(partnershipSeed,filter);
    expect(view.metrics).toEqual({cashIn:890000,cashOut:423000,netCash:467000,activeContracts:2});
    expect(view.daily.reduce((sum,row)=>sum+row.cashIn-row.cashOut,0)).toBe(view.metrics.netCash);
    const customer=partnershipView(partnershipSeed,{...filter,customer:'PC-001'});
    expect(customer.metrics.netCash).toBe(155000);
    expect(partnershipView(partnershipSeed,{...filter,level:'Gold'}).customers.map(row=>row.custom_sku)).toEqual(['URBAN']);
    expect(customer.transactions.every(row=>row.customer_id==='PC-001')).toBe(true);
  });
  it('validates exact cents and rejects invalid amounts',()=>{
    expect(centsFromInput('100.10')).toBe(10010);
    expect(centsFromInput('0.01')).toBe(1);
    for(const input of ['1.001','-1','1e3','NaN','9007199254740992',''])expect(centsFromInput(input)).toBeNull();
  });
  it('persists mock records in the repository and guards duplicates and contract links',()=>{
    const repo=new MockPartnershipRepository(false);
    const customer={custom_sku:'TEST',level:'Gold',name:'Test',email:'test@example.test',phone:'',company:'',notes:''};
    const id=repo.saveCustomer(customer);
    expect(()=>repo.saveCustomer(customer)).toThrow('partnerDuplicateCustomer');
    const contract=repo.saveContract({customer_id:id,title:'Resource contract',start_date:'2026-11-01',end_date:'2027-11-01',resources:['shipping'],monthly_fee_cents:1525,status:'draft',terms:'Demo'});
    const transaction={customer_id:id,contract_id:contract,date:'2026-11-17',direction:'income',category:'sales',amount_cents:10010,reference:'TEST-REF',notes:''};
    repo.addTransaction(transaction);
    expect(()=>repo.addTransaction(transaction)).toThrow('partnerDuplicateReference');
    expect(()=>repo.addTransaction({...transaction,reference:'WRONG',customer_id:'PC-001'})).toThrow('partnerInvalidTransaction');
    const view=partnershipView(repo.snapshot(),{...filter,customer:id});
    expect(view.metrics.cashIn).toBe(10010);
    const saved=repo.snapshot().contracts.find(row=>row.id===contract)!;
    expect(()=>repo.saveContract({...saved,customer_id:'PC-001'},contract)).toThrow('partnerContractCustomerLocked');
    repo.reset();expect(repo.snapshot()).toEqual(partnershipSeed);
  });
});
