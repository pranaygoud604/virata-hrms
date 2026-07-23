import { Body, Controller, Get, Param, ParseEnumPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PerformanceCycleStatus, Role } from '@prisma/client';
import { CyclesService } from './cycles.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('performance-cycles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('performance-cycles')
export class CyclesController {
  constructor(private service: CyclesService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  create(@Body() dto: CreateCycleDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/status/:status')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  setStatus(
    @Param('id') id: string,
    @Param('status', new ParseEnumPipe(PerformanceCycleStatus)) status: PerformanceCycleStatus,
  ) {
    return this.service.setStatus(id, status);
  }
}
