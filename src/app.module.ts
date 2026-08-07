import { PrismaModule } from '@/module/prisma/prisma.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { join } from 'node:path';
import { appConfig } from './config/app.config';
import { authJwtValidationSchema } from './config/jwt.config';
import { mysqlConfig, mysqlValidationSchema } from './config/mysql.config';
import { DEFAULT_LANGUAGE, LANGUAGE_FALLBACKS } from './constants/i18n.constants';
import { HealthModule } from './infrastructure/health/health.module';
import { InfluxdbModule } from './infrastructure/influxdb';
import { licenseValidationSchema } from './license/license.config';
import { LicenseModule } from './license/license.module';
import { AuthModule } from './module/auth/auth.module';
import { UserModule } from './module/user/user.module';
import { environment, isDevelopment, isProduction } from './utils/env';
const envFilePath = [`.env.${environment}.local`, `.env.${environment}`, '.env.local', '.env'];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: false,
      envFilePath,
      load: [appConfig, mysqlConfig],
      validationSchema: authJwtValidationSchema.concat(mysqlValidationSchema).concat(licenseValidationSchema),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'client'),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    HealthModule,
    UserModule,
    LicenseModule,
    PrismaModule,
    AuthModule,
    InfluxdbModule.forRoot({
      isGlobal: true,
      host: 'http://197.0.0.1',
      token: 'demo',
      database: 'demo',
      logging: true,
    }),
    I18nModule.forRoot({
      // 必须与 src/i18n 下的目录名一致，否则无语言头时会把翻译 key 直接返回给客户端。
      fallbackLanguage: DEFAULT_LANGUAGE,
      fallbacks: LANGUAGE_FALLBACKS,
      // 开发和测试尽早暴露漏配 key；生产环境仍允许回退，避免单个文案导致请求失败。
      throwOnMissingKey: !isProduction,
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
  ],
})
export class AppModule {}
