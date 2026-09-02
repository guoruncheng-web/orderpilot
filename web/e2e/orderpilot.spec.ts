import { expect, test } from '@playwright/test';

async function enterAs(page:any, role:'Administrator'|'Sales member'|'Read-only viewer') {
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(role) }).click();
  await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible({timeout:30_000});
  await page.locator('.close').click();
}

test('administrator can inspect, edit and audit a real order', async ({ page }) => {
  await enterAs(page, 'Administrator');
  await page.getByRole('button', { name: 'Demo guide' }).click();
  await page.getByRole('button', { name: 'Start guided workflow' }).click();
  await expect(page.getByText('GUIDED TOUR')).toBeVisible();
  await expect(page.locator('.drawer')).toHaveCount(0);
  await page.getByRole('button', { name: 'Sales orders' }).click();
  await expect(page.getByText('SO-1048')).toBeVisible();
  await page.getByRole('row', { name: /SO-1048/ }).getByRole('button', { name: 'Details' }).click();
  await expect(page.getByText('ORDER DETAIL')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit order' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete draft' })).toBeVisible();
  await page.getByRole('button', { name: 'Edit order' }).click();
  await page.locator('.edit-panel input').first().fill('Atlas Coffee QA');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Atlas Coffee QA')).toBeVisible();
  await page.getByRole('button', { name: 'Submit order' }).click();
  await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('button', { name: 'Check stock & purchase' })).toBeVisible();
  await page.locator('.close').click();
  for (const [module, expected] of [['Inventory','TM-104'],['Purchasing','PO-2044'],['Approvals','SO-1045'],['Customers','Campfire Studio']] as const) {
    await page.getByRole('button', { name: module }).click();
    await expect(page.getByText(expected).first()).toBeVisible();
  }
  await page.getByRole('button', { name: 'Audit log' }).click();
  await expect(page.getByText('order.created').first()).toBeVisible();
});

test('sales member can write but cannot delete', async ({ page }) => {
  await enterAs(page, 'Sales member');
  await expect(page.getByRole('button', { name: 'New order' })).toBeEnabled();
  await page.getByRole('button', { name: 'Sales orders' }).click();
  await page.getByRole('row', { name: /SO-1048/ }).getByRole('button', { name: 'Details' }).click();
  await expect(page.getByRole('button', { name: 'Edit order' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete draft' })).toHaveCount(0);
});

test('viewer is read-only and mobile navigation remains usable', async ({ page }) => {
  await enterAs(page, 'Read-only viewer');
  await expect(page.getByRole('button', { name: 'New order' })).toBeDisabled();
  await expect(page.locator('.workflow-action .primary')).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.mobile-menu').click();
  await expect(page.locator('.sidebar')).toHaveClass(/mobile-open/);
  await page.getByRole('button', { name: '中文' }).click();
  await expect(page.getByRole('button', { name: '审计日志' })).toBeVisible();
});

test('API enforces viewer permissions independently of the UI', async ({ request }) => {
  const session=await request.post('https://orderpilot-api.vercel.app/api/demo/session',{data:{role:'viewer'}});
  expect(session.ok()).toBeTruthy();
  const {accessToken}=await session.json();
  const create=await request.post('https://orderpilot-api.vercel.app/api/operations/orders',{headers:{Authorization:`Bearer ${accessToken}`},data:{customerName:'Forbidden Co.',items:[{productSku:'CB-001',quantity:1}],discountPct:0}});
  expect(create.status()).toBe(403);
});

test('business rules skip unnecessary approval and purchasing', async ({ request }) => {
  const session=await request.post('https://orderpilot-api.vercel.app/api/demo/session',{data:{role:'admin'}});
  const {accessToken}=await session.json();
  const headers={Authorization:`Bearer ${accessToken}`};
  const created=await request.post('https://orderpilot-api.vercel.app/api/operations/orders',{headers,data:{customerName:'Rules QA',items:[{productSku:'CB-001',quantity:1}],discountPct:5}});
  const order=await created.json();
  const submitted=await request.post(`https://orderpilot-api.vercel.app/api/operations/orders/${order.id}/actions`,{headers,data:{action:'submit'}});
  expect((await submitted.json()).status).toBe('approved');
  const stockChecked=await request.post(`https://orderpilot-api.vercel.app/api/operations/orders/${order.id}/actions`,{headers,data:{action:'purchase'}});
  expect((await stockChecked.json()).status).toBe('received');
  const cleanup=await request.get('https://orderpilot-api.vercel.app/api/demo/cleanup');
  expect(cleanup.status()).toBe(401);
});

test('multi-item orders and partial payments persist in the database', async ({ request }) => {
  const session=await request.post('https://orderpilot-api.vercel.app/api/demo/session',{data:{role:'admin'}});
  expect(session.ok()).toBeTruthy();
  const {accessToken}=await session.json();
  const headers={Authorization:`Bearer ${accessToken}`};
  const created=await request.post('https://orderpilot-api.vercel.app/api/operations/orders',{headers,data:{customerName:'Multi Item QA',items:[{productSku:'CB-001',quantity:2},{productSku:'DO-220',quantity:3}],discountPct:10}});
  expect(created.ok()).toBeTruthy();
  const order=await created.json();
  const detail=await request.get(`https://orderpilot-api.vercel.app/api/operations/orders/${order.id}`,{headers});
  expect((await detail.json()).items).toHaveLength(2);

  const updated=await request.patch(`https://orderpilot-api.vercel.app/api/operations/orders/${order.id}`,{headers,data:{customerName:'Reassigned QA',discountPct:20}});
  expect(updated.ok()).toBeTruthy();
  expect(Number((await updated.json()).total)).toBeCloseTo((128*2+76*3)*0.8);

  const resources=await request.get('https://orderpilot-api.vercel.app/api/operations/resources',{headers});
  const data=await resources.json();
  expect(data.customers.length).toBeGreaterThanOrEqual(5);
  expect(data.customers.find((customer:any)=>customer.name==='Reassigned QA')?.orders).toBe(1);
  expect(data.suppliers.length).toBeGreaterThanOrEqual(2);
  const orderList=await request.get('https://orderpilot-api.vercel.app/api/operations/orders?page=1&pageSize=20',{headers});
  const shipped=(await orderList.json()).items.find((item:any)=>item.number==='SO-1047');
  const payment=await request.post(`https://orderpilot-api.vercel.app/api/operations/orders/${shipped.id}/payments`,{headers,data:{amount:1000,reference:`PAY-QA-${Date.now()}`}});
  expect(payment.ok()).toBeTruthy();
  const paidDetail=await payment.json();
  expect(paidDetail.receivable.status).toBe('partial');
  expect(paidDetail.receivable.payments).toHaveLength(2);
});
