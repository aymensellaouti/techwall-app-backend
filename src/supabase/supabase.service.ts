import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Seul point du backend qui detient le SUPABASE_SECRET_KEY (service_role).
 * Le client cree ici contourne RLS - ne jamais l'exposer au frontend.
 */
@Injectable()
export class SupabaseService {
  private readonly client: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    this.client = createClient(
      this.config.getOrThrow<string>('SUPABASE_URL'),
      this.config.getOrThrow<string>('SUPABASE_SECRET_KEY'),
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
