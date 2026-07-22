import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import { RateLimitInterceptor } from '../auth/rate-limit.interceptor';
import { LlmModule } from '../llm/llm.module';
import { CatalogModule } from '../catalog/catalog.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [LlmModule, CatalogModule, PrismaModule],
  controllers: [RecommendationController],
  providers: [
    RecommendationService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitInterceptor,
    },
  ],
})
export class RecommendationModule {}
