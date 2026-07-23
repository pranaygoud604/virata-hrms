import { ForbiddenException, Injectable } from '@nestjs/common';
import { ReviewType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async submitSelfReview(actingUser: AuthenticatedUser, dto: SubmitReviewDto) {
    if (!actingUser.employeeId || actingUser.employeeId !== dto.employeeId) {
      throw new ForbiddenException('You can only submit a self-review for yourself');
    }
    return this.upsertReview(dto, actingUser.employeeId, ReviewType.SELF);
  }

  async submitManagerReview(actingUser: AuthenticatedUser, dto: SubmitReviewDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { id: dto.employeeId } });
    const isHrOverride = actingUser.role === Role.SUPER_ADMIN || actingUser.role === Role.HR_ADMIN;
    const isDirectManager = actingUser.employeeId === employee.managerId;
    if (!isHrOverride && !isDirectManager) {
      throw new ForbiddenException("Only the employee's manager or HR can submit a manager review");
    }
    if (!actingUser.employeeId) {
      throw new ForbiddenException('This account is not linked to an employee record');
    }
    return this.upsertReview(dto, actingUser.employeeId, ReviewType.MANAGER);
  }

  private upsertReview(dto: SubmitReviewDto, reviewerId: string, type: ReviewType) {
    return this.prisma.performanceReview.upsert({
      where: {
        cycleId_employeeId_reviewerId_type: {
          cycleId: dto.cycleId,
          employeeId: dto.employeeId,
          reviewerId,
          type,
        },
      },
      create: {
        cycleId: dto.cycleId,
        employeeId: dto.employeeId,
        reviewerId,
        type,
        rating: dto.rating,
        strengths: dto.strengths,
        improvements: dto.improvements,
      },
      update: {
        rating: dto.rating,
        strengths: dto.strengths,
        improvements: dto.improvements,
        submittedAt: new Date(),
      },
    });
  }

  forEmployeeInCycle(employeeId: string, cycleId: string) {
    return this.prisma.performanceReview.findMany({
      where: { employeeId, cycleId },
      include: { reviewer: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
}
