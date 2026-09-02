import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) search?: string;
  @ApiPropertyOptional({ enum:['all','open','paid'] }) @IsOptional() @IsIn(['all','open','paid']) status: 'all'|'open'|'paid'='all';
  @ApiPropertyOptional({ default:1 }) @IsOptional() @Type(()=>Number) @IsInt() @Min(1) page=1;
  @ApiPropertyOptional({ default:10, maximum:50 }) @IsOptional() @Type(()=>Number) @IsInt() @Min(1) @Max(50) pageSize=10;
}

export class OrderItemDto {
  @ApiProperty({ example:'TM-104' }) @IsNotEmpty() @MaxLength(40) productSku!: string;
  @ApiProperty({ example:12 }) @IsInt() @Min(1) @Max(1000) quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example:'Atlas Coffee Co.' }) @IsNotEmpty() @MaxLength(160) customerName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customerId?: string;
  @ApiProperty({ type:[OrderItemDto] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({each:true}) @Type(()=>OrderItemDto) items!:OrderItemDto[];
  @ApiProperty({ example:20 }) @IsInt() @Min(0) @Max(80) discountPct!: number;
}

export class UpdateOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsNotEmpty() @MaxLength(160) customerName?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(80) discountPct?: number;
}

export class WorkflowActionDto {
  @ApiProperty({ enum:['submit','approve','reject','purchase','receive','ship','pay'] })
  @IsIn(['submit','approve','reject','purchase','receive','ship','pay'])
  action!: 'submit'|'approve'|'reject'|'purchase'|'receive'|'ship'|'pay';

  @ApiPropertyOptional({ maxLength:240 }) @IsOptional() @IsString() @MaxLength(240)
  comment?: string;
}

export class ContactDto {
  @ApiProperty() @IsNotEmpty() @MaxLength(160) name!:string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(255) email?:string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?:string;
}

export class PaymentDto {
  @ApiProperty({example:5000}) @Type(()=>Number) @IsNumber({maxDecimalPlaces:2}) @Min(0.01) amount!:number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) reference?:string;
}
