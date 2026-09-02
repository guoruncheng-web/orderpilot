import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DemoModule } from './demo/demo.module';
import { HealthController } from './health.controller';
import { OperationsModule } from './operations/operations.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, DemoModule, OperationsModule], controllers: [HealthController] })
export class AppModule {}
