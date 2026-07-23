import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSalaryStructureDto } from './dto/create-salary-structure.dto';

@Injectable()
export class SalaryStructuresService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateSalaryStructureDto) {
    return this.prisma.salaryStructure.create({ data: dto });
  }

  /** The salary structure in effect on or before the given date. */
  async currentFor(employeeId: string, asOf: Date) {
    return this.prisma.salaryStructure.findFirst({
      where: { employeeId, effectiveFrom: { lte: asOf } },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  history(employeeId: string) {
    return this.prisma.salaryStructure.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
