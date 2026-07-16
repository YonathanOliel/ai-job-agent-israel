import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuditAction, LanguageCode, User, UserRole } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { AuthTokens } from './types/auth-response.type';

describe('AuthService', () => {
  const user: User = {
    id: 'u1',
    email: 'test@example.com',
    passwordHash: 'hashed',
    role: UserRole.CANDIDATE,
    displayName: 'Test',
    locale: LanguageCode.HE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const tokens: AuthTokens = {
    accessToken: 'access',
    refreshToken: 'refresh',
    tokenType: 'Bearer',
    expiresIn: 900,
  };

  let users: jest.Mocked<UsersService>;
  let passwords: jest.Mocked<PasswordService>;
  let tokenService: jest.Mocked<TokenService>;
  let audit: jest.Mocked<AuditService>;
  let service: AuthService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    passwords = { hash: jest.fn(), verify: jest.fn() } as unknown as jest.Mocked<PasswordService>;
    tokenService = {
      issueTokens: jest.fn().mockResolvedValue(tokens),
      rotate: jest.fn(),
      revoke: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;
    audit = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditService>;
    service = new AuthService(users, passwords, tokenService, audit);
  });

  describe('register', () => {
    it('creates a user and returns tokens', async () => {
      users.findByEmail.mockResolvedValue(null);
      passwords.hash.mockResolvedValue('hashed');
      users.create.mockResolvedValue(user);

      const result = await service.register(
        { email: 'test@example.com', password: 'S3cur3Pass!' },
        {},
      );

      expect(result.user.email).toBe('test@example.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.tokens).toEqual(tokens);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.USER_REGISTERED, userId: 'u1' }),
      );
    });

    it('rejects a duplicate email', async () => {
      users.findByEmail.mockResolvedValue(user);
      await expect(
        service.register({ email: 'test@example.com', password: 'S3cur3Pass!' }, {}),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(users.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      users.findByEmail.mockResolvedValue(user);
      passwords.verify.mockResolvedValue(true);

      const result = await service.login(
        { email: 'test@example.com', password: 'S3cur3Pass!' },
        {},
      );

      expect(result.tokens).toEqual(tokens);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LOGIN_SUCCEEDED, userId: 'u1' }),
      );
    });

    it('audits and rejects invalid credentials', async () => {
      users.findByEmail.mockResolvedValue(user);
      passwords.verify.mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LOGIN_FAILED }),
      );
      expect(tokenService.issueTokens).not.toHaveBeenCalled();
    });

    it('rejects an unknown email without leaking existence', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'whatever' }, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(passwords.verify).not.toHaveBeenCalled();
    });
  });
});
