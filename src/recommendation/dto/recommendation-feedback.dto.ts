import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class RecommendationFeedbackDto {
  @IsString()
  @MaxLength(200)
  sessionId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  videoId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  goalText?: string;

  @IsIn(['up', 'down'])
  vote: 'up' | 'down';
}
