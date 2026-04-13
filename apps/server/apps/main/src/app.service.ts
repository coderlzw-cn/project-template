import { Injectable, Logger } from '@nestjs/common';
@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  constructor() {} // private readonly minioService: MinioService, // private readonly rabbitmqService: RabbitmqService,

  getHello() {
    return 'Hello World!';
  }

  // @OnEvent('udp.message.LOCAL_SERVER_A')
  // handleRemoteAData(payload: UdpMessagePayload) {
  //   console.log(payload);
  // }

  // @OnEvent('udp.message.REMOTE_B')
  // handleRemoteBData(payload: UdpMessagePayload) {
  //   console.log(payload);
  // }
}
