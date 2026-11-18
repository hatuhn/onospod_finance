import {byId, pnl, sum, type Dataset} from './repository';
import {ref, type Locale, type Table} from './views';

export function expressView(data: Dataset, filter: {from: string; to: string; carrier: string; search: string; status: string}, locale: Locale) {
  const shipments = data.shipments.filter(row => {
    const order = byId(data.orders,row.order_id)!;
    const customer = byId(data.customers,order.customer_id)!;
    const carrier = byId(data.carriers,row.carrier_id)!;
    return !!row.shipped_at && row.shipped_at >= filter.from && row.shipped_at <= filter.to && (!filter.carrier || row.carrier_id === filter.carrier) && (!filter.status || row.status === filter.status) &&
      [row.tracking_number,row.id,row.order_id,customer.name,customer.custom_sku,carrier.name].join(' ').toLocaleLowerCase(locale).includes(filter.search.trim().toLocaleLowerCase(locale));
  });
  const shipmentTable: Table = {title:'expressShipmentList',columns:['id','tracking','date','order','customer','carrier','shippingRevenue','shippingCosts','shippingContribution','status'],rows:shipments.map(row => ({
    id:ref('shipments',row.id),tracking:row.tracking_number,date:row.shipped_at,order:ref('orders',row.order_id),customer:ref('customers',byId(data.orders,row.order_id)!.customer_id),carrier:byId(data.carriers,row.carrier_id)!.name,...pnl([],[row]),shippingContribution:pnl([],[row]).profit,status:row.status,
  }))};
  const carriers = data.carriers.filter(row => !filter.carrier || row.id === filter.carrier).map(carrier => {
    const rows = shipments.filter(row => row.carrier_id === carrier.id);
    const amounts = pnl([],rows);
    return {id:carrier.id,carrier:carrier.name,shipments:rows.length,...amounts,shippingContribution:amounts.profit};
  }).sort((a,b)=>b.shippingRevenue-a.shippingRevenue);
  const amounts = pnl([],shipments);
  return {shipments,shipmentTable,carrierTable:{title:'expressCarrierList',columns:['carrier','shipments','shippingRevenue','shippingCosts','shippingContribution'],rows:carriers} satisfies Table,
    metrics:{shipments:shipments.length,shippingRevenue:sum(shipments,row=>row.shipping_revenue_cents),shippingCosts:sum(shipments,row=>row.shipping_cost_cents),shippingContribution:amounts.profit}};
}
