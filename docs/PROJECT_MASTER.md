# SM FITNESS — Project Master Document

> **Purpose:** Complete technical reference for the SM FITNESS admin-only gym management system.
> Intended for learning, code review, and interview preparation.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Architecture Deep Dive](#3-architecture-deep-dive)
4. [Key Features Explained](#4-key-features-explained)
5. [Performance Decisions](#5-performance-decisions)
6. [Security](#6-security)
7. [Testing Strategy](#7-testing-strategy)
8. [Deployment & Infrastructure](#8-deployment--infrastructure)
9. [What I Learned](#9-what-i-learned)
10. [Interview Preparation Q&A](#10-interview-preparation-qa)

---

## 1. Project Overview

### What It Is

SM FITNESS is an **admin-only gym management system** — a single-tenant web app designed for a small-to-medium gym owner to manage members, memberships, payments, and reports. It is **not** a member-facing portal; all interactions happen through the admin dashboard.

### The Problem It Solves

Small gyms in India manage memberships manually — WhatsApp groups, paper registers, and memory. This leads to:

- **Lost revenue** from forgotten renewals and expired memberships
- **No financial visibility** into cash vs UPI collections, plan-wise breakdowns
- **Manual reminders** that depend on the owner remembering who's about to expire
- **No receipts** or audit trail for payments

SM FITNESS automates all of this into a single PWA that works on the gym owner's phone.

### Core Capabilities

| Capability | Description |
|---|---|
| **Member Registry** | Add, edit, archive/restore members with photos, medical info, and unique codes |
| **Membership Lifecycle** | Create time-bound memberships linked to plans, track active/expiring/expired status |
| **Payment & Receipts** | Record cash/UPI payments, auto-generate receipt numbers, email receipts |
| **Automated Reminders** | Cron jobs send email reminders at 7 days, 1 day before expiry, and on expiry |
| **Reports & PDF Export** | Revenue dashboards, plan-wise breakdown, member growth charts, PDF export |
| **Settings & Branding** | Custom gym name, logo, UPI QR code, WhatsApp group link |
| **PWA** | Installable on mobile with offline shell, service worker registration |

---

## 2. Tech Stack & Dependencies

### Core Framework

| Layer | Technology | Version | Why |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 16.x | Server Components, API routes, middleware, file-based routing |
| **Runtime** | React | 19.x | RSC support, `use` hook, async Server Components |
| **Language** | TypeScript | 5.x | Strict mode, zero `any` types |
| **Styling** | Tailwind CSS | 4.x | Utility-first, JIT, responsive |
| **Database** | Supabase (PostgreSQL) | — | Auth, DB, Storage, RPC, RLS |
| **Deployment** | Vercel | — | Serverless functions, cron triggers, edge middleware |

### Key Libraries

| Library | Purpose |
|---|---|
| `@supabase/ssr` | Cookie-based auth for SSR/SSG (browser + server clients) |
| `@tanstack/react-query` | Client-side data fetching with caching, stale-while-revalidate |
| `zod` | Runtime schema validation for all API inputs |
| `date-fns` + `date-fns-tz` | IST-aware date arithmetic (no moment.js bloat) |
| `nodemailer` | Gmail SMTP transactional emails |
| `jspdf` + `jspdf-autotable` | Client-side PDF report generation (dynamically imported) |
| `recharts` | Revenue and member growth bar charts |
| `sonner` | Toast notifications |
| `vitest` | Unit tests (jsdom environment) |
| `@playwright/test` | End-to-end browser tests |

### Fonts

- **Geist** (sans) and **Geist Mono** — loaded via `next/font/google` for zero-FOUT
- **Noto Sans** (TTF) — embedded in PDF exports for ₹ symbol support

---

## 3. Architecture Deep Dive

### 3.1 Directory Structure

```
app/
├── (auth)/login/          # Auth route group (no sidebar)
│   └── LoginClient.tsx    # Client component for login form
├── (dashboard)/           # Dashboard route group (with sidebar)
│   ├── layout.tsx         # Server: auth gate + sidebar shell
│   ├── page.tsx           # Server: dashboard home (RSC)
│   ├── members/           # /members, /members/new, /members/[id]
│   ├── memberships/       # /memberships/new
│   ├── payments/          # /payments, /payments/[id]
│   ├── reports/           # /reports
│   └── settings/          # /settings
├── api/
│   ├── members/           # CRUD + photo upload
│   ├── memberships/       # Create + detail
│   ├── payments/          # Create + detail + list + resend receipt
│   ├── plans/             # CRUD
│   ├── settings/          # Read + patch
│   ├── email/             # Send member-scoped emails
│   ├── reports/           # Summary, revenue, members-csv
│   └── cron/              # reminders, backup (Vercel cron)
├── layout.tsx             # Root: fonts, PWA, toaster
└── globals.css            # Design tokens, card surfaces, status badges

lib/
├── supabase.ts            # Browser + Server + Middleware clients
├── supabaseAdmin.ts       # Service-role client (server only)
├── auth.ts                # requireUser() — auth gate for API routes
├── dateUtils.ts           # IST date math (central source of truth)
├── email.ts               # sendAndLog, hasSentEmail, dedup logic
├── mailer.ts              # nodemailer transport (cached singleton)
├── memberEmail.ts         # Email address guards (skip if empty)
├── memberCode.ts          # Atomic member code via Postgres RPC
├── receiptNumber.ts       # Atomic receipt number via Postgres RPC
├── memberAge.ts           # Age calculation from DOB
├── imageCompress.ts       # Client-side JPEG compression
├── gymDisplay.ts          # Gym settings + signed URLs
├── messageTemplates.ts    # WhatsApp/SMS message builders
├── uiFormat.ts            # INR formatting, IST date display
├── formatMobile.ts        # Indian mobile number display
├── apiError.ts            # Standardised 500 error response
├── cron.ts                # CRON_SECRET verifier
├── types.ts               # Shared entity interfaces
├── validations/           # Zod schemas (member, membership, payment)
├── members/memberStatus.ts # Membership status derivation
└── queries/dashboardHome.ts # React-cached data loaders for dashboard

components/
├── auth/AutoLogout.tsx    # Idle timeout auto-logout
├── navigation/DashboardSidebar.tsx
├── dashboard/             # Dashboard stat cards, renewal lists
├── members/MembersClient.tsx  # Member list with tabs, search, pagination
├── memberships/           # Membership forms
├── payments/              # Payment form, receipt display
├── reports/ReportsPageClient.tsx  # Charts + PDF export
├── settings/              # Gym settings form
├── email/                 # HTML email templates (server-rendered)
├── providers/QueryProvider.tsx  # TanStack Query provider
├── pwa/                   # InstallPrompt, SWRegister
└── ui/                    # ConfirmDialog, FlowSteps, AvatarFallback, etc.
```

### 3.2 Supabase Client Architecture

The project uses **three Supabase client patterns**, each for a specific runtime context:

```
┌─────────────────────────────────────────────┐
│           Browser (Client Components)        │
│  createSupabaseBrowserClient()               │
│  → @supabase/ssr createBrowserClient         │
│  → Uses anon key + cookie-based session      │
└──────────────────┬──────────────────────────┘
                   │ HTTP requests
┌──────────────────▼──────────────────────────┐
│           Middleware (Edge Runtime)           │
│  createSupabaseMiddlewareClient(req, res)     │
│  → Refreshes session cookies on each request  │
│  → Protects /members, /payments, etc.         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│           Server (API Routes, RSC)           │
│  createSupabaseServerClient({ cookies })     │
│  → Cookie-forwarded user context             │
│  → Used in layouts/pages for auth checks     │
│                                              │
│  createSupabaseAdminClient()                 │
│  → SERVICE_ROLE_KEY (bypasses RLS)           │
│  → Used ONLY in API routes + cron jobs       │
│  → Single source: lib/supabaseAdmin.ts       │
└──────────────────────────────────────────────┘
```

**Key design rule:** `createSupabaseAdminClient()` is the **only** function that ever touches `SUPABASE_SERVICE_ROLE_KEY`. It is never imported in client components or middleware.

### 3.3 Data Flow: Server Components vs Client Components

```
Dashboard (page.tsx) — SERVER Component
  │
  ├── Fetches data via lib/queries/dashboardHome.ts
  │   └── Uses React.cache() for request-level dedup
  │
  └── Renders HTML → ships to browser with zero JS for static parts

MembersClient.tsx — CLIENT Component ("use client")
  │
  ├── Receives initialMembers as props (server-fetched)
  ├── useState for search, tabs, pagination (client-only state)
  ├── useMemo for computed membership status (no re-fetch)
  └── Optimistic updates for archive/restore (PATCH → rollback on error)
```

### 3.4 Database Schema (Logical)

```
┌──────────────────────────────────────────────────────┐
│  members                                             │
│  ─────────                                           │
│  id (uuid, PK)                                       │
│  member_code (text, unique)  ◄── RPC: next_member_code│
│  full_name, mobile, email                            │
│  photo_url, date_of_birth, gender                    │
│  address, blood_group, joining_date, notes            │
│  is_active (bool, default true)  ◄── soft delete     │
│  welcome_wa_sent (bool)                              │
│  created_at                                          │
└────────────┬─────────────────────────────────────────┘
             │ 1:N
┌────────────▼─────────────────────────────────────────┐
│  memberships                                         │
│  ────────────                                        │
│  id (uuid, PK)                                       │
│  member_id (FK → members)                            │
│  plan_id (FK → plans)                                │
│  start_date, end_date (date)                         │
│  fee_charged (numeric)                               │
│  status (text: active/expired/cancelled)             │
└────────────┬─────────────────────────────────────────┘
             │ 1:1 (enforced at app level)
┌────────────▼─────────────────────────────────────────┐
│  payments                                            │
│  ─────────                                           │
│  id (uuid, PK)                                       │
│  membership_id (FK → memberships, unique constraint) │
│  member_id (FK → members)                            │
│  amount, payment_mode (cash/upi), upi_ref            │
│  payment_date, receipt_number  ◄── RPC: next_receipt │
│  email_sent (bool), notes                            │
└──────────────────────────────────────────────────────┘

┌────────────────────┐   ┌────────────────────────────┐
│  plans             │   │  email_logs                │
│  ─────             │   │  ──────────                │
│  id, name          │   │  id, member_id, type       │
│  duration_months   │   │  sent_to, status, error_msg│
│  default_price     │   │  membership_id, sent_at    │
│  is_active         │   │  (dedup key: member+type+  │
│                    │   │   membership+date)          │
└────────────────────┘   └────────────────────────────┘

┌────────────────────────┐  ┌──────────────────────────┐
│  gym_settings (id=1)   │  │  admins                  │
│  ────────────          │  │  ──────                  │
│  gym_name, address     │  │  id (FK → auth.users)    │
│  phone, upi_id         │  │  (whitelist table for    │
│  backup_email          │  │   admin verification)    │
│  whatsapp_group_link   │  └──────────────────────────┘
│  logo_path, upi_qr_path│
└────────────────────────┘

┌────────────────────────┐  ┌──────────────────────────┐
│  member_code_counter   │  │  receipt_counter         │
│  ────────────────────  │  │  ───────────────         │
│  id=1, counter (int)   │  │  id=1, year, counter     │
│  (atomic via RPC)      │  │  (yearly reset via RPC)  │
└────────────────────────┘  └──────────────────────────┘
```

### 3.5 Request Lifecycle (API Route)

```
1. Client sends POST /api/payments
2. Middleware intercepts → refreshes Supabase session cookie
3. API route handler:
   a. requireUser()  → verify auth + admin check → 401 if not
   b. Zod parse body → 400 if invalid
   c. Business logic  → one-payment-per-membership check
   d. createSupabaseAdminClient() → DB write
   e. Side effects    → generate receipt, send email
   f. Return JSON     → { data: payment }
```

---

## 4. Key Features Explained

### 4.1 Member Code Generation

**Problem:** Two admins creating members simultaneously must not get duplicate codes.

**Solution:** Postgres RPC function `next_member_code()` that atomically increments a counter:

```sql
UPDATE member_code_counter SET counter = counter + 1 WHERE id = 1
RETURNING 'GYM-' || lpad(counter::text, 3, '0')
```

Called via `supabaseAdmin.rpc("next_member_code")` — the transaction isolation of PostgreSQL guarantees uniqueness without application-level locks.

### 4.2 Receipt Number Generation

Same atomic pattern as member codes, but with **yearly reset**:

```sql
-- Reset counter if calendar year changed
UPDATE receipt_counter SET year = current_year, counter = 0
  WHERE id = 1 AND year <> current_year;
-- Then increment
UPDATE receipt_counter SET counter = counter + 1 WHERE id = 1
RETURNING 'RCP-' || year || '-' || lpad(counter::text, 4, '0')
```

Format: `RCP-2026-0042` — human-readable, sortable, unique per year.

### 4.3 One-Payment-Per-Membership

**Business rule:** Each membership can have exactly one payment. Enforced at two levels:

1. **Database:** Unique constraint on `payments.membership_id`
2. **Application:** API route checks for existing payment before insert:
   ```ts
   const { data: existing } = await supabaseAdmin
     .from("payments").select("id")
     .eq("membership_id", membershipId).maybeSingle();
   if (existing) return error(409, "Payment already recorded");
   ```

### 4.4 IST Date Handling

**Critical decision:** All date logic uses **IST (Asia/Kolkata, UTC+5:30)** because the gym operates in India.

Centralized in `lib/dateUtils.ts`:

| Function | Purpose |
|---|---|
| `todayISTDateString()` | Returns `yyyy-MM-dd` in IST |
| `addDaysIST(date, n)` | Adds n days to an IST date string |
| `monthBoundsIST()` | Start/end of current month in IST |
| `getDaysRemaining(endDate)` | Days between today (IST) and an end date |
| `getMembershipStatusFromEndDate(endDate)` | Returns `active`, `expiring`, `expired`, or `no-plan` |
| `getEndDateFromStart(startDate, months)` | Calculates membership end date |

**Why not just `new Date()`?** A server running in UTC would compute the wrong "today" for 5.5 hours each day. This matters because membership expiry is date-based, not timestamp-based.

### 4.5 Membership Status Derivation

Status is **never stored** — it's always **derived** from `end_date` at read time:

```
end_date < today        → "expired"
end_date within 7 days  → "expiring_soon"  (or "expiring" in UI)
end_date > 7 days out   → "active"
no membership at all    → "no_membership"
```

This avoids stale status if a cron job fails — the status is always correct.

### 4.6 Soft Delete (Archive/Restore)

Members are never hard-deleted. The `is_active` boolean controls visibility:

- **Archive:** `PATCH /api/members/:id { is_active: false }`
- **Restore:** `PATCH /api/members/:id { is_active: true }`
- **Client-side:** Optimistic update → revert on API failure

The "Archived" tab in the members list shows `is_active = false` members.

### 4.7 Photo Upload & Compression

1. **Client-side compression** (`lib/imageCompress.ts`):
   - Canvas-based JPEG conversion
   - Iterative quality reduction (0.82 → 0.35) to hit `maxBytes` target
   - Falls back to resolution reduction if quality alone isn't enough
2. **Upload:** `POST /api/members/:id/photo` → Supabase Storage bucket
3. **Display:** Signed URLs with 1-hour expiry, generated on each page load

### 4.8 Email System

```
┌──────────────────────────────────────────────────────────┐
│  lib/mailer.ts           Nodemailer transport (cached)   │
│  lib/email.ts            sendAndLog + hasSentEmail       │
│  lib/memberEmail.ts      Skip guards (no email on file)  │
│  components/email/       HTML template renderers          │
│  app/api/email/route.ts  Manual send endpoint             │
│  app/api/cron/reminders/ Automated reminder sends        │
│  app/api/cron/backup/    Periodic backup digest email    │
└──────────────────────────────────────────────────────────┘
```

**Deduplication:** Before every send, `hasSentEmail()` checks `email_logs` for an existing record with the same `(member_id, type, membership_id)` tuple. For cron jobs, `hasSentEmailOnDate()` also includes the date to allow re-runs on the same day without duplicates.

**Email types:** `welcome`, `receipt`, `reminder_7d`, `reminder_1d`, `expired`, `backup`

### 4.9 Cron Jobs

Configured in `vercel.json`:

| Job | Schedule (UTC) | IST Equivalent | Purpose |
|---|---|---|---|
| `/api/cron/reminders` | `30 2 * * *` | 8:00 AM IST daily | Send 7-day, 1-day, and expiry reminders |
| `/api/cron/backup` | `0 3 */5 * *` | 8:30 AM IST every 5 days | Email HTML backup digest to gym owner |

Both routes validate `Authorization: Bearer <CRON_SECRET>` before executing.

### 4.10 WhatsApp & SMS Integration

Not API-based — uses **deep links**:

```ts
// WhatsApp: opens WhatsApp with pre-filled message
`https://wa.me/91${digits}?text=${encodeURIComponent(message)}`

// SMS: opens default SMS app
`sms:+91${digits}?body=${encodeURIComponent(message)}`
```

Message templates are centralized in `lib/messageTemplates.ts` with dynamic gym name injection.

### 4.11 PDF Report Generation

- Uses **jsPDF** + **jspdf-autotable** for client-side PDF generation
- **Dynamically imported** — the 75KB+ bundle only loads when "Export PDF" is clicked
- Embeds Noto Sans TTF for proper ₹ symbol rendering
- Auto-generates tables: summary metrics, payment list, plan breakdown
- Striped rows, branded header colors (`#1A1A2E`)

### 4.12 New Member Flow (3-Step Wizard)

A guided flow for onboarding:

```
Step 1: Add member details → /members/new
Step 2: Start membership   → /memberships/new?memberId=...&flow=new_member
Step 3: Record payment     → /payments?membershipId=...&flow=new_member
```

The `FlowSteps` component renders a visual progress indicator. The `flow=new_member` query param enables the wizard UI.

---

## 5. Performance Decisions

### 5.1 N+1 Query Elimination

**Cron reminders (before):** For each membership expiring on a target date, 3 sequential queries:
1. Fetch member by ID
2. Check for newer membership
3. Fetch plan name

**After:** Batch-fetch all members, plans, and newer memberships upfront with `Promise.all` + `.in()` queries. The loop only does email checks/sends.

**CSV export (before):** For each of N members, 2 queries (membership + plan). 200 members = 400 queries.

**After:** 3 parallel queries (members, memberships, plans) + Map lookups in the loop.

### 5.2 Promise.all Parallelization

**Member detail GET (before):** 5 sequential `await` calls (member, latest membership, active preview, payments, all memberships).

**After:** Member fetch first (needed to check photo_url), then 4 remaining queries run in parallel via `Promise.all`.

### 5.3 Dynamic Imports

**jsPDF** (75KB+) and **jspdf-autotable** are only needed when the user clicks "Export PDF". Using static imports would add them to the initial bundle for every page load.

```ts
const [{ jsPDF: JsPDF }, { default: autoTable }] = await Promise.all([
  import("jspdf"),
  import("jspdf-autotable"),
]);
```

### 5.4 Explicit Column Selection

All Supabase queries use explicit `.select()` columns instead of `select("*")`. This reduces payload size and prevents leaking internal columns.

### 5.5 React Performance Patterns

| Pattern | Where |
|---|---|
| `useMemo` for derived data | `MembersClient.tsx` — computed status, filtered list, counts, pagination |
| `useCallback` for stable refs | `PaymentsPageClient.tsx` — `goPage`, `ReportsPageClient.tsx` — `exportPdf` |
| 300ms debounce on search | `MembersClient.tsx` — `setTimeout` + `clearTimeout` on search input |
| Optimistic updates | `MembersClient.tsx` — archive/restore immediately updates UI, reverts on error |
| `placeholderData` | TanStack Query — shows previous data while fetching new scope/page |
| `staleTime: 5min` | Prevents unnecessary refetches within the cache window |
| Server Components | Dashboard `page.tsx` — no JS shipped, data fetched at request time |
| `React.cache()` | `dashboardHome.ts` — request-level dedup for shared data loaders |

### 5.6 Image Optimization

- Client-side JPEG compression before upload (target: ~150KB max)
- Canvas-based resize → quality sweep → resolution fallback
- Signed URLs with 1-hour TTL (not permanent public URLs)
- `next.config.ts` whitelists Supabase storage hostname for `next/image`

---

## 6. Security

### 6.1 Authentication Flow

```
1. User logs in → Supabase Auth (email/password)
2. Session stored in HTTP-only cookies via @supabase/ssr
3. Middleware refreshes session on every request
4. Dashboard layout verifies: (a) valid session AND (b) user.id exists in `admins` table
5. API routes call requireUser() which does the same double-check
```

### 6.2 Admin Verification

Not just "is logged in" but "is logged in AND is an admin":

```ts
export async function requireUser() {
  const supabase = createSupabaseServerClient({ cookies: ... });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, error: "Not authenticated" };

  const adminClient = createSupabaseAdminClient();
  const { data: admin } = await adminClient
    .from("admins").select("id").eq("id", user.id).maybeSingle();
  if (!admin) return { user: null, error: "Not authorized" };

  return { user, error: null };
}
```

### 6.3 Service Role Key Isolation

`SUPABASE_SERVICE_ROLE_KEY` is **only** used in `lib/supabaseAdmin.ts`. This file exports `createSupabaseAdminClient()` and is only imported in:
- API route handlers
- Cron job handlers
- Server-side data loaders (via `lib/queries/`)

**Never** imported in client components, middleware, or browser-accessible code.

### 6.4 Input Validation

Every API route validates input with Zod schemas **before** any database operation:

| Route | Schema |
|---|---|
| `POST /api/members` | `createMemberSchema` — name, mobile (10 digits), email, DOB, gender, blood group |
| `PATCH /api/members/:id` | `updateMemberSchema` — partial version of create |
| `POST /api/memberships` | `createMembershipSchema` — member_id, plan_id, start_date, fee |
| `POST /api/payments` | `paymentSchema` — membership_id, amount, mode, upi_ref |
| `PATCH /api/settings` | `patchSchema` — gym_name, address, phone, upi_id, email, URL validation |
| `POST /api/email` | Email schema — member_id, type enum, to, subject, html |
| `GET /api/plans` | `querySchema` — scope enum |
| Route params | `z.string().uuid()` on all `:id` params |

### 6.5 Error Handling

API errors **never expose internal details** to the client:

```ts
// ✅ What we do
if (dbError) {
  console.error("[PATCH /api/members/:id]", dbError);  // Internal log
  return internalServerError("Failed to update member");  // Generic to client
}

// ❌ What we avoid
return NextResponse.json({ error: dbError.message }, { status: 500 });
```

### 6.6 Cron Security

Cron endpoints verify `Authorization: Bearer <CRON_SECRET>`:

```ts
export function verifyCronSecret(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null; // pass
}
```

Vercel automatically sends this header for configured cron jobs.

### 6.7 Route Protection

```
middleware.ts
  └── Intercepts ALL routes except /login, /_next, /api, static assets
  └── Checks Supabase session via cookie
  └── Redirects to /login if no valid session

(dashboard)/layout.tsx
  └── Server-side auth gate (double-checks beyond middleware)
  └── Verifies user is in `admins` table
  └── Redirects to /login if not admin
```

---

## 7. Testing Strategy

### 7.1 Unit Tests (Vitest)

**Config:** `vitest.config.ts` — jsdom environment, globals enabled, `@/` path alias.

**Test files:**

| File | Tests |
|---|---|
| `lib/dateUtils.test.ts` | IST date math, month bounds, days remaining, status derivation |
| `lib/cron.test.ts` | Cron secret verification (valid, missing, wrong) |
| `lib/email.test.ts` | Email type validation, dedup logic |
| `lib/messageTemplates.test.ts` | WhatsApp/SMS link generation, message formatting |
| `lib/uiFormat.test.ts` | INR formatting, date display formatting |
| `lib/rpc-wrappers.test.ts` | Member code and receipt number RPC wrappers |
| `lib/validations/schemas.test.ts` | Zod schema validation (valid/invalid inputs) |
| `app/api/payments/[id]/route.test.ts` | Payment detail API response shape |

**Run:** `npm run test` → `vitest run`

### 7.2 End-to-End Tests (Playwright)

**Config:** `playwright.config.ts` — Chromium, baseURL from env, webServer auto-start.

**Test scenarios:**
- Login flow (valid credentials, invalid credentials)
- Navigation between dashboard sections
- Member CRUD operations
- Protected route redirects

**Run:** `npx playwright test`

### 7.3 Type Checking

- `tsconfig.json` with `"strict": true`
- Zero `any` types across the codebase
- Zero `as any` casts
- Named imports only (no `import *`)

---

## 8. Deployment & Infrastructure

### 8.1 Vercel Configuration

```
vercel.json
├── crons:
│   ├── /api/cron/reminders  → 30 2 * * *   (daily 8am IST)
│   └── /api/cron/backup     → 0 3 */5 * *  (every 5 days, 8:30am IST)
```

### 8.2 Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS (admin ops) |
| `CRON_SECRET` | Server only | Vercel cron auth |
| `GMAIL_USER` | Server only | SMTP sender address |
| `GMAIL_APP_PASSWORD` | Server only | Gmail App Password (not regular password) |
| `NEXT_PUBLIC_GYM_NAME` | Client + Server | Fallback gym name if settings DB is empty |
| `SUPABASE_MEMBER_PHOTO_BUCKET` | Server only | Storage bucket name (default: `sm-fitness-member-photo`) |
| `SUPABASE_GYM_ASSETS_BUCKET` | Server only | Logo/QR storage bucket (default: `gym-assets`) |

### 8.3 Database Setup (Supabase)

Required tables: `members`, `memberships`, `payments`, `plans`, `gym_settings`, `admins`, `email_logs`, `member_code_counter`, `receipt_counter`.

Required RPC functions:
- `next_member_code()` — atomic member code generation
- `next_receipt_number()` — atomic receipt number with yearly reset

### 8.4 PWA Support

- `manifest.json` — app name, icons, theme color (`#1A1A2E`), display: standalone
- `SWRegister.tsx` — registers service worker on mount
- `InstallPrompt.tsx` — shows "Add to Home Screen" banner
- Works as installed app on Android/iOS with offline shell

### 8.5 Next.js Configuration

```ts
// next.config.ts
{
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/sign/**" },
      { protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" },
    ]
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
}
```

---

## 9. What I Learned

### 9.1 N+1 Queries Are Silent Killers

The cron reminders route had 3 DB calls per membership, and the CSV export had 2 per member. With 200 members, that's 400-600 queries for a single request. The fix was simple — batch fetch with `.in()` and build Maps — but finding it required reading every loop and counting DB calls.

**Takeaway:** Before writing any loop that touches a database, ask: "Can I fetch all this data before the loop starts?"

### 9.2 IST Date Handling Is Non-Trivial

JavaScript `new Date()` returns UTC. A gym that opens at midnight IST (6:30 PM UTC previous day) would compute the wrong "today" for renewals and reports. Centralizing all date logic in `dateUtils.ts` with explicit timezone handling (`date-fns-tz`) eliminated an entire class of bugs.

**Takeaway:** Never compute dates inline. Create a single module that handles your timezone, and funnel all date logic through it.

### 9.3 Derived State > Stored State

Membership status (`active`/`expired`/`expiring`) is never stored in the database — it's always computed from `end_date` at read time. This means if a cron job fails, the UI still shows the correct status. No migration needed when business rules change (e.g., changing "expiring" threshold from 7 to 14 days).

**Takeaway:** If a value can be computed from other persisted data, compute it. Only store it if the computation is too expensive to run on every read.

### 9.4 Optimistic Updates Need Rollback

The members list uses optimistic updates for archive/restore — the UI updates immediately, then sends the API request. If the request fails, it reverts to the server state (`props.initialMembers`). Without the rollback, a failed request would leave the UI in an inconsistent state.

**Takeaway:** Optimistic updates are about UX, not about skipping error handling. Always pair them with a rollback path.

### 9.5 Dynamic Imports for Code Splitting

jsPDF is 75KB+ and only used when the user clicks "Export PDF" (maybe 1% of page loads). Static importing bloats the initial bundle for everyone. Moving to `await import("jspdf")` inside the click handler was a one-line change with meaningful impact.

**Takeaway:** Audit your bundle for libraries that are only used on specific user actions. If it's behind a button click, it should be a dynamic import.

### 9.6 Atomic Counters via Postgres RPC

Application-level counters (e.g., `SELECT MAX(code) + 1`) have race conditions under concurrent requests. Postgres RPC functions with `UPDATE ... RETURNING` provide true atomicity without distributed locks.

**Takeaway:** For sequential identifiers, let the database handle atomicity. Application-level "read max + increment" always has a race window.

---

## 10. Interview Preparation Q&A

### Architecture & Design

**Q: Why Next.js App Router instead of Pages Router?**
A: App Router gives us Server Components (zero JS shipped for data-heavy pages like the dashboard), streaming, and the `(route-group)` pattern for separating auth from dashboard layouts. The dashboard `page.tsx` is a pure Server Component — it fetches data, renders HTML, and ships zero client-side JavaScript for its static portions.

**Q: Why Supabase instead of a traditional backend?**
A: Supabase provides auth, PostgreSQL, storage, and RPC in a single hosted service. For a small gym app, it eliminates the need for a separate auth service, file storage, and database hosting. The RPC feature is key — it lets us write atomic Postgres functions (member codes, receipts) without an ORM.

**Q: How do you handle the one-payment-per-membership constraint?**
A: Defense in depth — a unique database constraint on `payments.membership_id` plus an application-level check in the API route before insert. The API check provides a friendly error message; the DB constraint is the safety net for race conditions.

**Q: Why is membership status derived, not stored?**
A: Storing status creates a consistency problem — if a cron job fails to update statuses, the UI shows stale data. By computing status from `end_date` on every read, the system is always correct. The computation is cheap (date comparison), so there's no performance reason to cache it.

### Performance

**Q: How did you identify and fix N+1 queries?**
A: I audited every API route and cron handler for loops containing `await supabase.from(...)`. Found two: (1) cron reminders doing 3 queries per membership, (2) CSV export doing 2 per member. Fixed both by pre-fetching all needed data with `.in()` queries and building lookup Maps.

**Q: What's your approach to client-side performance?**
A: Three things: (1) `useMemo` for all derived computations (membership status, filtered lists, counts), (2) debounced search input (300ms), (3) optimistic updates for mutations so the UI feels instant. For bundle size, jsPDF is dynamically imported since it's only needed on "Export PDF" click.

**Q: How do you prevent unnecessary re-renders?**
A: All expensive computations are wrapped in `useMemo` with minimal dependency arrays. Callbacks passed to children use `useCallback`. The dashboard is a Server Component, so it doesn't re-render at all — it's static HTML with no client-side state.

### Security

**Q: How do you handle auth in API routes?**
A: Every API route starts with `const { user, error } = await requireUser()`. This function (1) checks the session cookie via Supabase, (2) verifies the user exists in the `admins` table (whitelist). If either check fails, we return 401 immediately — no database queries happen.

**Q: How do you prevent sensitive data leakage in API errors?**
A: All database errors are logged internally with `console.error` and a route tag (e.g., `[PATCH /api/members/:id]`), but the client only sees a generic message like "Failed to update member". Raw Supabase error messages (which can contain column names and constraint details) are never sent to the client.

**Q: How is the service role key protected?**
A: `SUPABASE_SERVICE_ROLE_KEY` is only used in one file: `lib/supabaseAdmin.ts`. This file exports `createSupabaseAdminClient()` and is only imported in server-side code (API routes, cron handlers, server data loaders). It's never imported in client components, and Vercel ensures server-only env vars aren't bundled into client code.

### Data & Database

**Q: How do you handle concurrent member code generation?**
A: We use a Postgres RPC function (`next_member_code()`) that does `UPDATE ... SET counter = counter + 1 ... RETURNING`. The update is atomic within Postgres's transaction isolation, so two concurrent requests will always get different codes. No application-level locks needed.

**Q: What's your approach to soft delete?**
A: Members have an `is_active` boolean (default `true`). "Archive" sets it to `false`; "Restore" sets it back to `true`. The members list filters by `is_active` based on the selected tab. This preserves all historical data (memberships, payments, receipts) and allows full restoration.

**Q: How do you handle timezone issues?**
A: All date logic goes through `lib/dateUtils.ts`, which uses `date-fns-tz` with the `Asia/Kolkata` timezone. The key function `todayISTDateString()` returns `yyyy-MM-dd` in IST, regardless of where the server runs. Membership expiry, report periods, and cron schedules all use IST dates.

### Testing

**Q: What's your testing strategy?**
A: Three layers: (1) Unit tests with Vitest for pure functions (date math, validation schemas, formatting, cron secret verification), (2) E2E tests with Playwright for critical user flows (login, navigation, member operations), (3) TypeScript strict mode with zero `any` types as a compile-time safety net.

**Q: How do you test cron jobs?**
A: The cron secret verification logic is unit-tested (valid, missing, wrong token). The business logic inside cron handlers is tested indirectly through the unit tests of their dependencies (date utilities, email dedup logic). Full integration testing requires a seeded Supabase instance.

### Real-World Tradeoffs

**Q: What would you do differently if starting over?**
A: (1) Use Supabase's PostgREST joins more aggressively — some early API routes made sequential queries that could be single joined queries. (2) Add database-level RLS policies instead of relying solely on `requireUser()` checks — defense in depth. (3) Consider tRPC or server actions for type-safe client-server communication instead of manual `fetch` + Zod.

**Q: How would this scale to a multi-gym (multi-tenant) system?**
A: Key changes: (1) Add a `gym_id` column to every table and enable RLS policies that filter by the user's gym. (2) Replace the hardcoded `gym_settings` (id=1) with a per-gym row. (3) Add a `gym_members` join table for admin → gym assignment. (4) The receipt counter would need per-gym isolation. The core architecture (Next.js + Supabase + RPC) would scale fine.

**Q: What's the hardest bug you encountered?**
A: IST date boundary issues. A membership ending on "2026-04-26" was showing as "expired" on the evening of April 25th because the server was computing "today" in UTC. The fix was centralizing all date computations through `todayISTDateString()` and using `+05:30` offsets when converting between date strings and Date objects.

---

*Generated: April 2026 • SM FITNESS Admin App*
