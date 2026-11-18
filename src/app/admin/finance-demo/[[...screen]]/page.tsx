import {notFound} from 'next/navigation';
import {FinanceApp} from '../../../../finance/finance-app';
import {base, pages, type Screen} from '../../../../finance/routes';

type PageProps = {
  params: Promise<{screen?: string[]}>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export default async function Page({params, searchParams}: PageProps) {
  const [{screen = []}, query] = await Promise.all([params, searchParams]);
  const id = screen[0] ?? 'overview';
  if (screen.length > 1 || !Object.hasOwn(pages, id)) notFound();
  const search = new URLSearchParams();
  for (const [key, values] of Object.entries(query)) {
    for (const value of Array.isArray(values) ? values : values === undefined ? [] : [values]) search.append(key, value);
  }
  const location = base + (screen.length ? '/' + id : '') + (search.size ? '?' + search : '');
  return <FinanceApp initialScreen={id as Screen} initialLocation={location}/>;
}
