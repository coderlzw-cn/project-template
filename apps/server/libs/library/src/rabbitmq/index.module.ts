import { RabbitMQModule, RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';
import { DynamicModule, Module } from '@nestjs/common';
import { RabbitmqService } from './rabbitmq.service';

@Module({
  providers: [RabbitmqService],
  exports: [RabbitmqService],
})
export class NestRabbitmqModule {
  static forRoot(options: RabbitMQConfig): DynamicModule {
    return {
      module: NestRabbitmqModule,
      imports: [
        RabbitMQModule.forRootAsync({
          useFactory: () => options,
        }),
      ],
      providers: [RabbitmqService],
      exports: [RabbitmqService],
    };
  }

  static forRootAsync(options: { useFactory: (...args: any[]) => Promise<RabbitMQConfig> | RabbitMQConfig; inject?: any[] }): DynamicModule {
    return {
      module: NestRabbitmqModule,
      imports: [
        RabbitMQModule.forRootAsync({
          useFactory: options.useFactory,
          inject: options.inject,
        }),
      ],
      providers: [RabbitmqService],
      exports: [RabbitmqService],
    };
  }
}
