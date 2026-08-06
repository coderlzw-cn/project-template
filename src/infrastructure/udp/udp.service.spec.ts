import { UdpService } from './udp.service';

describe('UdpService', () => {
  let service: UdpService;

  beforeEach(() => {
    service = new UdpService();
  });

  afterEach(async () => {
    await service.onApplicationShutdown();
  });

  it('creates a server and exchanges datagrams with a connected client', async () => {
    let resolveReply: (message: string) => void = () => undefined;
    const reply = new Promise<string>((resolve) => {
      resolveReply = resolve;
    });
    const server = await service.createServer({
      bind: { port: 0, address: '127.0.0.1' },
      onMessage: async (message, remote) => {
        await server.send(Buffer.concat([Buffer.from('echo:'), message]), remote);
      },
    });
    const client = await service.createClient({
      remote: { port: server.address().port, address: '127.0.0.1' },
      onMessage: (message) => resolveReply(message.toString()),
    });

    await client.send('hello udp');

    await expect(reply).resolves.toBe('echo:hello udp');
  });

  it('requires a target when the client has no default remote', async () => {
    const client = await service.createClient();

    await expect(client.send('message')).rejects.toThrow('必须指定 target');
  });

  it('allows endpoints to be closed repeatedly', async () => {
    const server = await service.createServer({ bind: { port: 0, address: '127.0.0.1' } });

    await server.close();
    await expect(server.close()).resolves.toBeUndefined();
  });
});
