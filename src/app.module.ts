import { NestConsulModule } from '@app/shared/consul';
import { NestHealthModule } from '@app/shared/health/nest-health.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { NestRabbitmqModule } from '@app/shared/rabbitmq/index.module';
import { MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq';
import { NestMinioModule } from '@app/shared/minio/minio.module';

const envFilePath = [path.join(process.cwd(), '.env'), path.join(process.cwd(), `.env.production`), path.join(process.cwd(), `.env.development`)];

@Module({
  imports: [
    NestHealthModule,
    ConfigModule.forRoot({ isGlobal: true, cache: false, envFilePath }),
    NestRabbitmqModule.forRoot({
      // 交换机配置
      exchanges: [
        {
          // 交换机名称
          name: `my_exchanges_test1`,
          // 交换机类型
          type: 'direct',
          options: { durable: false },
        },
      ],
      // 连接的url
      uri: 'amqp://admin:admin@192.168.5.158:5672',
      connectionInitOptions: { wait: false },
      enableDirectReplyTo: false,
      prefetchCount: 300,
      defaultSubscribeErrorBehavior: MessageHandlerErrorBehavior.NACK,
    }),
    // NestConsulModule.forRoot({
    //   host: '192.168.5.158',
    //   port: 8500,
    //   protocol: 'http',
    //   register: true,
    //   service: {
    //     ID: 'my-service-1',
    //     Name: 'my-service',
    //     Address: '192.168.5.182',
    //     Port: 3000,
    //     Tags: ['api', 'v1'],
    //     Check: {
    //       HTTP: 'http://192.168.5.182:3000/api/v1/health/http',
    //       Interval: '10s',
    //       Timeout: '3s',
    //       DeregisterCriticalServiceAfter: '30s',
    //     },
    //   },
    // }),
    NestMinioModule.forRoot({
      endPoint: '192.168.200.2',
      port: 9000,
      accessKey: 'suMq9tnyI1vkhvI0NKzz',
      secretKey: 'wCsLRoT1HCi7tP0jbPQwcDXKf9we1gZRdauDyFVp',
      useSSL: false,
    }),
    // IoredisModule.forRoot({
    //   host: '192.168.5.158',
    //   port: 6379,
    //   password: 'your-password',
    //   db: 0,
    //   keyPrefix: 'app:',
    //   connectTimeout: 10000,
    //   lazyConnect: false,
    // }),
    // NestEmailModule.forRoot({
    //   host: 'smtp.qq.com',
    //   port: 587,
    //   secure: false,
    //   auth: {
    //     user: 'coderlzw@foxmail.com',
    //     pass: 'mgnevlqbgmrtcafh',
    //   },
    //   from: 'coderlzw@foxmail.com',
    //   fromName: '测试APP',
    // }),
    // ThrottlerModule.forRoot({
    //   ttl: 60, // 时间窗口：60 秒
    //   limit: 10, // 最大请求次数：10 次
    //   storage: 'memory',
    // }),
    // ScheduleModule.forRoot({
    //   // isGlobal: true,
    // }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
