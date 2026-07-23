import { Module } from '@nestjs/common';
import { LeaveModule } from '../leave/leave.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SalaryStructuresController } from './salary-structures.controller';
import { SalaryStructuresService } from './salary-structures.service';
import { BankDetailsController } from './bank-details.controller';
import { BankDetailsService } from './bank-details.service';
import { AdHocPayController } from './ad-hoc-pay.controller';
import { AdHocPayService } from './ad-hoc-pay.service';
import { PayrollRunsController } from './payroll-runs.controller';
import { PayrollRunsService } from './payroll-runs.service';

@Module({
  imports: [LeaveModule, NotificationsModule],
  controllers: [SalaryStructuresController, BankDetailsController, AdHocPayController, PayrollRunsController],
  providers: [SalaryStructuresService, BankDetailsService, AdHocPayService, PayrollRunsService],
})
export class PayrollModule {}
