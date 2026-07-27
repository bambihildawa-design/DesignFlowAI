# DesignFlow AI

Internal request-to-Figma workflow tool. Full architecture and rationale
live in `docs/architecture.md`. Plain-language install steps for the Figma
plugin live in `docs/figma-plugin.md`.

## Status: core carousel-request flow built ✅

- Public, no-login request flow: pick a template → fill in content per slide
  → submit
- Template Admin screen: register templates, tag each slide's fields by
  Figma layer name
- A real Figma plugin (`/figma-plugin`) that runs inside Figma, lists pending
  requests, and duplicates + fills the template directly on the canvas —
  the actual "auto-apply into Figma" step
- Notifications (email via Resend, task via Asana) fire automatically once
  a request is applied, routed through a configurable Settings screen
- Supabase Auth for the internal team; first sign-up becomes admin
  automatically

Not yet built: Brand Library, AI copy generation, QA scoring, in-app
approvals, the multi-format export pipeline. All are designed in
`docs/architecture.md` and deferred by choice, not oversight.

## Getting started

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL / DIRECT_URL and the Supabase URL + keys at minimum
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

Then:
1. Sign up at `/sign-up` (becomes the team admin)
2. Go to **Templates**, register your 4 SOC-MED carousel frames, tag each
   slide's text/image layers by their exact Figma layer name
3. Go to **Settings**, generate a plugin token and set up notification
   routing
4. Follow `docs/figma-plugin.md` to install the plugin inside Figma
5. Share the `/request/new` link with whoever submits requests
