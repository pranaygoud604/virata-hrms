import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdHocPayService } from './ad-hoc-pay.service';
import { CreateAdHocPayDto } from './dto/create-ad-hoc-pay.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('ad-hoc-pay')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.FINANCE)
@Controller('ad-hoc-pay')
export class AdHocPayController {
  constructor(private service: AdHocPayService) {}

  @Post()
  create(@Body() dto: CreateAdHocPayDto) {
    return this.service.create(dto);
  }

  @Get('employee/:employeeId/pending')
  pendingFor(@Param('employeeId') employeeId: string) {
    return this.service.pendingFor(employeeId);
  }
}
