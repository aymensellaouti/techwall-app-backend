import { Body, Controller, Logger, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { RecommendationRequestDto } from './dto/recommendation-request.dto';
import { RecommendationFeedbackDto } from './dto/recommendation-feedback.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { RateLimitInterceptor } from '../auth/rate-limit.interceptor';
import { randomUUID } from 'crypto';

// Rate limiting appliqué ICI seulement (endpoint LLM coûteux), pas globalement.
@Controller('recommendations')
@UseGuards(ApiKeyGuard)
@UseInterceptors(RateLimitInterceptor)
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(private recommendationService: RecommendationService) {}

  @Post()
  async generateRecommendation(@Body() dto: RecommendationRequestDto) {
    this.logger.debug(`[POST /recommendations] Received request`);
    this.logger.debug(`Goal: ${dto.goalText?.substring(0, 50)}`);

    const sessionId = dto.sessionId || randomUUID();
    this.logger.debug(`Session ID: ${sessionId}`);

    const result = await this.recommendationService.recommend(dto.goalText, sessionId, dto.history);

    return {
      sessionId,
      ...result,
      createdAt: new Date(),
    };
  }

  // Feedback 👍/👎 sur une vidéo recommandée (stocké pour affiner plus tard).
  @Post('feedback')
  async submitFeedback(@Body() dto: RecommendationFeedbackDto) {
    this.logger.debug(`[POST /recommendations/feedback] vote=${dto.vote} video=${dto.videoId}`);
    return this.recommendationService.recordFeedback(dto);
  }
}
