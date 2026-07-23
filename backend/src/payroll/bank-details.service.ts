import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertBankDetailDto } from './dto/upsert-bank-detail.dto';

@Injectable()
export class BankDetailsService {
  constructor(private prisma: PrismaService) {}

  upsert(dto: UpsertBankDetailDto) {
    const { employeeId, ...data } = dto;
    return this.prisma.bankDetail.upsert({
      where: { employeeId },
      create: { employeeId, ...data },
      update: data,
    });
  }

  forEmployee(employeeId: string) {
    return this.prisma.bankDetail.findUnique({ where: { employeeId } });
  }
}
