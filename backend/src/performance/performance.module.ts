import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CyclesController } from './cycles.controller';
import { CyclesService } from './cycles.service';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [NotificationsModule],
  controllers: [CyclesController, GoalsController, ReviewsController, PromotionsController],
  providers: [CyclesService, GoalsService, ReviewsService, PromotionsService],
})
export class PerformanceModule {}
