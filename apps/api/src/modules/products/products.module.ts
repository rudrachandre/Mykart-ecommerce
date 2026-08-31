import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CloudinaryService } from './cloudinary.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'search-sync-queue',
    }),
    NotificationsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, CloudinaryService],
})
export class ProductsModule {}
