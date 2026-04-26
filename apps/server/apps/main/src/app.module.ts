import { NestHealthModule } from '@app/library/health/nest-health.module';
import { UdpModule, UdpService } from '@app/library/udp';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from '../../user/src/user/user.module';
import { appConfig, envFilePath, validateEnv } from './config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './events/events.module';

// @Module({
//   imports: [
//     UdpModule.register({
//       debug: false,
//       servers: [
//         { name: 'LOCAL_SERVER_A', port: 7001 },
//         { name: 'LOCAL_SERVER_B', port: 7002 },
//       ],
//       clients: [
//         { name: 'REMOTE_A', host: '127.0.0.1', port: 8001 },
//         { name: 'REMOTE_B', host: '127.0.0.1', port: 8002 },
//       ],
//     }),
//     EventsModule,
//   ],
// })
// export class NestUdpModule {
//   constructor(private readonly udpService: UdpService) {
//     setInterval(() => {
//       void this.udpService.send('REMOTE_A', 'Hello World!');
//       void this.udpService.send('LOCAL_SERVER_B', 'Hello World!');
//     }, 2000);
//   }
// }

@Module({
  imports: [
    NestHealthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig],
      envFilePath,
      validate: validateEnv,
    }),
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
    //   defaultSubscribeErrorBehavior: MessageHandlerErrorBehavior.NACK,
    // }),
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
    // NestMinioModule.forRoot({
    //   endPoint: '192.168.200.2',
    //   port: 9000,
    //   accessKey: 'suMq9tnyI1vkhvI0NKzz',
    //   secretKey: 'wCsLRoT1HCi7tP0jbPQwcDXKf9we1gZRdauDyFVp',
    //   useSSL: false,
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
    // UserModule,
    // 在使用 UDP 模块时，必须开启 EventEmitterModule.forRoot()
    EventEmitterModule.forRoot(), // 必须开启
    // NestUdpModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
