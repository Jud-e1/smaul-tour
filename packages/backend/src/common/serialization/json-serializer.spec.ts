import { JSONSerializer } from './json-serializer';

describe('JSONSerializer', () => {
  let serializer: JSONSerializer;

  beforeEach(() => {
    serializer = new JSONSerializer();
  });

  // ─── serialize ────────────────────────────────────────────────────────────

  describe('serialize', () => {
    it('serializes a simple object', () => {
      expect(serializer.serialize({ a: 1 })).toBe('{"a":1}');
    });

    it('serializes null', () => {
      expect(serializer.serialize(null)).toBe('null');
    });

    it('serializes undefined as undefined (JSON.stringify behaviour)', () => {
      // JSON.stringify(undefined) returns undefined (not a string)
      expect(serializer.serialize(undefined)).toBeUndefined();
    });

    it('serializes boolean primitives', () => {
      expect(serializer.serialize(true)).toBe('true');
      expect(serializer.serialize(false)).toBe('false');
    });

    it('serializes numeric primitives', () => {
      expect(serializer.serialize(42)).toBe('42');
      expect(serializer.serialize(3.14)).toBe('3.14');
      expect(serializer.serialize(0)).toBe('0');
    });

    it('serializes string primitives', () => {
      expect(serializer.serialize('hello')).toBe('"hello"');
    });

    it('serializes arrays', () => {
      expect(serializer.serialize([1, 'two', null])).toBe('[1,"two",null]');
    });

    it('serializes nested objects', () => {
      const obj = { a: { b: { c: 42 } } };
      expect(serializer.serialize(obj)).toBe('{"a":{"b":{"c":42}}}');
    });

    it('serializes arrays of objects', () => {
      const arr = [{ id: 1 }, { id: 2 }];
      expect(serializer.serialize(arr)).toBe('[{"id":1},{"id":2}]');
    });

    it('serializes null values inside objects (Req 27.4)', () => {
      expect(serializer.serialize({ x: null })).toBe('{"x":null}');
    });

    it('escapes special characters in strings (Req 27.8)', () => {
      const obj = { msg: 'line1\nline2\ttabbed' };
      const result = serializer.serialize(obj);
      expect(result).toContain('\\n');
      expect(result).toContain('\\t');
    });

    it('escapes double-quotes inside strings (Req 27.8)', () => {
      const obj = { msg: 'say "hello"' };
      const result = serializer.serialize(obj);
      expect(result).toContain('\\"hello\\"');
    });

    it('escapes backslashes in strings (Req 27.8)', () => {
      const obj = { path: 'C:\\Users\\test' };
      const result = serializer.serialize(obj);
      expect(result).toContain('C:\\\\Users\\\\test');
    });

    it('escapes unicode control characters (Req 27.8)', () => {
      const obj = { ctrl: '\u0000\u001f' };
      const result = serializer.serialize(obj);
      // JSON.stringify escapes control chars
      expect(result).not.toContain('\u0000');
      expect(result).not.toContain('\u001f');
    });
  });

  // ─── parse ────────────────────────────────────────────────────────────────

  describe('parse', () => {
    it('parses a valid JSON string', () => {
      expect(serializer.parse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    });

    it('parses null', () => {
      expect(serializer.parse('null')).toBeNull();
    });

    it('parses arrays', () => {
      expect(serializer.parse('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('parses nested objects', () => {
      expect(serializer.parse<{ a: { b: number } }>('{"a":{"b":42}}')).toEqual({ a: { b: 42 } });
    });

    it('throws on invalid JSON syntax (Req 27.3)', () => {
      expect(() => serializer.parse('{invalid}')).toThrow('Invalid JSON syntax');
    });

    it('throws on empty string', () => {
      expect(() => serializer.parse('')).toThrow('Invalid JSON syntax');
    });

    it('throws on trailing comma', () => {
      expect(() => serializer.parse('{"a":1,}')).toThrow('Invalid JSON syntax');
    });

    it('throws on single-quoted strings', () => {
      expect(() => serializer.parse("{'a':1}")).toThrow('Invalid JSON syntax');
    });
  });

  // ─── prettyPrint ──────────────────────────────────────────────────────────

  describe('prettyPrint', () => {
    it('formats with 2-space indentation (Req 27.5)', () => {
      const result = serializer.prettyPrint({ a: 1, b: 2 });
      expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
    });

    it('formats nested objects with indentation', () => {
      const result = serializer.prettyPrint({ a: { b: 1 } });
      expect(result).toContain('  "a"');
      expect(result).toContain('    "b"');
    });

    it('formats arrays with indentation', () => {
      const result = serializer.prettyPrint([1, 2, 3]);
      expect(result).toBe('[\n  1,\n  2,\n  3\n]');
    });
  });

  // ─── round-trip property (Req 27.6) ──────────────────────────────────────

  describe('round-trip: serialize → parse → serialize produces equivalent JSON (Req 27.6)', () => {
    const cases: [string, unknown][] = [
      ['simple object', { id: 1, name: 'test' }],
      ['nested object', { a: { b: { c: 42 } } }],
      ['array of primitives', [1, 'two', true, null]],
      ['array of objects', [{ id: 1 }, { id: 2 }]],
      ['null value', null],
      ['boolean true', true],
      ['boolean false', false],
      ['number', 3.14],
      ['empty object', {}],
      ['empty array', []],
      ['object with null field', { x: null, y: 'hello' }],
      ['string with special chars', { msg: 'line\nnewline\ttab' }],
      ['deeply nested', { a: { b: { c: { d: [1, 2, { e: true }] } } } }],
    ];

    test.each(cases)('%s', (_label, value) => {
      const serialized = serializer.serialize(value);
      const parsed = serializer.parse(serialized);
      const reSerialized = serializer.serialize(parsed);
      expect(reSerialized).toBe(serialized);
    });

    it('validateRoundTrip returns true for valid objects', () => {
      expect(serializer.validateRoundTrip({ a: 1, b: [2, 3] })).toBe(true);
    });

    it('validateRoundTrip returns true for null', () => {
      expect(serializer.validateRoundTrip(null)).toBe(true);
    });
  });

  // ─── isValidJSON ──────────────────────────────────────────────────────────

  describe('isValidJSON', () => {
    it('returns true for valid JSON', () => {
      expect(serializer.isValidJSON('{"a":1}')).toBe(true);
      expect(serializer.isValidJSON('null')).toBe(true);
      expect(serializer.isValidJSON('[1,2,3]')).toBe(true);
    });

    it('returns false for invalid JSON', () => {
      expect(serializer.isValidJSON('{invalid}')).toBe(false);
      expect(serializer.isValidJSON('')).toBe(false);
    });
  });

  // ─── safeParse ────────────────────────────────────────────────────────────

  describe('safeParse', () => {
    it('returns parsed value for valid JSON', () => {
      expect(serializer.safeParse('{"a":1}', {})).toEqual({ a: 1 });
    });

    it('returns fallback for invalid JSON', () => {
      expect(serializer.safeParse('{bad}', { default: true })).toEqual({ default: true });
    });
  });
});
