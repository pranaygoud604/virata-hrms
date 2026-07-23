import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDesignationDto } from './dto/create-designation.dto';

@Injectable()
export class DesignationsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateDesignationDto) {
    return this.prisma.designation.create({ data: dto });
  }

  findAll(departmentId?: string) {
    return this.prisma.designation.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: { department: true },
      orderBy: { title: 'asc' },
    });
  }

  remove(id: string) {
    return this.prisma.designation.delete({ where: { id } });
  }
}
