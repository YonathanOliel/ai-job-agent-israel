import { Module } from '@nestjs/common';
import { DocxTextExtractor } from './parsing/docx-text.extractor';
import { LanguageDetectionService } from './parsing/language-detection.service';
import { PdfTextExtractor } from './parsing/pdf-text.extractor';
import { ResumeParsingService } from './parsing/resume-parsing.service';
import { TextExtractionService } from './parsing/text-extraction.service';
import { TxtTextExtractor } from './parsing/txt-text.extractor';
import { FileValidationService } from './file-validation.service';
import { ResumesController } from './resumes.controller';
import { ResumesService } from './resumes.service';

@Module({
  controllers: [ResumesController],
  providers: [
    ResumesService,
    FileValidationService,
    PdfTextExtractor,
    DocxTextExtractor,
    TxtTextExtractor,
    TextExtractionService,
    LanguageDetectionService,
    ResumeParsingService,
  ],
  exports: [ResumesService],
})
export class ResumesModule {}
