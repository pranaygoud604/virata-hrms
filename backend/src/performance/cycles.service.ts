import { Injectable } from '@nestjs/common';
import { PerformanceCycleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCycleDto } from './dto/create-cycle.dto';

@Injectable()
export class CyclesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCycleDto) {
    return this.prisma.performanceCycle.create({ data: dto });
  }

  findAll() {
    return this.prisma.performanceCycle.findMany({ orderBy: { startDate: 'desc' } });
  }

  setStatus(id: string, status: PerformanceCycleStatus) {
    return this.prisma.performanceCycle.update({ where: { id }, data: { status } });
  }
}
