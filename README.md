# AI Job Agent Israel 🇮🇱

A **personal AI job-search agent** for the Israeli market — not another job board.

The user uploads a resume once. The AI builds a Career Profile, continuously finds
the best-matching Israeli jobs, explains _why_ each fits, ranks them by real chance
of getting hired, and acts as a personal career agent.

> **Hebrew-first. Full RTL. Israel-only.**

---

## Status

🚧 Early development. The project is built incrementally, one feature per branch/PR,
following a strict production engineering workflow. See [docs/ROADMAP.md](docs/ROADMAP.md).

---

## Monorepo layout

```
apps/
  web/        Next.js (App Router, TS, Tailwind, shadcn/ui) — Hebrew-first, RTL
  api/        NestJS (REST + queue workers) — clean architecture
packages/
  types/      Shared TypeScript contracts (DTOs, domain models)
  config/     Shared eslint / tsconfig / tailwind presets
  ui/         Shared React components
infra/        Docker, CI, local dev services
docs/         Architecture, roadmap, decision records
```

## Tech stack

- **Frontend:** Next.js, React, TypeScript, TailwindCSS, shadcn/ui, Framer Motion
- **Backend:** NestJS, PostgreSQL, Redis, Prisma, queue workers
- **AI:** Claude / OpenAI / Gemini behind a provider abstraction, embeddings, RAG, semantic search
- **Infra:** Docker, CI/CD, logging, monitoring, rate limiting, RBAC auth

## Prerequisites

- Node.js `>=20` (see [.nvmrc](.nvmrc))
- pnpm `>=9` (`npm install -g pnpm`)
- Docker (for local Postgres / Redis / object storage)

## Getting started

```bash
pnpm install
cp .env.example .env   # then fill in values
pnpm dev
```

## Scripts

| Command          | Description              |
| ---------------- | ------------------------ |
| `pnpm dev`       | Run all apps in dev mode |
| `pnpm build`     | Build all packages/apps  |
| `pnpm lint`      | Lint the workspace       |
| `pnpm typecheck` | Type-check the workspace |
| `pnpm test`      | Run tests                |
| `pnpm format`    | Format with Prettier     |

## Contributing workflow

Every feature lives on its own branch and is merged via PR. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the
[pull request template](.github/pull_request_template.md).

## Compliance

Job-source ingestion respects `robots.txt`, site terms, API licensing, and copyright.
Official APIs, feeds, and explicit integrations are preferred. Resume data is
encrypted at rest and handled under a GDPR-ready architecture.
