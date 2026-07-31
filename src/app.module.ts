import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { appConfig } from './config/app.config';
import { HealthModule } from './infrastructure/health/health.module';
import { InfluxdbModule } from './infrastructure/influxdb';
import { UserModule } from './module/user/user.module';
import { LicenseModule } from './license/license.module';
import { join } from 'node:path';
import { isDevelopment } from './utils/env';
import { AuthModule } from './module/auth/auth.module';

console.log(join(__dirname, 'i18n'));

const nodeEnv = process.env.NODE_ENV ?? 'development';
const envFilePath = [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env.local', '.env'];
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
    HealthModule,
    UserModule,
    LicenseModule,
    AuthModule,
    InfluxdbModule.forRoot({
      isGlobal: true,
      host: 'http://197.0.0.1',
      token: 'demo',
      database: 'demo',
      logging: true,
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'zh',
      fallbacks: {
        'zh-*': 'zh',
        'en-*': 'en',
      },
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: isDevelopment,
      },
      resolvers: [
        new AcceptLanguageResolver({
          matchType: 'strict-loose',
        }),
      ],
    }),
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
