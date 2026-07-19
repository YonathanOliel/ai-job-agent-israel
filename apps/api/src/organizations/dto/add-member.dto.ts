import { OrgRole } from '@prisma/client';
import { IsEmail, IsIn } from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsIn([OrgRole.ADMIN, OrgRole.MEMBER])
  role!: OrgRole;
}
