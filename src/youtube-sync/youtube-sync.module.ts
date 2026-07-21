import { Module } from '@nestjs/common';
import { YoutubeSyncService } from './youtube-sync.service';
import { YoutubeSyncController } from './youtube-sync.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [YoutubeSyncController],
  providers: [YoutubeSyncService],
  exports: [YoutubeSyncService],
})
export class YoutubeSyncModule {}
