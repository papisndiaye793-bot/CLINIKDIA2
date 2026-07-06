import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  // En-têtes de sécurité (ISO 27002 8.23 / 8.26)
  app.use(helmet());
  app.use(cookieParser());

  // Validation stricte des entrées : rejette tout champ inconnu (8.28)
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // CORS restreint à l'origine du front + cookies de session
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true, credentials: true });

  await app.listen(Number(process.env.PORT) || 3001);
  // eslint-disable-next-line no-console
  console.log(`API ClinikDia démarrée (prod=${isProd})`);
}
bootstrap();
