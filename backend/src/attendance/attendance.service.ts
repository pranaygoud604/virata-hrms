import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeoFenceLocationsService } from '../geofence-locations/geofence-locations.service';
import { isWithinAnyGeofence } from './geofence.util';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { CorrectionRequestDto } from './dto/correction-request.dto';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private geoFenceLocations: GeoFenceLocationsService,
    private config: ConfigService,
  ) {}

  private get enforceGeofence(): boolean {
    return this.config.get<string>('ENFORCE_GEOFENCE') !== 'false';
  }

  private async resolveGeofenceStatus(latitude: number, longitude: number): Promise<boolean> {
    const locations = await this.geoFenceLocations.findAllActive();
    if (locations.length === 0) {
      // No geo-fences configured yet — do not block attendance, just record as unverified.
      return true;
    }
    return isWithinAnyGeofence(latitude, longitude, locations);
  }

  async checkIn(employeeId: string, dto: CheckInDto) {
    const today = startOfDay(new Date());

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (existing?.checkInAt) {
      throw new BadRequestException('Already checked in today');
    }

    const withinGeofence = await this.resolveGeofenceStatus(dto.latitude, dto.longitude);
    if (!withinGeofence && this.enforceGeofence) {
      throw new ForbiddenException('Check-in location is outside every approved site radius');
    }

    const now = new Date();
    const status = await this.resolveArrivalStatus(employeeId, now);

    return this.prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      create: {
        employeeId,
        date: today,
        checkInAt: now,
        checkInLat: dto.latitude,
        checkInLng: dto.longitude,
        checkInWithinGeofence: withinGeofence,
        status,
      },
      update: {
        checkInAt: now,
        checkInLat: dto.latitude,
        checkInLng: dto.longitude,
        checkInWithinGeofence: withinGeofence,
        status,
      },
    });
  }

  async checkOut(employeeId: string, dto: CheckOutDto) {
    const today = startOfDay(new Date());
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (!record?.checkInAt) {
      throw new BadRequestException('Cannot check out before checking in');
    }
    if (record.checkOutAt) {
      throw new BadRequestException('Already checked out today');
    }

    const withinGeofence = await this.resolveGeofenceStatus(dto.latitude, dto.longitude);
    if (!withinGeofence && this.enforceGeofence) {
      throw new ForbiddenException('Check-out location is outside every approved site radius');
    }

    return this.prisma.attendanceRecord.update({
      where: { employeeId_date: { employeeId, date: today } },
      data: {
        checkOutAt: new Date(),
        checkOutLat: dto.latitude,
        checkOutLng: dto.longitude,
        checkOutWithinGeofence: withinGeofence,
      },
    });
  }

  async startBreak(employeeId: string) {
    const record = await this.getTodayRecordOrThrow(employeeId);
    const openBreak = await this.prisma.break.findFirst({
      where: { attendanceRecordId: record.id, endAt: null },
    });
    if (openBreak) {
      throw new BadRequestException('A break is already in progress');
    }
    return this.prisma.break.create({
      data: { attendanceRecordId: record.id, startAt: new Date() },
    });
  }

  async endBreak(employeeId: string) {
    const record = await this.getTodayRecordOrThrow(employeeId);
    const openBreak = await this.prisma.break.findFirst({
      where: { attendanceRecordId: record.id, endAt: null },
    });
    if (!openBreak) {
      throw new BadRequestException('No break is currently in progress');
    }
    return this.prisma.break.update({ where: { id: openBreak.id }, data: { endAt: new Date() } });
  }

  async requestCorrection(employeeId: string, dto: CorrectionRequestDto) {
    const date = startOfDay(dto.date);
    return this.prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { employeeId, date, correctionNote: dto.note, status: AttendanceStatus.ABSENT },
      update: { correctionNote: dto.note },
    });
  }

  history(employeeId: string, from?: Date, to?: Date) {
    return this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        date: {
          gte: from ? startOfDay(from) : undefined,
          lte: to ? startOfDay(to) : undefined,
        },
      },
      include: { breaks: true },
      orderBy: { date: 'desc' },
    });
  }

  private async getTodayRecordOrThrow(employeeId: string) {
    const today = startOfDay(new Date());
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (!record) {
      throw new NotFoundException('No attendance record for today — check in first');
    }
    return record;
  }

  private async resolveArrivalStatus(employeeId: string, checkInAt: Date): Promise<AttendanceStatus> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { shift: true },
    });
    if (!employee?.shift) {
      return AttendanceStatus.PRESENT;
    }
    const shiftStartMinutes = parseHHMM(employee.shift.startTime);
    const graceLimit = shiftStartMinutes + employee.shift.gracePeriodMinutes;
    return minutesSinceMidnight(checkInAt) > graceLimit ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
  }
}
