import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from '@app/shared/health/health.module';
import path from 'path';

const envFilePath = [path.join(process.cwd(), '.env'), path.join(process.cwd(), `.env.production`), path.join(process.cwd(), `.env.development`)];

@Module({
  imports: [
    HealthModule,
    ConfigModule.forRoot({ isGlobal: true, cache: false, envFilePath }),
    // NestRabbitmqModule.forRoot({
    //   // 交换机配置
    //   exchanges: [
    //     {
    //       // 交换机名称
    //       name: `my_exchanges_test1`,
    //       // 交换机类型
    //       type: 'direct',
    //       options: { durable: false },
    //     },
    //   ],
    //   // 连接的url
    //   uri: 'amqp://admin:admin@192.168.5.158:5672',
    //   connectionInitOptions: { wait: false },
    //   enableDirectReplyTo: false,
    //   prefetchCount: 300,
    //   defaultSubscribeErrorBehavior: MessageHandlerErrorBehavior.ACK,
    // }),
    // ConsulModule.forRoot({
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
    //       HTTP: 'http://192.168.5.182:3000/api/v1',
    //       Interval: '10s',
    //       Timeout: '3s',
    //       DeregisterCriticalServiceAfter: '30s',
    //     },
    //   },
    // }),
    // IoredisModule.forRoot({
    //   host: '192.168.5.158',
    //   port: 6379,
    //   password: 'your-password',
    //   db: 0,
    //   keyPrefix: 'app:',
    //   connectTimeout: 10000,
    //   lazyConnect: false,
    // }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
