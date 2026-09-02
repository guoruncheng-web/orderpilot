const base = process.argv[2] || 'http://127.0.0.1:8104/api';
console.log(`Opening demo at ${base}`);
const sessionResponse = await fetch(`${base}/demo/session`, { method: 'POST' });
const auth = await sessionResponse.json();
if (!sessionResponse.ok) throw new Error(JSON.stringify(auth));
const headers = { Authorization: `Bearer ${auth.accessToken}` };
let dashboard = await fetch(`${base}/operations/dashboard`, { headers }).then((r) => r.json());
const states = [dashboard.order.status];
console.log(`Created ${auth.user.organizationName}: ${dashboard.order.status}`);
for (let i = 0; i < 6; i += 1) {
  const response = await fetch(`${base}/operations/orders/${dashboard.order.id}/advance`, { method: 'POST', headers });
  if (!response.ok) throw new Error(await response.text());
  dashboard = await response.json();
  states.push(dashboard.order.status);
  console.log(`Transition ${i + 1}: ${dashboard.order.status}`);
}
const audit = await fetch(`${base}/operations/audit`, { headers }).then((r) => r.json());
console.log(JSON.stringify({ states, receivable: dashboard.order.receivable?.status, travelMugOnHand: dashboard.products.find((p) => p.sku === 'TM-104')?.onHand, auditEvents: audit.length, company: auth.user.organizationName }, null, 2));
