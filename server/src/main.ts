import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  // Gestion des clés cryptographiques (ISO 27002 8.24) : refuser de démarrer
  // sans un secret de signature JWT fort. Évite toute signature avec un secret
  // « undefined » ou trivial en production.
  const secret = process.env.JWT_SECRET ?? '';
  if (!secret || secret.length < 32 || /change-?me/i.test(secret)) {
    throw new Error(
      'JWT_SECRET manquant ou trop faible (≥ 32 caractères aléatoires requis). ' +
        'Générer : node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))".',
    );
  }

  const app = await NestFactory.create(AppModule);

  // En-têtes de sécurité (ISO 27002 8.23 / 8.26)
  app.use(helmet());
  app.use(cookieParser());

  // Validation stricte des entrées : rejette tout champ inconnu (8.28)
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // CORS restreint à l'origine du front + cookies de session (8.20/8.5).
  // Fail-closed : si CORS_ORIGIN n'est pas défini, on n'autorise AUCUNE origine
  // tierce en production (les requêtes même-origine via /api restent possibles).
  const corsOrigin = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: corsOrigin ?? (isProd ? false : ['http://localhost:5180', 'http://localhost:5173']), credentials: true });

  await app.listen(Number(process.env.PORT) || 3001);
  // eslint-disable-next-line no-console
  console.log(`API ClinikDia démarrée (prod=${isProd})`);
}
bootstrap();
