import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser as User } from '../auth/jwt.strategy';
import { OperationsService } from './operations.service';
import { ContactDto, CreateOrderDto, OrderQueryDto, PaymentDto, UpdateOrderDto, WorkflowActionDto } from './dto/order.dto';

@ApiTags('operations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}
  @Get('dashboard') @ApiOperation({summary:'Return metrics, products and the guided order'}) dashboard(@CurrentUser() u:User){ return this.operations.dashboard(u.organizationId); }
  @Get('orders') @ApiOperation({summary:'Search and paginate tenant sales orders'}) orders(@CurrentUser() u:User,@Query() query:OrderQueryDto){ return this.operations.orders(u.organizationId,query); }
  @Get('orders/:id') @ApiOperation({summary:'Return an order with items, approval, purchasing, inventory and audit detail'}) order(@CurrentUser() u:User,@Param('id') id:string){return this.operations.orderDetail(u.organizationId,id);}
  @Get('resources') @ApiOperation({summary:'Return real inventory, purchasing, approvals and customer aggregates'}) resources(@CurrentUser() u:User){return this.operations.resources(u.organizationId);}
  @Post('orders') @ApiOperation({summary:'Create a draft sales order'}) createOrder(@CurrentUser() u:User,@Body() dto:CreateOrderDto){ return this.operations.createOrder(u,dto); }
  @Patch('orders/:id') @ApiOperation({summary:'Edit a draft sales order'}) updateOrder(@CurrentUser() u:User,@Param('id') id:string,@Body() dto:UpdateOrderDto){ return this.operations.updateOrder(u,id,dto); }
  @Delete('orders/:id') @ApiOperation({summary:'Delete a draft sales order (admin only)'}) deleteOrder(@CurrentUser() u:User,@Param('id') id:string){ return this.operations.deleteOrder(u,id); }
  @Post('orders/:id/advance') @ApiOperation({summary:'Advance the guided order by one validated business transition'}) advance(@CurrentUser() u:User,@Param('id') id:string){ return this.operations.advance(u,id); }
  @Post('orders/:id/actions') @ApiOperation({summary:'Execute an explicit approval, purchasing, warehouse or payment action'}) action(@CurrentUser() u:User,@Param('id') id:string,@Body() dto:WorkflowActionDto){ return this.operations.performAction(u,id,dto); }
  @Post('orders/:id/payments') @ApiOperation({summary:'Record a partial or final receivable payment'}) payment(@CurrentUser() u:User,@Param('id') id:string,@Body() dto:PaymentDto){return this.operations.recordPayment(u,id,dto);}
  @Get('customers') customers(@CurrentUser() u:User){return this.operations.customers(u.organizationId);}
  @Post('customers') createCustomer(@CurrentUser() u:User,@Body() dto:ContactDto){return this.operations.createCustomer(u,dto);}
  @Patch('customers/:id') updateCustomer(@CurrentUser() u:User,@Param('id') id:string,@Body() dto:ContactDto){return this.operations.updateCustomer(u,id,dto);}
  @Delete('customers/:id') deleteCustomer(@CurrentUser() u:User,@Param('id') id:string){return this.operations.deleteCustomer(u,id);}
  @Get('suppliers') suppliers(@CurrentUser() u:User){return this.operations.suppliers(u.organizationId);}
  @Post('suppliers') createSupplier(@CurrentUser() u:User,@Body() dto:ContactDto){return this.operations.createSupplier(u,dto);}
  @Patch('suppliers/:id') updateSupplier(@CurrentUser() u:User,@Param('id') id:string,@Body() dto:ContactDto){return this.operations.updateSupplier(u,id,dto);}
  @Delete('suppliers/:id') deleteSupplier(@CurrentUser() u:User,@Param('id') id:string){return this.operations.deleteSupplier(u,id);}
  @Get('audit') @ApiOperation({summary:'Return the latest tenant-scoped audit events'}) audit(@CurrentUser() u:User){ return this.operations.audit(u.organizationId); }
}
