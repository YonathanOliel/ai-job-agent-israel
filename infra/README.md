# Local infrastructure

Local development services for **AI Job Agent Israel**, via Docker Compose.

| Service    | Image                    | Port(s)                        | Purpose                                     |
| ---------- | ------------------------ | ------------------------------ | ------------------------------------------- |
| PostgreSQL | `pgvector/pgvector:pg16` | `5432`                         | Primary DB (with `pgvector` for embeddings) |
| Redis      | `redis:7-alpine`         | `6379`                         | Cache + queues (BullMQ)                     |
| MinIO      | `minio/minio`            | `9000` (API), `9001` (console) | S3-compatible object storage for resumes    |

## Usage

From the repository root:

```bash
# Start everything in the background
docker compose -f infra/docker-compose.yml up -d

# Check health
docker compose -f infra/docker-compose.yml ps

# Stop
docker compose -f infra/docker-compose.yml down

# Stop and wipe volumes (destroys local data)
docker compose -f infra/docker-compose.yml down -v
```

Values are read from the repo-root `.env` (see [`.env.example`](../.env.example)).
Sensible defaults are baked in so it also runs without a `.env`.

## MinIO console

Open http://localhost:9001 and log in with `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY`
(default `minioadmin` / `minioadmin`). Create the `resumes` bucket for local uploads.

## pgvector

The Postgres image ships the `vector` extension. It is enabled by Prisma migrations
when the matching engine milestone introduces embedding columns.
