import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // **CORS**: dev (localhost) + origine(s) EXACTE(S) du front en production.
  // On définit FRONTEND_ORIGIN sur Railway avec l'URL exacte du front
  // (ex: https://techwall-app-frontend.vercel.app). Plusieurs valeurs possibles
  // séparées par des virgules. Aucun wildcard: seul le domaine listé est autorisé.
  const devOrigins = ['http://localhost:4200', 'http://127.0.0.1:4200'];
  const frontendOrigin = process.env.FRONTEND_ORIGIN;

  let allowedOrigins: (string | RegExp)[];
  if (frontendOrigin) {
    const exact = frontendOrigin
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
    allowedOrigins = [...devOrigins, ...exact];
    logger.log(`CORS restreint aux origines: ${allowedOrigins.join(', ')}`);
  } else {
    // Transition uniquement: tant que FRONTEND_ORIGIN n'est pas défini, on tolère
    // les domaines Vercel/Netlify pour ne pas casser la prod. À restreindre en
    // définissant FRONTEND_ORIGIN avec l'URL exacte du front.
    allowedOrigins = [
      ...devOrigins,
      /https:\/\/.*\.vercel\.app$/,
      /https:\/\/.*\.netlify\.app$/,
    ];
    logger.warn(
      'FRONTEND_ORIGIN non défini: CORS permissif (*.vercel.app / *.netlify.app). ' +
        "Définis FRONTEND_ORIGIN avec l'URL exacte du front pour restreindre.",
    );
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

