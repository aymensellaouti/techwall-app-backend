import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * **POURQUOI ce guard:**
 * Protège les APIs contre les abus en validant une clé API
 * - La clé est stockée en variable d'env Railway (jamais exposée)
 * - Le frontend l'envoie dans le header Authorization
 * - Rejette tout appel sans clé valide
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers.authorization?.replace('Bearer ', '');

    const validApiKey = this.configService.get<string>('API_KEY');

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException('Invalid or missing API key');
    }

    return true;
  }
}
