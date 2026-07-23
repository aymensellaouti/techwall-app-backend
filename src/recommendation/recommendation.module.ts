import { Module } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import { RateLimitInterceptor } from '../auth/rate-limit.interceptor';
import { LlmModule } from '../llm/llm.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PrismaModule } from '../prisma/prisma.module';

// **POURQUOI plus d'APP_INTERCEPTOR:**
// Enregistré ainsi, le rate limiter s'appliquait GLOBALEMENT (toute la navigation
// catalogue bridée à 10 req/min). On le déclare comme provider normal et on l'applique
// uniquement sur le controller /recommendations (l'appel coûteux) via @UseInterceptors.
@Module({
  imports: [LlmModule, CatalogModule, PrismaModule],
  controllers: [RecommendationController],
  providers: [RecommendationService, RateLimitInterceptor],
})
export class RecommendationModule {}
