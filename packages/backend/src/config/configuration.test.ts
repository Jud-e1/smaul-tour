import { ConfigurationParser } from './configuration';
import { Configuration } from './configuration.schema';

describe('ConfigurationParser', () => {
  let parser: ConfigurationParser;

  const validConfig: Configuration = {
    server: {
      port: 3000,
      environment: 'development',
    },
    database: {
      host: 'localhost',
      port: 5432,
      name: 'test_db',
      user: 'test_user',
      password: 'test_password',
      poolSize: 20,
    },
    redis: {
      host: 'localhost',
      port: 6379,
      password: 'redis_password',
    },
    llm: {
      provider: 'openai',
      apiKey: 'test_llm_key',
      model: 'gpt-4',
      maxTokens: 2000,
    },
    vectorDb: {
      provider: 'pinecone',
      apiKey: 'test_vector_key',
      environment: 'us-west1-gcp',
      index: 'test-index',
    },
    payment: {
      provider: 'stripe',
      apiKey: 'test_payment_key',
      webhookSecret: 'test_webhook_secret',
    },
    jwt: {
      secret: 'test_jwt_secret_at_least_32_chars_long',
      expiresIn: 3600,
      refreshSecret: 'test_refresh_secret_at_least_32_chars',
      refreshExpiresIn: 2592000,
    },
    oauth: {
      google: {
        clientId: 'test_google_client_id',
        clientSecret: 'test_google_client_secret',
      },
      facebook: {
        appId: 'test_facebook_app_id',
        appSecret: 'test_facebook_app_secret',
      },
    },
    email: {
      provider: 'sendgrid',
      apiKey: 'test_email_key',
      from: 'test@example.com',
    },
    storage: {
      provider: 's3',
      bucket: 'test-bucket',
      region: 'us-east-1',
      accessKeyId: 'test_access_key',
      secretAccessKey: 'test_secret_key',
    },
    maps: {
      apiKey: 'test_maps_key',
    },
    exchangeRate: {
      apiKey: 'test_exchange_rate_key',
    },
    frontend: {
      webUrl: 'http://localhost:3001',
      mobileDeepLinkScheme: 'testapp',
    },
  };

  beforeEach(() => {
    parser = new ConfigurationParser();
  });

  describe('JSON parsing', () => {
    it('should parse valid JSON configuration', () => {
      const jsonString = JSON.stringify(validConfig);
      const result = parser.parse(jsonString, 'json');
      expect(result).toEqual(validConfig);
    });

    it('should throw error for invalid JSON syntax', () => {
      const invalidJson = '{ "server": { "port": 3000, }'; // trailing comma
      expect(() => parser.parse(invalidJson, 'json')).toThrow(/Invalid JSON syntax/);
    });

    it('should throw error for JSON with missing required fields', () => {
      const incompleteJson = JSON.stringify({ server: { port: 3000 } });
      expect(() => parser.parse(incompleteJson, 'json')).toThrow(/Configuration validation failed/);
    });

    it('should throw error for JSON with invalid types', () => {
      const invalidTypeConfig = {
        ...validConfig,
        server: { ...validConfig.server, port: 'not-a-number' },
      };
      const jsonString = JSON.stringify(invalidTypeConfig);
      expect(() => parser.parse(jsonString, 'json')).toThrow(/Configuration validation failed/);
    });

    it('should throw error for invalid environment value', () => {
      const invalidEnvConfig = {
        ...validConfig,
        server: { ...validConfig.server, environment: 'invalid' },
      };
      const jsonString = JSON.stringify(invalidEnvConfig);
      expect(() => parser.parse(jsonString, 'json')).toThrow(/Configuration validation failed/);
    });
  });

  describe('YAML parsing', () => {
    it('should parse valid YAML configuration', () => {
      const yamlString = `
server:
  port: 3000
  environment: development
database:
  host: localhost
  port: 5432
  name: test_db
  user: test_user
  password: test_password
  poolSize: 20
redis:
  host: localhost
  port: 6379
  password: redis_password
llm:
  provider: openai
  apiKey: test_llm_key
  model: gpt-4
  maxTokens: 2000
vectorDb:
  provider: pinecone
  apiKey: test_vector_key
  environment: us-west1-gcp
  index: test-index
payment:
  provider: stripe
  apiKey: test_payment_key
  webhookSecret: test_webhook_secret
jwt:
  secret: test_jwt_secret_at_least_32_chars_long
  expiresIn: 3600
  refreshSecret: test_refresh_secret_at_least_32_chars
  refreshExpiresIn: 2592000
oauth:
  google:
    clientId: test_google_client_id
    clientSecret: test_google_client_secret
  facebook:
    appId: test_facebook_app_id
    appSecret: test_facebook_app_secret
email:
  provider: sendgrid
  apiKey: test_email_key
  from: test@example.com
storage:
  provider: s3
  bucket: test-bucket
  region: us-east-1
  accessKeyId: test_access_key
  secretAccessKey: test_secret_key
maps:
  apiKey: test_maps_key
exchangeRate:
  apiKey: test_exchange_rate_key
frontend:
  webUrl: http://localhost:3001
  mobileDeepLinkScheme: testapp
`;
      const result = parser.parse(yamlString, 'yaml');
      expect(result).toEqual(validConfig);
    });

    it('should throw error for invalid YAML syntax', () => {
      const invalidYaml = `
server:
  port: 3000
  environment: development
  invalid indentation
`;
      expect(() => parser.parse(invalidYaml, 'yaml')).toThrow(/Invalid YAML syntax/);
    });

    it('should throw error for YAML with missing required fields', () => {
      const incompleteYaml = `
server:
  port: 3000
  environment: development
`;
      expect(() => parser.parse(incompleteYaml, 'yaml')).toThrow(/Configuration validation failed/);
    });

    it('should throw error for YAML with invalid types', () => {
      const invalidYaml = `
server:
  port: not-a-number
  environment: development
database:
  host: localhost
  port: 5432
  name: test_db
  user: test_user
  password: test_password
  poolSize: 20
`;
      expect(() => parser.parse(invalidYaml, 'yaml')).toThrow(/Configuration validation failed/);
    });
  });

  describe('Configuration validation', () => {
    it('should validate correct configuration', () => {
      const result = parser.validate(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should reject configuration with negative port', () => {
      const invalidConfig = {
        ...validConfig,
        server: { ...validConfig.server, port: -1 },
      };
      expect(() => parser.validate(invalidConfig)).toThrow(/Configuration validation failed/);
    });

    it('should reject configuration with empty string fields', () => {
      const invalidConfig = {
        ...validConfig,
        database: { ...validConfig.database, host: '' },
      };
      expect(() => parser.validate(invalidConfig)).toThrow(/Configuration validation failed/);
    });

    it('should reject configuration with invalid email format', () => {
      const invalidConfig = {
        ...validConfig,
        email: { ...validConfig.email, from: 'not-an-email' },
      };
      expect(() => parser.validate(invalidConfig)).toThrow(/Configuration validation failed/);
    });

    it('should reject configuration with invalid URL format', () => {
      const invalidConfig = {
        ...validConfig,
        frontend: { ...validConfig.frontend, webUrl: 'not-a-url' },
      };
      expect(() => parser.validate(invalidConfig)).toThrow(/Configuration validation failed/);
    });

    it('should reject configuration with JWT secret less than 32 characters', () => {
      const invalidConfig = {
        ...validConfig,
        jwt: { ...validConfig.jwt, secret: 'short' },
      };
      expect(() => parser.validate(invalidConfig)).toThrow(/Configuration validation failed/);
    });

    it('should reject configuration with invalid LLM provider', () => {
      const invalidConfig = {
        ...validConfig,
        llm: { ...validConfig.llm, provider: 'invalid' as any },
      };
      expect(() => parser.validate(invalidConfig)).toThrow(/Configuration validation failed/);
    });

    it('should accept configuration with optional fields missing', () => {
      const configWithoutOptionals = {
        ...validConfig,
        redis: { host: 'localhost', port: 6379 }, // password is optional
        oauth: {
          google: {},
          facebook: {},
        },
      };
      const result = parser.validate(configWithoutOptionals);
      expect(result.redis.password).toBeUndefined();
    });
  });

  describe('Serialization', () => {
    it('should serialize configuration to JSON', () => {
      const jsonString = parser.serialize(validConfig, 'json');
      const parsed = JSON.parse(jsonString);
      expect(parsed).toEqual(validConfig);
    });

    it('should serialize configuration to YAML', () => {
      const yamlString = parser.serialize(validConfig, 'yaml');
      expect(yamlString).toContain('server:');
      expect(yamlString).toContain('port: 3000');
      expect(yamlString).toContain('environment: development');
    });

    it('should produce pretty-printed JSON with indentation', () => {
      const jsonString = parser.serialize(validConfig, 'json');
      expect(jsonString).toContain('\n');
      expect(jsonString).toContain('  '); // 2-space indentation
    });
  });

  describe('Round-trip property', () => {
    it('should maintain equivalence after JSON parse → serialize → parse', () => {
      const jsonString1 = parser.serialize(validConfig, 'json');
      const parsed1 = parser.parse(jsonString1, 'json');
      const jsonString2 = parser.serialize(parsed1, 'json');
      const parsed2 = parser.parse(jsonString2, 'json');

      expect(parsed1).toEqual(validConfig);
      expect(parsed2).toEqual(validConfig);
      expect(parsed1).toEqual(parsed2);
    });

    it('should maintain equivalence after YAML parse → serialize → parse', () => {
      const yamlString1 = parser.serialize(validConfig, 'yaml');
      const parsed1 = parser.parse(yamlString1, 'yaml');
      const yamlString2 = parser.serialize(parsed1, 'yaml');
      const parsed2 = parser.parse(yamlString2, 'yaml');

      expect(parsed1).toEqual(validConfig);
      expect(parsed2).toEqual(validConfig);
      expect(parsed1).toEqual(parsed2);
    });

    it('should maintain equivalence across JSON and YAML formats', () => {
      const jsonString = parser.serialize(validConfig, 'json');
      const yamlString = parser.serialize(validConfig, 'yaml');

      const parsedFromJson = parser.parse(jsonString, 'json');
      const parsedFromYaml = parser.parse(yamlString, 'yaml');

      expect(parsedFromJson).toEqual(parsedFromYaml);
    });

    it('should handle complex nested structures in round-trip', () => {
      const complexConfig = {
        ...validConfig,
        oauth: {
          google: {
            clientId: 'complex_id_with_special_chars_!@#$',
            clientSecret: 'complex_secret',
          },
          facebook: {
            appId: 'app_123',
            appSecret: 'secret_456',
          },
        },
      };

      const jsonString = parser.serialize(complexConfig, 'json');
      const parsed = parser.parse(jsonString, 'json');
      const yamlString = parser.serialize(parsed, 'yaml');
      const parsedAgain = parser.parse(yamlString, 'yaml');

      expect(parsedAgain).toEqual(complexConfig);
    });
  });

  describe('Environment variable loading', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should load configuration from environment variables', () => {
      process.env.PORT = '4000';
      process.env.NODE_ENV = 'production';
      process.env.DB_HOST = 'db.example.com';
      process.env.DB_PORT = '5433';
      process.env.DB_NAME = 'prod_db';
      process.env.DB_USER = 'prod_user';
      process.env.DB_PASSWORD = 'prod_password';
      process.env.DB_POOL_SIZE = '50';

      const envConfig = parser.loadFromEnv();

      expect(envConfig.server?.port).toBe(4000);
      expect(envConfig.server?.environment).toBe('production');
      expect(envConfig.database?.host).toBe('db.example.com');
      expect(envConfig.database?.port).toBe(5433);
      expect(envConfig.database?.name).toBe('prod_db');
      expect(envConfig.database?.poolSize).toBe(50);
    });

    it('should handle missing environment variables', () => {
      const envConfig = parser.loadFromEnv();
      expect(envConfig.server?.port).toBeUndefined();
      expect(envConfig.database?.host).toBeUndefined();
    });

    it('should parse numeric environment variables correctly', () => {
      process.env.PORT = '8080';
      process.env.DB_PORT = '3306';
      process.env.REDIS_PORT = '6380';
      process.env.JWT_EXPIRES_IN = '7200';
      process.env.LLM_MAX_TOKENS = '4000';

      const envConfig = parser.loadFromEnv();

      expect(envConfig.server?.port).toBe(8080);
      expect(envConfig.database?.port).toBe(3306);
      expect(envConfig.redis?.port).toBe(6380);
      expect(envConfig.jwt?.expiresIn).toBe(7200);
      expect(envConfig.llm?.maxTokens).toBe(4000);
    });

    it('should load optional environment variables', () => {
      process.env.REDIS_PASSWORD = 'secure_redis_password';
      process.env.VECTOR_DB_ENVIRONMENT = 'production-env';

      const envConfig = parser.loadFromEnv();

      expect(envConfig.redis?.password).toBe('secure_redis_password');
      expect(envConfig.vectorDb?.environment).toBe('production-env');
    });

    it('should load OAuth configuration from environment', () => {
      process.env.GOOGLE_CLIENT_ID = 'google_123';
      process.env.GOOGLE_CLIENT_SECRET = 'google_secret';
      process.env.FACEBOOK_APP_ID = 'facebook_456';
      process.env.FACEBOOK_APP_SECRET = 'facebook_secret';

      const envConfig = parser.loadFromEnv();

      expect(envConfig.oauth?.google?.clientId).toBe('google_123');
      expect(envConfig.oauth?.google?.clientSecret).toBe('google_secret');
      expect(envConfig.oauth?.facebook?.appId).toBe('facebook_456');
      expect(envConfig.oauth?.facebook?.appSecret).toBe('facebook_secret');
    });
  });

  describe('Configuration merging', () => {
    it('should merge base configuration with overrides', () => {
      const baseConfig = validConfig;
      const overrides = {
        server: { port: 4000, environment: 'production' as const },
        database: { host: 'prod.db.com' },
      };

      const merged = parser.merge(baseConfig, overrides);

      expect(merged.server.port).toBe(4000);
      expect(merged.server.environment).toBe('production');
      expect(merged.database.host).toBe('prod.db.com');
      expect(merged.database.port).toBe(validConfig.database.port); // unchanged
    });

    it('should give precedence to overrides over base configuration', () => {
      const baseConfig = validConfig;
      const overrides = {
        llm: { apiKey: 'override_key' },
        payment: { webhookSecret: 'override_secret' },
      };

      const merged = parser.merge(baseConfig, overrides);

      expect(merged.llm.apiKey).toBe('override_key');
      expect(merged.payment.webhookSecret).toBe('override_secret');
      expect(merged.llm.provider).toBe(validConfig.llm.provider); // unchanged
    });

    it('should validate merged configuration', () => {
      const baseConfig = validConfig;
      const invalidOverrides = {
        server: { port: -1 },
      };

      expect(() => parser.merge(baseConfig, invalidOverrides)).toThrow(
        /Configuration validation failed/
      );
    });

    it('should handle partial overrides for nested objects', () => {
      const baseConfig = validConfig;
      const overrides = {
        oauth: {
          google: { clientId: 'new_google_id' },
        },
      };

      const merged = parser.merge(baseConfig, overrides);

      expect(merged.oauth.google.clientId).toBe('new_google_id');
      expect(merged.oauth.google.clientSecret).toBe(validConfig.oauth.google.clientSecret);
      expect(merged.oauth.facebook).toEqual(validConfig.oauth.facebook);
    });

    it('should handle empty overrides', () => {
      const baseConfig = validConfig;
      const overrides = {};

      const merged = parser.merge(baseConfig, overrides);

      expect(merged).toEqual(validConfig);
    });
  });

  describe('Environment variable precedence', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should give precedence to environment variables over file configuration', () => {
      // Set environment variables
      process.env.PORT = '9000';
      process.env.NODE_ENV = 'production';
      process.env.DB_HOST = 'env.db.com';

      const fileConfig = validConfig;
      const envConfig = parser.loadFromEnv();
      const merged = parser.merge(fileConfig, envConfig);

      expect(merged.server.port).toBe(9000); // from env
      expect(merged.server.environment).toBe('production'); // from env
      expect(merged.database.host).toBe('env.db.com'); // from env
      expect(merged.database.port).toBe(validConfig.database.port); // from file
    });

    it('should use file configuration when environment variables are not set', () => {
      const fileConfig = validConfig;
      const envConfig = parser.loadFromEnv();
      const merged = parser.merge(fileConfig, envConfig);

      expect(merged.server.port).toBe(validConfig.server.port);
      expect(merged.database.host).toBe(validConfig.database.host);
    });

    it('should override multiple configuration sections from environment', () => {
      process.env.PORT = '5000';
      process.env.DB_HOST = 'override.db.com';
      process.env.REDIS_HOST = 'override.redis.com';
      process.env.LLM_API_KEY = 'override_llm_key';

      const fileConfig = validConfig;
      const envConfig = parser.loadFromEnv();
      const merged = parser.merge(fileConfig, envConfig);

      expect(merged.server.port).toBe(5000);
      expect(merged.database.host).toBe('override.db.com');
      expect(merged.redis.host).toBe('override.redis.com');
      expect(merged.llm.apiKey).toBe('override_llm_key');
    });
  });

  describe('Edge cases', () => {
    it('should handle configuration with special characters in strings', () => {
      const configWithSpecialChars = {
        ...validConfig,
        database: {
          ...validConfig.database,
          password: 'p@ssw0rd!#$%^&*()',
        },
        jwt: {
          ...validConfig.jwt,
          secret: 'secret_with_special_chars_!@#$%^&*()_+-=[]{}|;:,.<>?',
        },
      };

      const jsonString = parser.serialize(configWithSpecialChars, 'json');
      const parsed = parser.parse(jsonString, 'json');

      expect(parsed.database.password).toBe('p@ssw0rd!#$%^&*()');
      expect(parsed.jwt.secret).toBe('secret_with_special_chars_!@#$%^&*()_+-=[]{}|;:,.<>?');
    });

    it('should handle configuration with unicode characters', () => {
      const configWithUnicode = {
        ...validConfig,
        email: {
          ...validConfig.email,
          from: 'test@例え.com',
        },
      };

      const jsonString = parser.serialize(configWithUnicode, 'json');
      const parsed = parser.parse(jsonString, 'json');

      expect(parsed.email.from).toBe('test@例え.com');
    });

    it('should handle configuration with very large numbers', () => {
      const configWithLargeNumbers = {
        ...validConfig,
        jwt: {
          ...validConfig.jwt,
          expiresIn: 2147483647, // max 32-bit integer
          refreshExpiresIn: 2147483647,
        },
      };

      const jsonString = parser.serialize(configWithLargeNumbers, 'json');
      const parsed = parser.parse(jsonString, 'json');

      expect(parsed.jwt.expiresIn).toBe(2147483647);
      expect(parsed.jwt.refreshExpiresIn).toBe(2147483647);
    });

    it('should handle empty optional fields', () => {
      const configWithEmptyOptionals = {
        ...validConfig,
        redis: {
          host: 'localhost',
          port: 6379,
        },
        vectorDb: {
          provider: 'pinecone',
          apiKey: 'test_key',
          index: 'test-index',
        },
      };

      const result = parser.validate(configWithEmptyOptionals);
      expect(result.redis.password).toBeUndefined();
      expect(result.vectorDb.environment).toBeUndefined();
    });
  });
});
