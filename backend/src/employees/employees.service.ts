import { Injectable } from '@nestjs/common';
import { EmployeeStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeeCodeService } from './employee-code.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ExitEmployeeDto } from './dto/exit-employee.dto';

const INCLUDE = {
  department: true,
  designation: true,
  manager: { select: { id: true, employeeCode: true, firstName: true, lastName: true } },
  shift: true,
};

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private employeeCode: EmployeeCodeService,
  ) {}

  async create(dto: CreateEmployeeDto) {
    const employeeCode = await this.employeeCode.next();
    return this.prisma.employee.create({
      data: { ...dto, employeeCode, status: EmployeeStatus.ACTIVE },
      include: INCLUDE,
    });
  }

  findAll(status?: EmployeeStatus) {
    return this.prisma.employee.findMany({
      where: status ? { status } : undefined,
      include: INCLUDE,
      orderBy: { employeeCode: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.employee.findUniqueOrThrow({ where: { id }, include: INCLUDE });
  }

  update(id: string, dto: UpdateEmployeeDto) {
    return this.prisma.employee.update({ where: { id }, data: dto, include: INCLUDE });
  }

  markExited(id: string, dto: ExitEmployeeDto) {
    return this.prisma.employee.update({
      where: { id },
      data: { status: EmployeeStatus.EXITED, dateOfExit: dto.dateOfExit },
      include: INCLUDE,
    });
  }
}
