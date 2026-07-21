import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('categories')
  getCategories() {
    return this.catalogService.getCategories();
  }

  @Get('playlists')
  getPlaylists(@Query('category') category?: string) {
    return this.catalogService.getPlaylists(category);
  }

  @Get('playlists/:id')
  getPlaylistById(@Param('id') id: string) {
    return this.catalogService.getPlaylistById(id);
  }

  @Get('founders')
  getFounders() {
    return this.catalogService.getFounders();
  }
}
