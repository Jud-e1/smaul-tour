import { z } from 'zod';

export const ConfigurationSchema = z.object({
  server: z.object({
    port: z.number().int().positive(),
    environment: z.enum(['development', 'staging', 'production']),
  }),
  database: z.object({
    host: z.string().min(1),
    port: z.number().int().positive(),
    name: z.string().min(1),
    user: z.string().min(1),
    password: z.string().min(1),
    poolSize: z.number().int().positive(),
  }),
  redis: z.object({
    host: z.string().min(1),
    port: z.number().int().positive(),
    password: z.string().optional(),
  }),
  llm: z.object({
    provider: z.enum(['openai', 'anthropic']),
    apiKey: z.string().min(1),
    model: z.string().min(1),
    maxTokens: z.number().int().positive(),
  }),
  vectorDb: z.object({
    provider: z.string().min(1),
    apiKey: z.string().min(1),
    environment: z.string().optional(),
    index: z.string().min(1),
  }),
  payment: z.object({
    provider: z.string().min(1),
    apiKey: z.string().min(1),
    webhookSecret: z.string().min(1),
  }),
  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.number().int().positive(),
    refreshSecret: z.string().min(32),
    refreshExpiresIn: z.number().int().positive(),
  }),
  oauth: z.object({
    google: z.object({
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
    }),
    facebook: z.object({
      appId: z.string().optional(),
      appSecret: z.string().optional(),
    }),
  }),
  email: z.object({
    provider: z.string().min(1),
    apiKey: z.string().min(1),
    from: z.string().email(),
  }),
  storage: z.object({
    provider: z.string().min(1),
    bucket: z.string().min(1),
    region: z.string().min(1),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
  }),
  maps: z.object({
    apiKey: z.string().min(1),
  }),
  exchangeRate: z.object({
    apiKey: z.string().min(1),
  }),
  frontend: z.object({
    webUrl: z.string().url(),
    mobileDeepLinkScheme: z.string().min(1),
  }),
});

export type Configuration = z.infer<typeof ConfigurationSchema>;
