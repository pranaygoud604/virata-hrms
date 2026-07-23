import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGeoFenceLocationDto } from './dto/create-geofence-location.dto';

@Injectable()
export class GeoFenceLocationsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateGeoFenceLocationDto) {
    return this.prisma.geoFenceLocation.create({ data: dto });
  }

  findAllActive() {
    return this.prisma.geoFenceLocation.findMany({ where: { isActive: true } });
  }

  findAll() {
    return this.prisma.geoFenceLocation.findMany({ orderBy: { name: 'asc' } });
  }

  deactivate(id: string) {
    return this.prisma.geoFenceLocation.update({ where: { id }, data: { isActive: false } });
  }
}
