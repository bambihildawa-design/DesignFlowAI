# DesignFlow AI

Internal request-to-Figma workflow tool. Full architecture, schema rationale,
and build-order tradeoffs live in `docs/architecture.md` (mirrors the doc
reviewed and approved before this code was written).

## Status: Module 1 — Foundation ✅

Built in this module:
- Next.js 15 app shell (App Router), Tailwind + shadcn-pattern components
- Design token system (`src/app/globals.css`, `tailwind.config.ts`) — light/dark,
  one accent color, semantic status colors
- Clerk auth wired up, with the public no-login requester routes (`/`, `/request/*`,
  `/r/*`) explicitly carved out in `src/middleware.ts`
- Full Prisma schema (`prisma/schema.prisma`) — every model from the architecture
  doc, including the MVP additions (`TemplateSlot`, `NotificationRoute`,
  requester fields on `Project`)
- `requireOrgScope()` / `getDefaultOrganization()` — the two auth entry points
  every future service function will use, so cross-tenant leaks are structurally
  hard rather than a discipline problem
- Enterprise folder structure (`src/{components,services,ai,integrations,db,
  auth,actions,jobs}`) with lint-enforced dependency direction

Not yet built (by design — see architecture doc §8.5 for the order):
Template Admin, the public requester flow's actual form, the Figma push job,
notifications, Brand Library, AI copy generation, QA scoring, in-app approvals,
export pipeline.

## Getting started

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL / DIRECT_URL (Supabase) and the Clerk keys at minimum —
# see .env.example for what each later module needs and when
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

## Project structure

See `docs/architecture.md` §6 for the full rationale. Short version:
`app/` is routes only; `components/` never talks to the database or external
APIs directly; `services/` is where business logic lives; `integrations/` is
the only place that talks to Figma, UploadThing, Supabase Storage, Asana, or
Resend; `ai/` is the only place that calls the Anthropic API.
