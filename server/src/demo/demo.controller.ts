import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DemoService } from './demo.service';
import { DemoSessionDto } from './demo.dto';
@ApiTags('demo')
@Controller('demo')
export class DemoController {
  constructor(private readonly demo: DemoService) {}
  @Post('session')
  @ApiOperation({ summary: 'Create an isolated, seeded operations workspace' })
  create(@Body() dto:DemoSessionDto) { return this.demo.create(dto.role); }
  @Get('cleanup')
  @ApiOperation({ summary: 'Delete demo organizations older than 24 hours (Vercel Cron)' })
  cleanup(@Headers('authorization') authorization?:string) {
    const secret=process.env.CRON_SECRET;
    if(!secret||authorization!==`Bearer ${secret}`) throw new UnauthorizedException('Invalid cron authorization');
    return this.demo.cleanupExpired();
  }
}
