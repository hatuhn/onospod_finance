import {expect,test} from '@playwright/test';
import {base} from '../src/finance/routes';
import {language} from '../src/finance/i18n';
import {mkdir} from 'node:fs/promises';

for (const lang of ['vi','en'] as const) {
  for (const [workspace,page,key] of [
    ['onosexpress','overview','expressOverview'],['onosexpress','shipments','expressShipments'],['onosexpress','carriers','expressCarriers'],['warehouse','overview','warehouseOverview'],
  ]) test(`${lang} workspace ${workspace}/${page}`,async ({page:browser})=>{
    const errors: string[]=[];const external: string[]=[];
    browser.on('pageerror',error=>errors.push(error.message));
    browser.on('request',request=>{const url=new URL(request.url());if(url.protocol.startsWith('http') && (url.origin!=='http://127.0.0.1:3100' || url.pathname.startsWith('/api') || request.method()!=='GET'))external.push(request.url());});
    await browser.goto(`${base}/workspaces/${workspace}/${page}?lang=${lang}`);
    await expect(browser.getByRole('heading',{level:1})).toHaveText(language(lang).t(key));
    await expect(browser.locator('.workspace-switcher a')).toHaveCount(4);
    await expect(browser.locator('.workspace-switcher a[aria-current=page]')).toHaveText(workspace==='onosexpress'?'OnosExpress':'Warehouse');
    await expect(browser.locator('nav a')).toHaveCount(workspace==='onosexpress'?3:1);
    for(const width of [1440,1024,768,390]) {
      await browser.setViewportSize({width,height:1000});
      expect(await browser.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    }
    expect(errors).toEqual([]);expect(external).toEqual([]);
  });
}

test('switches workspaces, restores finance location and filters shipping',async ({page})=>{
  await page.goto(base+'/orders?lang=vi&period=last7Days');
  await page.getByRole('link',{name:'OnosExpress',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Tổng quan Shipping');
  await page.getByRole('link',{name:'Hãng vận chuyển',exact:true}).click();
  await page.getByRole('button',{name:'Xem vận đơn',exact:true}).first().click();
  await expect(page).toHaveURL(/shipments\?.*carrier=/);
  await expect(page.getByRole('heading',{level:1})).toHaveText('Vận đơn');
  await page.locator('tbody button[title^="SHIP-"]').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('searchbox').fill('NO-SHIPMENT-MATCH');
  await page.getByRole('button',{name:'Áp dụng',exact:true}).click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.getByRole('button',{name:'Xóa bộ lọc',exact:true}).first().click();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Xuất CSV',exact:true}).click()]);
  expect(download.suggestedFilename()).toContain('onosexpress-shipments');
  await page.getByRole('link',{name:'Warehouse',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Tổng quan kho');
  await page.getByRole('link',{name:'Onospod',exact:true}).click();
  await expect(page).toHaveURL(/orders\?.*period=last7Days/);
  await expect(page.getByRole('heading',{level:1})).toHaveText('Lãi lỗ đơn hàng');
});

test('captures shipping workspace preview',async ({page})=>{
  await page.goto(base+'/workspaces/onosexpress/overview?lang=vi');
  await expect(page.locator('.express-chart .recharts-bar-rectangle').first()).toBeVisible();
  await mkdir('test-results/screenshots',{recursive:true});
  await page.screenshot({path:'test-results/screenshots/onosexpress-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'test-results/screenshots/onosexpress-mobile.png',fullPage:false});
});
