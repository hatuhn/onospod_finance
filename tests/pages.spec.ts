import {expect,test} from '@playwright/test';
import {pages} from '../src/finance/routes';
import {language} from '../src/finance/i18n';
const prefix='/onospod_finance-demo';const root=prefix+'/admin/finance-demo';
const routes=[...Object.entries(pages).map(([page,key])=>({path:root+'/'+page+'/',title:(lang:'vi'|'en')=>language(lang).navigation[key]})),...[
 ['onosexpress','overview','expressOverview'],['onosexpress','shipments','expressShipments'],['onosexpress','carriers','expressCarriers'],['warehouse','overview','warehouseOverview'],['partnership','overview','partnerOverview'],['partnership','customers','partnerCustomers'],['partnership','contracts','partnerContracts'],['partnership','cashflow','partnerCashflow'],
].map(([workspace,page,key])=>({path:root+'/workspaces/'+workspace+'/'+page+'/',title:(lang:'vi'|'en')=>language(lang).t(key)}))];
for(const lang of ['vi','en'] as const)for(const route of routes)test(`static ${lang} ${route.path}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(route.path+'?lang='+lang);await expect(page.getByRole('heading',{level:1})).toHaveText(route.title(lang));
 await expect(page.locator('.workspace-switcher a')).toHaveCount(4);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 expect(errors).toEqual([]);
});
test('static login, workspace navigation, language and filters work with the project prefix',async({page})=>{
 await page.goto(prefix+'/');await expect(page).toHaveURL(/login/);
 await page.getByRole('button',{name:'Điền tài khoản demo',exact:true}).click();
 await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Tổng quan tài chính');
 await page.getByRole('link',{name:'OnosExpress',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('Tổng quan Shipping');
 await page.getByRole('button',{name:'EN',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('Shipping Overview');
 await page.getByRole('searchbox').fill('NO-SHIPMENT');await page.getByRole('button',{name:'Apply filters',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(0);
 await page.getByRole('link',{name:'Partnership',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('Partnership Overview');
 await expect(page).toHaveURL(new RegExp(prefix));
});
