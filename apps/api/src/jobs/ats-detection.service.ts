import { Injectable, Logger } from '@nestjs/common';
import { CompanyRegistryService } from './company-registry.service';
import { isIsraelLocation } from './job-source.util';

const REQUEST_TIMEOUT_MS = 12000;
const USER_AGENT = 'Mozilla/5.0 (compatible; AiJobAgentIsrael/1.0)';

export interface AtsDetection {
  token: string;
  ats: 'greenhouse' | 'lever' | 'ashby' | null;
  jobs: number;
  israelJobs: number;
  sample?: string;
  registered: boolean;
}

interface Probe {
  ats: 'greenhouse' | 'lever' | 'ashby';
  url: (token: string) => string;
  parse: (body: unknown) => Array<{ location: string; title: string }>;
}

const PROBES: Probe[] = [
  {
    ats: 'greenhouse',
    url: (t) =>
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(t)}/jobs?content=false`,
    parse: (body) =>
      ((body as { jobs?: Array<{ location?: { name?: string }; title?: string }> }).jobs ?? []).map(
        (j) => ({ location: j.location?.name ?? '', title: j.title ?? '' }),
      ),
  },
  {
    ats: 'lever',
    url: (t) => `https://api.lever.co/v0/postings/${encodeURIComponent(t)}?mode=json`,
    parse: (body) =>
      (Array.isArray(body)
        ? (body as Array<{ text?: string; categories?: { location?: string } }>)
        : []
      ).map((j) => ({ location: j.categories?.location ?? '', title: j.text ?? '' })),
  },
  {
    ats: 'ashby',
    url: (t) => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(t)}`,
    parse: (body) =>
      ((body as { jobs?: Array<{ location?: string; title?: string }> }).jobs ?? []).map((j) => ({
        location: j.location ?? '',
        title: j.title ?? '',
      })),
  },
];

/**
 * Discovery engine (ATS detection): probes the public Greenhouse/Lever/Ashby
 * APIs to determine which ATS a company's board is on and whether it carries
 * Israeli jobs. Matches are registered so the connectors start ingesting them.
 * Official public APIs only — no scraping.
 */
@Injectable()
export class AtsDetectionService {
  private readonly logger = new Logger(AtsDetectionService.name);

  constructor(private readonly companies: CompanyRegistryService) {}

  /** Probes each candidate token and registers Israeli-eligible ATS boards. */
  async discover(tokens: string[]): Promise<AtsDetection[]> {
    const results: AtsDetection[] = [];
    for (const raw of tokens) {
      const token = raw.trim();
      if (!token) {
        continue;
      }
      const detection = await this.detect(token);
      if (detection.ats && detection.israelJobs > 0) {
        await this.companies.upsertDiscovered(
          this.prettify(token),
          detection.ats,
          token,
          detection.israelJobs,
        );
        detection.registered = true;
      }
      results.push(detection);
    }
    return results;
  }

  async detect(token: string): Promise<AtsDetection> {
    let best: AtsDetection = { token, ats: null, jobs: 0, israelJobs: 0, registered: false };
    for (const probe of PROBES) {
      try {
        const postings = await this.probe(probe, token);
        if (postings.length === 0) {
          continue;
        }
        const israel = postings.filter((p) => isIsraelLocation(p.location));
        const candidate: AtsDetection = {
          token,
          ats: probe.ats,
          jobs: postings.length,
          israelJobs: israel.length,
          sample: (israel[0] ?? postings[0])?.title,
          registered: false,
        };
        if (candidate.israelJobs > best.israelJobs || (best.ats === null && candidate.jobs > 0)) {
          best = candidate;
        }
      } catch {
        // A probe miss (404/timeout) just means this ATS doesn't host the token.
      }
    }
    return best;
  }

  private async probe(
    probe: Probe,
    token: string,
  ): Promise<Array<{ location: string; title: string }>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(probe.url(token), {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
        signal: controller.signal,
      });
      if (!response.ok) {
        return [];
      }
      return probe.parse(await response.json());
    } finally {
      clearTimeout(timeout);
    }
  }

  private prettify(token: string): string {
    return token
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }
}
