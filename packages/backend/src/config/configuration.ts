import { ConfigurationSchema, Configuration } from './configuration.schema';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export class ConfigurationParser {
  /**
   * Parse configuration from JSON or YAML string
   */
  parse(content: string, format: 'json' | 'yaml'): Configuration {
    try {
      let parsed: unknown;

      if (format === 'json') {
        parsed = JSON.parse(content);
      } else {
        parsed = yaml.load(content);
      }

      return this.validate(parsed);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid ${format.toUpperCase()} syntax: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Validate configuration object against schema
   */
  validate(config: unknown): Configuration {
    const result = ConfigurationSchema.safeParse(config);

    if (!result.success) {
      const errors = result.error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    return result.data;
  }

  /**
   * Serialize configuration to JSON or YAML string
   */
  serialize(config: Configuration, format: 'json' | 'yaml'): string {
    if (format === 'json') {
      return JSON.stringify(config, null, 2);
    } else {
      return yaml.dump(config, { indent: 2 });
    }
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnv(): Partial<Configuration> {
    return {
      server: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
        environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
      },
      database: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
        name: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        poolSize: process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE, 10) : undefined,
      },
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : undefined,
        password: process.env.REDIS_PASSWORD,
      },
      llm: {
        provider: process.env.LLM_PROVIDER as 'openai' | 'anthropic',
        apiKey: process.env.LLM_API_KEY,
        model: process.env.LLM_MODEL,
        maxTokens: process.env.LLM_MAX_TOKENS
          ? parseInt(process.env.LLM_MAX_TOKENS, 10)
          : undefined,
      },
      vectorDb: {
        provider: process.env.VECTOR_DB_PROVIDER,
        apiKey: process.env.VECTOR_DB_API_KEY,
        environment: process.env.VECTOR_DB_ENVIRONMENT,
        index: process.env.VECTOR_DB_INDEX,
      },
      payment: {
        provider: process.env.PAYMENT_PROVIDER,
        apiKey: process.env.PAYMENT_API_KEY,
        webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
      },
      jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN, 10) : undefined,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN
          ? parseInt(process.env.JWT_REFRESH_EXPIRES_IN, 10)
          : undefined,
      },
      oauth: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
        facebook: {
          appId: process.env.FACEBOOK_APP_ID,
          appSecret: process.env.FACEBOOK_APP_SECRET,
        },
      },
      email: {
        provider: process.env.EMAIL_PROVIDER,
        apiKey: process.env.EMAIL_API_KEY,
        from: process.env.EMAIL_FROM,
      },
      storage: {
        provider: process.env.STORAGE_PROVIDER,
        bucket: process.env.STORAGE_BUCKET,
        region: process.env.STORAGE_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      maps: {
        apiKey: process.env.MAPS_API_KEY,
      },
      exchangeRate: {
        apiKey: process.env.EXCHANGE_RATE_API_KEY,
      },
      frontend: {
        webUrl: process.env.WEB_URL,
        mobileDeepLinkScheme: process.env.MOBILE_DEEP_LINK_SCHEME,
      },
    } as Partial<Configuration>;
  }

  /**
   * Merge base configuration with overrides (environment variables take precedence)
   */
  merge(base: Configuration, overrides: Partial<Configuration>): Configuration {
    const merged = {
      server: { ...base.server, ...overrides.server },
      database: { ...base.database, ...overrides.database },
      redis: { ...base.redis, ...overrides.redis },
      llm: { ...base.llm, ...overrides.llm },
      vectorDb: { ...base.vectorDb, ...overrides.vectorDb },
      payment: { ...base.payment, ...overrides.payment },
      jwt: { ...base.jwt, ...overrides.jwt },
      oauth: {
        google: { ...base.oauth.google, ...overrides.oauth?.google },
        facebook: { ...base.oauth.facebook, ...overrides.oauth?.facebook },
      },
      email: { ...base.email, ...overrides.email },
      storage: { ...base.storage, ...overrides.storage },
      maps: { ...base.maps, ...overrides.maps },
      exchangeRate: { ...base.exchangeRate, ...overrides.exchangeRate },
      frontend: { ...base.frontend, ...overrides.frontend },
    };

    return this.validate(merged);
  }

  /**
   * Load configuration from file with environment variable overrides
   */
  loadFromFile(filePath: string): Configuration {
    const content = fs.readFileSync(filePath, 'utf-8');
    const format = filePath.endsWith('.yaml') || filePath.endsWith('.yml') ? 'yaml' : 'json';
    const fileConfig = this.parse(content, format);
    const envConfig = this.loadFromEnv();

    return this.merge(fileConfig, envConfig);
  }
}

export const configurationParser = new ConfigurationParser();

/**
 * NestJS ConfigModule factory function
 * Returns configuration loaded from environment variables
 */
export default function configuration() {
  return {
    server: {
      port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
      environment: process.env.NODE_ENV || 'development',
    },
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      name: process.env.DB_NAME || 'tourism',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      poolSize: process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE, 10) : 20,
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
      password: process.env.REDIS_PASSWORD,
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'secret',
      expiresIn: process.env.JWT_EXPIRES_IN ? parseInt(process.env.JWT_EXPIRES_IN, 10) : 3600,
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN
        ? parseInt(process.env.JWT_REFRESH_EXPIRES_IN, 10)
        : 2592000,
    },
    payment: {
      provider: process.env.PAYMENT_PROVIDER || 'stripe',
      apiKey: process.env.PAYMENT_API_KEY || '',
      webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',
    },
    llm: {
      provider: process.env.LLM_PROVIDER || 'openai',
      apiKey: process.env.LLM_API_KEY || '',
      model: process.env.LLM_MODEL || 'gpt-4',
      maxTokens: process.env.LLM_MAX_TOKENS ? parseInt(process.env.LLM_MAX_TOKENS, 10) : 2000,
    },
    vectorDb: {
      provider: process.env.VECTOR_DB_PROVIDER || 'pinecone',
      apiKey: process.env.VECTOR_DB_API_KEY || '',
      environment: process.env.VECTOR_DB_ENVIRONMENT || '',
      index: process.env.VECTOR_DB_INDEX || 'experiences',
    },
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      },
      facebook: {
        appId: process.env.FACEBOOK_APP_ID || '',
        appSecret: process.env.FACEBOOK_APP_SECRET || '',
      },
    },
    email: {
      provider: process.env.EMAIL_PROVIDER || 'sendgrid',
      apiKey: process.env.EMAIL_API_KEY || '',
      from: process.env.EMAIL_FROM || 'noreply@example.com',
    },
    storage: {
      provider: process.env.STORAGE_PROVIDER || 's3',
      bucket: process.env.STORAGE_BUCKET || '',
      region: process.env.STORAGE_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    maps: {
      apiKey: process.env.MAPS_API_KEY || '',
    },
    exchangeRate: {
      apiKey: process.env.EXCHANGE_RATE_API_KEY || '',
    },
    frontend: {
      webUrl: process.env.WEB_URL || 'http://localhost:3001',
      mobileDeepLinkScheme: process.env.MOBILE_DEEP_LINK_SCHEME || 'tourism',
    },
  };
}
