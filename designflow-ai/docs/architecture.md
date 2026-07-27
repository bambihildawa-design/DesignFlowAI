# DesignFlow AI — Architecture & Design Document (v1)

This is the foundation document. Nothing below is placeholder — it's the actual shape the codebase will take. Please review and approve (or redline) before I start Module 1.

---

## 1. System Architecture

### 1.1 High-Level Shape

DesignFlow AI is a **modular monolith** on Next.js 15 (App Router), not microservices. At this team size and scale, microservices would add operational overhead (multiple deploys, network hops, distributed tracing) without a corresponding benefit. The modularity requirement is satisfied at the *code* level — clean service boundaries, dependency direction enforced by folder structure and lint rules — so it can be split into services later if scale ever demands it (it won't, for an internal agency tool).

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (Browser)                      │
│   Next.js App Router (RSC + Client Components) · Tailwind   │
│   shadcn/ui · Framer Motion · Zustand (client UI state)      │
└───────────────────────────┬───────────────────────────────────┘
                             │ HTTPS
┌───────────────────────────▼───────────────────────────────────┐
│                    Next.js Server (Vercel)                    │
│  ┌───────────────┐ ┌──────────────┐ ┌───────────────────────┐ │
│  │ Route Handlers│ │ Server        │ │  Background Jobs      │ │
│  │ /app/api/**   │ │ Actions       │ │  (QStash / Vercel     │ │
│  │ (REST-ish)    │ │ (mutations)   │ │   Cron + queue)       │ │
│  └───────┬───────┘ └──────┬───────┘ └───────────┬───────────┘ │
│          └────────┬───────┘                     │             │
│                    ▼                             ▼             │
│  ┌─────────────────────────────┐   ┌───────────────────────┐  │
│  │      Service Layer          │   │   AI Orchestration     │  │
│  │  projects/ brands/ templates│   │   Layer (Claude calls, │  │
│  │  qa/ exports/ approvals/    │   │   prompt templates,    │  │
│  │  notifications/             │   │   structured outputs)  │  │
│  └──────────────┬──────────────┘   └───────────┬───────────┘  │
│                 │                               │              │
│  ┌──────────────▼───────────────────────────────▼───────────┐ │
│  │              Integration Adapters (ports)                 │ │
│  │   Figma API · Anthropic API · UploadThing · Supabase      │ │
│  │   Storage · Resvg/Sharp (image ops) · Clerk                │ │
│  └──────────────┬─────────────────────────────────────────────┘ │
└─────────────────┼───────────────────────────────────────────────┘
                   │ Prisma Client
┌──────────────────▼──────────────────────────────────────────┐
│              PostgreSQL (Supabase) — source of truth          │
└────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Architectural Decisions & Tradeoffs

| Decision | Why | Tradeoff accepted |
|---|---|---|
| Modular monolith, not microservices | Single deploy, shared types, simpler ops for an internal tool | Less independent scaling per module — irrelevant at this scale |
| Server Actions for mutations, Route Handlers for anything external (webhooks, AI streaming, Figma callbacks) | Server Actions give you type-safe client→server calls without hand-rolled fetch/JSON; Route Handlers are needed wherever a non-React client (webhook, cron, streaming) hits the server | Two mutation patterns to keep straight — mitigated by a strict rule: *Server Action = internal UI mutation, Route Handler = everything else* |
| Long-running work (Figma generation, QA scan, multi-size export) goes through a job queue, not inline in the request | Figma duplication + replace + export can take 10–60s; Vercel serverless functions have execution limits, and blocking a request that long is a bad UX anyway | Requires a queue (recommend **Vercel Queue / QStash** or **Inngest** — see §1.3) and a job-status polling/SSE pattern in the UI |
| Prisma as the only DB access layer | Type safety end-to-end, migrations, no raw SQL scattered around | Prisma's query flexibility ceiling — fine here, nothing we do is exotic enough to need raw SQL beyond the odd `$queryRaw` for full-text search |
| Clerk for auth (not NextAuth) | Org/team support, invitations, RBAC primitives out of the box — an agency tool needs "who's on this team" from day one | Vendor dependency, but this is explicitly in your stack already |
| Supabase Storage for durable assets, UploadThing for the upload *pipeline* | UploadThing gives a great upload UX (client widgets, presigned URLs, progress) but we want assets to live in *our* Supabase bucket long-term for portability and to sit next to Postgres | An extra hop: UploadThing receives → webhook → we copy/reference into Supabase Storage. Documented clearly in Module 6 (Storage) |
| AI orchestration is its own layer, not scattered `anthropic.messages.create()` calls | Every Claude call in this app (copy gen, QA, creative-director suggestions, brief summarization) shares prompt templates, model selection, structured-output parsing, retry/fallback logic | Slightly more upfront scaffolding — pays for itself by module 4 when there are 6+ distinct AI features |
| Figma access via a thin adapter (`services/figma/`) | Figma's REST API + Plugin API have real constraints (Auto Layout, component instance overrides, rate limits) — isolating this means the rest of the app never talks to Figma's raw shapes | Some Figma operations (deep component swaps) may need a companion **Figma Plugin** we build alongside the REST integration — flagged explicitly in §5 |

### 1.3 Background Jobs — recommendation

Given Vercel deployment, I recommend **Inngest** (or QStash as a lighter alternative) for:
- Figma template duplication + content replacement (Step 6)
- Design QA scan (Step 7)
- Multi-format/multi-size export (Step 9)
- AI copy generation when done in "batch" mode (multiple variants)

Each job writes progress to a `Job` table; the client polls or subscribes via a lightweight SSE route. This avoids serverless timeout issues and gives you a real "Job History" for free, which maps directly to your Step 10 dashboard requirement (Time Spent, History).

### 1.4 Multi-tenancy

Modeled as **Organization → Members → Projects/Brands/Templates/Assets**, using Clerk Organizations as the tenancy boundary. Every domain table carries `organizationId` and every Prisma query is scoped through a request-scoped context object — never left to be remembered ad hoc per-query. This is enforced via a `withOrgScope()` service helper (Module 1) so it's structurally hard to leak data across orgs.

---

## 2. Database Design

PostgreSQL via Prisma. Below is the full schema for the core workflow (v1 — future features like Canva/Notion integrations get their own tables later, not bolted onto these).

```prisma
// ── Identity & Tenancy ─────────────────────────────────────────
model Organization {
  id        String   @id @default(cuid())
  clerkOrgId String  @unique
  name      String
  createdAt DateTime @default(now())

  members      Member[]
  brands       Brand[]
  projects     Project[]
  templates    Template[]
  assets       Asset[]
  prompts      Prompt[]
  apiKeys      ApiKeyConfig[]
}

model Member {
  id             String   @id @default(cuid())
  clerkUserId    String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  role           MemberRole   @default(DESIGNER)
  name           String
  email          String
  avatarUrl      String?
  createdAt      DateTime @default(now())

  assignedProjects Project[]      @relation("AssignedDesigner")
  comments         Comment[]
  approvals        Approval[]

  @@unique([clerkUserId, organizationId])
}

enum MemberRole {
  ADMIN
  MANAGER
  DESIGNER
  REVIEWER
  CLIENT_VIEWER
}

// ── Brand Library (Step 3) ─────────────────────────────────────
model Brand {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  name           String
  logoUrl        String?
  primaryColors  Json      // [{ name, hex }]
  secondaryColors Json     // [{ name, hex }]
  typography     Json      // { heading: {family, weights}, body: {...} }
  voice          String?   @db.Text
  tone           String?   @db.Text
  guidelinesUrl  String?   // uploaded brand guideline PDF
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  icons          Asset[]   @relation("BrandIcons")
  approvedImages Asset[]   @relation("BrandApprovedImages")
  projects       Project[]
}

// ── Project Intake (Step 1) ─────────────────────────────────────
model Project {
  id               String   @id @default(cuid())
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id])
  name             String
  client           String
  campaign         String?
  dueDate          DateTime?
  priority         Priority @default(MEDIUM)
  description      String?  @db.Text
  referenceLinks   String[] @default([])
  brandId          String?
  brand            Brand?   @relation(fields: [brandId], references: [id])
  designerId       String?
  designer         Member?  @relation("AssignedDesigner", fields: [designerId], references: [id])
  status           ProjectStatus @default(INTAKE)
  layoutType       LayoutType?
  favoritedBy      String[] @default([]) // Member IDs

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  attachments   Asset[]        @relation("ProjectAttachments")
  contentDrafts ContentDraft[]
  designs       Design[]
  qaReports     QaReport[]
  approvals     Approval[]
  exports       Export[]
  jobs          Job[]
  comments      Comment[]
  activityLog   ActivityLogEntry[]
}

enum Priority { LOW MEDIUM HIGH URGENT }

enum ProjectStatus {
  INTAKE
  LAYOUT_SELECTED
  CONTENT_DRAFTING
  TEMPLATE_SELECTED
  GENERATING
  QA_REVIEW
  PENDING_APPROVAL
  REJECTED
  APPROVED
  EXPORTING
  COMPLETED
}

enum LayoutType {
  CAROUSEL INSTAGRAM_POST STORY REEL_COVER FACEBOOK_AD
  LANDING_PAGE THUMBNAIL POSTER BROCHURE EMAIL PRESENTATION FLYER
}

// ── Content (Step 4) ─────────────────────────────────────────────
model ContentDraft {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  headline    String?
  subheadline String?
  body        String?  @db.Text
  cta         String?
  footer      String?
  seoCopy     String?  @db.Text
  altHeadlines String[] @default([])
  generatedByAi Boolean @default(false)
  version     Int      @default(1)
  createdAt   DateTime @default(now())

  images Asset[] @relation("ContentImages")
}

// ── Templates (Step 5) — synced from Figma ───────────────────────
model Template {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  figmaFileKey   String
  figmaNodeId    String
  name           String
  category       LayoutType?
  thumbnailUrl   String?
  isFavorite     Boolean  @default(false)
  lastSyncedAt   DateTime @default(now())

  designs Design[]

  @@unique([figmaFileKey, figmaNodeId])
}

// ── Generated Design (Step 6) ─────────────────────────────────────
model Design {
  id            String   @id @default(cuid())
  projectId     String
  project       Project  @relation(fields: [projectId], references: [id])
  templateId    String
  template      Template @relation(fields: [templateId], references: [id])
  figmaFileKey  String   // duplicated file/frame
  figmaNodeId   String
  version       Int      @default(1)
  status        DesignStatus @default(DRAFT)
  previewUrl    String?
  createdAt     DateTime @default(now())

  qaReports  QaReport[]
  approvals  Approval[]
  exports    Export[]
}

enum DesignStatus { DRAFT GENERATING READY_FOR_QA QA_FAILED READY_FOR_REVIEW APPROVED REJECTED }

// ── QA (Step 7) ────────────────────────────────────────────────────
model QaReport {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  designId  String
  design    Design   @relation(fields: [designId], references: [id])
  score     Int      // 0-100
  issues    Json     // [{ category, severity, message, nodeId? }]
  createdAt DateTime @default(now())
}

// ── Approval (Step 8) ──────────────────────────────────────────────
model Approval {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id])
  designId   String
  design     Design   @relation(fields: [designId], references: [id])
  reviewerId String
  reviewer   Member   @relation(fields: [reviewerId], references: [id])
  decision   ApprovalDecision @default(PENDING)
  notes      String?  @db.Text
  createdAt  DateTime @default(now())
}

enum ApprovalDecision { PENDING APPROVED REJECTED CHANGES_REQUESTED }

model Comment {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id])
  authorId   String
  author     Member   @relation(fields: [authorId], references: [id])
  body       String   @db.Text
  nodeId     String?  // anchored to a specific design element, if applicable
  resolved   Boolean  @default(false)
  createdAt  DateTime @default(now())
}

// ── Export (Step 9) ────────────────────────────────────────────────
model Export {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id])
  designId   String
  design     Design   @relation(fields: [designId], references: [id])
  format     ExportFormat
  variant    String   // e.g. "instagram_square", "story", "linkedin"
  fileUrl    String
  fileSizeKb Int?
  createdAt  DateTime @default(now())
}

enum ExportFormat { PNG JPG PDF SVG WEBP }

// ── Assets (shared library) ───────────────────────────────────────
model Asset {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  url            String
  type           AssetType
  tags           String[] @default([])
  width          Int?
  height          Int?
  createdAt      DateTime @default(now())

  brandIconOf    Brand? @relation("BrandIcons", fields: [brandIconOfId], references: [id])
  brandIconOfId  String?
  brandApprovedOf Brand? @relation("BrandApprovedImages", fields: [brandApprovedOfId], references: [id])
  brandApprovedOfId String?
  projectAttachmentOf Project? @relation("ProjectAttachments", fields: [projectAttachmentOfId], references: [id])
  projectAttachmentOfId String?
  contentDraftOf ContentDraft? @relation("ContentImages", fields: [contentDraftOfId], references: [id])
  contentDraftOfId String?
}

enum AssetType { IMAGE ICON LOGO VIDEO ILLUSTRATION MOCKUP AI_GENERATED }

// ── Prompt Library ─────────────────────────────────────────────────
model Prompt {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  title          String
  body           String   @db.Text
  category       PromptCategory
  createdAt      DateTime @default(now())
}

enum PromptCategory { IMAGE COPY MARKETING SOCIAL }

// ── Jobs (async orchestration) ─────────────────────────────────────
model Job {
  id         String   @id @default(cuid())
  projectId  String?
  project    Project? @relation(fields: [projectId], references: [id])
  type       JobType
  status     JobStatus @default(QUEUED)
  progress   Int       @default(0)
  result     Json?
  error      String?
  startedAt  DateTime?
  finishedAt DateTime?
  createdAt  DateTime @default(now())
}

enum JobType { FIGMA_GENERATE QA_SCAN EXPORT_BATCH AI_COPY_BATCH FIGMA_SYNC }
enum JobStatus { QUEUED RUNNING SUCCEEDED FAILED }

// ── Notifications ──────────────────────────────────────────────────
model Notification {
  id        String   @id @default(cuid())
  memberId  String
  type      NotificationType
  message   String
  link      String?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

enum NotificationType { APPROVAL_NEEDED EXPORT_FINISHED QA_FAILED PROJECT_ASSIGNED }

// ── Activity / audit log ───────────────────────────────────────────
model ActivityLogEntry {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  memberId  String?
  action    String
  metadata  Json?
  createdAt DateTime @default(now())
}

// ── Settings / API keys ────────────────────────────────────────────
model ApiKeyConfig {
  id             String   @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  provider       ApiProvider
  encryptedKey   String   // encrypted at rest, never returned to client in plaintext
  createdAt      DateTime @default(now())

  @@unique([organizationId, provider])
}

enum ApiProvider { ANTHROPIC OPENAI GEMINI FIGMA SUPABASE }
```

**Notes on design choices:**
- `Json` fields (colors, QA issues, typography) are used where the shape is display-oriented and doesn't need relational querying — querying "all projects with contrast issues" is rare enough that a `jsonb` scan or a denormalized `QaReport.score` filter covers it.
- `ApiKeyConfig.encryptedKey` — API keys are **never** stored plaintext, encrypted with a server-side key (e.g. via `libsodium` or KMS), and only ever decrypted server-side at call time. The client never receives the raw key back, only a masked preview (`sk-ant-...xyz9`).
- `ActivityLogEntry` gives you the Step 10 "History" and doubles as an audit trail — cheap to add now, painful to retrofit later.

---

## 3. API Design

Two layers, as noted in §1.2:

### 3.1 Server Actions (internal mutations, called from Client Components)
Located in `src/actions/*.ts`, one file per domain. Examples:
- `createProject(input)`, `updateProject(id, patch)`, `advanceProjectStatus(id, next)`
- `generateAiCopy(projectId, options)` → calls AI layer, returns draft, does **not** itself wait on long Figma jobs
- `submitApproval(designId, decision, notes)`
- `createBrand`, `updateBrand`

### 3.2 Route Handlers (`src/app/api/**`) — external-facing or job-driven
```
POST   /api/webhooks/uploadthing          UploadThing → copy into Supabase Storage
POST   /api/webhooks/figma                Figma webhook (file update notifications)
POST   /api/jobs/figma-generate           Enqueue Step 6 generation job
POST   /api/jobs/qa-scan                  Enqueue Step 7 QA job
POST   /api/jobs/export-batch             Enqueue Step 9 multi-size export job
GET    /api/jobs/:id                      Poll job status/progress
GET    /api/jobs/:id/stream               SSE stream of job progress (alternative to polling)
GET    /api/templates/sync                Pull latest templates from a Figma Team/Project
GET    /api/search?q=...                  Global search (Step: Global Search) — Postgres full-text or pg_trgm
POST   /api/ai/copy                       Direct AI copy generation (non-batch, streamed)
POST   /api/ai/creative-director          "AI Creative Director" suggestions (layout/copy/color critique)
POST   /api/ai/qa-analyze                 AI-assisted QA pass (grammar, hierarchy, weak CTA detection)
GET    /api/exports/:id/download          Signed download URL
```

**Why this split holds up:** Server Actions never touch Figma, AI batch jobs, or file webhooks directly — they only ever *enqueue* a Job row and return immediately. The route handlers under `/api/jobs/*` are what the queue worker (Inngest function) actually invokes. This means the request/response cycle for anything slow is always async-job-shaped, never a blocking 30s+ serverless invocation.

---

## 4. UI / Page Structure

```
/app
 ├─ (marketing)/                      — not needed (internal tool), skip
 ├─ (auth)/sign-in, sign-up           — Clerk
 ├─ (dashboard)/
 │   ├─ dashboard/                    Step 10 home: recent, today's tasks, pending approval...
 │   ├─ projects/
 │   │   ├─ page.tsx                  Project list + Global Search
 │   │   ├─ new/                      Step 1: Intake wizard entry
 │   │   └─ [projectId]/
 │   │       ├─ layout.tsx            Wizard shell + step progress bar
 │   │       ├─ layout-select/        Step 2
 │   │       ├─ brand/                Step 3
 │   │       ├─ content/              Step 4 (+ "Generate Copy with AI")
 │   │       ├─ template/             Step 5 (Figma template picker)
 │   │       ├─ generate/             Step 6 (job progress UI)
 │   │       ├─ qa/                   Step 7 (score + issue list)
 │   │       ├─ review/               Step 8 (approval, comments, version compare)
 │   │       ├─ export/               Step 9 (formats + auto sizes)
 │   │       └─ complete/             Step 10 (summary: files, history, time, downloads)
 │   ├─ brands/                       Brand Library CRUD
 │   ├─ templates/                    Template Manager (Figma sync, favorites, categories)
 │   ├─ assets/                       Asset Library
 │   ├─ prompts/                      Prompt Library
 │   ├─ notifications/
 │   └─ settings/
 │       ├─ theme/
 │       ├─ api-keys/
 │       └─ team/
 └─ api/**                            (see §3.2)
```

**Wizard pattern:** the per-project step routes (`layout-select`, `brand`, `content`, …) share a persistent left-rail progress indicator and are guarded — you can't jump to `/export` if `project.status` hasn't reached `APPROVED`. This is enforced server-side (a layout-level check), not just hidden in the UI, since agencies will absolutely have someone paste a URL directly.

**Design language:** shadcn/ui as the component primitive layer, themed to a Linear/Notion-esque restrained palette (not default shadcn slate), Framer Motion for step transitions and the job-progress states, full dark/light mode via CSS variables from day one (not retrofitted).

---

## 5. Figma Integration — a note before we build it

Worth flagging now rather than discovering it mid-build: the plain **Figma REST API** can duplicate files/frames and it can push some node property updates, but a few things in your spec (deep component-instance swaps that respect Auto Layout, true "replace this icon component with that one" operations) are more reliably done via a **Figma Plugin** running inside Figma itself, talking back to our backend. My recommendation:

- **Phase 1 (this build):** REST-API-only adapter — duplication, text content replacement, image fills, basic color/style swaps. This covers the large majority of Step 6.
- **Phase 2 (flagged as future work, not blocking):** a companion Figma Plugin for the harder Auto-Layout-safe component swap cases, if Phase 1 proves insufficient for your actual templates.

I'll build the adapter with this seam in place from the start so Phase 2 is additive, not a rewrite.

---

## 6. File Structure

```
src/
 ├─ app/                       routes (see §4)
 ├─ actions/                   Server Actions, one file per domain
 ├─ components/
 │   ├─ ui/                    shadcn primitives
 │   ├─ wizard/                shared step-wizard shell components
 │   └─ [domain]/              feature-specific components (projects/, brands/, qa/, ...)
 ├─ services/                  business logic, framework-agnostic
 │   ├─ projects/
 │   ├─ brands/
 │   ├─ templates/
 │   ├─ qa/
 │   ├─ exports/
 │   ├─ approvals/
 │   └─ notifications/
 ├─ ai/                        AI orchestration layer
 │   ├─ client.ts              Anthropic SDK wrapper, model config
 │   ├─ prompts/                versioned prompt templates per feature
 │   ├─ schemas/                zod schemas for structured AI outputs
 │   └─ features/               copy-generation.ts, creative-director.ts, qa-analysis.ts, ...
 ├─ integrations/
 │   ├─ figma/                  REST adapter, node mapping, rate-limit handling
 │   ├─ uploadthing/
 │   └─ supabase-storage/
 ├─ jobs/                       Inngest functions (one per JobType)
 ├─ db/
 │   ├─ prisma/                 schema.prisma, migrations/
 │   └─ repositories/            thin query modules used by services/
 ├─ auth/                       Clerk helpers, withOrgScope(), RBAC guards
 ├─ hooks/                      shared client hooks
 ├─ lib/                        generic utilities (formatting, validation, constants)
 └─ types/                      shared TS types/interfaces
```

Dependency rule enforced by lint (`eslint-plugin-boundaries` or similar): `components` → `actions`/`hooks` only; `actions` → `services` only; `services` → `db/repositories` + `ai` + `integrations`; nothing reaches into `integrations` except `services`. This is what keeps "modular" true in practice, not just in the folder names.

---

## 7. Build Order (proposed modules)

I'd build and get sign-off in this order — each is independently useful and testable:

1. **Foundation** — Next.js scaffold, Clerk auth + org support, Prisma schema + migrations, base layout, theme (dark/light), `withOrgScope()`
2. **Brand Library** — full CRUD, becomes the dependency for everything downstream
3. **Project Intake + Dashboard** — Step 1, project list, dashboard shell
4. **Content Step + AI Copy Generation** — Step 4, AI orchestration layer stood up here
5. **Asset Library + Uploads** — UploadThing → Supabase Storage pipeline
6. **Template Manager + Figma Sync** — Step 5, read-only Figma integration first
7. **Design Generation (Figma write)** — Step 6, the job queue gets introduced here
8. **QA Engine** — Step 7, rule-based checks + AI-assisted analysis
9. **Approval & Review** — Step 8, comments, version compare
10. **Export Pipeline** — Step 9, multi-format/multi-size
11. **Notifications, Global Search, Prompt Library, Settings/API Keys** — cross-cutting polish
12. **Future-feature seams** (Canva/Adobe/Slack/Drive/etc.) — stub integration points only, not implemented

---

## 8. MVP Addendum — the actual first flow to build

Based on your walkthrough, the real v1 target is narrower and more concrete than the full 10-step pipeline above. It's this:

```
Requester opens "New Carousel Request"
        │
        ▼
Sees 4–5 curated carousel templates  ──────  (admin-curated shortlist, not the full Figma library)
        │  picks one
        ▼
Redirected to a per-slide content form
   Slide 1: text field(s) + 1 image
   Slide 2: text field(s) + 1 image
   ... (N slides, N = however many that template has)
        │  submits
        ▼
Background job: duplicate the Figma template,
populate each slide's text layers + image fill
        │
        ▼
Notify: email + Asana task created  ("New carousel request: <name>")
        │
        ▼
You open Figma, do the final check + any revisions directly there
(no in-app QA score, no in-app approval screen — Figma IS the review surface)
```

The QA engine, in-app Approval/Review page, and multi-size Export pipeline from §2–4 above **stay in the schema** (nothing to throw away) but are **out of scope for the build itself** until you decide whether this simple flow replaces them or sits alongside them. Nothing in the MVP below forecloses adding those later.

### 8.1 Schema additions this flow needs

The one real gap: a template needs to know *its own shape* — how many slides, and which Figma node in each slide is the text layer vs. the image fill. Without this, the "auto-push to Figma" job has nothing to map content onto.

```prisma
model Template {
  // ...existing fields from §2...
  slideCount     Int?           // null for non-carousel layouts
  slots          TemplateSlot[] // ordered list of fillable fields per slide
}

model TemplateSlot {
  id           String   @id @default(cuid())
  templateId   String
  template     Template @relation(fields: [templateId], references: [id])
  slideIndex   Int              // 0-based
  slotType     SlotType         // TEXT or IMAGE
  figmaNodeId  String           // the exact node this slot maps to in the duplicated file
  label        String           // shown on the content form, e.g. "Slide 2 headline"
  order        Int              // display order within the slide

  @@unique([templateId, slideIndex, figmaNodeId])
}

enum SlotType { TEXT IMAGE }
```

This mapping (`TemplateSlot`) is populated once per template — either by you manually tagging node IDs when a template is added, or (nicer, but more work) a small Figma Plugin that lets you click "mark as text slot" / "mark as image slot" on layers inside Figma itself and pushes that mapping back to us. I'd start with **manual entry via a simple admin form** (paste the Figma node ID) and only build the plugin if tagging templates by hand becomes a real bottleneck.

`Project` gains nothing new structurally — a carousel request is just a `Project` with `layoutType = CAROUSEL`, using a trimmed status path:

```
INTAKE → TEMPLATE_SELECTED → CONTENT_SUBMITTED → GENERATING → PUSHED_TO_FIGMA
```
(It simply never proceeds to `QA_REVIEW` / `PENDING_APPROVAL` / `EXPORTING` in this flow — those states remain valid for the future full pipeline.)

### 8.2 Notifications — email + Asana (configurable)

- **Email:** Resend — one transactional template: "New carousel request submitted," sent to the internal review address(es).
- **Asana:** Create a task via the Asana API, in a **configurable** target project rather than a hardcoded one:

```prisma
model NotificationRoute {
  id               String   @id @default(cuid())
  organizationId   String
  organization     Organization @relation(fields: [organizationId], references: [id])
  layoutType       LayoutType?      // null = default/fallback route
  asanaProjectGid  String?
  asanaWorkspaceGid String?
  notifyEmails     String[] @default([])
  createdAt        DateTime @default(now())

  @@unique([organizationId, layoutType])
}
```
This means today all carousel requests can route to one Asana project, but the moment you want, say, "Poster" requests to land in a different Asana board or notify a different person, it's a Settings change, not a code change. Managed under **Settings → Notifications**. Requires an Asana Personal Access Token stored in `ApiKeyConfig` (extend `ApiProvider` enum with `ASANA`).

Both fire from the same job step, right after the Figma push succeeds — not before, so nobody gets pinged about a request that then failed to generate.

### 8.3 No-login requester flow

Since requesters don't have accounts, `Project` needs to identify them without a `Member` relation:

```prisma
model Project {
  // ...existing fields from §2...
  requesterName  String?
  requesterEmail String?
}
```

The intake + content form is a **public route** (no Clerk gate). Since it's open, I'll add a honeypot field and basic IP-based rate limiting on submission by default — lightweight, invisible to real requesters, no captcha friction unless this link ever gets shared outside the company and abuse becomes a real problem.

After submitting, the requester lands on a simple **status page** (via a unique link, e.g. `/r/[requestId]`) showing "Submitted → In Figma, here's a preview" — no login needed to check on their own request either.

### 8.4 Figma template setup

Confirmed: all 4 templates live inside one Figma file (`SOC-MED`, file key `nUa35AhgRB2r7adG3aN4BP`), as different frames/nodes — not four separate files. So all 4 `Template` rows share one `figmaFileKey` and differ only by `figmaNodeId`. Once Figma API access is wired up in Module 4, I'll pull the real layer tree for each of the 4 frames and map out their `TemplateSlot`s (which layer is text, which is the image fill, per slide) — that mapping can't be done from a plain URL fetch, it needs an authenticated Figma API call.

### 8.5 Revised MVP build order

1. **Foundation** — Next.js scaffold, Clerk auth (internal team only — requesters bypass this), Prisma schema (§2 + `TemplateSlot`, `NotificationRoute`, requester fields), theme shell
2. **Template Admin** — internal-only screen to register the 4 SOC-MED frames as `Template`s, map their `TemplateSlot`s via Figma node IDs
3. **Public Requester Flow** — no-login template picker (carousel-only, the 4 curated frames) → dynamic per-slide content form (text + 1 image) → honeypot/rate-limit guard
4. **Figma Push Job** — authenticate to Figma API, duplicate the target frame, populate text + image fills per slide, save resulting file/frame reference as a `Design`
5. **Notifications** — email (Resend) + Asana task via `NotificationRoute`, fired on successful push; Settings screen to configure the route
6. **Polish** — requester status page (`/r/[requestId]`), internal dashboard of open requests

Brand Library, AI copy generation, QA scoring, in-app approvals, and the export pipeline remain designed in §2–4 but deliberately deferred.

## Status

All open questions are resolved. Say the word and I'll start on **Module 1: Foundation**.
