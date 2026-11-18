import {notFound} from 'next/navigation';
import {PartnershipApp} from '../../../../../../finance/partnership-app';
import {OperationsApp} from '../../../../../../finance/operations-app';

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.entries({onosexpress:['overview','shipments','carriers'],warehouse:['overview'],partnership:['overview','customers','contracts','cashflow']}).flatMap(([workspace,screens])=>[{workspace,screen:[]},...screens.map(screen=>({workspace,screen:[screen]}))]);
}
export default async function Page({params,searchParams}: {params:Promise<{workspace:string;screen?:string[]}>;searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {workspace,screen=[]} = await params;
  const query = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true' ? {} : await searchParams;
  const page = screen[0] ?? 'overview';
  if (!['onosexpress','warehouse','partnership'].includes(workspace) || screen.length > 1 || !(workspace === 'onosexpress' ? ['overview','shipments','carriers'] : workspace === 'partnership' ? ['overview','customers','contracts','cashflow'] : ['overview']).includes(page)) notFound();
  const search = new URLSearchParams();
  for (const [key,value] of Object.entries(query)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) search.append(key,item);
  if (workspace === 'partnership') return <PartnershipApp page={page} query={search.toString()}/>;
  return <OperationsApp workspace={workspace as 'onosexpress'|'warehouse'} page={page} query={search.toString()}/>;
}
