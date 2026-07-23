import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';

@Injectable()
export class HolidaysService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateHolidayDto) {
    return this.prisma.holiday.create({ data: dto });
  }

  findAll(year?: number) {
    return this.prisma.holiday.findMany({
      where: year
        ? { date: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } }
        : undefined,
      orderBy: { date: 'asc' },
    });
  }

  async findAllDatesInRange(start: Date, end: Date): Promise<Date[]> {
    const holidays = await this.prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true },
    });
    return holidays.map((h) => h.date);
  }
}
