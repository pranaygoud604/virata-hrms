import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PayrollRunsService } from './payroll-runs.service';
import { ProcessPayrollRunDto } from './dto/process-payroll-run.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

function requireEmployeeId(user: AuthenticatedUser): string {
  if (!user.employeeId) {
    throw new ForbiddenException('This account is not linked to an employee record');
  }
  return user.employeeId;
}

@ApiTags('payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollRunsController {
  constructor(private service: PayrollRunsService) {}

  @Post('runs/process')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.FINANCE)
  process(@Body() dto: ProcessPayrollRunDto) {
    return this.service.process(dto);
  }

  @Get('runs/:payrollRunId/bank-file')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.FINANCE)
  @Header('Content-Type', 'text/csv')
  bankFile(@Param('payrollRunId') payrollRunId: string) {
    return this.service.bankFileCsv(payrollRunId);
  }

  @Get('runs/:payrollRunId/payslips/:employeeId')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.FINANCE, Role.MANAGER)
  payslipFor(@Param('payrollRunId') payrollRunId: string, @Param('employeeId') employeeId: string) {
    return this.service.findPayslip(payrollRunId, employeeId);
  }

  @Get('payslips/me')
  myPayslips(@CurrentUser() user: AuthenticatedUser) {
    return this.service.payslipsForEmployee(requireEmployeeId(user));
  }
}
