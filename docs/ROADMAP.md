# Roadmap

The product is built incrementally — **one feature per branch, one PR at a time**.
Each milestone must satisfy the Definition of Done before the next begins.

## Definition of Done

A task is complete only if: code compiles, lint passes, tests pass, feature works,
responsive, RTL works, accessible, no console errors, no TypeScript errors,
documentation updated, and a Git commit is created.

## Branch strategy

- `main` — always production-ready.
- `develop` — stable integration branch.
- `feature/*` — one feature only.
- `fix/*` — bug fixes only.
- `refactor/*` — architecture improvements.
- `hotfix/*` — emergency production fixes.

## Milestones

| #   | Branch                       | Deliverable                                                       | Status  |
| --- | ---------------------------- | ----------------------------------------------------------------- | ------- |
| 0   | `chore/foundation`           | Monorepo scaffold, tooling, docs, CI skeleton                     | ✅ Done |
| 1   | `feature/infra-db`           | Docker infra (Postgres/Redis/storage), Prisma schema + migrations | ✅ Done |
| 2   | `feature/authentication`     | Register/login, JWT access+refresh, RBAC, audit logs              | ✅ Done |
| 3   | `feature/resume-upload`      | Secure upload, object storage, malware-scan hook, validation      | ✅ Done |
| 4   | `feature/resume-parser`      | Resume text extraction (PDF/DOCX/TXT) + language detection        | ✅ Done |
| 4a  | `feature/ai-provider`        | AI provider abstraction (OpenAI impl, config-selected)            | ✅ Done |
| 4b  | `feature/career-profile`     | AI extraction → structured Career Profile (uses AI provider)      | ⬜      |
| 5   | `feature/ai-matching-engine` | Semantic matching + explainable multi-dimension scores            | ⬜      |
| 6   | `feature/job-sources`        | Compliant job-source ingestion abstraction + adapters             | ⬜      |
| 7   | `feature/dashboard`          | Premium Hebrew-first RTL dashboard                                | ⬜      |
| 8   | `feature/job-search`         | Natural-language AI search + filters                              | ⬜      |
| 9   | `feature/notifications`      | Continuous monitoring + high-quality match alerts                 | ⬜      |
| 10  | `feature/resume-optimizer`   | Per-job resume rewrite (PDF/DOCX), ATS-optimized                  | ⬜      |
| 11  | `feature/cover-letter`       | Personalized cover letter generation                              | ⬜      |
| 12  | `feature/ats-analyzer`       | ATS parsing/formatting/keyword analysis                           | ⬜      |
| 13  | `feature/career-coach`       | Skill gaps, courses, certifications, direction                    | ⬜      |
| 14  | `feature/ai-assistant`       | Integrated RAG chat grounded in profile + jobs                    | ⬜      |

_Statuses are updated as milestones complete._
