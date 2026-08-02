import { ConsulApiError } from './consul.errors';
import type { ConsulModuleOptions } from './consul.interfaces';
import { ConsulService } from './consul.service';

const options: ConsulModuleOptions = {
  baseUrl: 'https://consul.example.test',
  token: 'secret-token',
  datacenter: 'dc1',
  namespace: 'payments',
  partition: 'prod',
  maxRetries: 0,
};

function getRequestUrl(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

describe('ConsulService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends ACL and enterprise scope safely and reads query metadata', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('[]', {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Consul-Index': '42',
          'X-Consul-KnownLeader': 'true',
          'X-Consul-Results-Filtered-By-ACLs': 'true',
        },
      }),
    );

    const response = await new ConsulService(options).discoverService('orders');
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    const url = new URL(getRequestUrl(requestUrl));
    const headers = new Headers(requestInit?.headers);

    expect(url.pathname).toBe('/v1/health/service/orders');
    expect(url.searchParams.get('dc')).toBe('dc1');
    expect(url.searchParams.get('ns')).toBe('payments');
    expect(url.searchParams.get('partition')).toBe('prod');
    expect(url.searchParams.get('passing')).toBe('true');
    expect(url.searchParams.has('token')).toBe(false);
    expect(headers.get('X-Consul-Token')).toBe('secret-token');
    expect(response.meta).toMatchObject({ index: 42, knownLeader: true, resultsFilteredByAcls: true });
  });

  it('returns empty KV results for a missing prefix', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

    const response = await new ConsulService(options).listKv('config/demo');

    expect(response.data).toEqual([]);
  });

  it('throws a structured error without placing the ACL token in its message', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('permission denied', { status: 403 }));

    const promise = new ConsulService(options).getAgentSelf();

    await expect(promise).rejects.toMatchObject<Partial<ConsulApiError>>({ status: 403, responseBody: 'permission denied', retryable: false });
    await expect(promise).rejects.not.toThrow('secret-token');
  });

  it('registers and deregisters the configured service during application lifecycle', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }));
    const service = new ConsulService({ ...options, service: { Name: 'api', ID: 'api-1', Port: 3000 } });

    await service.onApplicationBootstrap();
    await service.onApplicationShutdown();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getRequestUrl(fetchMock.mock.calls[0][0])).toContain('/v1/agent/service/register');
    expect(getRequestUrl(fetchMock.mock.calls[1][0])).toContain('/v1/agent/service/deregister/api-1');
  });
});
