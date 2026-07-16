import { IsUUID } from 'class-validator';

export class GenerateProfileDto {
  @IsUUID()
  resumeId!: string;
}
