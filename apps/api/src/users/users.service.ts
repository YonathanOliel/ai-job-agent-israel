import { Injectable } from '@nestjs/common';
import { LanguageCode, Prisma, User, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  displayName?: string;
  locale?: LanguageCode;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(input: CreateUserInput): Promise<User> {
    const data: Prisma.UserCreateInput = {
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      locale: input.locale,
      role: input.role,
    };
    return this.prisma.user.create({ data });
  }

  /** Promotes the given email to a role (used to bootstrap the owner). Returns updated count. */
  async setRoleByEmail(email: string, role: UserRole): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: { email: email.toLowerCase() },
      data: { role },
    });
    return result.count;
  }
}
