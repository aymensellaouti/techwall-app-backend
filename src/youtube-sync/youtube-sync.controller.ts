import { Controller, Post, UseGuards } from '@nestjs/common';
import { YoutubeSyncService } from './youtube-sync.service';
import { AdminGuard } from '../auth/admin.guard';

/**
 * Endpoint de declenchement manuel de la sync catalogue, reserve a l'admin
 * (verification du JWT Supabase via AdminGuard).
 */
@Controller('youtube-sync')
export class YoutubeSyncController {
  constructor(private readonly youtubeSyncService: YoutubeSyncService) {}

  @Post('run')
  @UseGuards(AdminGuard)
  async run() {
    return this.youtubeSyncService.syncAll();
  }
}
