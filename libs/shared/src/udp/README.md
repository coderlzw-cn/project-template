```js
@Module({
  imports: [
    UdpModule.register({
      debug: false,
      servers: [
        { name: 'LOCAL_SERVER_A', port: 7001 },
        { name: 'LOCAL_SERVER_B', port: 7002 },
      ],
      clients: [
        { name: 'REMOTE_A', host: '127.0.0.1', port: 8001 },
        { name: 'REMOTE_B', host: '127.0.0.1', port: 8002 },
      ],
    }),
  ],
})
export class NestUdpModule {
  constructor(private readonly udpService: UdpService) {
    setInterval(() => {
      void this.udpService.send('REMOTE_A', 'Hello World!');
      void this.udpService.send('LOCAL_SERVER_B', 'Hello World!');
    }, 2000);
  }
}
```


```js
import { type UdpMessagePayload } from '@app/shared/udp';
@Injectable()
export class AppService {
  // 监听对方发送过来的消息，需要注册 EventEmitterModule.forRoot()
  @OnEvent('udp.message.REMOTE_A')
  handleDeviceData(payload: UdpMessagePayload) {
    console.log(payload);  // {name: “REMOTE_A”, msg: "xxx", remoteInfo: { address: '127.0.0.1', family: 'IPv4', port: 8001, size: 18 }}
  }
}

```
