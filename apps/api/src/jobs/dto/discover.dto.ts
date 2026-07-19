import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

/** Candidate ATS board tokens to probe for the Discovery engine. */
export class DiscoverDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  tokens!: string[];
}
