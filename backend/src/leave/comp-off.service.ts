import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrantCompOffDto } from './dto/grant-comp-off.dto';

@Injectable()
export class CompOffService {
  constructor(private prisma: PrismaService) {}

  grant(dto: GrantCompOffDto) {
    const expiresInDays = dto.expiresInDays ?? 90;
    const expiresAt = new Date(dto.earnedForDate);
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    return this.prisma.compOffCredit.create({
      data: {
        employeeId: dto.employeeId,
        earnedForDate: dto.earnedForDate,
        expiresAt,
      },
    });
  }

  availableFor(employeeId: string) {
    return this.prisma.compOffCredit.findMany({
      where: { employeeId, isUsed: false, expiresAt: { gte: new Date() } },
      orderBy: { earnedForDate: 'asc' },
    });
  }
}
