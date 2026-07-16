import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { ResumesService } from './resumes.service';
import type { ResumeSummary } from './types/resume.types';

// Hard memory ceiling for multipart parsing; the service enforces the precise,
// configurable limit. Slightly above UPLOAD_MAX_BYTES to yield a clean 413.
const MULTER_HARD_LIMIT_BYTES = 15 * 1024 * 1024;

@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumes: ResumesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MULTER_HARD_LIMIT_BYTES } }))
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<ResumeSummary> {
    if (!file) {
      throw new BadRequestException('A "file" field is required');
    }
    return this.resumes.upload(user.id, {
      originalName: file.originalname,
      buffer: file.buffer,
    });
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser): Promise<ResumeSummary[]> {
    return this.resumes.list(user.id);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const { resume, stream } = await this.resumes.download(user.id, id);
    const encodedName = encodeURIComponent(resume.fileName);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', resume.fileSize);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedName}`);
    stream.pipe(res);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.resumes.remove(user.id, id);
  }
}
