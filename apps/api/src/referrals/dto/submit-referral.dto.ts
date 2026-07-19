import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class SubmitReferralDto {
  /**
   * The raw posting text as the user saw it (e.g. copy-pasted from a
   * Facebook group or LinkedIn post they already viewed). Required — we never
   * fetch private/gated content ourselves.
   */
  @IsString()
  @MinLength(20)
  @MaxLength(4000)
  text!: string;

  /** Optional citation link (public preview only; never fetched server-side). */
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url?: string;
}
