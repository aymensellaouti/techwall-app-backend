import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mockCategories, mockPlaylists, mockFounders } from './fixtures';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories() {
    try {
      return await this.prisma.category.findMany({
        include: { _count: { select: { playlists: true } } },
        orderBy: { label: 'asc' },
      });
    } catch {
      return mockCategories;
    }
  }

  async getPlaylists(categoryKey?: string) {
    try {
      return await this.prisma.playlist.findMany({
        where: categoryKey ? { category: { key: categoryKey } } : undefined,
        include: { category: true, _count: { select: { videos: true } } },
        orderBy: { videoCount: 'desc' },
      });
    } catch {
      return categoryKey
        ? mockPlaylists.filter(p => p.category?.key === categoryKey)
        : mockPlaylists;
    }
  }

  async getPlaylistById(id: string) {
    try {
      const playlist = await this.prisma.playlist.findUnique({
        where: { id },
        include: { category: true, videos: { orderBy: { position: 'asc' } } },
      });
      if (!playlist) throw new NotFoundException(`Playlist ${id} introuvable`);
      return playlist;
    } catch {
      const playlist = mockPlaylists.find(p => p.id === id);
      if (!playlist) throw new NotFoundException(`Playlist ${id} introuvable`);
      return { ...playlist, videos: [] };
    }
  }

  async getFounders() {
    try {
      return await this.prisma.founder.findMany({ orderBy: { name: 'asc' } });
    } catch {
      return mockFounders;
    }
  }
}
