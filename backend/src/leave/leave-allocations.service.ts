import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AllocateLeaveDto } from './dto/allocate-leave.dto';

@Injectable()
export class LeaveAllocationsService {
  constructor(private prisma: PrismaService) {}

  allocate(dto: AllocateLeaveDto) {
    return this.prisma.leaveAllocation.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: dto.employeeId,
          leaveTypeId: dto.leaveTypeId,
          year: dto.year,
        },
      },
      create: {
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        year: dto.year,
        allocatedDays: dto.allocatedDays,
        carriedForwardDays: dto.carriedForwardDays ?? 0,
      },
      update: {
        allocatedDays: dto.allocatedDays,
        carriedForwardDays: dto.carriedForwardDays ?? 0,
      },
    });
  }

  forEmployee(employeeId: string, year: number) {
    return this.prisma.leaveAllocation.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    });
  }
}
