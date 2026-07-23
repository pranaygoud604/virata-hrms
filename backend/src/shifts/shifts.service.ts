import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateShiftDto) {
    return this.prisma.shift.create({ data: dto });
  }

  findAll() {
    return this.prisma.shift.findMany({ orderBy: { name: 'asc' } });
  }

  remove(id: string) {
    return this.prisma.shift.delete({ where: { id } });
  }
}
