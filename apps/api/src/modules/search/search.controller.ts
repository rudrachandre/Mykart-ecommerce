import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query(new ValidationPipe({ transform: true })) query: SearchQueryDto,
  ) {
    return this.searchService.searchProducts(query);
  }

  @Get('autocomplete')
  async autocomplete(@Query('q') q: string) {
    return this.searchService.autocompleteProducts(q);
  }
}
