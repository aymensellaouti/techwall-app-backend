import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RecommendationRequestDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  goalText: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  // Transcript des derniers échanges (formaté côté frontend) pour les questions de suivi.
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  history?: string;
}

