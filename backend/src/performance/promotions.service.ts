import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async promote(dto: CreatePromotionDto) {
    const employee = await this.prisma.employee.findUniqueOrThrow({ where: { id: dto.employeeId } });

    const [record] = await this.prisma.$transaction([
      this.prisma.promotionRecord.create({
        data: {
          employeeId: dto.employeeId,
          previousDesignationId: employee.designationId,
          newDesignationId: dto.newDesignationId,
          cycleId: dto.cycleId,
          effectiveDate: dto.effectiveDate,
          note: dto.note,
        },
      }),
      this.prisma.employee.update({
        where: { id: dto.employeeId },
        data: { designationId: dto.newDesignationId },
      }),
    ]);

    const user = await this.prisma.user.findUnique({ where: { employeeId: dto.employeeId } });
    if (user) {
      await this.notifications.notify({
        userId: user.id,
        title: 'Congratulations on your promotion!',
        message: dto.note ?? 'Your designation has been updated effective ' + dto.effectiveDate.toDateString(),
      });
    }

    return record;
  }

  historyFor(employeeId: string) {
    return this.prisma.promotionRecord.findMany({
      where: { employeeId },
      include: { previousDesignation: true, newDesignation: true },
      orderBy: { effectiveDate: 'desc' },
    });
  }
}
