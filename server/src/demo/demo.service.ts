import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DemoService {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService) {}
  async create(role:'admin'|'member'|'viewer'='admin') {
    const suffix = crypto.randomUUID().slice(0, 8);
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    const user = await this.prisma.user.create({
      data: { email: `demo-${suffix}@orderpilot.local`, name: role==='admin'?'Alex Morgan':role==='member'?'Jamie Chen':'Taylor Reed', passwordHash, role, organization: { create: { name: 'Northwind Goods', isDemo: true } } },
      include: { organization: true },
    });
    const products = await Promise.all([
      ['CB-001','Canvas Backpack',12800,86,20],['TM-104','Travel Mug / Charcoal',160000,4,10],['DO-220','Desk Organizer',7600,31,15],['WP-410','Weekly Planner',3200,21,12],
    ].map(([sku,name,price,onHand,reorderPoint]) => this.prisma.product.create({ data: { organizationId:user.organizationId, sku:String(sku), name:String(name), unitPrice:Number(price)/100, onHand:Number(onHand), reorderPoint:Number(reorderPoint) } })));
    const customers=await Promise.all([['Atlas Coffee Co.','ops@atlas.example'],['Campfire Studio','finance@campfire.example'],['Juniper Market','hello@juniper.example'],['Field Notes Co.','sales@fieldnotes.example']].map(([name,email])=>this.prisma.customer.create({data:{organizationId:user.organizationId,name,email}})));
    const suppliers=await Promise.all([['Northstar Supply','orders@northstar.example'],['Harbor Supply','dock@harbor.example']].map(([name,email])=>this.prisma.supplier.create({data:{organizationId:user.organizationId,name,email}})));
    const mug = products[1];
    const guided=await this.prisma.salesOrder.create({ data: { organizationId:user.organizationId,customerId:customers[0].id, number:'SO-1048', customerName:'Atlas Coffee Co.', status:'draft', discountPct:20, total:12288, items:{create:[{productId:mug.id,quantity:8,unitPrice:1600},{productId:products[2].id,quantity:4,unitPrice:640}]} } });
    const shipped=await this.prisma.salesOrder.create({data:{organizationId:user.organizationId,customerId:customers[1].id,number:'SO-1047',customerName:'Campfire Studio',status:'shipped',discountPct:5,total:8420,items:{create:{productId:products[0].id,quantity:4,unitPrice:2105}},receivable:{create:{organizationId:user.organizationId,amount:8420,paid:2420,status:'partial',payments:{create:{organizationId:user.organizationId,amount:2420,reference:'PAY-DEPOSIT-1047'}}}}}});
    const paid=await this.prisma.salesOrder.create({data:{organizationId:user.organizationId,customerId:customers[2].id,number:'SO-1046',customerName:'Juniper Market',status:'paid',discountPct:0,total:4980,items:{create:{productId:products[2].id,quantity:6,unitPrice:830}},receivable:{create:{organizationId:user.organizationId,amount:4980,paid:4980,status:'paid',payments:{create:{organizationId:user.organizationId,amount:4980,reference:'PAY-FULL-1046'}}}}}});
    const awaiting=await this.prisma.salesOrder.create({data:{organizationId:user.organizationId,customerId:customers[3].id,number:'SO-1045',customerName:'Field Notes Co.',status:'approval',discountPct:18,total:12240,items:{create:{productId:products[3].id,quantity:12,unitPrice:1020}}}});
    await this.prisma.approval.create({data:{organizationId:user.organizationId,orderId:awaiting.id,status:'pending',reason:'Discount exceeds the 15% policy threshold'}});
    await this.prisma.purchaseOrder.create({data:{organizationId:user.organizationId,salesOrderId:shipped.id,productId:products[0].id,supplierId:suppliers[1].id,number:'PO-2044',supplier:'Harbor Supply',status:'ordered',quantity:24}});
    await this.prisma.auditEvent.createMany({data:[{organizationId:user.organizationId,entityType:'sales_order',entityId:guided.id,action:'order.created',detail:{number:'SO-1048',actor:user.name}},{organizationId:user.organizationId,entityType:'sales_order',entityId:shipped.id,action:'order.shipped',detail:{number:'SO-1047',actor:'Morgan Lee'}},{organizationId:user.organizationId,entityType:'sales_order',entityId:paid.id,action:'order.paid',detail:{number:'SO-1046',actor:'Jamie Chen'}}]});
    return this.auth.issueToken(user);
  }

  async cleanupExpired() {
    const cutoff=new Date(Date.now()-24*60*60*1000);
    const result=await this.prisma.organization.deleteMany({where:{isDemo:true,createdAt:{lt:cutoff}}});
    return {deletedOrganizations:result.count,cutoff:cutoff.toISOString()};
  }

}
