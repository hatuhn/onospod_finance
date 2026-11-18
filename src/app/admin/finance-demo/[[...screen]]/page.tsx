import {notFound} from 'next/navigation';
import {FinanceApp} from '../../../../finance/finance-app';
import {base, pages, type Screen} from '../../../../finance/routes';

type PageProps = {
  params: Promise<{screen?: string[]}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export const dynamicParams = false;
export function generateStaticParams() {return [{screen:[]},...Object.keys(pages).map(screen=>({screen:[screen]}))];}
export default async function Page({params, searchParams}: PageProps) {
  const {screen = []} = await params;
  const query = process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true' ? {} : await searchParams;
  const id = screen[0] ?? 'overview';
  if (screen.length > 1 || !Object.hasOwn(pages, id)) notFound();
  const search = new URLSearchParams();
  for (const [key, values] of Object.entries(query)) {
    for (const value of Array.isArray(values) ? values : values === undefined ? [] : [values]) search.append(key, value);
  }
  const location = base + (screen.length ? '/' + id : '') + (search.size ? '?' + search : '');
  return <FinanceApp initialScreen={id as Screen} initialLocation={location}/>;
}
