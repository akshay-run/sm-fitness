# Admin dashboard UI and form UX

This document describes user-facing patterns added for clearer copy, onboarding, forms, and touch-friendly controls. It complements [ARCHITECTURE.md](./ARCHITECTURE.md) (code layout) and [UAT_CHECKLIST.md](./UAT_CHECKLIST.md) (release testing).

## New-member onboarding flow

Typical path:

1. **Add member** — `/members/new`  
2. **Start membership** — `/memberships/new?memberId=<uuid>` (from profile or after creating a member)  
3. **Record payment** — `/payments?membershipId=<uuid>&flow=new_member`

After a membership is created, the app navigates to payments with **`flow=new_member`** so the step indicator stays in context. Pagination and other query params on `/payments` are preserved when changing pages.

### Step indicator (`FlowSteps`)

- Component: [`components/ui/FlowSteps.tsx`](../components/ui/FlowSteps.tsx)  
- Shown below the page title on **New member** (step 1), **Save membership** (step 2), and **Payments** when `flow=new_member` (step 3).  
- Short labels on small screens; full labels from `md:` and up.

### Member profile hints

On [`app/(dashboard)/members/[id]/page.tsx`](../app/(dashboard)/members/[id]/page.tsx), below the membership status banner:

- **No membership** (`membership.status === "none"`): teal banner linking to start a membership.  
- **Has membership history but no recent payments** (unpaid heuristic): amber banner linking to `/payments?membershipId=<latest>&flow=new_member`.  
- Otherwise: no banner.

The header **Add payment** link uses the same `membershipId` + `flow=new_member` pattern when the latest membership exists.

## Forms and validation (Zod)

Shared schemas live under [`lib/validations/`](../lib/validations/). API routes use the same schemas; **user-visible messages** may appear in both the UI and `400` JSON responses (behavior unchanged).

| Area | Notes |
|------|--------|
| **Member** | Mobile display mask (space after 5th digit); spaces stripped before submit. Per-field errors from `safeParse`. Optional suspicious-email-domain warning (amber). |
| **Membership** | Client form uses `membershipFormSchema` (plan + fee). Fee empty/invalid/zero/max messages aligned with API. Non-blocking amber warning if fee > ₹50,000 (still under server max). Date rule copy: end date must be after start date. |
| **Payment** | `paymentFormSchema` for `upi_ref` / `notes` lengths. UPI ID/QR missing: inline message under the UPI block (not only a toast). |
| **Plans (Settings)** | Inline `nameError`, `priceError`, and duration errors on add/edit rows. Edit row remounts via React `key` when entering edit mode so `draft` stays in sync with the server row. |

Helpers: [`lib/formatMobile.ts`](../lib/formatMobile.ts) for mobile display formatting.

## Touch targets and layout polish

- Compact actions (e.g. WhatsApp/SMS, receipt **→**, UPI modal **Close**, profile action rows) aim for at least **44×44px** hit areas where specified (`min-h-[44px]`, `min-w-[44px]` where appropriate).  
- Selected cards and sections use slightly increased padding (`p-5`, inner history rows `px-4 py-3`).  
- Inner status strips and nested chips use a smaller radius than outer cards (`rounded-lg` / `rounded-md` vs `rounded-2xl`) for visual hierarchy.

## Members list search

- Search field: leading **SVG** icon, `pl-9`, `py-2.5`, placeholder example copy.  
- **Archived** tab label and restore flow use `ConfirmDialog` (see members page).

## Related files (quick reference)

| Topic | Location |
|-------|-----------|
| Flow steps wiring | `app/(dashboard)/members/new/page.tsx`, `memberships/new/page.tsx`, `payments/page.tsx` |
| Member form | `components/members/MemberForm.tsx` |
| Membership form | `components/memberships/MembershipForm.tsx` |
| Payment form | `components/payments/PaymentForm.tsx` |
| Plans manager | `components/settings/PlansManager.tsx` |
| Member / payment schemas | `lib/validations/member.schema.ts`, `membership.schema.ts`, `payment.schema.ts` |
