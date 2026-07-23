import { Injectable, Logger } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  channel?: NotificationChannel;
}

/**
 * Only the IN_APP channel actually persists/delivers anything right now.
 * EMAIL/SMS/WHATSAPP are logged as a stand-in so call sites don't need to
 * change once a real provider (SES/Brevo, an SMS gateway, WhatsApp Business
 * API) is wired in — see backend/README.md.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  constructor(private prisma: PrismaService) {}

  async notify(input: NotifyInput) {
    const channel = input.channel ?? NotificationChannel.IN_APP;

    if (channel !== NotificationChannel.IN_APP) {
      this.logger.warn(
        `[stub] ${channel} notification to user ${input.userId} not actually dispatched: "${input.title}"`,
      );
    }

    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        channel,
      },
    });
  }

  listForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, isRead: unreadOnly ? false : undefined },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(userId: string, id: string) {
    // Scoped to userId so one user cannot mark another user's notification read.
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }
}
