import {byId, type Dataset} from './repository';
import {isRef, type Table} from './views';
import type {TableParty} from './party-table';

export function expenseCustomers(data: Dataset, table: Table): TableParty[] {
  return data.customers.flatMap(customer => {
    const rowIds = table.rows.flatMap(row => {
      if (!isRef(row.id)) return [];
      const payableId = table.title === 'payables' ? row.id.ids[0]
        : byId(data.payouts,row.id.ids[0])?.factory_payable_id;
      const payable = payableId ? byId(data.payables,payableId) : undefined;
      return payable?.order_item_ids.some(itemId => {
        const item = byId(data.items,itemId);
        return item && byId(data.orders,item.order_id)?.customer_id === customer.id;
      }) ? row.id.ids : [];
    });
    return rowIds.length ? [{id:customer.id,name:customer.custom_sku,subtitle:customer.email,searchText:customer.name,tier:customer.tier,accountType:customer.account_type,rowIds}] : [];
  });
}
