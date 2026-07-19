import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { MatchFiltersDto } from './dto/match-filters.dto';
import { UpdateMatchStatusDto } from './dto/update-match-status.dto';
import { MatchInsightService } from './match-insight.service';
import type { MatchInsight } from './match-insight.types';
import {
  MatchingService,
  type GenerateResult,
  type MatchWithJob,
  type PaginatedMatches,
} from './matching.service';

@Controller('matches')
export class MatchingController {
  constructor(
    private readonly matching: MatchingService,
    private readonly insights: MatchInsightService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  generate(@CurrentUser() user: AuthenticatedUser): Promise<GenerateResult> {
    return this.matching.generate(user.id);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: MatchFiltersDto,
  ): Promise<PaginatedMatches> {
    return this.matching.list(user.id, filters);
  }

  @Get(':jobId')
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<MatchWithJob> {
    return this.matching.get(user.id, jobId);
  }

  @Patch(':jobId/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: UpdateMatchStatusDto,
  ): Promise<MatchWithJob> {
    return this.matching.updateStatus(user.id, jobId, dto.status);
  }

  /** On-demand LLM explanation of a single match ("why you fit / what you miss"). */
  @Post(':jobId/explain')
  @HttpCode(HttpStatus.OK)
  explain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<MatchInsight> {
    return this.insights.explain(user.id, jobId);
  }
}
