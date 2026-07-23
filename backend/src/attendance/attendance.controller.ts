import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CorrectionRequestDto } from './dto/correction-request.dto';
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

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post('check-in')
  checkIn(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckInDto) {
    return this.attendanceService.checkIn(requireEmployeeId(user), dto);
  }

  @Post('check-out')
  checkOut(@CurrentUser() user: AuthenticatedUser, @Body() dto: CheckOutDto) {
    return this.attendanceService.checkOut(requireEmployeeId(user), dto);
  }

  @Post('break/start')
  startBreak(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.startBreak(requireEmployeeId(user));
  }

  @Post('break/end')
  endBreak(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.endBreak(requireEmployeeId(user));
  }

  @Post('correction')
  requestCorrection(@CurrentUser() user: AuthenticatedUser, @Body() dto: CorrectionRequestDto) {
    return this.attendanceService.requestCorrection(requireEmployeeId(user), dto);
  }

  @Get('me')
  myHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.history(
      requireEmployeeId(user),
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('employee/:employeeId')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER)
  employeeHistory(
    @Param('employeeId') employeeId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!employeeId) {
      throw new BadRequestException('employeeId is required');
    }
    return this.attendanceService.history(
      employeeId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }
}
