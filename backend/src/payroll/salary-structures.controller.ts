import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SalaryStructuresService } from './salary-structures.service';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('salary-structures')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN, Role.HR_ADMIN, Role.FINANCE)
@Controller('salary-structures')
export class SalaryStructuresController {
  constructor(private service: SalaryStructuresService) {}

  @Post()
  create(@Body() dto: CreateSalaryStructureDto) {
    return this.service.create(dto);
  }

  @Get('employee/:employeeId')
  history(@Param('employeeId') employeeId: string) {
    return this.service.history(employeeId);
  }
}
