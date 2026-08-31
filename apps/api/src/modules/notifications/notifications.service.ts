import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../../common/mail/mail.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({
        where: { userId },
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    });

    // Send email notification asynchronously, fail-safe
    this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }).then((user) => {
      if (user?.email) {
        this.mailService.sendNotificationEmail(
          user.email,
          `MyKart: ${title}`,
          message,
        ).catch((err) => {
          console.error('Failed to send notification email', err);
        });
      }
    }).catch((err) => {
      console.error('Failed to query user email for notification', err);
    });

    return notification;
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
