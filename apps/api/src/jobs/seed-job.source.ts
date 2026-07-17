import { Injectable } from '@nestjs/common';
import type { JobSource, RawJob } from './job-source.types';
import { SEED_JOBS } from './seed-jobs.data';

/**
 * Development/test job source that returns a fixed set of realistic (fictional)
 * Israeli postings. Implements the same {@link JobSource} contract that real,
 * compliance-gated integrations will use.
 */
@Injectable()
export class SeedJobSource implements JobSource {
  readonly name = 'seed';

  async fetchJobs(): Promise<RawJob[]> {
    return SEED_JOBS;
  }
}
