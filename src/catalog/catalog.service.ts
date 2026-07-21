import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  getCategories() {
    return this.prisma.category.findMany({
      include: { _count: { select: { playlists: true } } },
      orderBy: { label: 'asc' },
    });
  }

  getPlaylists(categoryKey?: string) {
    return this.prisma.playlist.findMany({
      where: categoryKey ? { category: { key: categoryKey } } : undefined,
      include: { category: true, _count: { select: { videos: true } } },
      orderBy: { videoCount: 'desc' },
    });
  }

  async getPlaylistById(id: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: { category: true, videos: { orderBy: { position: 'asc' } } },
    });
    if (!playlist) throw new NotFoundException(`Playlist ${id} introuvable`);
    return playlist;
  }

  getFounders() {
    return this.prisma.founder.findMany({ orderBy: { name: 'asc' } });
  }
}
