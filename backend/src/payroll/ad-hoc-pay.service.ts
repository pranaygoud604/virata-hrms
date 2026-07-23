import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdHocPayDto } from './dto/create-ad-hoc-pay.dto';

@Injectable()
export class AdHocPayService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateAdHocPayDto) {
    return this.prisma.adHocPayComponent.create({ data: dto });
  }

  /** Unapplied components for an employee — picked up by the next payroll run. */
  pendingFor(employeeId: string) {
    return this.prisma.adHocPayComponent.findMany({
      where: { employeeId, applied: false },
      orderBy: { createdAt: 'asc' },
    });
  }
}
