import { Body, Controller, Logger, Post } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import type { RecommendationRequestDto } from './dto/recommendation-request.dto';
import { randomUUID } from 'crypto';

@Controller('recommendations')
export class RecommendationController {
  private readonly logger = new Logger(RecommendationController.name);

  constructor(private recommendationService: RecommendationService) {}

  @Post()
  async generateRecommendation(@Body() dto: RecommendationRequestDto) {
    this.logger.debug(`[POST /recommendations] Received request`);
    this.logger.debug(`Goal: ${dto.goalText?.substring(0, 50)}`);

    const sessionId = dto.sessionId || randomUUID();
    this.logger.debug(`Session ID: ${sessionId}`);

    const result = await this.recommendationService.recommend(dto.goalText, sessionId);

    return {
      sessionId,
      ...result,
      createdAt: new Date(),
    };
  }
}
