import {notFound} from 'next/navigation';
import {PartnershipApp} from '../../../../../../finance/partnership-app';
import {OperationsApp} from '../../../../../../finance/operations-app';

export default async function Page({params,searchParams}: {params:Promise<{workspace:string;screen?:string[]}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const [{workspace,screen=[]},query] = await Promise.all([params,searchParams]);
  const page = screen[0] ?? 'overview';
  if (!['onosexpress','warehouse','partnership'].includes(workspace) || screen.length > 1 || !(workspace === 'onosexpress' ? ['overview','shipments','carriers'] : workspace === 'partnership' ? ['overview','customers','contracts','cashflow'] : ['overview']).includes(page)) notFound();
  const search = new URLSearchParams();
  for (const [key,value] of Object.entries(query)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) search.append(key,item);
  if (workspace === 'partnership') return <PartnershipApp page={page} query={search.toString()}/>;
  return <OperationsApp workspace={workspace as 'onosexpress'|'warehouse'} page={page} query={search.toString()}/>;
}
