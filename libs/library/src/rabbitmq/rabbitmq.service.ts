import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

interface ConnectFailedError {
  err?: Error;
  url?: string;
}

interface DisconnectError {
  err?: Error;
}

@Injectable()
export class RabbitmqService implements OnModuleInit {
  private readonly logger = new Logger(RabbitmqService.name);
  constructor(private readonly amqpConnection: AmqpConnection) {}

  onModuleInit() {
    void this.listenConnection();
    void this.listenChannel();
  }

  /**
   * 监听 mq 的连接
   */
  private listenConnection() {
    // 连接成功事件
    this.amqpConnection.managedConnection.on('connect', (amqp) => {
      this.logger.log(`Connected to RabbitMQ server successfully: ${amqp.url}`);
    });

    // 连接失败事件
    this.amqpConnection.managedConnection.on('connectFailed', (err: ConnectFailedError) => {
      this.logger.error(`Failed to connect to RabbitMQ: ${err.err?.message || 'Unknown error'}`);
    });

    // 连接断开事件
    this.amqpConnection.managedConnection.on('disconnect', (err: DisconnectError) => {
      this.logger.error(`RabbitMQ connection disconnected: ${err.err?.message || 'Unknown error'}`);
    });
  }

  /**
   * 监听 mq 的通道
   */
  private listenChannel() {
    // 通道创建成功
    this.amqpConnection.managedConnection.on('channel', () => {
      this.logger.log('RabbitMQ channel created successfully');
    });

    // 通道阻塞
    this.amqpConnection.managedConnection.on('blocked', (reason) => {
      this.logger.warn(`RabbitMQ channel blocked: ${reason.reason}`);
    });

    // 通道解除阻塞
    this.amqpConnection.managedConnection.on('unblocked', () => {
      this.logger.log('RabbitMQ channel unblocked');
    });
  }

  /**
   * 发布消息
   * @param exchange 交换机名称
   * @param routingKey 路由键
   * @param message 消息内容
   * @param options
   */
  publish<T = unknown>(exchange: string, routingKey: string, message: T, options?: Parameters<AmqpConnection['publish']>[3]) {
    return this.amqpConnection.publish(exchange, routingKey, message, options);
  }
}
