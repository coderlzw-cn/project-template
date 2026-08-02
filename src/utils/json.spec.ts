import { stringifyJson } from './json';

describe('stringifyJson', () => {
  it('默认保持标准 JSON 序列化行为', () => {
    expect(stringifyJson({ nullable: null, missing: undefined, values: [null, undefined] })).toBe('{"nullable":null,"values":[null,null]}');
  });

  it('启用 omitNullish 后递归丢弃对象中的 null 和 undefined 字段', () => {
    expect(
      stringifyJson(
        {
          nullable: null,
          missing: undefined,
          nested: { kept: 1, nullable: null },
          values: [null, undefined, { nullable: null, kept: 2 }],
        },
        { omitNullish: true },
      ),
    ).toBe('{"nested":{"kept":1},"values":[null,null,{"kept":2}]}');
  });

  it('omitNullish 可与 replacer 和键排序组合使用', () => {
    expect(
      stringifyJson(
        { c: null, b: 1, a: 2 },
        {
          omitNullish: true,
          sortKeys: true,
          replacer: (_key, value) => (typeof value === 'number' ? value * 2 : value),
        },
      ),
    ).toBe('{"a":4,"b":2}');
  });

  it('omitNullish 不丢弃顶层 null', () => {
    expect(stringifyJson(null, { omitNullish: true })).toBe('null');
  });

  it('校验 omitNullish 的类型', () => {
    expect(() => stringifyJson({}, { omitNullish: 'yes' as unknown as boolean })).toThrow(new TypeError('omitNullish must be a boolean'));
  });
});
