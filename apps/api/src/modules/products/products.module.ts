import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'search-sync-queue',
    }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
