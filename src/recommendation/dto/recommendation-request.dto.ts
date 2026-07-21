import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RecommendationRequestDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  goalText: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}

