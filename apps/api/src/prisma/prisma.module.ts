import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Provides a single shared {@link PrismaService} across the application.
 * Global so feature modules can inject it without re-importing.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
