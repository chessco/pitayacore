import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Keep the API alive when background integrations (e.g. the whatsapp-web.js
// puppeteer session) throw on teardown/logout. Without this, an unhandled
// puppeteer ProtocolError on a WhatsApp LOGOUT crashes the whole process.
const processLogger = new Logger('Process');
process.on('unhandledRejection', (reason: any) => {
  processLogger.error(
    `Unhandled promise rejection: ${reason?.message || reason}`,
    reason?.stack,
  );
});
process.on('uncaughtException', (err: any) => {
  processLogger.error(`Uncaught exception: ${err?.message || err}`, err?.stack);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());

  // Global Error Handling
  app.useGlobalFilters(new AllExceptionsFilter());

  // Input Validation & Sanitization
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS dinámico para producción
  app.enableCors({
    origin: [
      /^https?:\/\/localhost:\d+$/,
      /^https?:\/\/([a-zA-Z0-9-]+\.)?pitayacode\.io$/,
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    exposedHeaders: ['set-cookie'],
  });
  app.setGlobalPrefix('api'); // Restored to fix global routes
  // Aumentar el límite de tamaño para recibir payloads de Flow (ej. base64 o skills grandes)
  const { json, urlencoded } = require('express');
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  await app.listen(process.env.PORT ?? 2014);
}
bootstrap();
