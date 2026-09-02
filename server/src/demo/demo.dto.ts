import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
export class DemoSessionDto {
  @ApiPropertyOptional({enum:['admin','member','viewer'],default:'admin'})
  @IsOptional() @IsIn(['admin','member','viewer']) role:'admin'|'member'|'viewer'='admin';
}
