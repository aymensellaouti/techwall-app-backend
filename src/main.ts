import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // **CORS STRICT**: dev + production (Vercel / Netlify)
  // Production: domaines *.vercel.app et *.netlify.app uniquement (protège contre CSRF)
  // Dev: localhost:4200
  const allowedOrigins = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    /https:\/\/.*\.vercel\.app$/, // Vercel production (+ preview deployments)
    /https:\/\/.*\.netlify\.app$/, // Netlify production
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

