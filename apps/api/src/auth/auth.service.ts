import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, User, UserRole } from '@prisma/client';
import type { Env } from '../config/env.validation';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { AuthResult, PublicUser, RequestContext } from './types/auth-response.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async register(dto: RegisterDto, context: RequestContext): Promise<AuthResult> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const ownerEmail = this.config.get('SUPER_ADMIN_EMAIL', { infer: true });
    const isOwner = Boolean(ownerEmail) && dto.email.toLowerCase() === ownerEmail!.toLowerCase();
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      locale: dto.locale,
      role: isOwner ? UserRole.SUPER_ADMIN : undefined,
    });

    await this.audit.record({ action: AuditAction.USER_REGISTERED, userId: user.id, ...context });
    const tokens = await this.tokens.issueTokens(user, context);
    return { user: this.toPublicUser(user), tokens };
  }

  async login(dto: LoginDto, context: RequestContext): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    const valid = user ? await this.passwords.verify(user.passwordHash, dto.password) : false;

    if (!user || !valid) {
      await this.audit.record({
        action: AuditAction.LOGIN_FAILED,
        userId: user?.id ?? null,
        metadata: { email: dto.email.toLowerCase() },
        ...context,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.audit.record({ action: AuditAction.LOGIN_SUCCEEDED, userId: user.id, ...context });
    const tokens = await this.tokens.issueTokens(user, context);
    return { user: this.toPublicUser(user), tokens };
  }

  async refresh(rawToken: string, context: RequestContext): Promise<AuthResult> {
    const { user, tokens } = await this.tokens.rotate(rawToken, context);
    await this.audit.record({ action: AuditAction.TOKEN_REFRESHED, userId: user.id, ...context });
    return { user: this.toPublicUser(user), tokens };
  }

  async logout(rawToken: string, userId: string, context: RequestContext): Promise<void> {
    await this.tokens.revoke(rawToken);
    await this.audit.record({ action: AuditAction.LOGOUT, userId, ...context });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return this.toPublicUser(user);
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      locale: user.locale,
      createdAt: user.createdAt,
    };
  }
}
