/**
 * JSON Serializer for API request/response handling
 * Implements requirements 27.1-27.8
 */
export class JSONSerializer {
  /**
   * Serialize an object to JSON string.
   * Handles nested objects, arrays, null values, and all JSON primitive types (Req 27.4).
   * Special characters in strings are escaped by JSON.stringify (Req 27.8).
   */
  serialize<T>(obj: T): string {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      throw new Error(`JSON serialization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Parse JSON string to object (Req 27.2).
   * Throws a descriptive error for invalid JSON syntax (Req 27.3).
   */
  parse<T>(json: string): T {
    try {
      return JSON.parse(json) as T;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON syntax: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Pretty-print JSON with indentation for debugging (Req 27.5).
   */
  prettyPrint<T>(obj: T): string {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      throw new Error(`JSON pretty-print failed: ${(error as Error).message}`);
    }
  }

  /**
   * Validate round-trip: serialize → parse → serialize produces equivalent JSON (Req 27.6).
   * Returns true if the round-trip is stable.
   */
  validateRoundTrip<T>(obj: T): boolean {
    try {
      const serialized = this.serialize(obj);
      const parsed = this.parse<T>(serialized);
      const reSerialized = this.serialize(parsed);
      return serialized === reSerialized;
    } catch {
      return false;
    }
  }

  /**
   * Validate that a string is valid JSON.
   */
  isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Safely parse JSON with a fallback value.
   */
  safeParse<T>(json: string, fallback: T): T {
    try {
      return JSON.parse(json) as T;
    } catch {
      return fallback;
    }
  }
}

export const jsonSerializer = new JSONSerializer();
