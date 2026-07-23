import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CompOffService } from './comp-off.service';
import { GrantCompOffDto } from './dto/grant-comp-off.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('comp-off')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('comp-off')
export class CompOffController {
  constructor(private service: CompOffService) {}

  @Post('grant')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  grant(@Body() dto: GrantCompOffDto) {
    return this.service.grant(dto);
  }

  @Get('employee/:employeeId')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.MANAGER)
  availableFor(@Param('employeeId') employeeId: string) {
    return this.service.availableFor(employeeId);
  }
}
