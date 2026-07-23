import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalProgressDto } from './dto/update-goal-progress.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateGoalDto) {
    return this.prisma.goal.create({ data: dto });
  }

  forEmployeeInCycle(employeeId: string, cycleId: string) {
    return this.prisma.goal.findMany({ where: { employeeId, cycleId }, orderBy: { createdAt: 'asc' } });
  }

  async updateProgress(goalId: string, actingUser: AuthenticatedUser, dto: UpdateGoalProgressDto) {
    const goal = await this.prisma.goal.findUniqueOrThrow({ where: { id: goalId }, include: { employee: true } });
    const isSelf = actingUser.employeeId === goal.employeeId;
    const isManager = actingUser.employeeId === goal.employee.managerId;
    const isHr = actingUser.role === Role.SUPER_ADMIN || actingUser.role === Role.HR_ADMIN;
    if (!isSelf && !isManager && !isHr) {
      throw new ForbiddenException('Only the employee, their manager, or HR can update this goal');
    }
    return this.prisma.goal.update({ where: { id: goalId }, data: dto });
  }
}
