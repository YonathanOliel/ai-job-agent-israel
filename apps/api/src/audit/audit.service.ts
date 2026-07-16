import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEvent {
  action: AuditAction;
  userId?: string | null;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Best-effort audit logging. Failures are logged but never propagated so an
 * auditing problem cannot break a user-facing request.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEvent): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: event.action,
          userId: event.userId ?? null,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          metadata: event.metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log for ${event.action}`, error as Error);
    }
  }
}
