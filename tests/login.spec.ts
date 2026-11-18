import {test,expect} from '@playwright/test';
import {base} from '../src/finance/routes';
import {language} from '../src/finance/i18n';
import {mkdir} from 'node:fs/promises';
for(const lang of ['vi','en'] as const)test(`${lang} login validates demo credentials and returns to the selected workspace`,async({page})=>{
  const l=language(lang);const requests:string[]=[];const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{const url=new URL(request.url());if(url.protocol.startsWith('http')&&(url.origin!=='http://127.0.0.1:3100'||url.pathname.startsWith('/api')||request.method()!=='GET'))requests.push(request.url());});
  await page.goto(base+'/workspaces/onosexpress/shipments?lang='+lang+'&carrier=CAR-UPS');
  await page.getByRole('link',{name:l.t('authLogin'),exact:true}).click();
  await expect(page.getByRole('heading',{name:l.t('authLogin'),exact:true})).toBeVisible();
  await page.getByLabel('Email',{exact:true}).fill('wrong@example.test');
  await page.getByLabel(l.t('authPassword'),{exact:true}).fill('incorrect');
  await page.getByRole('button',{name:l.t('authShowPassword'),exact:true}).click();
  await expect(page.locator('#login-password')).toHaveAttribute('type','text');
  await page.getByRole('button',{name:l.t('authLogin'),exact:true}).click();
  await expect(page.locator('.login-form').getByRole('alert')).toContainText(l.t('authInvalidCredentials'));
  await page.getByRole('button',{name:l.t('authFillDemo'),exact:true}).click();
  await page.getByRole('button',{name:l.t('authLogin'),exact:true}).click();
  await expect(page).toHaveURL(/onosexpress\/shipments\?.*carrier=CAR-UPS/);
  await expect(page.locator('.auth-account')).toBeVisible();
  expect(await page.evaluate(()=>sessionStorage.getItem('onospod.demo.session.v1'))).not.toContain('OnosDemo2026!');
  await page.reload();await page.locator('.auth-account summary').click();
  await page.getByRole('button',{name:l.t('authLogout'),exact:true}).click();
  await expect(page).toHaveURL(/finance-demo\/login/);
  expect(await page.evaluate(()=>sessionStorage.getItem('onospod.demo.session.v1'))).toBeNull();
  expect(requests).toEqual([]);expect(errors).toEqual([]);
});

test('Google sign-in is explicitly a local demo and cannot redirect outside the prototype',async({page})=>{
  const external:string[]=[];page.on('request',request=>{const url=new URL(request.url());if(url.protocol.startsWith('http')&&url.origin!=='http://127.0.0.1:3100')external.push(request.url());});
  await page.goto(base+'/login?lang=en&returnTo=https%3A%2F%2Fevil.example');
  await page.getByRole('button',{name:'Continue with Google',exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toContainText('Simulate Google sign-in');
  await dialog.getByRole('button',{name:'Use Google demo account',exact:true}).click();
  await expect(page).toHaveURL(base+'/overview?lang=en');
  expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('onospod.demo.session.v1')!).provider)).toBe('google');
  expect(external).toEqual([]);
});

test('login layout works on desktop tablet and mobile',async({page})=>{
  await page.goto(base+'/login?lang=vi');await mkdir('test-results/screenshots',{recursive:true});
  for(const width of [1440,1024,768,390]){
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.getByRole('button',{name:'Tiếp tục với Google',exact:true})).toBeVisible();
    await page.screenshot({path:`test-results/screenshots/login-${width}.png`,fullPage:width>767});
  }
});
