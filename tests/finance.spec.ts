import {expect, test} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {base, pages, type Screen} from '../src/finance/routes';
import {language} from '../src/finance/i18n';

const snapshots: Screen[] = ['overview', 'orders', 'wallet', 'invoices', 'production-sku'];
const screenshotDir = process.env.FINANCE_SCREENSHOTS ?? 'test-results/screenshots';

for (const locale of ['vi', 'en'] as const) {
  const l = language(locale);
  for (const [path, label] of Object.entries(pages)) {
    test(`${locale} · ${path}`, async ({page}) => {
      const errors: string[] = [];
      const businessRequests: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.protocol.startsWith('http') && (url.origin !== 'http://127.0.0.1:3100' || url.pathname.startsWith('/api') || request.method() !== 'GET')) businessRequests.push(request.url());
      });
      await page.goto(`${base}/${path}?lang=${locale}`);
      await expect(page.getByRole('heading', {level: 1})).toHaveText(l.navigation[label]);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('nav a')).toHaveCount(Object.keys(pages).length);
      await expect(page.locator('nav h2')).toHaveCount(3);
      await expect(page.locator('.presets button')).toHaveCount(9);
      if (path !== 'overview') await expect(page.locator('tbody tr:visible').first()).toBeVisible();
      else await expect(page.locator('.legend > div')).toHaveCount(4);
      if (snapshots.includes(path as Screen)) {
        await mkdir(screenshotDir, {recursive: true});
        await page.screenshot({path: `${screenshotDir}/${path}-${locale}.png`, fullPage: true});
      }
      const link = page.locator('nav a').filter({hasText: l.navigation[path === 'overview' ? 'orderProfit' : 'financeOverview']});
      await link.click();
      await expect(page.getByRole('heading', {level: 1})).toHaveText(l.navigation[path === 'overview' ? 'orderProfit' : 'financeOverview']);
      await page.goto(`${base}/${path}?lang=${locale}`);
      for (const width of [768, 390]) {
        await page.setViewportSize({width, height: 844});
        await expect(page.getByRole('heading', {level: 1})).toHaveText(l.navigation[label]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      }
      expect(errors).toEqual([]);
      expect(businessRequests).toEqual([]);
    });
  }
}

test('historic refunds, invoice drilldown, locale, export and browser history', async ({page}) => {
  await page.goto(base + '/orders');
  await page.getByRole('button', {name: 'Refunds in Period'}).click();
  await expect(page.getByRole('button', {name: 'Details for ON-11013'})).toBeVisible();
  await page.getByRole('button', {name: 'Has Invoice', exact: true}).click();
  const invoice = page.locator('tbody button[title^="INV-"]').first();
  const reference = await invoice.getAttribute('title');
  await invoice.click();
  await expect(page.getByRole('dialog')).toContainText(reference!);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', {name: 'VI', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Hoàn tiền trong kỳ'})).toHaveAttribute('aria-pressed', 'true');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', {name: language('vi').actions.exportCsv}).click()]);
  expect(download.suggestedFilename()).toContain('orders_2026-11-01_2026-11-17');
  await page.getByRole('link', {name: language('vi').navigation.financeOverview}).click();
  await page.goBack();
  await expect(page.getByRole('button', {name: 'Hoàn tiền trong kỳ'})).toHaveAttribute('aria-pressed', 'true');
});

test('allows one reviewed topup and updates ledger, with read-only gating', async ({page}) => {
  await page.goto(base + '/wallet');
  await page.getByRole('combobox', {name: 'Demo role'}).selectOption('viewer');
  await page.getByRole('button', {name: 'Details for TOP-DEMO-01'}).click();
  await expect(page.getByRole('button', {name: 'Approve topup'})).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', {name: 'Demo role'}).selectOption('finance_manager');
  await page.getByRole('button', {name: 'Details for TOP-DEMO-01'}).click();
  await page.getByRole('button', {name: 'Approve topup'}).click();
  await page.getByRole('button', {name: 'Confirm', exact: true}).click();
  await expect(page.getByRole('dialog')).toContainText('Linh Nguyen');
  await expect(page.getByRole('dialog').getByRole('button', {name: 'Approve topup'})).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('link', {name: 'Transactions', exact: true}).click();
  await expect(page.locator('tbody button[title="DEMO-TOP-DEMO-01"]')).toHaveCount(1);
  await page.getByRole('button', {name: 'Reset Demo'}).click();
  await expect(page.locator('tbody button[title="DEMO-TOP-DEMO-01"]')).toHaveCount(0);
});

test('mobile presets scroll, navigation and table stay usable', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto(base + '/overview?lang=vi');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Tổng quan tài chính');
  await page.getByRole('button', {name: 'Mở menu'}).click();
  await page.getByRole('link', {name: language('vi').navigation.orderProfit}).click();
  const widths = await page.locator('.presets').evaluate(element => ({width: element.clientWidth, content: element.scrollWidth}));
  expect(widths.content).toBeGreaterThan(widths.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(page.locator('tbody tr:visible').first()).toBeVisible();
});

test('switches trend metrics and validates a custom date range', async ({page}) => {
  await page.goto(base + '/overview');
  await page.getByRole('button', {name: 'By SKU'}).click();
  await expect(page.getByRole('region', {name: 'Distinct SKU count'})).toBeVisible();
  await page.getByText('View chart data', {exact: true}).click();
  await expect(page.locator('.trend-data tbody tr')).toHaveCount(17);
  await page.getByRole('button', {name: 'Custom Range'}).click();
  await page.getByLabel('From', {exact: true}).fill('2026-11-16');
  await page.getByLabel('To', {exact: true}).fill('2026-11-15');
  const dateAlert = page.locator('.filter-panel').getByRole('alert');
  await expect(dateAlert).toContainText('Choose valid dates');
  await page.getByLabel('To', {exact: true}).fill('2026-11-17');
  await expect(dateAlert).toHaveCount(0);
});

test('desktop sidebar keeps navigation icons when collapsed', async ({page}) => {
  await page.goto(base + '/overview?lang=vi');
  const sidebar = page.locator('#finance-sidebar');
  const hide = page.getByRole('button', {name: 'Thu gọn thanh bên'});
  await expect(hide).toHaveAttribute('aria-expanded', 'true');
  const initialWidth = await page.locator('.workspace').evaluate(node => node.clientWidth);

  await hide.click();
  const show = page.getByRole('button', {name: 'Mở rộng thanh bên'});
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole('link')).toHaveCount(Object.keys(pages).length);
  const orders = sidebar.getByRole('link', {name: language('vi').navigation.orderProfit});
  await expect(orders).toHaveAttribute('title', language('vi').navigation.orderProfit);
  await expect(orders.locator('svg')).toBeVisible();
  await orders.click();
  await expect(orders).toHaveAttribute('aria-current', 'page');
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  expect(await page.locator('.workspace').evaluate(node => node.clientWidth)).toBeGreaterThan(initialWidth);

  await page.setViewportSize({width: 390, height: 844});
  await page.getByRole('button', {name: 'Mở menu'}).click();
  await expect(sidebar).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sidebar).toBeHidden();

  await page.setViewportSize({width: 1440, height: 1000});
  await show.click();
  await expect(sidebar).toBeVisible();
  await expect(hide).toHaveAttribute('aria-expanded', 'true');
});


test('overview renders fixture metrics and all four chart lines, and recovers from an empty filter', async ({page}) => {
  await page.goto(base + '/overview?lang=vi');
  await expect(page.getByRole('button', {name: /Doanh thu đơn hàng/})).toContainText('9.476,35');
  const trend = page.locator('.trend');
  await expect(trend.locator('path.recharts-line-curve[stroke-dasharray="4 4"]')).toHaveCount(1);
  const lines = trend.locator('path.recharts-line-curve:not([stroke-dasharray])');
  await expect(lines).toHaveCount(4);
  for (const line of await lines.all()) {
    await expect(line).toBeVisible();
    await expect(line).toHaveAttribute('d', /^M.+/);
  }
  await trend.getByRole('button', {name: 'Theo SKU'}).click();
  await expect(lines).toHaveCount(4);
  await page.getByRole('searchbox').fill('no-fixture-matches');
  await expect(trend.getByText('Không có dữ liệu sản xuất cho bộ lọc hiện tại.')).toBeVisible();
  await trend.getByRole('button', {name: language('vi').t('clear')}).click();
  await expect(lines).toHaveCount(4);
  await expect(page.getByRole('button', {name: /Doanh thu đơn hàng/})).toContainText('9.476,35');
});

test('order invoices filters, row actions and filtered CSV work', async ({page}) => {
  await page.goto(base + '/order-invoices?lang=en&period=thisYear');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Order Invoices');
  await expect(page.locator('.invoice-summary > div')).toHaveCount(4);
  await page.locator('.invoice-total-filter summary').click();
  await page.getByRole('spinbutton',{name:'Minimum total (USD)'}).fill('100');
  await page.getByRole('spinbutton',{name:'Maximum total (USD)'}).fill('1000');
  await page.locator('.invoice-total-filter summary').click();
  await expect(page.locator('tbody tr:visible').first()).toBeVisible();
  const firstRow = page.locator('tbody tr').first();
  const [download] = await Promise.all([page.waitForEvent('download'),firstRow.getByRole('button',{name:'Download',exact:true}).click()]);
  expect(download.suggestedFilename()).toMatch(/^INV-.*\.csv$/);
  await firstRow.getByRole('button',{name:'Show',exact:true}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'VI',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Hóa đơn đơn hàng');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
});


test('weekly production invoice opens matching production charges and downloads CSV', async ({page}) => {
  await page.goto(base + '/production-invoices?lang=en');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Production Invoices');
  const first = page.locator('tbody tr').first();
  const invoiceId = await first.locator('td').first().innerText();
  await first.getByRole('button',{name:'Show',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toContainText(invoiceId.trim());
  await expect(dialog.getByRole('heading',{name:'Production charges'})).toBeVisible();
  await page.keyboard.press('Escape');
  const [download]=await Promise.all([page.waitForEvent('download'),first.getByRole('button',{name:'Download',exact:true}).click()]);
  expect(download.suggestedFilename()).toMatch(/^PINV-.*\.csv$/);
  await page.getByRole('button',{name:'VI',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Hóa đơn sản xuất');
});


test('SKU dashboard switches quantity and revenue rankings and restores chart tab', async ({page}) => {
  await page.goto(base + '/production-sku?lang=vi');
  await expect(page.getByRole('heading',{level:1})).toHaveText('Dashboard SKU sản xuất');
  await expect(page.getByRole('region',{name:'Số lượng đã sản xuất theo SKU'})).toBeVisible();
  await expect(page.locator('.sku-chart .recharts-bar-rectangle').first()).toBeVisible();
  await expect(page.locator('.department-share .recharts-pie-sector').first()).toBeVisible();
  await expect(page.locator('.factory-revenue-chart .recharts-bar-rectangle').first()).toBeVisible();
  await page.getByRole('button',{name:'Doanh thu cao nhất',exact:true}).click();
  await expect(page.getByRole('region',{name:'Doanh thu sản xuất theo SKU'})).toBeVisible();
  await expect(page).toHaveURL(/tab=revenue/);
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await expect(page.getByRole('button',{name:'Highest revenue'})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('searchbox').fill('NOT-A-SKU');
  await expect(page.locator('.sku-ranking').getByText('No production revenue in this period.')).toBeVisible();
  await page.locator('.sku-ranking').getByRole('button',{name:'Clear filters'}).click();
  await expect(page.locator('.sku-chart .recharts-bar-rectangle').first()).toBeVisible();
});


test('production expenses customer sidebars search and filter each table independently', async ({page}) => {
  await page.goto(base + '/production-expenses?lang=vi');
  const groups = page.locator('.party-table-layout');
  await expect(groups).toHaveCount(2);
  const first = groups.nth(0);
  const second = groups.nth(1);
  const search = first.getByRole('searchbox',{name:'Tìm khách hàng · Debit Customers'});
  await expect(search).toBeVisible();
  await expect(second.getByRole('searchbox',{name:'Tìm khách hàng · Prepaid Customers'})).toBeVisible();
  await expect(first.locator('.party-account-prepaid')).toHaveCount(0);
  await expect(second.locator('.party-account-debit')).toHaveCount(0);
  const option = first.locator('.table-party-option').first();
  await option.click();
  await expect(option).toHaveAttribute('aria-pressed','true');
  await expect(first.locator('.scope-note')).toContainText('tổng của xưởng');
  await expect(second.locator('.table-party-option[aria-pressed=true]')).toHaveCount(0);
  await first.getByRole('button',{name:'Xóa lọc',exact:true}).click();
  await expect(first.locator('.scope-note')).toHaveCount(0);
  await search.fill('northstar-apparel@example.test');
  await expect(first.locator('.table-party-option')).toHaveCount(1);
  await expect(first.locator('.table-party-option strong')).toHaveText('NSAPP');
  await expect(first.locator('tbody tr:visible')).toHaveCount(2);
  await search.fill('NO-MATCH-CUSTOMER');
  await expect(first.locator('.table-party-option')).toHaveCount(0);
  await first.getByRole('button',{name:'Xóa lọc',exact:true}).click();
  await expect(first.locator('.table-party-option').first()).toBeVisible();
  await mkdir(screenshotDir,{recursive:true});
  for (const width of [1440,1024,768,390]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(search).toBeVisible();
    await page.screenshot({path:screenshotDir + `/production-expenses-search-${width}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'EN',exact:true}).click();
  await expect(first.getByRole('searchbox',{name:'Search customers · Debit Customers'})).toBeVisible();
});


test('order P&L hides production detail columns and opens View actions', async ({page}) => {
  await page.goto(base + '/orders?lang=vi');
  const table = page.locator('.table-card').first();
  for (const name of ['Nhà máy','SKU','Trạng thái chi phí','Trạng thái','Chi phí trực tiếp','Mã hóa đơn','Nhân sự sản xuất']) {
    await expect(table.getByRole('button',{name:'Sắp xếp theo ' + name,exact:true})).toHaveCount(0);
  }
  await table.getByRole('button',{name:'View',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').locator('tbody tr').first()).toBeVisible();
});


test('overview ranks customers and opens customer details', async ({page}) => {
  await page.goto(base + '/overview?lang=en');
  await expect(page.getByRole('heading',{name:'Factory Contribution',exact:true})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Top Customers',exact:true})).toBeVisible();
  await expect(page.locator('.top-customer-list li')).toHaveCount(5);
  await expect(page.locator('.tier-revenue-list li').first()).toBeVisible();
  await page.locator('.top-customer-heading button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
