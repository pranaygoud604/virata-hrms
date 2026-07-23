import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Generates sequential employee codes like VH-2026-0001.
 * Uses an atomic row increment (Counter.value) so concurrent
 * onboarding requests never collide on the same sequence number.
 */
@Injectable()
export class EmployeeCodeService {
  constructor(private prisma: PrismaService) {}

  async next(prefix = 'VH'): Promise<string> {
    const year = new Date().getFullYear();
    const key = `employee-code-${year}`;

    const counter = await this.prisma.counter.upsert({
      where: { key },
      create: { key, value: 1 },
      update: { value: { increment: 1 } },
    });

    const sequence = counter.value.toString().padStart(4, '0');
    return `${prefix}-${year}-${sequence}`;
  }
}
