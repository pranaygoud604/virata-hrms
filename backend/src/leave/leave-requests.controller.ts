import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LeaveRequestsService } from './leave-requests.service';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { DecideLeaveDto } from './dto/decide-leave.dto';
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

@ApiTags('leave-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private service: LeaveRequestsService) {}

  @Post()
  apply(@CurrentUser() user: AuthenticatedUser, @Body() dto: ApplyLeaveDto) {
    return this.service.apply(requireEmployeeId(user), dto);
  }

  @Get('me')
  myRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listForEmployee(requireEmployeeId(user));
  }

  @Get('me/balance')
  myBalances(@CurrentUser() user: AuthenticatedUser, @Query('year') year?: string) {
    return this.service.myBalances(requireEmployeeId(user), year ? Number(year) : new Date().getFullYear());
  }

  @Get('pending-approvals')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN)
  pendingApprovals(@CurrentUser() user: AuthenticatedUser) {
    requireEmployeeId(user);
    return this.service.listPendingForApprover(user);
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.cancel(requireEmployeeId(user), id);
  }

  @Patch(':id/approve')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN)
  approve(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DecideLeaveDto) {
    return this.service.decide(id, user, true, dto.note);
  }

  @Patch(':id/reject')
  @Roles(Role.MANAGER, Role.HR_ADMIN, Role.SUPER_ADMIN)
  reject(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: DecideLeaveDto) {
    return this.service.decide(id, user, false, dto.note);
  }
}
