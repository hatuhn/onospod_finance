import {partnershipSeed} from '../src/finance/partnership-repository';
import {test,expect} from '@playwright/test';
import {base} from '../src/finance/routes';
import {language} from '../src/finance/i18n';
import {mkdir} from 'node:fs/promises';
const root=base+'/workspaces/partnership';
for(const lang of ['vi','en'] as const)for(const [page,key] of [['overview','partnerOverview'],['customers','partnerCustomers'],['contracts','partnerContracts'],['cashflow','partnerCashflow']])test(`${lang} Partnership ${page}`,async({page:browser})=>{
  const errors:string[]=[];const realRequests:string[]=[];
  browser.on('pageerror',error=>errors.push(error.message));
  browser.on('request',request=>{const url=new URL(request.url());if(url.protocol.startsWith('http')&&(url.origin!=='http://127.0.0.1:3100'||url.pathname.startsWith('/api')||request.method()!=='GET'))realRequests.push(request.url());});
  await browser.goto(`${root}/${page}?lang=${lang}`);
  await expect(browser.getByRole('heading',{level:1})).toHaveText(language(lang).t(key));
  await expect(browser.locator('.workspace-switcher a')).toHaveCount(4);
  await expect(browser.locator('nav a')).toHaveCount(4);
  await expect(browser.locator('tbody tr').first()).toBeVisible();
  for(const width of [1440,1024,768,390]){
    await browser.setViewportSize({width,height:1000});
    expect(await browser.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  }
  expect(errors).toEqual([]);expect(realRequests).toEqual([]);
});

test('creates a customer, contract and cashflow, keeps data after reload and prevents duplicates',async({page})=>{
  await page.goto(root+'/customers?lang=en');
  await page.getByRole('button',{name:'Add customer',exact:true}).click();
  let dialog=page.getByRole('dialog');
  await dialog.getByLabel('Custom SKU', {exact:true}).fill('TESTPART');
  await dialog.getByLabel('Customer name',{exact:true}).fill('Test Partner');
  await dialog.getByLabel('Email',{exact:true}).fill('test-partner@example.test');
  await dialog.getByRole('combobox',{name:'Customer level',exact:true}).selectOption('Gold');
  await dialog.getByRole('button',{name:'Save',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await page.reload();await expect(page.locator('tbody')).toContainText('TESTPART');
  await expect(page.locator('tbody tr').filter({hasText:'TESTPART'}).locator('.partner-level-gold')).toHaveText('Gold');
  await page.getByRole('link',{name:'Partnership Contracts',exact:true}).click();
  await page.getByRole('button',{name:'Create contract',exact:true}).click();
  dialog=page.getByRole('dialog');
  await dialog.getByRole('combobox',{name:'Customer',exact:true}).selectOption({label:'TESTPART · Test Partner'});
  await dialog.getByLabel('Contract title',{exact:true}).fill('Fixture partner agreement');
  await dialog.getByLabel('Shipping',{exact:true}).check();
  await dialog.getByLabel('Monthly fee (USD)',{exact:true}).fill('15.25');
  await dialog.getByRole('button',{name:'Save',exact:true}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('tbody')).toContainText('Fixture partner agreement');
  await page.getByRole('link',{name:'Customer Cashflow',exact:true}).click();
  const record=async()=>{
    await page.getByRole('button',{name:'Record cashflow',exact:true}).click();
    const form=page.getByRole('dialog');
    await form.getByRole('combobox',{name:'Customer',exact:true}).selectOption({label:'TESTPART · Test Partner'});
    const contract=form.getByRole('combobox',{name:'Contract',exact:true});
    const option=await contract.locator('option').last().getAttribute('value');
    await contract.selectOption(option!);
    await form.getByLabel('Amount (USD)',{exact:true}).fill('100.10');
    await form.getByLabel('Bank reference',{exact:true}).fill('TEST-RECEIPT-001');
    await form.getByRole('button',{name:'Save',exact:true}).click();
  };
  await record();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();await expect(page.locator('tbody')).toContainText('TEST-RECEIPT-001');
  await record();await expect(page.getByRole('alert')).toContainText('reference already exists');
  await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export CSV',exact:true}).click()]);
  expect(download.suggestedFilename()).toContain('partnership-cashflow');
  await page.locator('tbody tr').filter({hasText:'TEST-RECEIPT-001'}).getByRole('button',{name:'View',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Minh Tran');
  await expect(page.getByRole('dialog')).toContainText('$100.10');
});

test('captures Partnership overview',async({page})=>{
  await page.goto(root+'/overview?lang=vi');
  await expect(page.locator('.express-chart .recharts-area').first()).toBeVisible();
  await mkdir('test-results/screenshots',{recursive:true});
  await page.screenshot({path:'test-results/screenshots/partnership-desktop.png',fullPage:true});
});


test('migrates saved customers without levels and filters by selected level',async({page})=>{
  const legacy=structuredClone(partnershipSeed);
  for(const customer of legacy.customers) delete (customer as {level?:string}).level;
  await page.addInitScript(data=>localStorage.setItem('onospod.partnership.demo.v1',JSON.stringify(data)),legacy);
  await page.goto(root+'/customers?lang=en');
  await expect(page.locator('.partner-level-standard')).toHaveCount(3);
  await expect(page.locator('tbody')).toContainText('Northstar Commerce');
  await page.getByRole('combobox',{name:'Customer level',exact:true}).selectOption('Gold');
  await page.getByRole('button',{name:'Apply filters',exact:true}).click();
  await expect(page.locator('tbody tr')).toHaveCount(0);
});
