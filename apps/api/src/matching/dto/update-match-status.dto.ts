import { MatchStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateMatchStatusDto {
  @IsEnum(MatchStatus)
  status!: MatchStatus;
}
