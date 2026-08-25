import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchSyncProcessor } from './search-sync.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'search-sync-queue',
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService, SearchSyncProcessor],
  exports: [SearchService, BullModule],
})
export class SearchModule {}
