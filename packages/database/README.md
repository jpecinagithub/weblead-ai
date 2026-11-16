# @weblead/database

Prisma schema (PostgreSQL 16) with the 30 entities from master prompt §8.
State fields are plain strings: the transition rules live in
`@weblead/shared` (single source of truth); the DB stores the current value.

Dev DB: local PostgreSQL 16, database `weblead_dev` (see `docs/architecture.md`).
`pnpm db:push` applies the schema; `pnpm db:migrate` creates a migration.
