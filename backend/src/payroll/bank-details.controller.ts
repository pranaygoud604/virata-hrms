import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BankDetailsService } from './bank-details.service';
import { UpsertBankDetailDto } from './dto/upsert-bank-detail.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('bank-details')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.FINANCE)
@Controller('bank-details')
export class BankDetailsController {
  constructor(private service: BankDetailsService) {}

  @Post()
  upsert(@Body() dto: UpsertBankDetailDto) {
    return this.service.upsert(dto);
  }

  @Get('employee/:employeeId')
  forEmployee(@Param('employeeId') employeeId: string) {
    return this.service.forEmployee(employeeId);
  }
}
