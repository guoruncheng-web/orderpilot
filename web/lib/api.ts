export type Stage = "draft" | "approval" | "approved" | "purchasing" | "received" | "shipped" | "paid";
export type Dashboard = {
  order: { id:string; number:string; customerName:string; status:Stage; discountPct:number; total:string|number };
  products: { id:string; sku:string; name:string; unitPrice:string|number; onHand:number; reserved:number; reorderPoint:number }[];
  metrics: { revenue:number; outstanding:number; lowStock:number; approvals:number };
};
export type User = { id:string;name:string;email:string;organizationId:string;organizationName:string;role:"admin"|"member"|"viewer" };
export type Order = { id:string;number:string;customerName:string;status:Stage;discountPct:number;total:string|number;createdAt:string;items?:{quantity:number;product:{sku:string;name:string}}[] };
export type OrderPage = {items:Order[];total:number;page:number;pageSize:number;pages:number};
export type Contact={id:string;name:string;email?:string;phone?:string;createdAt:string};
export type Resources = {products:Dashboard["products"];purchases:{id:string;number:string;supplier:string;status:string;quantity:number;salesOrder:{number:string}}[];approvals:{id:string;status:string;reason:string;decidedAt?:string;order:Order}[];customers:(Contact&{orders:number;lifetimeValue:number;outstanding:number;lastOrder:string})[];suppliers:(Contact&{_count:{purchaseOrders:number}})[];receivables:{id:string;amount:string|number;paid:string|number;status:string;order:Order;payments:{id:string;amount:string|number;reference:string;createdAt:string}[]}[]};
export type AuditEvent={id:string;entityType:string;entityId:string;action:string;detail:Record<string,unknown>;createdAt:string};
export type OrderDetail=Order&{approvals:{id:string;status:string;reason:string;decidedAt?:string}[];purchaseOrders:{id:string;number:string;supplier:string;status:string;quantity:number}[];receivable?:{amount:string|number;paid:string|number;status:string;payments:{id:string;amount:string|number;reference:string;createdAt:string}[]};movements:{id:string;kind:string;quantity:number;reference:string;createdAt:string}[];audit:AuditEvent[]};

const base = process.env.NEXT_PUBLIC_API_URL;
let token = "";
let user: User | null = null;

export class ApiError extends Error { constructor(message:string,public status:number){super(message);} }

async function request<T>(path:string, init:RequestInit={}):Promise<T>{
  if(!base) throw new Error("API is not configured");
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),12_000);
  try { const response=await fetch(`${base}${path}`,{...init,signal:controller.signal,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}});
    if(!response.ok) throw new ApiError((await response.json().catch(()=>null))?.message||`Request failed (${response.status})`,response.status);
    return response.json();
  } catch(error){ if(error instanceof DOMException && error.name==="AbortError") throw new ApiError("The server took too long to respond",408); throw error; }
  finally { clearTimeout(timer); }
}

export async function openDemo(role:User["role"]="admin"):Promise<Dashboard>{
  const auth=await request<{accessToken:string;user:User}>("/demo/session",{method:"POST",body:JSON.stringify({role})});
  token=auth.accessToken; user=auth.user;
  return request<Dashboard>("/operations/dashboard");
}

export function advanceOrder(id:string){ return request<Dashboard>(`/operations/orders/${id}/advance`,{method:"POST"}); }
export function performOrderAction(id:string,action:"submit"|"approve"|"reject"|"purchase"|"receive"|"ship"|"pay",comment?:string){return request<OrderDetail>(`/operations/orders/${id}/actions`,{method:"POST",body:JSON.stringify({action,comment})});}
export function currentUser(){return user;}
export function listOrders(params:{search?:string;status?:string;page?:number;pageSize?:number}={}){const q=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==undefined&&v!=="").map(([k,v])=>[k,String(v)]));return request<OrderPage>(`/operations/orders?${q}`);}
export function createOrder(data:{customerName:string;customerId?:string;items:{productSku:string;quantity:number}[];discountPct:number}){return request<Order>("/operations/orders",{method:"POST",body:JSON.stringify(data)});}
export function updateOrder(id:string,data:{customerName?:string;discountPct?:number}){return request<Order>(`/operations/orders/${id}`,{method:"PATCH",body:JSON.stringify(data)});}
export function deleteOrder(id:string){return request<{deleted:boolean}>(`/operations/orders/${id}`,{method:"DELETE"});}
export function getOrder(id:string){return request<OrderDetail>(`/operations/orders/${id}`);}
export function getResources(){return request<Resources>("/operations/resources");}
export function getAudit(){return request<AuditEvent[]>("/operations/audit");}
export function recordPayment(id:string,data:{amount:number;reference?:string}){return request<OrderDetail>(`/operations/orders/${id}/payments`,{method:"POST",body:JSON.stringify(data)});}
export function listCustomers(){return request<Resources["customers"]>("/operations/customers");}
export function createCustomer(data:{name:string;email?:string;phone?:string}){return request<Contact>("/operations/customers",{method:"POST",body:JSON.stringify(data)});}
export function listSuppliers(){return request<Resources["suppliers"]>("/operations/suppliers");}
export function createSupplier(data:{name:string;email?:string;phone?:string}){return request<Contact>("/operations/suppliers",{method:"POST",body:JSON.stringify(data)});}
