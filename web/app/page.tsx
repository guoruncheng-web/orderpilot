"use client";

import {
  AlertCircle, ArrowRight, Boxes, Check, ChevronLeft, ChevronRight, CircleDollarSign, ClipboardCheck,
  Building2, Eye, FileText, HandCoins, History, LayoutDashboard, PackageCheck, Plus, Search, ShoppingCart,
  Menu, Sparkles, Trash2, Truck, Users, Warehouse, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { advanceOrder, createCustomer, createOrder, createSupplier, currentUser, deleteOrder, getAudit, getOrder, getResources, listOrders, openDemo, performOrderAction, recordPayment, updateOrder, type AuditEvent, type Dashboard, type Order, type OrderDetail, type Resources, type User } from "@/lib/api";

type Stage = "draft" | "approval" | "approved" | "purchasing" | "received" | "shipped" | "paid";
type Locale = "en" | "zh";

const zh: Record<string,string> = {
  "Operations OS":"运营管理系统","Demo company":"演示公司","Private demo workspace":"独立演示空间","Interactive preview":"交互预览","Live API workspace":"线上 API 工作区","Preview mode · API unavailable":"预览模式 · API 暂不可用",
  "Overview":"总览","Sales orders":"销售订单","Inventory":"库存管理","Purchasing":"采购管理","Approvals":"审批中心","Customers":"客户管理","Suppliers":"供应商","Receivables":"应收账款","Audit log":"审计日志",
  "Tuesday, 11 August":"8 月 11 日，星期二","Good morning, Alex.":"早上好，Alex。","Here is what needs attention across your operation.":"以下是当前业务中需要关注的事项。","Search orders, SKUs…":"搜索订单、SKU…","Demo guide":"演示指南","New order":"新建订单",
  "Revenue this month":"本月收入","Outstanding":"待收款","6 invoices":"6 张发票","Low stock":"低库存","2 critical":"2 项严重","Awaiting approval":"待审批","Oldest 1h 42m":"最早等待 1 小时 42 分",
  "LIVE WORKFLOW":"实时工作流","Order total":"订单总额","Requested discount":"申请折扣","Required ship date":"要求发货日期","Owner":"负责人","Next best action":"建议下一步","Saving…":"保存中…","Workflow complete · replay":"流程已完成 · 重新演示",
  "NEEDS ATTENTION":"需要关注","Operational queue":"运营任务队列","View all":"查看全部","Discount approval":"折扣审批","Stock below reorder point":"库存低于补货点","Invoice due tomorrow":"发票明日到期","Delivery arriving":"到货提醒","remaining":"剩余",
  "SALES":"销售","Revenue trend":"收入趋势","Last 8 weeks":"最近 8 周","INVENTORY":"库存","Stock health":"库存健康度","94% healthy":"94% 健康",
  "Order drafted":"订单草稿","Approval queued":"等待审批","Order approved":"订单已批准","Purchase raised":"已创建采购单","Stock received":"货物已入库","Order shipped":"订单已发货","Payment recorded":"款项已登记",
  "Submit for approval":"提交审批","Approve order":"批准订单","Create purchase order":"创建采购单","Receive stock":"确认入库","Ship order":"订单发货","Record payment":"登记收款",
  "20% discount requests approval":"20% 折扣需要审批","Sales lead review":"销售主管审核","Inventory check found 4 short":"库存检查发现短缺 4 件","4 units booked into Main":"4 件商品已入主仓","Inventory and ledger updated":"库存和台账已更新","Order-to-cash complete":"订单到收款流程完成",
  "The requested discount exceeds the 15% policy threshold.":"申请折扣超过 15% 的规则阈值。","Review margin impact and approve as Sales Lead.":"以销售主管身份审核利润影响并批准。","Four Travel Mugs are short. Convert the suggestion to a PO.":"旅行杯短缺 4 件，将建议转换为采购单。","Simulate the supplier delivery and book stock into Main warehouse.":"模拟供应商到货并将库存记入主仓。","All stock is allocated. Create the shipment and inventory movement.":"库存已经分配，创建发货单和库存流水。","Record the customer payment to close the receivable.":"登记客户付款并结清应收款。","Every state change is retained in the audit trail.":"每次状态变化都会保留在审计记录中。",
  "Trigger a discount approval":"触发折扣审批","Resolve a stock shortage with purchasing":"通过采购解决库存短缺","Receive, ship and record payment":"完成入库、发货和收款","Inspect the audit trail behind every step":"查看每一步背后的审计记录","approved":"已批准","shipped":"已发货","paid":"已付款","draft":"草稿","approval":"审批中","purchasing":"采购中","received":"已入库","Suggested":"建议创建","In transit":"运输中","Not submitted":"未提交","Approved":"已批准",
  "Track every customer order from draft to payment.":"跟踪客户订单从草稿到收款的完整过程。","Monitor stock availability, reservations and reorder points.":"监控可用库存、预留数量和补货点。","Manage purchase orders and incoming supplier deliveries.":"管理采购订单和供应商到货。","Review policy exceptions and keep decisions auditable.":"审核规则例外并保留完整审计记录。","See customer value, open balances and recent activity.":"查看客户价值、未结余额和近期活动。",
  "All":"全部","Open":"进行中","Paid":"已付款","Healthy":"健康","Received":"已收货","Pending":"待处理","Resolved":"已解决","Active":"活跃","Export CSV":"导出 CSV","records":"条记录","Live demo workspace":"线上演示工作区",
  "Order":"订单","Customer":"客户","Placed":"下单日期","Total":"金额","Status":"状态","SKU":"SKU","Product":"商品","On hand":"现有库存","Reserved":"已预留","Reorder point":"补货点","Health":"库存状态","Purchase order":"采购单","Supplier":"供应商","Expected":"预计到货","Buyer":"采购员","Request":"申请","Type":"类型","Submitted by":"提交人","Value":"金额","Age":"等待时间","Orders":"订单数","Lifetime value":"累计价值","Last order":"最近订单",
  "3-MINUTE PRODUCT TOUR":"3 分钟产品导览","Run a real order-to-cash workflow.":"体验真实的订单到收款流程。","This workspace is yours. Every click changes the dashboard, inventory and operational queue.":"这是你的演示空间，每次操作都会更新仪表盘、库存和任务队列。","Start guided workflow":"开始引导演示","No signup · isolated data · resets in 24 hours":"无需注册 · 数据隔离 · 24 小时后重置","NEW SALES ORDER":"新建销售订单","Create an order":"创建订单","Quantity":"数量","Discount":"折扣","Approval will be required":"需要审批","Discounts above 15% need a Sales Lead.":"折扣超过 15% 需要销售主管审批。","Save draft":"保存草稿"
};
const tx=(locale:Locale,text:string)=>locale === "zh" ? (zh[text] || text) : text;

const stages: { key: Stage; label: string; detail: string }[] = [
  { key: "draft", label: "Order drafted", detail: "20% discount requests approval" },
  { key: "approval", label: "Approval queued", detail: "Sales lead review" },
  { key: "approved", label: "Order approved", detail: "Inventory check found 4 short" },
  { key: "purchasing", label: "Purchase raised", detail: "PO-2048 · Northstar Supply" },
  { key: "received", label: "Stock received", detail: "4 units booked into Main" },
  { key: "shipped", label: "Order shipped", detail: "Inventory and ledger updated" },
  { key: "paid", label: "Payment recorded", detail: "Order-to-cash complete" },
];

const nav = [
  [LayoutDashboard, "Overview"], [ShoppingCart, "Sales orders"], [Boxes, "Inventory"],
  [Truck, "Purchasing"], [ClipboardCheck, "Approvals"], [Users, "Customers"], [Building2,"Suppliers"], [HandCoins,"Receivables"], [History,"Audit log"],
] as const;

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [section, setSection] = useState<(typeof nav)[number][1]>("Overview");
  const [stage, setStage] = useState<Stage>("draft");
  const [panel, setPanel] = useState<"tour" | "order" | "detail" | null>(null);
  const [selectedOrder,setSelectedOrder]=useState<string|null>(null);
  const [remote, setRemote] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedIn,setSignedIn]=useState(false);
  const [user,setUser]=useState<User|null>(null);
  const [error,setError]=useState("");
  const [search,setSearch]=useState("");
  const [mobileNav,setMobileNav]=useState(false);
  const [tourActive,setTourActive]=useState(false);
  const [apiNote, setApiNote] = useState("Interactive preview");
  const index = stages.findIndex((item) => item.key === stage);
  const tr=(text:string)=>tx(locale,text);
  useEffect(() => {
    const saved=localStorage.getItem("orderpilot-locale");
    if(saved === "en" || saved === "zh") setLocale(saved);
  }, []);
  const signIn=async(role:User["role"])=>{setBusy(true);setError("");try{const data=await openDemo(role);setRemote(data);setStage(data.order.status);setUser(currentUser());setApiNote("Live API workspace");setSignedIn(true);setPanel("tour");}catch(e){setError(e instanceof Error?e.message:"Unable to open the workspace");}finally{setBusy(false);}};
  const startTour=async()=>{setBusy(true);setError("");try{const data=await openDemo(user?.role||"admin");setRemote(data);setStage(data.order.status);setUser(currentUser());setSection("Overview");setPanel(null);setTourActive(true);setApiNote("Guided workflow active");setTimeout(()=>document.querySelector('.workflow-card')?.scrollIntoView({behavior:'smooth',block:'center'}),100);}catch(e){setError(e instanceof Error?e.message:"Unable to reset the guided workspace");}finally{setBusy(false);}};
  const changeLocale=(value:Locale)=>{setLocale(value);localStorage.setItem("orderpilot-locale",value);document.documentElement.lang=value === "zh" ? "zh-CN" : "en";};
  const next = async () => {
    if(index >= stages.length-1 || busy) return;
    if(!remote){ setStage(stages[index+1].key); return; }
    setBusy(true);
    try { const data=await advanceOrder(remote.order.id); setRemote(data); setStage(data.order.status); }
    catch(e){setError(e instanceof Error?e.message:"Unable to update the order");}
    finally { setBusy(false); }
  };
  const metrics = useMemo(() => ({
    revenue: remote?.metrics.revenue ?? 184250 + (stage === "paid" ? 12288 : 0),
    receivable: remote?.metrics.outstanding ?? (stage === "paid" ? 22480 : 37840),
    lowStock: remote?.metrics.lowStock ?? (index >= 4 ? 3 : 4),
    approvals: remote?.metrics.approvals ?? (index >= 2 ? 2 : 3),
  }), [stage, index, remote]);

  if(!signedIn) return <main className="login-screen"><section className="login-card role-login"><div className="login-brand">OP</div><p className="eyebrow">ORDERPILOT · SECURE DEMO</p><h1>{locale==="zh"?"选择角色进入企业工作台":"Choose a role to enter the workspace."}</h1><p>{locale==="zh"?"每个角色都会创建独立的演示组织，并执行真实权限校验。":"Each role gets an isolated workspace with real server-side authorization."}</p>{error&&<div className="error-box"><AlertCircle size={17}/><span>{error}</span></div>}<div className="role-grid"><RoleButton title={locale==="zh"?"管理员":"Administrator"} detail={locale==="zh"?"全部权限，包括删除草稿":"Full access, including draft deletion"} role="admin" disabled={busy} onClick={signIn}/><RoleButton title={locale==="zh"?"业务员":"Sales member"} detail={locale==="zh"?"创建、编辑和推进订单":"Create, edit and advance orders"} role="member" disabled={busy} onClick={signIn}/><RoleButton title={locale==="zh"?"只读访客":"Read-only viewer"} detail={locale==="zh"?"只能查看业务数据和审计记录":"View business data and audit only"} role="viewer" disabled={busy} onClick={signIn}/></div><div className="language-switch login-language"><button className={locale==="en"?"selected":""} onClick={()=>changeLocale("en")}>EN</button><button className={locale==="zh"?"selected":""} onClick={()=>changeLocale("zh")}>中文</button></div><small>{locale==="zh"?"JWT 登录 · 组织数据隔离 · 24 小时自动重置":"JWT authentication · tenant isolation · automatic 24-hour reset"}</small></section></main>;
  return (
    <main className="shell">
      <aside className={`sidebar ${mobileNav?"mobile-open":""}`}>
        <button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button>
        <div className="logo"><span>OP</span><div>OrderPilot<small>{tr("Operations OS")}</small></div></div>
        <div className="workspace"><span className="workspace-mark">N</span><div><small>{tr("Demo company")}</small>Northwind Goods</div><ChevronRight size={15}/></div>
        <nav>{nav.map(([Icon, label]) => <button className={section === label ? "active" : ""} onClick={() => {setSection(label);setMobileNav(false)}} key={label}><Icon size={17}/>{tr(label)}{label === "Approvals" && <b>{metrics.approvals}</b>}</button>)}</nav>
        <div className="sidebar-foot"><Sparkles size={16}/><div><strong>{user?.name} · {user?.role}</strong><small>{tr(apiNote)}</small></div></div>
      </aside>

      <section className="content">
        <button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu size={19}/><span>OrderPilot</span></button>
        {error&&<div className="error-banner"><AlertCircle size={16}/><span>{error}</span><button onClick={()=>setError("")}><X size={15}/></button></div>}
        <header><div><p className="eyebrow">{section === "Overview" ? tr("Tuesday, 11 August") : `${locale === "zh" ? "运营" : "OPERATIONS"} / ${tr(section).toUpperCase()}`}</p><h1>{section === "Overview" ? tr("Good morning, Alex.") : tr(section)}</h1><p>{tr(section === "Overview" ? "Here is what needs attention across your operation." : moduleSubtitle(section))}</p></div><div className="header-actions"><div className="language-switch" aria-label="Language"><button className={locale==="en"?"selected":""} onClick={()=>changeLocale("en")}>EN</button><button className={locale==="zh"?"selected":""} onClick={()=>changeLocale("zh")}>中文</button></div><label><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={tr("Search orders, SKUs…")}/></label><button className="secondary" onClick={() => setPanel("tour")}>{tr("Demo guide")}</button><button className="primary" disabled={user?.role==="viewer"} title={user?.role==="viewer"?"Viewer role is read-only":""} onClick={() => setPanel("order")}><Plus size={17}/>{tr("New order")}</button></div></header>

        {section === "Overview" ? <>
        <section className="metrics">
          <Metric icon={CircleDollarSign} label={tr("Revenue this month")} value={money(metrics.revenue)} trend="+12.4%"/>
          <Metric icon={FileText} label={tr("Outstanding")} value={money(metrics.receivable)} note={tr("6 invoices")}/>
          <Metric icon={Warehouse} label={tr("Low stock")} value={String(metrics.lowStock)} note={tr("2 critical")} warning/>
          <Metric icon={ClipboardCheck} label={tr("Awaiting approval")} value={String(metrics.approvals)} note={tr("Oldest 1h 42m")}/>
        </section>

        <section className="grid">
          <article className={`card workflow-card ${tourActive?"tour-active":""}`}>
            <div className="card-head"><div><p className="eyebrow">{tr("LIVE WORKFLOW")}{tourActive&&<b className="guided-badge">{locale==="zh"?"引导进行中":"GUIDED TOUR"}</b>}</p><h2>SO-1048 · Atlas Coffee Co.</h2></div><span className={`status s-${stage}`}>{tr(stages[index].label)}</span></div>
            <div className="order-summary"><div><small>{tr("Order total")}</small><strong>{money(Number(remote?.order.total??12288))}</strong></div><div><small>{tr("Requested discount")}</small><strong className="amber">{remote?.order.discountPct??20}%</strong></div><div><small>{tr("Required ship date")}</small><strong>14 Aug</strong></div><div><small>{tr("Owner")}</small><strong>Jamie Chen</strong></div></div>
            <div className="timeline">
              {stages.map((item, i) => <div className={`timeline-item ${i < index ? "done" : i === index ? "current" : ""}`} key={item.key}><span>{i < index ? <Check size={13}/> : i + 1}</span><div><strong>{tr(item.label)}</strong><small>{tr(item.detail)}</small></div></div>)}
            </div>
            <div className="workflow-action"><div><strong>{tr("Next best action")}</strong><p>{user?.role==="viewer"?(locale==="zh"?"只读访客可查看流程，但不能执行状态变更。":"Viewers can inspect the workflow but cannot change state."):tr(actionCopy(stage))}</p></div>{stage !== "paid" ? <button className="primary" disabled={busy||user?.role==="viewer"} onClick={next}>{tr(busy ? "Saving…" : actionLabel(stage))}<ArrowRight size={16}/></button> : <button className="complete" onClick={() => location.reload()}><Check size={16}/>{tr("Workflow complete · replay")}</button>}</div>
          </article>

          <article className="card attention">
            <div className="card-head"><div><p className="eyebrow">{tr("NEEDS ATTENTION")}</p><h2>{tr("Operational queue")}</h2></div><button className="text-button" onClick={()=>setSection("Approvals")}>{tr("View all")}</button></div>
            <Queue icon={ClipboardCheck} tone="amber" title="Discount approval" text="SO-1048 · 20% requested" meta="1h 42m"/>
            <Queue icon={Boxes} tone="red" title="Stock below reorder point" text="Travel Mug / Charcoal" meta="4 remaining"/>
            <Queue icon={CircleDollarSign} tone="blue" title="Invoice due tomorrow" text="INV-8831 · Campfire Studio" meta="$8,420"/>
            <Queue icon={Truck} tone="green" title="Delivery arriving" text="PO-2044 · Harbor Supply" meta="Today"/>
          </article>

          <article className="card chart-card"><div className="card-head"><div><p className="eyebrow">SALES</p><h2>Revenue trend</h2></div><select><option>Last 8 weeks</option></select></div><div className="chart"><div className="y-labels"><span>$60k</span><span>$40k</span><span>$20k</span><span>$0</span></div><svg viewBox="0 0 650 190" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#315c4d" stopOpacity=".25"/><stop offset="1" stopColor="#315c4d" stopOpacity="0"/></linearGradient></defs><path className="area" d="M0,155 C60,148 70,110 130,123 S210,92 270,102 S340,52 405,76 S500,44 555,57 S620,18 650,28 L650,190 L0,190Z"/><path className="line" d="M0,155 C60,148 70,110 130,123 S210,92 270,102 S340,52 405,76 S500,44 555,57 S620,18 650,28"/></svg><div className="x-labels"><span>23 Jun</span><span>7 Jul</span><span>21 Jul</span><span>4 Aug</span></div></div></article>
          <article className="card stock-card"><div className="card-head"><div><p className="eyebrow">INVENTORY</p><h2>Stock health</h2></div><span className="healthy">94% healthy</span></div><Stock name="Canvas Backpack" sku="CB-001" value={86} qty="86 / 100"/><Stock name="Travel Mug / Charcoal" sku="TM-104" value={16} qty="4 / 25" danger/><Stock name="Desk Organizer" sku="DO-220" value={62} qty="31 / 50"/><Stock name="Weekly Planner" sku="WP-410" value={42} qty="21 / 50"/></article>
        </section>
        </> : <ModuleView section={section} locale={locale} search={search} role={user?.role||"viewer"} onError={setError} onSelectOrder={(id)=>{setSelectedOrder(id);setPanel("detail")}}/>} 
      </section>

      {panel && <div className="scrim" onMouseDown={() => setPanel(null)}><aside className={`drawer ${panel==="detail"?"detail-drawer":""}`} onMouseDown={(e) => e.stopPropagation()}><button className="close" onClick={() => setPanel(null)}><X size={18}/></button>{panel === "tour" ? <Tour locale={locale} busy={busy} onStart={startTour}/>:panel==="order"?<OrderForm locale={locale} products={remote?.products||[]} onError={setError} onDone={() => {setPanel(null);setSection("Sales orders")}}/>:<OrderDetailDrawer id={selectedOrder!} locale={locale} role={user?.role||"viewer"} onError={setError} onDone={()=>{setPanel(null);setSection("Overview");setTimeout(()=>setSection("Sales orders"),0)}}/>}</aside></div>}
    </main>
  );
}

function RoleButton({title,detail,role,disabled,onClick}:{title:string;detail:string;role:User["role"];disabled:boolean;onClick:(role:User["role"])=>void}){return <button className="role-card" disabled={disabled} onClick={()=>onClick(role)}><span>{role==="admin"?"A":role==="member"?"M":"V"}</span><strong>{title}</strong><small>{detail}</small><ArrowRight size={16}/></button>}

function OrderDetailDrawer({id,locale,role,onError,onDone}:{id:string;locale:Locale;role:string;onError:(message:string)=>void;onDone:()=>void}){
  const [order,setOrder]=useState<OrderDetail|null>(null);const [editing,setEditing]=useState(false);const [customer,setCustomer]=useState("");const [discount,setDiscount]=useState(0);const [comment,setComment]=useState("");const [payment,setPayment]=useState(0);const [paymentRef,setPaymentRef]=useState("");const [saving,setSaving]=useState(false);
  const load=async()=>{try{const data=await getOrder(id);setOrder(data);setCustomer(data.customerName);setDiscount(data.discountPct)}catch(e){onError(e instanceof Error?e.message:"Unable to load order")}};
  useEffect(()=>{load()},[id]);
  const save=async()=>{setSaving(true);try{await updateOrder(id,{customerName:customer,discountPct:discount});setEditing(false);await load()}catch(e){onError(e instanceof Error?e.message:"Unable to update order")}finally{setSaving(false)}};
  const remove=async()=>{if(!confirm(locale==="zh"?"确认删除此草稿订单？":"Delete this draft order?"))return;try{await deleteOrder(id);onDone()}catch(e){onError(e instanceof Error?e.message:"Unable to delete order")}};
  const act=async(action:"submit"|"approve"|"reject"|"purchase"|"receive"|"ship"|"pay")=>{setSaving(true);try{await performOrderAction(id,action,comment||undefined);setComment("");await load()}catch(e){onError(e instanceof Error?e.message:"Unable to update workflow")}finally{setSaving(false)}};
  const pay=async()=>{setSaving(true);try{await recordPayment(id,{amount:payment,reference:paymentRef||undefined});setPayment(0);setPaymentRef("");await load()}catch(e){onError(e instanceof Error?e.message:"Unable to record payment")}finally{setSaving(false)}};
  if(!order)return <div className="drawer-loading">{locale==="zh"?"正在加载订单详情…":"Loading order detail…"}</div>;
  return <div className="order-detail"><p className="eyebrow">{locale==="zh"?"订单详情":"ORDER DETAIL"}</p><div className="detail-title"><div><h2>{order.number}</h2><p>{order.customerName}</p></div><span className={`status s-${order.status}`}>{tx(locale,order.status)}</span></div>
    {editing?<div className="edit-panel"><label className="field">{tx(locale,"Customer")}<input value={customer} onChange={e=>setCustomer(e.target.value)}/></label><label className="field">{tx(locale,"Discount")}<input type="number" min="0" max="80" value={discount} onChange={e=>setDiscount(Number(e.target.value))}/></label><div className="detail-actions"><button className="secondary" onClick={()=>setEditing(false)}>{locale==="zh"?"取消":"Cancel"}</button><button className="primary" disabled={saving} onClick={save}>{saving?(locale==="zh"?"保存中…":"Saving…"):(locale==="zh"?"保存修改":"Save changes")}</button></div></div>:<><section className="detail-summary"><div><small>{tx(locale,"Total")}</small><strong>{money(Number(order.total))}</strong></div><div><small>{tx(locale,"Discount")}</small><strong>{order.discountPct}%</strong></div><div><small>{locale==="zh"?"商品":"Items"}</small><strong>{order.items?.length||0}</strong></div></section>{order.items?.map(item=><div className="detail-row" key={item.product.sku}><div><strong>{item.product.name}</strong><small>{item.product.sku}</small></div><span>× {item.quantity}</span></div>)}<DetailGroup title={locale==="zh"?"审批记录":"Approval"} empty={locale==="zh"?"尚无审批记录":"No approval yet"} rows={order.approvals.map(a=>[a.reason,tx(locale,a.status)])}/><DetailGroup title={locale==="zh"?"采购记录":"Purchasing"} empty={locale==="zh"?"尚无采购记录":"No purchase order yet"} rows={order.purchaseOrders.map(p=>[`${p.number} · ${p.supplier}`,tx(locale,p.status)])}/><DetailGroup title={locale==="zh"?"库存流水":"Inventory movements"} empty={locale==="zh"?"尚无库存流水":"No inventory movement yet"} rows={order.movements.map(m=>[`${m.reference} · ${m.quantity>0?"+":""}${m.quantity}`,tx(locale,m.kind)])}/>{order.receivable&&<DetailGroup title={locale==="zh"?`收款记录 · 待收 ${money(Number(order.receivable.amount)-Number(order.receivable.paid))}`:`Payments · ${money(Number(order.receivable.amount)-Number(order.receivable.paid))} due`} empty={locale==="zh"?"尚无收款记录":"No payment yet"} rows={order.receivable.payments.map(p=>[`${p.reference} · ${money(Number(p.amount))}`,new Date(p.createdAt).toLocaleDateString(locale==="zh"?"zh-CN":"en-US")])}/>}<DetailGroup title={locale==="zh"?"审计轨迹":"Audit trail"} empty={locale==="zh"?"尚无审计事件":"No audit event yet"} rows={order.audit.map(a=>[a.action,new Date(a.createdAt).toLocaleString(locale==="zh"?"zh-CN":"en-US")])}/>{role!=="viewer"&&order.status!=="paid"&&<section className="workflow-controls"><h3>{locale==="zh"?"工作流操作":"Workflow action"}</h3>{order.status==="approval"&&<label className="field">{locale==="zh"?"审批意见":"Decision note"}<input value={comment} onChange={e=>setComment(e.target.value)} placeholder={locale==="zh"?"可填写审批说明":"Optional decision note"}/></label>}{order.status==="shipped"&&role==="admin"&&<div className="payment-grid"><label className="field">{locale==="zh"?"本次收款金额":"Payment amount"}<input type="number" min="0.01" max={Number(order.receivable?.amount||0)-Number(order.receivable?.paid||0)} value={payment||""} onChange={e=>setPayment(Number(e.target.value))}/></label><label className="field">{locale==="zh"?"收款单号":"Reference"}<input value={paymentRef} onChange={e=>setPaymentRef(e.target.value)} placeholder="PAY-2026-001"/></label></div>}<div className="detail-actions">{order.status==="draft"&&<button className="primary" disabled={saving} onClick={()=>act("submit")}>{locale==="zh"?"提交订单":"Submit order"}</button>}{order.status==="approval"&&role==="admin"&&<><button className="danger-button" disabled={saving} onClick={()=>act("reject")}>{locale==="zh"?"驳回":"Reject"}</button><button className="primary" disabled={saving} onClick={()=>act("approve")}>{locale==="zh"?"批准":"Approve"}</button></>}{order.status==="approved"&&<button className="primary" disabled={saving} onClick={()=>act("purchase")}>{locale==="zh"?"检查库存并创建采购":"Check stock & purchase"}</button>}{order.status==="purchasing"&&<button className="primary" disabled={saving} onClick={()=>act("receive")}>{locale==="zh"?"确认收货":"Receive stock"}</button>}{order.status==="received"&&<button className="primary" disabled={saving} onClick={()=>act("ship")}>{locale==="zh"?"确认发货":"Ship order"}</button>}{order.status==="shipped"&&role==="admin"&&<button className="primary" disabled={saving||payment<=0} onClick={pay}>{locale==="zh"?"登记本次收款":"Record payment"}</button>}</div></section>}{order.status==="draft"&&role!=="viewer"&&<div className="detail-actions"><button className="secondary" onClick={()=>setEditing(true)}>{locale==="zh"?"编辑订单":"Edit order"}</button>{role==="admin"&&<button className="danger-button" onClick={remove}>{locale==="zh"?"删除草稿":"Delete draft"}</button>}</div>}</>}
  </div>
}
function DetailGroup({title,rows,empty}:{title:string;rows:string[][];empty:string}){return <section className="detail-group"><h3>{title}</h3>{rows.length?rows.map((row,i)=><div className="detail-event" key={i}><span>{row[0]}</span><em>{row[1]}</em></div>):<p>{empty}</p>}</section>}

function Metric({ icon: Icon, label, value, trend, note, warning=false }: any) { return <article className="metric"><span className={warning ? "metric-icon warning" : "metric-icon"}><Icon size={18}/></span><div><small>{label}</small><strong>{value}</strong></div><em className={trend ? "trend" : "note"}>{trend || note}</em></article>; }
function Queue({ icon: Icon, tone, title, text, meta }: any) { return <div className="queue-item"><span className={`queue-icon ${tone}`}><Icon size={16}/></span><div><strong>{title}</strong><small>{text}</small></div><em>{meta}</em><ChevronRight size={15}/></div>; }
function Stock({ name, sku, value, qty, danger=false }: any) { return <div className="stock"><div><strong>{name}</strong><small>{sku}</small></div><div className="bar"><i style={{width:`${value}%`}} className={danger ? "danger" : ""}/></div><span>{qty}</span></div>; }
function actionLabel(s: Stage) { return ({ draft:"Submit for approval", approval:"Approve order", approved:"Create purchase order", purchasing:"Receive stock", received:"Ship order", shipped:"Record payment", paid:"Done" } as const)[s]; }
function actionCopy(s: Stage) { return ({ draft:"The requested discount exceeds the 15% policy threshold.", approval:"Review margin impact and approve as Sales Lead.", approved:"Four Travel Mugs are short. Convert the suggestion to a PO.", purchasing:"Simulate the supplier delivery and book stock into Main warehouse.", received:"All stock is allocated. Create the shipment and inventory movement.", shipped:"Record the customer payment to close the receivable.", paid:"Every state change is retained in the audit trail." } as const)[s]; }
function moduleSubtitle(section: string) { return ({ "Sales orders":"Track every customer order from draft to payment.", Inventory:"Monitor stock availability, reservations and reorder points.", Purchasing:"Manage purchase orders and incoming supplier deliveries.", Approvals:"Review policy exceptions and keep decisions auditable.", Customers:"See customer value, open balances and recent activity.",Suppliers:"Maintain supplier contacts and purchasing relationships.",Receivables:"Track balances, aging and every payment allocation.","Audit log":"Review every immutable business event across the workspace." } as Record<string,string>)[section]; }

function ModuleView({section, locale, search, role, onError, onSelectOrder}:{section:string;locale:Locale;search:string;role:string;onError:(message:string)=>void;onSelectOrder:(id:string)=>void}) {
  const [filter, setFilter] = useState("All");
  const [page,setPage]=useState(1);
  const [orders,setOrders]=useState<Order[]>([]);
  const [resources,setResources]=useState<Resources|null>(null);
  const [audit,setAudit]=useState<AuditEvent[]>([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(false);
  const addContact=async(kind:"customer"|"supplier")=>{const name=prompt(locale==="zh"?`请输入${kind==="customer"?"客户":"供应商"}名称`:`Enter ${kind} name`);if(!name?.trim())return;const email=prompt(locale==="zh"?"联系邮箱（可选）":"Contact email (optional)")||undefined;setLoading(true);try{if(kind==="customer")await createCustomer({name:name.trim(),email});else await createSupplier({name:name.trim(),email});setResources(await getResources())}catch(e){onError(e instanceof Error?e.message:"Unable to create contact")}finally{setLoading(false)}};
  const loadOrders=async()=>{if(section!=="Sales orders")return;setLoading(true);try{const result=await listOrders({search,status:filter.toLowerCase(),page,pageSize:5});setOrders(result.items);setTotal(result.total);}catch(e){onError(e instanceof Error?e.message:"Unable to load orders");}finally{setLoading(false);}};
  useEffect(()=>{const timer=setTimeout(loadOrders,250);return()=>clearTimeout(timer);},[section,search,filter,page]);
  useEffect(()=>{if(section==="Sales orders")return;setLoading(true);(section==="Audit log"?getAudit().then(setAudit):getResources().then(setResources)).catch(e=>onError(e instanceof Error?e.message:"Unable to load data")).finally(()=>setLoading(false));},[section]);
  useEffect(()=>{setPage(1);setFilter("All")},[section]);
  const date=(value:string|Date|null|undefined)=>value?new Date(value).toLocaleDateString(locale==="zh"?"zh-CN":"en-US",{month:"short",day:"numeric"}):"—";
  const inventory=(resources?.products||[]).map(p=>[p.sku,p.name,String(p.onHand),String(p.reserved),String(p.reorderPoint),p.onHand-p.reserved<=p.reorderPoint?"Low stock":"Healthy"]);
  const data: Record<string,{columns:string[];rows:string[][];filters:string[]}> = {
    "Sales orders": { columns:["Order","Customer","Placed","Total","Owner","Status"], filters:["All","Open","Paid"], rows:orders.map(order=>[order.number,order.customerName,new Date(order.createdAt).toLocaleDateString(locale==="zh"?"zh-CN":"en-US",{month:"short",day:"numeric"}),money(Number(order.total)),"Alex Morgan",order.status])},
    Inventory: { columns:["SKU","Product","On hand","Reserved","Reorder point","Health"], filters:["All","Healthy","Low stock"], rows:inventory },
    Purchasing: { columns:["Purchase order","Supplier","Sales order","Quantity","Buyer","Status"], filters:["All","Open","Received"], rows:(resources?.purchases||[]).map(p=>[p.number,p.supplier,p.salesOrder.number,String(p.quantity),"Morgan Lee",p.status])},
    Approvals: { columns:["Request","Type","Submitted by","Value","Age","Status"], filters:["All","Pending","Resolved"], rows:(resources?.approvals||[]).map(a=>[a.order.number,a.reason,"Jamie Chen",money(Number(a.order.total)),date(a.order.createdAt),a.status])},
    Customers: { columns:["Customer","Orders","Lifetime value","Outstanding","Last order","Status"], filters:["All","Active","Outstanding"], rows:(resources?.customers||[]).map(c=>[c.name,String(c.orders),money(c.lifetimeValue),money(c.outstanding),date(c.lastOrder),c.outstanding>0?"Outstanding":"Active"])},
    Suppliers:{columns:["Supplier","Email","Phone","Purchase orders","Created","Status"],filters:["All","Active"],rows:(resources?.suppliers||[]).map(s=>[s.name,s.email||"—",s.phone||"—",String(s._count.purchaseOrders),date(s.createdAt),"Active"])},
    Receivables:{columns:["Order","Customer","Total","Paid","Outstanding","Status"],filters:["All","Open","Paid"],rows:(resources?.receivables||[]).map(r=>[r.order.number,r.order.customerName,money(Number(r.amount)),money(Number(r.paid)),money(Number(r.amount)-Number(r.paid)),r.status])},
    "Audit log":{columns:["Time","Action","Entity","Reference","Actor","Status"],filters:["All"],rows:audit.map(a=>[new Date(a.createdAt).toLocaleString(locale==="zh"?"zh-CN":"en-US"),a.action,a.entityType,String(a.detail.number||a.entityId).slice(0,18),String(a.detail.actor||"System"),"Recorded"])},
  };
  const table=data[section];
  const statusMatches=(row:string[])=>filter==="All"||row[row.length-1].toLowerCase().includes(filter.toLowerCase())||(filter==="Resolved"&&/approved/i.test(row[row.length-1]))||(filter==="Outstanding"&&row[3]!=="$0");
  const searched=section==="Sales orders"?table.rows:table.rows.filter(row=>!search||row.some(cell=>cell.toLowerCase().includes(search.toLowerCase())));
  const filtered=searched.filter(statusMatches);
  const rows=section==="Sales orders"?filtered:filtered.slice((page-1)*5,page*5);
  const recordTotal=section==="Sales orders"?total:filtered.length;
  const pages=Math.max(1,Math.ceil(recordTotal/5));
  const exportCsv=()=>{ const csv=[table.columns,...rows].map(row=>row.map(cell=>`"${cell.replaceAll('"','""')}"`).join(",")).join("\n"); const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); const a=document.createElement("a"); a.href=url;a.download=`${section.toLowerCase().replaceAll(" ","-")}.csv`;a.click();URL.revokeObjectURL(url); };
  return <article className="card module-card">
    <div className="module-toolbar"><div className="tabs">{table.filters.map(item=><button className={filter===item?"selected":""} onClick={()=>setFilter(item)} key={item}>{tx(locale,item)}</button>)}</div><div className="toolbar-actions">{section==="Customers"&&<button className="primary" disabled={role==="viewer"} onClick={()=>addContact("customer")}><Plus size={14}/>{locale==="zh"?"新增客户":"Add customer"}</button>}{section==="Suppliers"&&<button className="primary" disabled={role==="viewer"} onClick={()=>addContact("supplier")}><Plus size={14}/>{locale==="zh"?"新增供应商":"Add supplier"}</button>}<button className="secondary" onClick={exportCsv}>{tx(locale,"Export CSV")}</button></div></div>
    <div className="table-wrap"><table><thead><tr>{table.columns.map(col=><th key={col}>{tx(locale,col)}</th>)}{section==="Sales orders"&&<th>{locale==="zh"?"操作":"Actions"}</th>}</tr></thead><tbody>{loading?<tr><td colSpan={7}>{locale==="zh"?"正在加载…":"Loading…"}</td></tr>:rows.length===0?<tr><td className="empty-cell" colSpan={7}>{locale==="zh"?"没有匹配记录":"No matching records"}</td></tr>:rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{j===row.length-1?<span className={`cell-status ${/low|pending/i.test(cell)?"alert":""}`}>{tx(locale,cell)}</span>:cell}</td>)}{section==="Sales orders"&&<td><div className="row-actions"><button onClick={()=>onSelectOrder(orders[i].id)}><Eye size={13}/>{locale==="zh"?"详情":"Details"}</button></div></td>}</tr>)}</tbody></table></div>
    <div className="table-foot"><span>{recordTotal} {tx(locale,"records")}</span><div className="pagination"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={14}/></button><span>{page} / {pages}</span><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}><ChevronRight size={14}/></button></div></div>
  </article>;
}
function Tour({onStart,locale,busy}:{onStart:()=>void;locale:Locale;busy:boolean}) { return <div className="tour"><p className="eyebrow">{tx(locale,"3-MINUTE PRODUCT TOUR")}</p><h2>{tx(locale,"Run a real order-to-cash workflow.")}</h2><p>{tx(locale,"This workspace is yours. Every click changes the dashboard, inventory and operational queue.")}</p>{["Trigger a discount approval","Resolve a stock shortage with purchasing","Receive, ship and record payment","Inspect the audit trail behind every step"].map((x,i)=><div className="tour-step" key={x}><span>{i+1}</span>{tx(locale,x)}</div>)}<button className="primary wide" disabled={busy} onClick={onStart}>{busy?(locale==="zh"?"正在重置演示数据…":"Resetting workspace…"):tx(locale,"Start guided workflow")}<ArrowRight size={17}/></button><small className="privacy">{tx(locale,"No signup · isolated data · resets in 24 hours")}</small></div>; }
function OrderForm({onDone,locale,products,onError}:{onDone:()=>void;locale:Locale;products:Dashboard["products"];onError:(message:string)=>void}) {
  const [customer,setCustomer]=useState("Atlas Coffee Co.");const [items,setItems]=useState([{productSku:products[0]?.sku||"TM-104",quantity:1}]);const [discount,setDiscount]=useState(0);const [saving,setSaving]=useState(false);
  const update=(index:number,patch:Partial<(typeof items)[number]>)=>setItems(rows=>rows.map((row,i)=>i===index?{...row,...patch}:row));
  const subtotal=items.reduce((sum,line)=>sum+Number(products.find(p=>p.sku===line.productSku)?.unitPrice||0)*line.quantity,0);const total=subtotal*(1-discount/100);
  const save=async()=>{setSaving(true);try{await createOrder({customerName:customer,items,discountPct:discount});onDone()}catch(e){onError(e instanceof Error?e.message:"Unable to create order")}finally{setSaving(false)}};
  return <div className="tour"><p className="eyebrow">{tx(locale,"NEW SALES ORDER")}</p><h2>{tx(locale,"Create an order")}</h2><label className="field">{tx(locale,"Customer")}<input value={customer} onChange={e=>setCustomer(e.target.value)}/></label><div className="line-items"><strong>{locale==="zh"?"订单商品":"Order items"}</strong>{items.map((line,i)=><div className="line-item" key={i}><select value={line.productSku} onChange={e=>update(i,{productSku:e.target.value})}>{products.map(p=><option value={p.sku} disabled={items.some((x,j)=>j!==i&&x.productSku===p.sku)} key={p.id}>{p.name} · {money(Number(p.unitPrice))}</option>)}</select><input aria-label={`Quantity ${i+1}`} type="number" min="1" value={line.quantity} onChange={e=>update(i,{quantity:Number(e.target.value)})}/><button aria-label={`Remove item ${i+1}`} disabled={items.length===1} onClick={()=>setItems(rows=>rows.filter((_,j)=>j!==i))}><Trash2 size={15}/></button></div>)}</div><button className="secondary add-line" disabled={items.length>=products.length} onClick={()=>{const product=products.find(p=>!items.some(x=>x.productSku===p.sku));if(product)setItems(rows=>[...rows,{productSku:product.sku,quantity:1}])}}><Plus size={14}/>{locale==="zh"?"添加商品":"Add item"}</button><div className="form-row"><label className="field">{tx(locale,"Discount")}<input type="number" min="0" max="80" value={discount} onChange={e=>setDiscount(Number(e.target.value))}/></label><div className="order-total"><small>{locale==="zh"?"订单总额":"Order total"}</small><strong>{money(total)}</strong></div></div>{discount>15&&<div className="policy"><Sparkles size={17}/><div><strong>{tx(locale,"Approval will be required")}</strong><small>{tx(locale,"Discounts above 15% need a Sales Lead.")}</small></div></div>}<button className="primary wide" disabled={saving||!customer.trim()||items.some(i=>i.quantity<1)} onClick={save}>{saving?(locale==="zh"?"保存中…":"Saving…"):tx(locale,"Save draft")}</button></div>;
}
