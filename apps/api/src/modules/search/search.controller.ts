import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { AutocompleteQueryDto } from './dto/autocomplete-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query(new ValidationPipe({ transform: true })) query: SearchQueryDto,
  ) {
    return this.searchService.searchProducts(query);
  }

  @Get('popular')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async popular() {
    const items = await this.searchService.getPopularSearches();
    return { items };
  }

  @Get('autocomplete')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async autocomplete(
    @Query(new ValidationPipe({ transform: true })) dto: AutocompleteQueryDto,
  ) {
    return this.searchService.autocompleteProducts(dto.q || '');
  }
}
