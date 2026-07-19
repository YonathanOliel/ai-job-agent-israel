import { UserRole } from '@prisma/client';
import { IsIn } from 'class-validator';

/** Role assignable by the Super-Admin. SUPER_ADMIN is intentionally excluded. */
export class SetRoleDto {
  @IsIn([UserRole.CANDIDATE, UserRole.SUPPORT, UserRole.ADMIN])
  role!: UserRole;
}
