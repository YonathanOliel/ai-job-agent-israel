import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CareerProfile } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CareerProfileService } from './career-profile.service';
import { GenerateProfileDto } from './dto/generate-profile.dto';

@Controller('career-profile')
export class CareerProfileController {
  constructor(private readonly careerProfile: CareerProfileService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateProfileDto,
  ): Promise<CareerProfile> {
    return this.careerProfile.generate(user.id, dto.resumeId);
  }

  @Get()
  get(@CurrentUser() user: AuthenticatedUser): Promise<CareerProfile> {
    return this.careerProfile.get(user.id);
  }
}
