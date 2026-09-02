import { chromium } from '@playwright/test';

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
const page = context.pages()[0] ?? await context.newPage();

await page.goto('https://www.proginn.com/web/works_create');
const detail = await page.evaluate(async () => {
  const response = await fetch('/api/user_works/getDetailV3', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'wid=1585937',
  });
  return response.json();
});

if (detail.status !== 1) throw new Error(`Unable to load work: ${detail.info}`);

const implementation = '本人独立完成需求分析、交互设计、前后端开发、数据库建模、权限体系、自动化测试与 Vercel 上线。前端采用 Next.js、React、TypeScript，后端采用 NestJS、Prisma、PostgreSQL（Neon）；JWT 实现组织级数据隔离，关键状态变更使用事务和并发校验。多商品订单按全部明细实时重算折后金额，客户变更同步主数据归属；多商品缺货可逐项采购入库，应收支持多笔部分付款。2026 年 8 月 12 日生产复验覆盖权限、金额、客户归属、完整订单到收款流程、库存流水、应收与审计轨迹，全部通过。';

await page.locator('#app').evaluate((element, form) => {
  const vm = element.__vue__;
  vm.form = { ...form, xmsx: form.xmsx };
}, { ...detail.data, xmsx: implementation, imglist: detail.data.imglist.filter((_, index) => index !== 1) });

const files = [
  '/Users/mac/projects/oner/codeing/demo4/portfolio/source/orderpilot-02-overview-current.png',
  '/Users/mac/projects/oner/codeing/demo4/portfolio/source/08-multi-item-order.png',
  '/Users/mac/projects/oner/codeing/demo4/portfolio/source/09-partial-payment.png',
];

for (const file of files) {
  const before = await page.locator('#app').evaluate(element => element.__vue__.form.imglist.length);
  await page.locator('input[name="file"]').setInputFiles(file);
  await page.waitForFunction(length => document.querySelector('#app').__vue__.form.imglist.length > length, before, { timeout: 30_000 });
}

const saved = await page.locator('#app').evaluate(async element => {
  const form = element.__vue__.form;
  const response = await fetch('/uapi/app/user/user_works/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(form),
  });
  return response.json();
});

if (saved.status !== 1) throw new Error(`Unable to save work: ${saved.info}`);
console.log(JSON.stringify({ workId: saved.data, imageCount: 9, implementation }, null, 2));
await browser.close();
