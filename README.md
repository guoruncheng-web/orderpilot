# OrderPilot

An interactive order-to-cash operations demo for small and mid-sized businesses.
It demonstrates sales orders, policy approvals, inventory shortages, purchasing,
goods receipt, shipment and receivables as one traceable workflow.

- Live app: https://orderpilot-web-alpha.vercel.app
- API docs: https://orderpilot-api.vercel.app/api/docs
- Health: https://orderpilot-api.vercel.app/api/health

## Current milestone

The `web` package contains a responsive operations dashboard and seven-step
guided workflow. With `NEXT_PUBLIC_API_URL` configured it provisions a private
company and reads every metric, order and stock balance from the API. Without
an API it deliberately falls back to preview mode so the product can still be
reviewed. Orders support multiple product lines, customer selection and a
calculated discounted total. Customer, supplier and receivable screens all use
persisted data, and receivables retain individual partial-payment records.

The `server` package persists the workflow in PostgreSQL. Each transition is a
database transaction: discount approval, purchase creation, receipt inventory
movement, shipment inventory movement and receivable payment. Every transition
also appends an audit event.

## Architecture

```text
Next.js (Vercel) -> NestJS API (Vercel Functions) -> PostgreSQL (Neon)
```

Implemented server boundaries include isolated demo organizations, JWT
authentication, immutable inventory movements, approval instances,
customer and supplier master data, payment history, receivables and an audit
trail. Every resource query is scoped with the
organization ID from the signed token rather than a caller-controlled header.

## Run locally

```bash
cd web
pnpm install
pnpm dev

cd ../server
cp .env.example .env
pnpm install
pnpm prisma:generate
pnpm exec prisma db push
pnpm dev
```

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/demo/session` | Provision and seed a private demo company |
| `GET` | `/api/operations/dashboard` | Metrics, inventory and guided order |
| `GET/POST` | `/api/operations/orders` | Search/paginate orders or create a multi-line order |
| `GET/PATCH/DELETE` | `/api/operations/orders/:id` | Read, edit or delete a permitted order |
| `POST` | `/api/operations/orders/:id/actions` | Execute an explicit approval, purchase, receipt, shipment or payment action |
| `POST` | `/api/operations/orders/:id/payments` | Record a partial or final payment |
| `GET/POST/PATCH/DELETE` | `/api/operations/customers` | Maintain customer master data |
| `GET/POST/PATCH/DELETE` | `/api/operations/suppliers` | Maintain supplier master data |
| `GET` | `/api/operations/audit` | Tenant-scoped business audit trail |
| `GET` | `/api/demo/cleanup` | Cron-protected cleanup of demo workspaces older than 24 hours |
| `GET` | `/api/docs` | Interactive OpenAPI documentation |

Run `pnpm smoke` in `server/` against a local API to exercise the workflow.
