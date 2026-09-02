import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await page.goto('https://orderpilot-web-alpha.vercel.app');
await page.getByRole('button', { name: /Administrator/ }).click();
await page.getByRole('heading', { name: /Good morning/ }).waitFor({ timeout: 30_000 });
await page.locator('.close').click();

await page.screenshot({ path: '../portfolio/source/orderpilot-02-overview-current.png', fullPage: true });

await page.getByRole('button', { name: 'New order' }).click();
await page.getByLabel('Customer').fill('Portfolio Multi-item Customer');
await page.getByRole('button', { name: /Add item/i }).click();
const quantities = page.locator('input[type="number"]');
await quantities.nth(0).fill('2');
await quantities.nth(1).fill('3');
await page.screenshot({ path: '../portfolio/source/08-multi-item-order.png', fullPage: true });

await page.keyboard.press('Escape');
const close = page.locator('.close');
if (await close.count()) await close.first().click();
await page.getByRole('button', { name: 'Sales orders' }).click();
await page.getByRole('row', { name: /SO-1047/ }).getByRole('button', { name: 'Details' }).click();
await page.getByText('PAY-DEPOSIT-1047').waitFor({ timeout: 30_000 });
await page.screenshot({ path: '../portfolio/source/09-partial-payment.png', fullPage: true });

await browser.close();
