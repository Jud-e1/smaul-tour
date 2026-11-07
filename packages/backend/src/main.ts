import { config as loadDotenv } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configurationParser } from './config/configuration';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

loadDotenv();

async function bootstrap() {
  // Load configuration
  const config = configurationParser.loadFromEnv();

  const app = await NestFactory.create(AppModule);

  // Allow the local web app and the deployed site to call this API.
  const configuredWebUrl = config.frontend?.webUrl || 'http://localhost:3001';
  const extraOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const allowedOrigins = [
    ...new Set([
      configuredWebUrl,
      'http://localhost:3001',
      'https://smaul-tour.vercel.app',
      'https://smaul-tour-jude-azanes-projects.vercel.app',
      ...extraOrigins,
    ]),
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global exception filter — returns structured { statusCode, message, timestamp, path }
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger API documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI-Powered Local Tourism Marketplace API')
    .setDescription('API documentation for the Tourism Marketplace platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.server?.port || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
