import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUser } from '../auth/jwt.strategy';
import { ContactDto, CreateOrderDto, OrderQueryDto, PaymentDto, UpdateOrderDto, WorkflowActionDto } from './dto/order.dto';
import { orderTotal, shortage } from './workflow';

@Injectable()
export class OperationsService {
  constructor(private readonly prisma:PrismaService){}
  async orders(organizationId:string,query:OrderQueryDto){
    const search=query.search?.trim();
    const where={organizationId,...(query.status==='paid'?{status:'paid'}:query.status==='open'?{status:{not:'paid'}}:{}),...(search?{OR:[{number:{contains:search,mode:'insensitive' as const}},{customerName:{contains:search,mode:'insensitive' as const}}]}:{})};
    const [items,total]=await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({where,orderBy:{createdAt:'desc'},skip:(query.page-1)*query.pageSize,take:query.pageSize,include:{items:{include:{product:true}}}}),
      this.prisma.salesOrder.count({where}),
    ]);
    return {items,total,page:query.page,pageSize:query.pageSize,pages:Math.max(1,Math.ceil(total/query.pageSize))};
  }
  async orderDetail(organizationId:string,id:string){
    const order=await this.prisma.salesOrder.findFirst({where:{id,organizationId},include:{items:{include:{product:true}},approvals:true,purchaseOrders:true,receivable:{include:{payments:{orderBy:{createdAt:'desc'}}}}}});
    if(!order) throw new NotFoundException('Order not found');
    const [movements,audit]=await Promise.all([
      this.prisma.inventoryMovement.findMany({where:{productId:{in:order.items.map(i=>i.productId)},reference:{in:[order.number,...order.purchaseOrders.map(p=>p.number)]}},orderBy:{createdAt:'desc'}}),
      this.prisma.auditEvent.findMany({where:{organizationId,entityId:id},orderBy:{createdAt:'desc'}}),
    ]);
    return {...order,movements,audit};
  }
  async resources(organizationId:string){
    const [products,purchases,approvals,customers,suppliers,receivables]=await Promise.all([
      this.prisma.product.findMany({where:{organizationId},orderBy:{sku:'asc'}}),
      this.prisma.purchaseOrder.findMany({where:{organizationId},include:{salesOrder:true},orderBy:{number:'desc'}}),
      this.prisma.approval.findMany({where:{organizationId},include:{order:true},orderBy:{order:{createdAt:'desc'}}}),
      this.customers(organizationId),
      this.suppliers(organizationId),
      this.prisma.receivable.findMany({where:{organizationId},include:{order:true,payments:{orderBy:{createdAt:'desc'}}},orderBy:{order:{createdAt:'desc'}}}),
    ]);
    return {products,purchases,approvals,customers,suppliers,receivables};
  }
  async createOrder(user:CurrentUser,dto:CreateOrderDto){
    if(user.role==='viewer') throw new ForbiddenException('Viewer role cannot create orders');
    const skus=[...new Set(dto.items.map(i=>i.productSku))];
    if(skus.length!==dto.items.length) throw new BadRequestException('Duplicate products are not allowed');
    const products=await this.prisma.product.findMany({where:{organizationId:user.organizationId,sku:{in:skus}}});
    if(products.length!==skus.length) throw new NotFoundException('One or more products were not found');
    const customer=dto.customerId?await this.prisma.customer.findFirst({where:{id:dto.customerId,organizationId:user.organizationId}}):await this.prisma.customer.upsert({where:{organizationId_name:{organizationId:user.organizationId,name:dto.customerName.trim()}},create:{organizationId:user.organizationId,name:dto.customerName.trim()},update:{}});
    if(!customer) throw new NotFoundException('Customer not found');
    const number=`SO-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,4).toUpperCase()}`;
    const lines=dto.items.map(line=>{const product=products.find(p=>p.sku===line.productSku)!;return {productId:product.id,quantity:line.quantity,unitPrice:product.unitPrice};});
    const total=orderTotal(lines,dto.discountPct);
    const order=await this.prisma.salesOrder.create({data:{organizationId:user.organizationId,customerId:customer.id,number,customerName:customer.name,discountPct:dto.discountPct,total,status:'draft',items:{create:lines}},include:{items:{include:{product:true}}}});
    await this.prisma.auditEvent.create({data:{organizationId:user.organizationId,entityType:'sales_order',entityId:order.id,action:'order.created',detail:{number,actor:user.name}}});
    return order;
  }
  async updateOrder(user:CurrentUser,id:string,dto:UpdateOrderDto){
    if(user.role==='viewer') throw new ForbiddenException('Viewer role cannot edit orders');
    const order=await this.prisma.salesOrder.findFirst({where:{id,organizationId:user.organizationId},include:{items:true}});
    if(!order) throw new NotFoundException('Order not found');
    if(order.status!=='draft') throw new BadRequestException('Only draft orders can be edited');
    const discount=dto.discountPct??order.discountPct;
    const customerName=dto.customerName?.trim();
    const customer=customerName&&customerName!==order.customerName
      ?await this.prisma.customer.upsert({where:{organizationId_name:{organizationId:user.organizationId,name:customerName}},create:{organizationId:user.organizationId,name:customerName},update:{}})
      :null;
    const updated=await this.prisma.salesOrder.update({where:{id},data:{customerId:customer?.id,customerName,total:orderTotal(order.items,discount),discountPct:dto.discountPct}});
    await this.auditChange(user,id,'order.updated',{number:order.number,before:{customerName:order.customerName,discountPct:order.discountPct},after:{customerName:updated.customerName,discountPct:updated.discountPct}});
    return updated;
  }
  async deleteOrder(user:CurrentUser,id:string){
    if(user.role!=='admin') throw new ForbiddenException('Only admins can delete orders');
    const order=await this.prisma.salesOrder.findFirst({where:{id,organizationId:user.organizationId}});
    if(!order) throw new NotFoundException('Order not found');
    if(order.status!=='draft') throw new BadRequestException('Only draft orders can be deleted');
    await this.auditChange(user,id,'order.deleted',{number:order.number,status:order.status});
    await this.prisma.salesOrder.delete({where:{id}});
    return {deleted:true,id};
  }
  async dashboard(organizationId:string){
    const [order,products,pending,receivables] = await Promise.all([
      this.prisma.salesOrder.findFirst({where:{organizationId,number:'SO-1048'},include:{items:{include:{product:true}},approvals:true,purchaseOrders:true,receivable:true}}),
      this.prisma.product.findMany({where:{organizationId},orderBy:{sku:'asc'}}),
      this.prisma.approval.count({where:{organizationId,status:'pending'}}),
      this.prisma.receivable.aggregate({where:{organizationId},_sum:{amount:true,paid:true}}),
    ]);
    if(!order) throw new NotFoundException('No order exists in this workspace');
    const outstanding = Number(receivables._sum.amount??0)-Number(receivables._sum.paid??0);
    return { order, products, metrics:{revenue:Number(receivables._sum.paid??0),outstanding,lowStock:products.filter(p=>p.onHand-p.reserved<=p.reorderPoint).length,approvals:pending} };
  }
  async advance(user:CurrentUser,id:string){
    const order=await this.prisma.salesOrder.findFirst({where:{id,organizationId:user.organizationId}});
    if(!order) throw new NotFoundException('Order not found');
    const action=({draft:'submit',approval:'approve',approved:'purchase',purchasing:'receive',received:'ship',shipped:'pay'} as const)[order.status];
    if(!action) throw new BadRequestException('Order workflow is already complete');
    await this.performAction(user,id,{action});
    return this.dashboard(user.organizationId);
  }

  async performAction(user:CurrentUser,id:string,dto:WorkflowActionDto){
    if(user.role==='viewer') throw new ForbiddenException('Viewer role cannot change workflow state');
    if((dto.action==='approve'||dto.action==='reject'||dto.action==='pay')&&user.role!=='admin') throw new ForbiddenException('This action requires an administrator');
    const organizationId=user.organizationId;
    await this.prisma.$transaction(async tx=>{
      const order=await tx.salesOrder.findFirst({where:{id,organizationId},include:{items:{include:{product:true}},approvals:true,purchaseOrders:true,receivable:true}});
      if(!order) throw new NotFoundException('Order not found');
      let next:string;
      if(dto.action==='submit'){
        if(order.status!=='draft') throw new BadRequestException('Only a draft can be submitted');
        next=order.discountPct>15?'approval':'approved';
        if(next==='approval') await tx.approval.upsert({where:{organizationId_orderId:{organizationId,orderId:id}},create:{organizationId,orderId:id,reason:`Discount ${order.discountPct}% exceeds the 15% policy threshold`},update:{status:'pending',reason:`Discount ${order.discountPct}% exceeds the 15% policy threshold`,decidedAt:null}});
      } else if(dto.action==='approve'||dto.action==='reject'){
        if(order.status!=='approval') throw new BadRequestException('Order is not awaiting approval');
        const approved=dto.action==='approve'; next=approved?'approved':'draft';
        await tx.approval.updateMany({where:{organizationId,orderId:id,status:'pending'},data:{status:approved?'approved':'rejected',reason:dto.comment?.trim()||order.approvals[0]?.reason||'Policy review',decidedAt:new Date()}});
      } else if(dto.action==='purchase'){
        if(order.status!=='approved') throw new BadRequestException('Order must be approved before purchasing');
        if(!order.items.length) throw new BadRequestException('Order has no items');
        const shortages=order.items.map(item=>({item,quantity:shortage(item.product.onHand,item.product.reserved,item.quantity)})).filter(x=>x.quantity>0);
        next=shortages.length?'purchasing':'received';
        for(const line of shortages)await tx.purchaseOrder.create({data:{organizationId,salesOrderId:id,productId:line.item.productId,number:`PO-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,4).toUpperCase()}`,supplier:'Northstar Supply',quantity:line.quantity}});
      } else if(dto.action==='receive'){
        if(order.status!=='purchasing') throw new BadRequestException('Order has no stock awaiting receipt'); next='received';
        const open=order.purchaseOrders.filter(p=>p.status==='ordered');if(!open.length)throw new BadRequestException('Purchase order is incomplete');
        for(const po of open){if(!po.productId)throw new BadRequestException('Purchase order has no product');await tx.product.update({where:{id:po.productId},data:{onHand:{increment:po.quantity}}});await tx.inventoryMovement.create({data:{productId:po.productId,kind:'receipt',quantity:po.quantity,reference:po.number}});await tx.purchaseOrder.update({where:{id:po.id},data:{status:'received'}});}
      } else if(dto.action==='ship'){
        if(order.status!=='received') throw new BadRequestException('Stock must be available before shipment'); next='shipped';
        if(order.items.some(item=>item.product.onHand<item.quantity))throw new BadRequestException('Insufficient stock to ship');
        for(const item of order.items){await tx.product.update({where:{id:item.productId},data:{onHand:{decrement:item.quantity}}});await tx.inventoryMovement.create({data:{productId:item.productId,kind:'shipment',quantity:-item.quantity,reference:order.number}});}
        await tx.receivable.create({data:{organizationId,orderId:id,amount:order.total}});
      } else {
        if(order.status!=='shipped'||!order.receivable) throw new BadRequestException('Only a shipped order can be paid'); next='paid';
        const balance=Number(order.receivable.amount)-Number(order.receivable.paid);
        if(balance<=0)throw new BadRequestException('Receivable is already paid');
        await tx.payment.create({data:{organizationId,receivableId:order.receivable.id,amount:balance,reference:`PAY-${crypto.randomUUID().slice(0,8).toUpperCase()}`}});
        await tx.receivable.update({where:{orderId:id},data:{paid:order.total,status:'paid'}});
      }
      const changed=await tx.salesOrder.updateMany({where:{id,organizationId,status:order.status},data:{status:next}});
      if(changed.count!==1) throw new BadRequestException('Order changed concurrently; refresh and retry');
      await tx.auditEvent.create({data:{organizationId,entityType:'sales_order',entityId:id,action:this.eventAction(`order.${dto.action}`),detail:{from:order.status,to:next,number:order.number,actor:user.name,comment:dto.comment||null}}});
    },{isolationLevel:'Serializable'});
    return this.orderDetail(organizationId,id);
  }

  private auditChange(user:CurrentUser,id:string,action:string,detail:Record<string,unknown>){return this.prisma.auditEvent.create({data:{organizationId:user.organizationId,entityType:'sales_order',entityId:id,action:this.eventAction(action),detail:{...detail,actor:user.name}}});}
  private eventAction(action:string){return `${action}.${crypto.randomUUID().slice(0,8)}`;}
  audit(organizationId:string){return this.prisma.auditEvent.findMany({where:{organizationId},orderBy:{createdAt:'desc'},take:50});}

  async customers(organizationId:string){
    const rows=await this.prisma.customer.findMany({where:{organizationId},include:{orders:{include:{receivable:true},orderBy:{createdAt:'desc'}}},orderBy:{name:'asc'}});
    return rows.map(c=>({...c,orders:c.orders.length,lifetimeValue:c.orders.reduce((s,o)=>s+Number(o.total),0),outstanding:c.orders.reduce((s,o)=>s+(o.receivable?Number(o.receivable.amount)-Number(o.receivable.paid):0),0),lastOrder:c.orders[0]?.createdAt??c.createdAt}));
  }
  async createCustomer(user:CurrentUser,dto:ContactDto){this.ensureWriter(user);return this.prisma.customer.create({data:{organizationId:user.organizationId,...dto}});}
  async updateCustomer(user:CurrentUser,id:string,dto:ContactDto){this.ensureWriter(user);await this.ensureContact('customer',user.organizationId,id);return this.prisma.customer.update({where:{id},data:dto});}
  async deleteCustomer(user:CurrentUser,id:string){this.ensureAdmin(user);await this.ensureContact('customer',user.organizationId,id);const used=await this.prisma.salesOrder.count({where:{organizationId:user.organizationId,customerId:id}});if(used)throw new BadRequestException('Customer with orders cannot be deleted');await this.prisma.customer.delete({where:{id}});return {deleted:true};}
  suppliers(organizationId:string){return this.prisma.supplier.findMany({where:{organizationId},include:{_count:{select:{purchaseOrders:true}}},orderBy:{name:'asc'}});}
  async createSupplier(user:CurrentUser,dto:ContactDto){this.ensureWriter(user);return this.prisma.supplier.create({data:{organizationId:user.organizationId,...dto}});}
  async updateSupplier(user:CurrentUser,id:string,dto:ContactDto){this.ensureWriter(user);await this.ensureContact('supplier',user.organizationId,id);return this.prisma.supplier.update({where:{id},data:dto});}
  async deleteSupplier(user:CurrentUser,id:string){this.ensureAdmin(user);await this.ensureContact('supplier',user.organizationId,id);const used=await this.prisma.purchaseOrder.count({where:{organizationId:user.organizationId,supplierId:id}});if(used)throw new BadRequestException('Supplier with purchase orders cannot be deleted');await this.prisma.supplier.delete({where:{id}});return {deleted:true};}
  async recordPayment(user:CurrentUser,id:string,dto:PaymentDto){
    this.ensureAdmin(user);
    await this.prisma.$transaction(async tx=>{const order=await tx.salesOrder.findFirst({where:{id,organizationId:user.organizationId},include:{receivable:true}});if(!order?.receivable)throw new BadRequestException('Order has no receivable');const remaining=Number(order.receivable.amount)-Number(order.receivable.paid);if(dto.amount>remaining)throw new BadRequestException('Payment exceeds outstanding balance');const paid=Number(order.receivable.paid)+dto.amount;const status=paid>=Number(order.receivable.amount)?'paid':'partial';const reference=dto.reference?.trim()||`PAY-${crypto.randomUUID().slice(0,8).toUpperCase()}`;await tx.payment.create({data:{organizationId:user.organizationId,receivableId:order.receivable.id,amount:dto.amount,reference}});await tx.receivable.update({where:{id:order.receivable.id},data:{paid,status}});if(status==='paid')await tx.salesOrder.update({where:{id},data:{status:'paid'}});await tx.auditEvent.create({data:{organizationId:user.organizationId,entityType:'sales_order',entityId:id,action:this.eventAction('order.payment'),detail:{number:order.number,amount:dto.amount,remaining:remaining-dto.amount,reference,actor:user.name}}});},{isolationLevel:'Serializable'});
    return this.orderDetail(user.organizationId,id);
  }
  private ensureWriter(user:CurrentUser){if(user.role==='viewer')throw new ForbiddenException('Viewer role is read-only');}
  private ensureAdmin(user:CurrentUser){if(user.role!=='admin')throw new ForbiddenException('Administrator access required');}
  private async ensureContact(type:'customer'|'supplier',organizationId:string,id:string){const found=type==='customer'?await this.prisma.customer.findFirst({where:{id,organizationId}}):await this.prisma.supplier.findFirst({where:{id,organizationId}});if(!found)throw new NotFoundException(`${type} not found`);}
}
