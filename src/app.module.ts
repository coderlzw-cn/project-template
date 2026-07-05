import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import path from 'path';
import { appConfig, jwtConfig } from './config/app.config';
import { UserModule } from './user/user.module';
const envFilePath = [path.join(process.cwd(), '.env'), path.join(process.cwd(), `.env.production`), path.join(process.cwd(), `.env.development`)];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: false, envFilePath, load: [appConfig] }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000, // 时间窗口：60,000 毫秒 (1分钟)
          limit: 100, // 限制次数：每个 IP 在 1 分钟内最多 100 次请求
        },
      ],
    }),
    CacheModule.register({
      isGlobal: true, // 设置为全局模块
      ttl: 5, // 默认缓存时间 5 秒
      max: 100, // 内存中最大缓存条目数
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    UserModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // },
  ],
})
export class AppModule {}
