import {
  getEnvArray,
  getEnvBool,
  getEnvInt,
  getEnvJson,
  getEnvNum,
  getEnvStr,
  getEnvUnion,
  getRequiredEnvArray,
  getRequiredEnvBool,
  getRequiredEnvInt,
  getRequiredEnvJson,
  getRequiredEnvNum,
  getRequiredEnvStr,
  getRequiredEnvUnion,
} from './env';

const ENV_KEY = 'ENV_UTIL_TEST_VALUE';

describe('env utils', () => {
  afterEach(() => {
    delete process.env[ENV_KEY];
    jest.restoreAllMocks();
  });

  it('字符串将空白值视为未配置', () => {
    process.env[ENV_KEY] = '   ';

    expect(getEnvStr(ENV_KEY, 'fallback')).toBe('fallback');
    expect(() => getRequiredEnvStr(ENV_KEY)).toThrow(`缺少或无效的 ${ENV_KEY} 环境变量`);
  });

  it('数字拒绝非有限值', () => {
    process.env[ENV_KEY] = 'Infinity';

    expect(getEnvNum(ENV_KEY)).toBeUndefined();
    expect(() => getRequiredEnvNum(ENV_KEY)).toThrow(`缺少或无效的 ${ENV_KEY} 环境变量`);
  });

  it('布尔值支持常见表示并拒绝其他值', () => {
    process.env[ENV_KEY] = 'YES';
    expect(getRequiredEnvBool(ENV_KEY)).toBe(true);

    process.env[ENV_KEY] = 'disabled';
    expect(getEnvBool(ENV_KEY)).toBeUndefined();
    expect(() => getRequiredEnvBool(ENV_KEY)).toThrow(`缺少或无效的 ${ENV_KEY} 环境变量`);
  });

  it('数组支持自定义分隔符', () => {
    process.env[ENV_KEY] = 'alpha; beta ;gamma';

    expect(getEnvArray(ENV_KEY, undefined, ';')).toEqual(['alpha', 'beta', 'gamma']);
    expect(getRequiredEnvArray(ENV_KEY, ';')).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('联合类型支持可选、默认值和必填读取', () => {
    const allowedValues = ['development', 'production'] as const;

    expect(getEnvUnion(ENV_KEY, allowedValues)).toBeUndefined();
    expect(getEnvUnion(ENV_KEY, allowedValues, 'development')).toBe('development');

    process.env[ENV_KEY] = 'production';
    expect(getRequiredEnvUnion(ENV_KEY, allowedValues)).toBe('production');
  });

  it('JSON 支持可选和必填读取', () => {
    process.env[ENV_KEY] = '{"enabled":true}';

    expect(getEnvJson<{ enabled: boolean }>(ENV_KEY)).toEqual({ enabled: true });
    expect(getRequiredEnvJson<{ enabled: boolean }>(ENV_KEY)).toEqual({ enabled: true });

    process.env[ENV_KEY] = 'invalid';
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(() => getRequiredEnvJson(ENV_KEY)).toThrow(`缺少或无效的 ${ENV_KEY} 环境变量`);
  });

  it('整数严格校验完整值、进制和安全范围', () => {
    process.env[ENV_KEY] = '12abc';
    expect(getEnvInt(ENV_KEY)).toBeUndefined();

    process.env[ENV_KEY] = 'ff';
    expect(getRequiredEnvInt(ENV_KEY, 16)).toBe(255);
    expect(() => getEnvInt(ENV_KEY, undefined, 1)).toThrow(new RangeError('radix 必须是 2 到 36 之间的整数'));
  });
});
