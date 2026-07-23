import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeaveTypesController } from './leave-types.controller';
import { LeaveTypesService } from './leave-types.service';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { LeaveAllocationsController } from './leave-allocations.controller';
import { LeaveAllocationsService } from './leave-allocations.service';
import { CompOffController } from './comp-off.controller';
import { CompOffService } from './comp-off.service';
import { LeaveRequestsController } from './leave-requests.controller';
import { LeaveRequestsService } from './leave-requests.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    LeaveTypesController,
    HolidaysController,
    LeaveAllocationsController,
    CompOffController,
    LeaveRequestsController,
  ],
  providers: [
    LeaveTypesService,
    HolidaysService,
    LeaveAllocationsService,
    CompOffService,
    LeaveRequestsService,
  ],
  exports: [HolidaysService],
})
export class LeaveModule {}
