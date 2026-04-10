# SM FITNESS — End-to-end test matrix (manual + automated)

Use this with [`UAT_CHECKLIST.md`](./UAT_CHECKLIST.md). Automated checks: `npm run test`, `npm run lint`, `npm run build` (see CI).

## SECTION 0 — Functional test cases

| ID | Area | Steps | Expected |
|----|------|--------|----------|
| TC-A1 | Auth (admin) | Open `/login`, sign in with admin user in `admins` table | Redirect to dashboard `/` |
| TC-A2 | Auth (non-admin) | Sign in with user not in `admins` | Stays on or returns to login; no dashboard access |
| TC-A3 | Session | Open `/` while logged out | Redirect to `/login?next=...` |
| TC-M1 | Members list | Open `/members`, type in search, wait ~300ms | URL updates with `q`, list filters; skeletons while loading |
| TC-M2 | Members list | Member with photo | Avatar or placeholder; plan line and expiry |
| TC-M3 | Members list | Active/expiring member | WhatsApp/SMS links visible |
| TC-M4 | Members list | Expired/none | Renew link where applicable |
| TC-M5 | Member detail | Open `/members/[id]` | Banner, cards, photo area, recent payments |
| TC-M6 | Photo | Upload or capture, save | Preview updates; no `next/image` host error |
| TC-M7 | Deactivate | Confirm deactivate | Member inactive; API reflects soft delete |
| TC-MS1 | Membership | `/memberships/new?memberId=...` | Start/end dates follow renewal rules |
| TC-P1 | Payment | Record payment for membership | Success; one payment per membership enforced |
| TC-P2 | Payment detail | Open `/payments/[id]` | Receipt card, print, resend, WhatsApp/SMS |
| TC-P3 | Payments list | Open `/payments` | List loads; amounts/dates formatted |
| TC-D1 | Dashboard | Open `/` | Stat cards, revenue, renewals, recent payments |
| TC-R1 | Reports | Open `/reports` | CSV/export actions work if configured |
| TC-X1 | Hydration | Login and browse with extension-prone browser | No hydration crash (`suppressHydrationWarning` on root) |
| TC-X2 | Images | Member photo from Supabase signed URL | Host allowed in `next.config.ts` remotePatterns |

## SECTION 1 — Performance-style (slow network)

| ID | Steps | Pass criteria |
|----|--------|---------------|
| PT-1 | Chrome DevTools → Network → Slow 3G (or Fast 3G) | Navigate `/login` → `/` → `/members` → member → `/payments` |
| PT-2 | During load | Dashboard route shows skeleton from `loading.tsx` or page loaders; not indefinite blank white |
| PT-3 | Toggle offline briefly, then online | App does not hard-crash; retry or refresh recovers |
| PT-4 | Mobile device (optional) | Same flows on cellular/Wi‑Fi toggle | No uncaught errors in UI |

## SECTION 2 — Final checklist

| Check | Method |
|-------|--------|
| No console errors | DevTools Console on `/`, `/members`, `/members/[id]`, `/payments/[id]` |
| No UI glitches | Resize to mobile width; check sidebar + bottom nav |
| No broken navigation | All sidebar and bottom nav links; browser back/forward |
| No incorrect data | Spot-check IST dates and INR amounts vs source data |
| No crashes | Above + automated build succeeds |

## Agent-only verification log

- **Automated gate:** Record date and `npm run test` / `lint` / `build` result in commit message or release notes.
- **Sections 1–2 on real device:** Mark **Owner verified** when you complete PT-* and Section 2 in a browser.

### Last automated run (CI/local)

| Step | Result | Notes |
|------|--------|--------|
| `npm run test` | Pass | 15 files, 37 tests (Vitest) |
| `npm run lint` | Pass | ESLint |
| `npm run build` | Pass | Next.js 16 production build |

**Sections 1–2 (slow network, console, UI):** Not executed in the agent environment; complete per tables above and mark **Owner verified** when done.
