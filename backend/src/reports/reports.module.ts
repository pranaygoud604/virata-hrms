import { Module } from '@nestjs/common';
import { LeaveModule } from '../leave/leave.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [LeaveModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
