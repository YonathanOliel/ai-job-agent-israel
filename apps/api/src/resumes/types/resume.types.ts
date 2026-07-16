import type { LanguageCode, ResumeFileType, ResumeStatus } from '@prisma/client';

/** Client-facing resume metadata (no storage internals leaked). */
export interface ResumeSummary {
  id: string;
  fileName: string;
  fileType: ResumeFileType;
  fileSize: number;
  status: ResumeStatus;
  language: LanguageCode | null;
  createdAt: Date;
}
