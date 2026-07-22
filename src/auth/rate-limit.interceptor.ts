import { Injectable, NestInterceptor, ExecutionContext, CallHandler, TooManyRequestsException } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * **POURQUOI ce rate limiter:**
 * Protège les quotas LLM en limitant les requêtes par IP
 * - Max 10 requêtes par minute par IP
 * - Empêche les abus/DDoS
 * - Simple en mémoire (bon pour petits projets)
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private requests = new Map<string, { count: number; resetTime: number }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress || 'unknown';

    const now = Date.now();
    const record = this.requests.get(ip);

    // Reset bucket si expiration passée
    if (record && now > record.resetTime) {
      this.requests.delete(ip);
    }

    const current = this.requests.get(ip) || { count: 0, resetTime: now + 60000 };

    // Limite: 10 requêtes par minute
    if (current.count >= 10) {
      throw new TooManyRequestsException('Rate limit exceeded (10 req/min)');
    }

    current.count++;
    this.requests.set(ip, current);

    return next.handle();
  }
}
