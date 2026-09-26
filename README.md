# CAMI OP — Church Information Management System

Operations portal connecting Headquarters and branches: organization/branch setup, role-and-branch-based access control, member and pastoral records, finance and giving, requests and approvals, documents and memos, a restricted equipment-valuation register, tasks, communications (announcements + manually-confirmed SMS), and an audit log.

Built against the CAMI OP PRD (all phases). See [`docs/PRD_SUMMARY.md`](docs/PRD_SUMMARY.md) for the module-by-module build status.

## Stack

- **Next.js 16 (App Router) + React 19 + TypeScript**
- **Prisma + PostgreSQL** (Neon recommended for a free hosted DB)
- **Tailwind CSS 4**, small in-house UI primitives (`src/components/ui`)
- **Auth**: `bcryptjs` + `jose` (JWT session cookie) — role + branch scoped
- **SMS**: Twilio, with a simulated/logged fallback when no credentials are set (every send still requires a human "review & send" click)
- **Zod** for input validation

## Local setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL / DIRECT_URL / AUTH_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

`AUTH_SECRET` can be any long random string, e.g. `openssl rand -base64 32`.

The seed script creates one Headquarters context, 3 branches, and one user per role. It prints the demo login accounts and shared password when it finishes (default `CamiOp#2026`, override with `SEED_DEMO_PASSWORD`).

## Deploying (Netlify + Neon, both free)

1. Create a free Postgres database at [neon.tech](https://neon.tech) (or enable Netlify's built-in Neon DB extension from your site's dashboard) and copy the pooled (`DATABASE_URL`) and direct (`DIRECT_URL`) connection strings.
2. On [netlify.com](https://netlify.com), "Add new site" → "Import an existing project" → connect this GitHub repo. Netlify auto-detects Next.js via `netlify.toml`.
3. In Site settings → Environment variables, add `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (and optionally `TWILIO_*`, `RESEND_*`).
4. Run `npm run db:deploy && npm run db:seed` once against that database (locally, with the same env vars in `.env`) to create the schema and demo data.
5. Trigger a deploy.

## Access control model

Every sensitive check lives in [`src/lib/rbac.ts`](src/lib/rbac.ts) and is enforced in server actions / data-fetching functions — never only in the UI. The equipment valuation restriction (PRD §3.3) is implemented in [`src/lib/data/equipment.ts`](src/lib/data/equipment.ts): only `GENERAL_OVERSEER` (church-wide) and `BRANCH_PASTOR` (their own branch) can compute the total-worth aggregate, and every successful view is written to the audit log.
