import { describe, expect, it } from '@jest/globals';
import { formatJson, type FormatJsonOptions, parseJson, stringifyJson } from './json';

function createInvalidFormatOptions(key: keyof FormatJsonOptions, value: unknown): FormatJsonOptions {
  const options: FormatJsonOptions = {};
  Object.defineProperty(options, key, { value, enumerable: true });
  return options;
}

describe('json utils', () => {
  describe('parseJson', () => {
    it('defaults to JSON5 and parses its extended syntax', () => {
      const result = parseJson(`{
        // JSON5 comment
        unquoted: 'value',
        hexadecimal: 0x10,
        positiveInfinity: Infinity,
      }`);

      expect(result).toEqual({
        success: true,
        data: {
          unquoted: 'value',
          hexadecimal: 16,
          positiveInfinity: Infinity,
        },
      });
    });

    it.each([
      ['object', '{"name":"Codex"}', { name: 'Codex' }],
      ['array', '[1,true,null]', [1, true, null]],
      ['string', '"text"', 'text'],
      ['number', '42', 42],
      ['boolean', 'false', false],
      ['null', 'null', null],
    ])('parses a JSON %s value', (_name, text, expected) => {
      expect(parseJson(text)).toEqual({ success: true, data: expected });
    });

    it('uses strict JSON syntax when format is json', () => {
      expect(parseJson('{"name":"Codex"}', { format: 'json' })).toEqual({ success: true, data: { name: 'Codex' } });

      const result = parseJson("{ name: 'Codex', }", { format: 'json' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBeInstanceOf(SyntaxError);
    });

    it('applies the reviver from child properties to the root value', () => {
      const visitedKeys: string[] = [];
      const result = parseJson('{"count":"2","nested":{"remove":true}}', {
        reviver(key, value) {
          visitedKeys.push(key);
          if (key === 'count') return Number(value);
          if (key === 'remove') return undefined;
          return value;
        },
      });

      expect(result).toEqual({ success: true, data: { count: 2, nested: {} } });
      expect(visitedKeys).toEqual(['count', 'remove', 'nested', '']);
    });

    it('allows the reviver to replace the root value', () => {
      const result = parseJson('{"value":1}', {
        reviver(key, value) {
          return key === '' ? [value] : value;
        },
      });

      expect(result).toEqual({ success: true, data: [{ value: 1 }] });
    });

    it('creates an empty array slot when the reviver removes an array element', () => {
      const result = parseJson<number[]>('[1,2,3]', {
        reviver(key, value) {
          return key === '1' ? undefined : value;
        },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(1 in result.data).toBe(false);
      }
    });

    it('returns the parser error instead of throwing for invalid syntax', () => {
      expect(() => parseJson('{broken')).not.toThrow();

      const result = parseJson('{broken');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBeInstanceOf(SyntaxError);
    });

    it('adds fieldName context and preserves the original error as cause', () => {
      const result = parseJson('{broken', { fieldName: '用户配置' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(SyntaxError);
        expect(result.error.message).toContain('用户配置 不是有效的 JSON');
        expect(result.error.cause).toBeInstanceOf(Error);
      }
    });

    it('captures and normalizes errors thrown by the reviver', () => {
      const errorResult = parseJson('{"value":1}', {
        reviver() {
          throw new TypeError('conversion failed');
        },
      });
      const nonErrorResult = parseJson('{"value":1}', {
        reviver() {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- 验证工具会将非 Error 抛出值标准化。
          throw 'conversion failed';
        },
      });

      expect(errorResult).toEqual({ success: false, error: new TypeError('conversion failed') });
      expect(nonErrorResult).toEqual({ success: false, error: new Error('conversion failed') });
    });

    it.each([
      ['non-string text', 123, {}, TypeError, 'text must be a string'],
      ['unknown format', '{}', { format: 'xml' }, RangeError, 'format must be either "json" or "json5"'],
      ['non-function reviver', '{}', { reviver: true }, TypeError, 'reviver must be a function'],
      ['empty fieldName', '{}', { fieldName: '' }, TypeError, 'fieldName must be a non-empty string'],
    ])('returns an error for %s', (_name, text, options, ErrorType, message) => {
      const result = parseJson(text, options);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ErrorType);
        expect(result.error.message).toBe(message);
      }
    });

    it('does not perform runtime validation from its generic type argument', () => {
      const result = parseJson<{ count: number }>('{"count":"not-a-number"}');

      expect(result).toEqual({ success: true, data: { count: 'not-a-number' } });
    });
  });

  describe('stringifyJson', () => {
    it.each([
      ['object', { name: 'Codex' }, '{"name":"Codex"}'],
      ['array', [1, true, null], '[1,true,null]'],
      ['string', 'text', '"text"'],
      ['number', 42, '42'],
      ['boolean', false, 'false'],
      ['null', null, 'null'],
    ])('serializes a JavaScript %s value as JSON', (_name, value, expected) => {
      expect(stringifyJson(value)).toBe(expected);
    });

    it('serializes JSON5-specific values when format is json5', () => {
      expect(stringifyJson({ value: 'text', nan: NaN, infinity: Infinity }, { format: 'json5' })).toBe("{value:'text',nan:NaN,infinity:Infinity}");
    });

    it('uses standard JSON handling for non-finite numbers', () => {
      expect(stringifyJson({ nan: NaN, positive: Infinity, negative: -Infinity })).toBe('{"nan":null,"positive":null,"negative":null}');
    });

    it.each([
      ['undefined', undefined],
      ['function', () => undefined],
      ['symbol', Symbol('value')],
    ])('returns undefined for a top-level %s', (_name, value) => {
      expect(stringifyJson(value)).toBeUndefined();
    });

    it('omits unsupported object properties and converts unsupported array elements to null', () => {
      const value = {
        keep: 1,
        undefinedValue: undefined,
        functionValue: () => undefined,
        symbolValue: Symbol('value'),
        array: [undefined, () => undefined, Symbol('value'), 1],
      };

      expect(stringifyJson(value)).toBe('{"keep":1,"array":[null,null,null,1]}');
    });

    it('uses toJSON when the value provides it', () => {
      expect(stringifyJson({ createdAt: new Date('2026-08-13T00:00:00.000Z') })).toBe('{"createdAt":"2026-08-13T00:00:00.000Z"}');
    });

    it('supports numeric and string indentation with the native ten-character limit', () => {
      expect(stringifyJson({ value: 1 }, { space: 2 })).toBe('{\n  "value": 1\n}');
      expect(stringifyJson({ value: 1 }, { space: '............' })).toBe('{\n.........."value": 1\n}');
    });

    it('filters object properties recursively with a replacer key list', () => {
      const value = {
        id: 1,
        name: 'root',
        ignored: true,
        nested: { id: 2, name: 'child', ignored: true },
      };

      expect(stringifyJson(value, { replacer: ['id', 'nested', 'name'] })).toBe('{"id":1,"nested":{"id":2,"name":"child"},"name":"root"}');
      expect(stringifyJson({ 1: 'one', 2: 'two' }, { replacer: [1] })).toBe('{"1":"one"}');
    });

    it('calls a replacer function for the root and transforms or omits properties', () => {
      const visitedKeys: string[] = [];
      const output = stringifyJson(
        { count: 1, secret: 'hidden', items: [1, 2] },
        {
          replacer(key, value) {
            visitedKeys.push(key);
            if (key === 'count') return 2;
            if (key === 'secret' || key === '0') return undefined;
            return value;
          },
        },
      );

      expect(output).toBe('{"count":2,"items":[null,2]}');
      expect(visitedKeys[0]).toBe('');
    });

    it('sorts object keys recursively without changing array order', () => {
      const value = { zebra: 1, alpha: { delta: 4, beta: 2 }, list: [{ zebra: 3, alpha: 1 }, 2, 1] };

      expect(stringifyJson(value, { sortKeys: true })).toBe('{"alpha":{"beta":2,"delta":4},"list":[{"alpha":1,"zebra":3},2,1],"zebra":1}');
    });

    it('recursively omits nullish object fields but preserves array positions and the root', () => {
      const value = {
        keepFalse: false,
        keepZero: 0,
        keepEmpty: '',
        removeNull: null,
        removeUndefined: undefined,
        nested: { removeNull: null, keep: 1 },
        list: [null, undefined, { removeNull: null, keep: 2 }],
      };

      expect(stringifyJson(value, { omitNullish: true })).toBe('{"keepFalse":false,"keepZero":0,"keepEmpty":"","nested":{"keep":1},"list":[null,null,{"keep":2}]}');
      expect(stringifyJson(null, { omitNullish: true })).toBe('null');
      expect(stringifyJson(undefined, { omitNullish: true })).toBeUndefined();
    });

    it('applies the replacer before omitNullish and sorting', () => {
      const output = stringifyJson(
        { zebra: null, alpha: 1, remove: null },
        {
          replacer(key, value) {
            if (key === 'zebra') return 'retained';
            return value;
          },
          omitNullish: true,
          sortKeys: true,
        },
      );

      expect(output).toBe('{"alpha":1,"zebra":"retained"}');
    });

    it('combines a key whitelist with nullish omission and key sorting', () => {
      const value = { zebra: 1, remove: null, alpha: 2, ignored: 3, nested: { zebra: 4, alpha: 5, ignored: 6 } };

      expect(
        stringifyJson(value, {
          replacer: ['zebra', 'remove', 'alpha', 'nested'],
          omitNullish: true,
          sortKeys: true,
        }),
      ).toBe('{"alpha":2,"nested":{"alpha":5,"zebra":4},"zebra":1}');
    });

    it('throws for circular references and BigInt values', () => {
      const circular: Record<string, unknown> = {};
      circular.self = circular;

      expect(() => stringifyJson(circular)).toThrow(TypeError);
      expect(() => stringifyJson({ value: BigInt(1) })).toThrow(TypeError);
    });

    it.each([
      ['unknown format', { format: 'xml' }, RangeError, 'format must be either "json" or "json5"'],
      ['invalid replacer', { replacer: true }, TypeError, 'replacer must be a function or an array of property names'],
      ['invalid replacer key', { replacer: ['valid', true] }, TypeError, 'replacer property names must be strings or numbers'],
      ['invalid space type', { space: true }, TypeError, 'space must be a string or number'],
      ['infinite space', { space: Infinity }, RangeError, 'space must be a finite number'],
      ['invalid sortKeys', { sortKeys: 'yes' }, TypeError, 'sortKeys must be a boolean'],
      ['invalid omitNullish', { omitNullish: 'yes' }, TypeError, 'omitNullish must be a boolean'],
    ])('throws for %s', (_name, options, ErrorType, message) => {
      expect(() => stringifyJson({}, options)).toThrow(ErrorType);
      expect(() => stringifyJson({}, options)).toThrow(message);
    });
  });

  describe('formatJson', () => {
    it('defaults to JSON5 input, standard JSON output and two-space indentation', () => {
      const input = `{
        // comment
        name: 'Codex',
        values: [1, 2,],
      }`;

      expect(formatJson(input)).toBe('{\n  "name": "Codex",\n  "values": [\n    1,\n    2\n  ]\n}');
    });

    it('supports strict JSON input', () => {
      expect(formatJson('{"name":"Codex"}', { inputFormat: 'json', space: 0 })).toBe('{"name":"Codex"}');
      expect(() => formatJson("{ name: 'Codex' }", { inputFormat: 'json' })).toThrow(SyntaxError);
    });

    it('supports JSON5 output and custom indentation', () => {
      expect(formatJson('{"name":"Codex"}', { outputFormat: 'json5', space: 2 })).toBe("{\n  name: 'Codex',\n}");
    });

    it('sorts nested object keys while preserving array order', () => {
      const input = '{zebra:1,alpha:{delta:4,beta:2},list:[3,2,1]}';

      expect(formatJson(input, { sortKeys: true, space: 0 })).toBe('{"alpha":{"beta":2,"delta":4},"list":[3,2,1],"zebra":1}');
    });

    it('converts JSON5 non-finite numbers according to the output format', () => {
      expect(formatJson('{value:NaN}', { space: 0 })).toBe('{"value":null}');
      expect(formatJson('{value:NaN}', { outputFormat: 'json5', space: 0 })).toBe('{value:NaN}');
    });

    it('formats primitive root values', () => {
      expect(formatJson('null')).toBe('null');
      expect(formatJson('42')).toBe('42');
      expect(formatJson("'text'")).toBe('"text"');
    });

    it('throws the parsing error for malformed input', () => {
      expect(() => formatJson('{broken')).toThrow(SyntaxError);
    });

    it('throws for invalid input and output options', () => {
      expect(() => formatJson('{}', createInvalidFormatOptions('inputFormat', 'xml'))).toThrow(RangeError);
      expect(() => formatJson('{}', createInvalidFormatOptions('outputFormat', 'xml'))).toThrow(RangeError);
      expect(() => formatJson('{}', { space: Infinity })).toThrow(RangeError);
      expect(() => formatJson('{}', createInvalidFormatOptions('sortKeys', 'yes'))).toThrow(TypeError);
    });
  });
});
