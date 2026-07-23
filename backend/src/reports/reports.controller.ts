import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER, Role.FINANCE)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('attendance')
  attendance(
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.attendanceReport(Number(month), Number(year), employeeId);
  }

  @Get('leave')
  leave(@Query('year') year: string, @Query('employeeId') employeeId?: string) {
    return this.service.leaveReport(Number(year), employeeId);
  }

  @Get('payroll/:payrollRunId')
  payrollRegister(@Param('payrollRunId') payrollRunId: string) {
    return this.service.payrollRegister(payrollRunId);
  }

  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }
}
