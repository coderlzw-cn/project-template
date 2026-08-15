import { PrismaModule } from '@/module/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { ApplicationHealthIndicator } from './application.health-indicator';
import { ConfigHealthIndicator } from './config.health-indicator';
import { EventLoopHealthIndicator } from './event-loop.health-indicator';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule, TerminusModule, PrismaModule],
  controllers: [HealthController],
  providers: [ApplicationHealthIndicator, ConfigHealthIndicator, EventLoopHealthIndicator],
})
export class HealthModule {}
