import { RecommendationPlan } from '../types/recommendation-plan.type';

export class RecommendationResponseDto {
  sessionId: string;
  plan: RecommendationPlan;
  providerUsed: string;
  fallbackUsed: boolean;
  createdAt: Date;
}
