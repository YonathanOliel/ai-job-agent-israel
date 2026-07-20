import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { SavedSearch } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import type { PaginatedJobs } from '../jobs/jobs.service';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { SavedSearchesService } from './saved-searches.service';

/** Per-user saved job searches (create, list, run, delete). */
@Controller('saved-searches')
export class SavedSearchesController {
  constructor(private readonly savedSearches: SavedSearchesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateSavedSearchDto,
  ): Promise<SavedSearch> {
    return this.savedSearches.create(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<SavedSearch[]> {
    return this.savedSearches.listForUser(user.id);
  }

  @Get(':id/run')
  run(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
  ): Promise<PaginatedJobs> {
    return this.savedSearches.run(user.id, id, page, pageSize);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.savedSearches.remove(user.id, id);
  }
}
