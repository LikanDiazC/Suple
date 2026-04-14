import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3001;

  // -----------------------------------------------------------------------
  // AUDIT FIX #1: Global ValidationPipe
  // -----------------------------------------------------------------------
  // - whitelist: true          → Strips any property NOT decorated in the DTO,
  //                              preventing mass-assignment / NoSQL injection.
  // - forbidNonWhitelisted     → Throws 400 if unknown properties are sent,
  //                              making attacks visible in logs.
  // - transform: true          → Auto-converts query params (string → number)
  //                              via class-transformer @Type decorators.
  // - disableErrorMessages     → In production, hide validation details from attackers.
  // -----------------------------------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(port);
  Logger.log(`Backend running on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
