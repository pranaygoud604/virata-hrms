import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { GeoFenceLocationsModule } from '../geofence-locations/geofence-locations.module';

@Module({
  imports: [GeoFenceLocationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
