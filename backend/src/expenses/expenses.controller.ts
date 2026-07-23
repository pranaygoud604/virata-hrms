import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { SubmitExpenseClaimDto } from './dto/submit-expense-claim.dto';
import { DecideExpenseClaimDto } from './dto/decide-expense-claim.dto';
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

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private service: ExpensesService) {}

  @Post()
  submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitExpenseClaimDto) {
    return this.service.submit(requireEmployeeId(user), dto);
  }

  @Get('me')
  myClaims(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listForEmployee(requireEmployeeId(user));
  }

  @Get('pending-approvals')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN)
  pendingApprovals(@CurrentUser() user: AuthenticatedUser) {
    requireEmployeeId(user);
    return this.service.listPendingForApprover(user);
  }

  @Patch(':id/approve')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN)
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DecideExpenseClaimDto) {
    return this.service.decide(id, user, true, dto.note);
  }

  @Patch(':id/reject')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN)
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DecideExpenseClaimDto) {
    return this.service.decide(id, user, false, dto.note);
  }

  @Patch(':id/reimburse')
  @Roles(Role.HR_ADMIN, Role.SUPER_ADMIN, Role.FINANCE)
  reimburse(@Param('id') id: string) {
    return this.service.markReimbursed(id);
  }
}
