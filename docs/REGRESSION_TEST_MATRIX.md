# Full Regression Test Matrix (Jest-first)

This matrix follows `docs/NEXTJS_TESTING_SKILL.md` using:
- equivalence partitioning,
- boundary value analysis,
- cause-effect combinations,
- error guessing.

## 1) Critical Flow: Add Member -> Start Membership -> Record Payment

### Scope
- `app/(dashboard)/members/new/page.tsx`
- `app/(dashboard)/memberships/new/page.tsx`
- `components/memberships/MembershipForm.tsx`
- `components/payments/PaymentsPageClient.tsx`
- `components/payments/PaymentForm.tsx`
- `app/api/members/route.ts`
- `app/api/memberships/route.ts`
- `app/api/payments/route.ts`

### Equivalence classes
- Member create payload:
  - valid: required fields present
  - invalid: missing/blank required fields, invalid email/mobile
- Membership create:
  - valid: valid `plan_id`, positive fee
  - invalid: missing `member_id`, invalid fee, invalid `plan_id`
- Payment create:
  - valid cash, valid upi
  - invalid mode, malformed notes/ref, missing membership

### Boundary values
- Fee charged: `0`, `1`, max accepted, max+1
- String length boundaries for notes/ref and member fields
- Optional fields: omitted vs empty string vs null-equivalent

### Cause-effect combinations
- Existing active membership + new membership creation => warning + adjusted dates
- Payment mode is `upi` and no UPI config => blocked with explicit error
- Flow query `flow=new_member` + `membershipId` => payment form shows and routes to receipt

### Error-guessing
- `router.refresh` should not be required for correctness after redirects
- Duplicate submits should not create duplicate records
- Unexpected API non-200 should show user-facing error states

## 2) Reports UI/API/PDF integrity

### Scope
- `app/(dashboard)/reports/page.tsx`
- `components/reports/ReportsPageClient.tsx`
- `app/api/reports/summary/route.ts`

### Equivalence classes
- Relation shapes:
  - object relation
  - single-item array relation
  - null relation
- Scope values:
  - valid enum (`this_month`, `last_month`, etc.)
  - invalid scope

### Boundary values
- Empty payments list
- Single payment row
- Multiple rows with plan and without plan
- First and last row ordering by payment date desc

### Cause-effect combinations
- `plan_id` present + plan object => plan name used
- `plan_id` present + plan array => plan name used
- `plan_id` absent => placeholder dash
- Export PDF with/without plan breakdown rows

### Error-guessing
- Missing mobile/name should fallback safely
- PDF formatting should preserve right-aligned amount/revenue and total-row styling

## 3) Settings hydration and save behavior

### Scope
- `app/(dashboard)/settings/page.tsx`
- `components/settings/SettingsClient.tsx`
- `components/settings/PlansManager.tsx`
- `app/api/settings/route.ts`

### Equivalence classes
- Initial settings present vs missing
- Backup email valid vs invalid
- WhatsApp link valid URL vs invalid URL

### Boundary values
- Empty optional settings fields
- Max-length fields near schema limits

### Cause-effect combinations
- Reports settings query cache and settings page cache should not collide
- Save success should invalidate only `["settings","full"]`

### Error-guessing
- Partial cache shape should not blank full settings page
- Upload response payload missing optional paths should not crash UI

## 4) Backup email ordering and integrity

### Scope
- `app/api/cron/backup/route.ts`

### Equivalence classes
- Members with recent payments
- Members without payments
- Active / expiring / expired / no-membership groups

### Boundary values
- Equal payment timestamps (tie-breakers)
- No rows
- Single row

### Cause-effect combinations
- Different statuses + different `lastPaidSortTs` => strict descending by recency first
- Same recency => expiry tie-break then deterministic name order

### Error-guessing
- Missing backup recipient should skip safely
- Mail send failure should log failed state

## 5) Security regression matrix

### Targets
- Protected API routes in `app/api/**`

### Cases
- Missing auth => 401
- Malformed input bodies => 400
- XSS-like payload in string fields should not be echoed unsafely in critical paths
- Sensitive field leakage checks in API responses (e.g., no credentials/tokens/passwords)

## 6) Lightweight performance assertions

### Targets
- Reports summary aggregation path
- Backup cron aggregation path

### Cases
- Ensure expected bounded database/mock call counts (N+1 guard checks)
- Ensure list transforms complete in acceptable time for representative large in-memory arrays
