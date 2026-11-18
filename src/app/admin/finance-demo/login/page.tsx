import {LoginPage} from '../../../../finance/login-page';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query=process.env.NEXT_PUBLIC_STATIC_EXPORT === 'true' ? {} : await searchParams;
  return <LoginPage locale={query.lang==='vi'?'vi':'en'} returnTo={typeof query.returnTo==='string'?query.returnTo:null}/>;
}
