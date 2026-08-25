import { Module } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { SellersController } from './sellers.controller';
import { AnalyticsModule } from '../analytics/analytics.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [AnalyticsModule, OrdersModule],
  controllers: [SellersController],
  providers: [SellersService],
  exports: [SellersService],
})
export class SellersModule {}
