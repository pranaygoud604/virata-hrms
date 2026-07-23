import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DesignationsService } from './designations.service';
import { CreateDesignationDto } from './dto/create-designation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('designations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('designations')
export class DesignationsController {
  constructor(private designationsService: DesignationsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  create(@Body() dto: CreateDesignationDto) {
    return this.designationsService.create(dto);
  }

  @Get()
  findAll(@Query('departmentId') departmentId?: string) {
    return this.designationsService.findAll(departmentId);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  remove(@Param('id') id: string) {
    return this.designationsService.remove(id);
  }
}
