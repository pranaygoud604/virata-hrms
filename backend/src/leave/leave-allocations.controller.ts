import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LeaveAllocationsService } from './leave-allocations.service';
import { AllocateLeaveDto } from './dto/allocate-leave.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('leave-allocations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-allocations')
export class LeaveAllocationsController {
  constructor(private service: LeaveAllocationsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  allocate(@Body() dto: AllocateLeaveDto) {
    return this.service.allocate(dto);
  }

  @Get('employee/:employeeId')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER)
  forEmployee(@Param('employeeId') employeeId: string, @Query('year') year?: string) {
    return this.service.forEmployee(employeeId, year ? Number(year) : new Date().getFullYear());
  }
}
