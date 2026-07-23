import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GeoFenceLocationsService } from './geofence-locations.service';
import { CreateGeoFenceLocationDto } from './dto/create-geofence-location.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('geofence-locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('geofence-locations')
export class GeoFenceLocationsController {
  constructor(private service: GeoFenceLocationsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  create(@Body() dto: CreateGeoFenceLocationDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id/deactivate')
  @Roles(Role.SUPER_ADMIN, Role.HR_ADMIN)
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
