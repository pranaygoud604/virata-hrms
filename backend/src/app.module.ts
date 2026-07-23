import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DepartmentsModule } from './departments/departments.module';
import { DesignationsModule } from './designations/designations.module';
import { ShiftsModule } from './shifts/shifts.module';
import { GeoFenceLocationsModule } from './geofence-locations/geofence-locations.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LeaveModule } from './leave/leave.module';
import { PayrollModule } from './payroll/payroll.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { PerformanceModule } from './performance/performance.module';
import { RecruitmentModule } from './recruitment/recruitment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    DepartmentsModule,
    DesignationsModule,
    ShiftsModule,
    GeoFenceLocationsModule,
    EmployeesModule,
    AttendanceModule,
    NotificationsModule,
    LeaveModule,
    PayrollModule,
    ExpensesModule,
    ReportsModule,
    PerformanceModule,
    RecruitmentModule,
  ],
})
export class AppModule {}
