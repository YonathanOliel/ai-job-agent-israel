import { Module } from '@nestjs/common';
import { FileValidationService } from './file-validation.service';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  controllers: [ResumesController],
  providers: [ResumesService, FileValidationService],
  exports: [ResumesService],
})
export class ResumesModule {}
