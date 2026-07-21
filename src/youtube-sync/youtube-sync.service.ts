import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CATEGORIES, PLAYLIST_CATEGORY_BY_ID } from './category-mapping';
import { SEED_FALLBACK_PLAYLISTS } from './seed-fallback/seed-fallback';

interface YoutubePlaylistItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
  };
  contentDetails: { itemCount: number };
}

interface YoutubePlaylistItemsEntry {
  snippet: {
    title: string;
    description: string;
    position: number;
    resourceId: { videoId: string };
    thumbnails?: { high?: { url: string }; medium?: { url: string }; default?: { url: string } };
  };
  contentDetails: { videoPublishedAt?: string };
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

@Injectable()
export class YoutubeSyncService {
  private readonly logger = new Logger(YoutubeSyncService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get apiKey(): string | undefined {
    return this.config.get<string>('YOUTUBE_API_KEY');
  }

  private get channelId(): string | undefined {
    return this.config.get<string>('YOUTUBE_CHANNEL_ID');
  }

  async ensureCategories(): Promise<void> {
    for (const category of CATEGORIES) {
      await this.prisma.category.upsert({
        where: { key: category.key },
        create: category,
        update: { label: category.label, description: category.description },
      });
    }
  }

  /** Teste que la cle YouTube Data est fonctionnelle avant de lancer une sync complete. */
  async checkApiKeyIsAlive(): Promise<boolean> {
    if (!this.apiKey || !this.channelId) return false;
    const url = `${YOUTUBE_API_BASE}/channels?part=id&id=${this.channelId}&key=${this.apiKey}`;
    const res = await fetch(url);
    return res.ok;
  }

  async syncAll(): Promise<{ mode: 'youtube-api' | 'seed-fallback'; playlists: number; videos: number }> {
    await this.ensureCategories();

    const alive = await this.checkApiKeyIsAlive();
    if (!alive) {
      this.logger.warn('Cle YouTube Data indisponible, repli sur le seed statique');
      return this.syncFromSeedFallback();
    }

    return this.syncFromYoutubeApi();
  }

  private async syncFromYoutubeApi() {
    const playlists = await this.fetchAllPlaylists();
    let videoCount = 0;

    for (const playlist of playlists) {
      const categoryKey = PLAYLIST_CATEGORY_BY_ID[playlist.id];
      const category = categoryKey
        ? await this.prisma.category.findUnique({ where: { key: categoryKey } })
        : null;

      const savedPlaylist = await this.prisma.playlist.upsert({
        where: { youtubePlaylistId: playlist.id },
        create: {
          youtubePlaylistId: playlist.id,
          title: playlist.snippet.title,
          description: playlist.snippet.description || null,
          thumbnailUrl:
            playlist.snippet.thumbnails?.high?.url ??
            playlist.snippet.thumbnails?.medium?.url ??
            playlist.snippet.thumbnails?.default?.url ??
            null,
          videoCount: playlist.contentDetails.itemCount,
          categoryId: category?.id,
          syncedAt: new Date(),
          source: 'youtube-sync',
        },
        update: {
          title: playlist.snippet.title,
          description: playlist.snippet.description || null,
          thumbnailUrl:
            playlist.snippet.thumbnails?.high?.url ??
            playlist.snippet.thumbnails?.medium?.url ??
            playlist.snippet.thumbnails?.default?.url ??
            null,
          videoCount: playlist.contentDetails.itemCount,
          categoryId: category?.id,
          syncedAt: new Date(),
          source: 'youtube-sync',
        },
      });

      const videos = await this.fetchPlaylistItems(playlist.id);
      for (const video of videos) {
        await this.prisma.video.upsert({
          where: { youtubeVideoId: video.snippet.resourceId.videoId },
          create: {
            youtubeVideoId: video.snippet.resourceId.videoId,
            title: video.snippet.title,
            description: video.snippet.description || null,
            thumbnailUrl:
              video.snippet.thumbnails?.high?.url ??
              video.snippet.thumbnails?.medium?.url ??
              video.snippet.thumbnails?.default?.url ??
              null,
            publishedAt: video.contentDetails.videoPublishedAt
              ? new Date(video.contentDetails.videoPublishedAt)
              : null,
            position: video.snippet.position,
            playlistId: savedPlaylist.id,
            syncedAt: new Date(),
          },
          update: {
            title: video.snippet.title,
            description: video.snippet.description || null,
            thumbnailUrl:
              video.snippet.thumbnails?.high?.url ??
              video.snippet.thumbnails?.medium?.url ??
              video.snippet.thumbnails?.default?.url ??
              null,
            position: video.snippet.position,
            playlistId: savedPlaylist.id,
            syncedAt: new Date(),
          },
        });
        videoCount += 1;
      }
    }

    return { mode: 'youtube-api' as const, playlists: playlists.length, videos: videoCount };
  }

  private async syncFromSeedFallback() {
    for (const entry of SEED_FALLBACK_PLAYLISTS) {
      const category = await this.prisma.category.findUnique({ where: { key: entry.categoryKey } });
      await this.prisma.playlist.upsert({
        where: { youtubePlaylistId: entry.youtubePlaylistId },
        create: {
          youtubePlaylistId: entry.youtubePlaylistId,
          title: entry.title,
          videoCount: entry.videoCount,
          categoryId: category?.id,
          syncedAt: new Date(),
          source: 'seed-fallback',
        },
        update: {
          title: entry.title,
          videoCount: entry.videoCount,
          categoryId: category?.id,
          syncedAt: new Date(),
          source: 'seed-fallback',
        },
      });
    }
    return { mode: 'seed-fallback' as const, playlists: SEED_FALLBACK_PLAYLISTS.length, videos: 0 };
  }

  private async fetchAllPlaylists(): Promise<YoutubePlaylistItem[]> {
    const items: YoutubePlaylistItem[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${YOUTUBE_API_BASE}/playlists`);
      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('channelId', this.channelId!);
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('key', this.apiKey!);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`YouTube playlists.list a echoue: ${res.status}`);
      const data = await res.json();
      items.push(...data.items);
      pageToken = data.nextPageToken;
    } while (pageToken);

    return items;
  }

  private async fetchPlaylistItems(playlistId: string): Promise<YoutubePlaylistItemsEntry[]> {
    const items: YoutubePlaylistItemsEntry[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
      url.searchParams.set('part', 'snippet,contentDetails');
      url.searchParams.set('playlistId', playlistId);
      url.searchParams.set('maxResults', '50');
      url.searchParams.set('key', this.apiKey!);
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const res = await fetch(url.toString());
      if (!res.ok) {
        this.logger.warn(`playlistItems.list a echoue pour ${playlistId}: ${res.status}`);
        break;
      }
      const data = await res.json();
      items.push(...(data.items ?? []));
      pageToken = data.nextPageToken;
    } while (pageToken);

    return items;
  }
}
