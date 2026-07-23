import { Module } from '@nestjs/common';
import { GeoFenceLocationsController } from './geofence-locations.controller';
import { GeoFenceLocationsService } from './geofence-locations.service';

@Module({
  controllers: [GeoFenceLocationsController],
  providers: [GeoFenceLocationsService],
  exports: [GeoFenceLocationsService],
})
export class GeoFenceLocationsModule {}
