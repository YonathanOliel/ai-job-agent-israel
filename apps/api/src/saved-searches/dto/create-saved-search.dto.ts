import { EmploymentType, SeniorityLevel, WorkArrangement } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** The subset of job filters that can be persisted in a saved search (no pagination). */
export class SavedSearchFiltersDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isRemote?: boolean;

  @IsOptional()
  @IsEnum(SeniorityLevel)
  seniority?: SeniorityLevel;

  @IsOptional()
  @IsEnum(WorkArrangement)
  workArrangement?: WorkArrangement;

  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  technology?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

export class CreateSavedSearchDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SavedSearchFiltersDto)
  filters!: SavedSearchFiltersDto;
}
