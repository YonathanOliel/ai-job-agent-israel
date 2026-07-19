import { Global, Module } from '@nestjs/common';
import { elasticsearchProvider } from './elasticsearch.provider';
import { JobSearchService } from './job-search.service';

/**
 * Global search module. Exposes {@link JobSearchService} everywhere so both
 * ingestion (indexing) and the jobs API (querying) can use it.
 */
@Global()
@Module({
  providers: [elasticsearchProvider, JobSearchService],
  exports: [JobSearchService],
})
export class SearchModule {}
