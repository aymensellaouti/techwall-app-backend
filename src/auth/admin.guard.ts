import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Verifie un Bearer token Supabase (JWT signe par le projet, via SUPABASE_JWKS_URL).
 * Le frontend/l'appelant obtient ce token via Supabase Auth (login admin), jamais
 * de cle Supabase transmise - seul le JWT circule.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(private readonly config: ConfigService) {
    this.jwks = createRemoteJWKSet(
      new URL(this.config.getOrThrow<string>('SUPABASE_JWKS_URL')),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token admin manquant');
    }

    const token = authHeader.slice('Bearer '.length);
    try {
      const { payload } = await jwtVerify(token, this.jwks);
      request.adminUser = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token admin invalide ou expire');
    }
  }
}
