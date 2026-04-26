# PHASE C — Full Functional Testing + Message Excellence
## SM FITNESS Admin App

> **Agent Role:** Senior QA Engineer + Communications Designer  
> **Prerequisite:** Phase A and Phase B are complete. `npm run lint`, `npm run build`, `npm run test` all pass.  
> **Ground rule for testing:** Your job is to find what breaks, not to confirm things work.  
> **Ground rule for messages:** You have full creative freedom. Make them warm, personal, specific, and professional.

---

# PART 1 — FULL FUNCTIONAL TESTING

---

## 1.1 Test Environment Verification

Before writing a single test:
```bash
npm run lint       # must be zero errors
npm run build      # must succeed
npm run test       # existing tests must be green
```

Verify `vitest.config.ts`:
- Coverage enabled
- jsdom environment for component tests
- node environment for API handler tests
- `@/` path alias resolves correctly

---

## 1.2 Test Suite Structure

```
__tests__/
  unit/
    lib/
      dateUtils.test.ts
      validations/
        member.test.ts
        membership.test.ts
        payment.test.ts
    utils/
      receiptNumber.test.ts
      memberStatus.test.ts
  integration/
    api/
      members.test.ts
      memberships.test.ts
      payments.test.ts
      reports/
        summary.test.ts
      cron/
        backup.test.ts
        reminders.test.ts
      settings.test.ts
      security.test.ts
  components/
    MembershipForm.test.tsx
    PaymentForm.test.tsx
    FlowStepIndicator.test.tsx
    StatusBadge.test.tsx
    AvatarFallback.test.tsx
    PlansManager.test.tsx
```

---

## 1.3 Feature Test Specifications

---

### TEST SUITE 1 — Member CRUD
**File:** `__tests__/integration/api/members.test.ts`

```
POST /api/members

VALID:
  ✅ All required fields (name + mobile) → 201, member created
  ✅ member_code generated automatically and matches expected format (GYM-NNN)
  ✅ Email omitted → 201 (email is optional)
  ✅ Mobile: exactly 10 digits → accepted
  ✅ Welcome email triggered when email is present
  ✅ Welcome email NOT triggered when email is absent

INVALID:
  ❌ Missing name → 400 with error pointing to 'name' field
  ❌ Missing mobile → 400 with error pointing to 'mobile' field
  ❌ Mobile: 9 digits → 400 (boundary: one below minimum)
  ❌ Mobile: 11 digits → 400 (boundary: one above maximum)
  ❌ Mobile: non-numeric ("abcdefghij") → 400
  ❌ Email: invalid format ("notanemail") → 400
  ❌ Empty body → 400
  ❌ Unauthenticated request (no session) → 401

BOUNDARY:
  - Name: empty string → 400; single char → accepted; 255 chars → accepted
  - member_code: unique — test concurrent creates don't collide

SIDE EFFECTS:
  - email_logs entry created when welcome email sent
  - email_logs entry created with 'failed' status when send fails

GET /api/members

  ✅ Returns list for authenticated admin
  ✅ Active members returned by default
  ✅ Archived members (is_active=false) returned when ?archived=true (or tab filter)
  ✅ Search by name: partial match returns member
  ✅ Search by mobile: partial match returns member
  ✅ Empty result: returns [] not null
  ❌ Unauthenticated → 401

PATCH /api/members/[id]

  ✅ Valid partial update → 200, fields updated
  ✅ Soft deactivate: is_active=false → 200, row still exists in DB
  ❌ Non-existent ID → 404
  ❌ Unauthenticated → 401
  - Hard delete: no DELETE endpoint should exist (verify 404 or 405)
```

---

### TEST SUITE 2 — Membership Create & Renewal
**File:** `__tests__/integration/api/memberships.test.ts`

```
POST /api/memberships

VALID:
  ✅ Valid plan_id + valid member_id → 201
  ✅ No active membership: start_date = today IST, end_date = start + plan duration
  ✅ Active membership exists → dates adjusted (starts after current end), warning in response
  ✅ fee = 0 → test whether this is accepted (document behavior)
  ✅ fee = 1 (minimum positive) → accepted

INVALID:
  ❌ Missing member_id → 400
  ❌ Non-existent plan_id → 400
  ❌ Negative fee → 400
  ❌ fee as string "700" instead of number → 400 or coerced (document)
  ❌ Unauthenticated → 401

DATE BOUNDARY:
  - Plan duration 30 days: end_date must be exactly start + 30 days in IST
  - Verify: not 29, not 31 — test at IST midnight boundary
  - Test with plan duration 1 month: end_date = same day next month

REGRESSION (from UAT checklist):
  ✅ Membership form redirect: after save, URL includes membershipId for payment step
  ✅ flow=new_member param preserved through redirect
```

---

### TEST SUITE 3 — Payment Create
**File:** `__tests__/integration/api/payments.test.ts`

```
POST /api/payments

VALID:
  ✅ mode=cash, valid membership_id → 201, receipt_number generated
  ✅ mode=upi, UPI configured in settings → 201
  ✅ Receipt number format correct (matches RCP-YYYY-NNNN pattern)
  ✅ Receipt email triggered when member has email
  ✅ Receipt email NOT triggered when member has no email

INVALID:
  ❌ mode=upi, UPI not configured → 400 with explicit "UPI not configured" error
  ❌ mode="bank_transfer" (invalid mode) → 400
  ❌ Missing membership_id → 400
  ❌ Second payment for same membership → 400 (one-per-membership rule)
    - Error message must be explicit: "A payment already exists for this membership"
    - Must NOT be a raw DB constraint violation message
  ❌ Negative amount → 400
  ❌ Unauthenticated → 401

BOUNDARY:
  - Amount = 0 → document whether accepted or rejected
  - Receipt number: unique across concurrent creates (no collision)

SIDE EFFECTS:
  ✅ email_logs entry created on send (type=receipt, status=sent)
  ✅ email_logs entry created on send failure (type=receipt, status=failed)
  ✅ Duplicate email prevention: resend blocked if already sent

REGRESSION:
  ✅ After payment: receipt_number in response matches what displays on receipt page
  ✅ WhatsApp deep link on receipt uses correct phone number
```

---

### TEST SUITE 4 — Reports
**File:** `__tests__/integration/api/reports/summary.test.ts`

```
GET /api/reports/summary?scope=this_month

VALID SCOPES:
  ✅ this_month → revenue for current IST month
  ✅ last_month → revenue for previous IST month
  ✅ Other valid scopes (if any) → test each

INVALID:
  ❌ scope=invalid_scope → 400
  ❌ scope omitted → default behavior or 400 (document)
  ❌ Unauthenticated → 401

DATA SHAPE (mock/seed payments with known values):
  ✅ Payment with plan as object → plan name extracted correctly
  ✅ Payment with plan as single-item array → plan name extracted (regression from test matrix)
  ✅ Payment with null plan_id → shows dash/null safely, does not crash
  ✅ Empty payments list → { total: 0, cash: 0, upi: 0, payments: [] }
  ✅ Single payment (cash ₹700) → { total: 700, cash: 700, upi: 0 }
  ✅ Mix of cash + UPI → split calculated correctly
  ✅ Total = cash + upi exactly (no rounding errors)

IST BOUNDARY:
  - Payment at 23:59 IST on last day of month → included in that month
  - Payment at 00:01 IST on first day of next month → NOT included in prev month
  - UTC midnight ≠ IST midnight — verify boundary is IST not UTC
```

---

### TEST SUITE 5 — Cron: Reminders
**File:** `__tests__/integration/api/cron/reminders.test.ts`

```
GET /api/cron/reminders

AUTH:
  ✅ Authorization: Bearer <CRON_SECRET> → 200
  ✅ x-cron-secret: <CRON_SECRET> → 200 (this route supports both, per ARCHITECTURE.md)
  ❌ Wrong secret → 401
  ❌ Missing auth header → 401

REMINDER LOGIC (mock IST date, mock DB):
  ✅ Membership expiring in exactly 7 days → 7-day reminder sent
  ✅ Membership expiring in exactly 1 day → 1-day reminder sent
  ✅ Membership expiring today (0 days) → expired OR 1-day reminder (document which)
  ✅ Membership already expired (yesterday) → expired reminder sent
  ✅ Membership active with 8+ days remaining → NO reminder sent

DUPLICATE PREVENTION:
  ✅ Same membership + same type + same day → second send blocked
  ✅ Same membership + different type → allowed
  ✅ Same membership + same type + different day → allowed (new day = new reminder)

EDGE CASES:
  ✅ Cancelled membership → NEVER gets reminder, NEVER updated to 'expired' status
  ✅ Member with no email → skipped gracefully, no crash
  ✅ Membership with no member → skipped, no crash
  ✅ Zero memberships matching → returns success with { sent: 0 }
```

---

### TEST SUITE 6 — Cron: Backup
**File:** `__tests__/integration/api/cron/backup.test.ts`

```
GET /api/cron/backup

AUTH (backup route is Bearer ONLY — no x-cron-secret):
  ✅ Authorization: Bearer <CRON_SECRET> → 200
  ❌ x-cron-secret: <CRON_SECRET> (not supported on this route) → 401
  ❌ Wrong Bearer token → 401
  ❌ Missing Authorization header → 401

BEHAVIOR:
  ✅ backup_email in DB settings → email sent to that address
  ✅ backup_email empty in DB, BACKUP_EMAIL env set → email sent to env value
  ✅ Both empty → { skipped: true }, no email, no crash
  ✅ Mail send failure → logged in email_logs with type=backup, status=failed
  ✅ Mail send success → logged in email_logs with type=backup, status=sent

TABLE SORT ORDER (mock members with known statuses):
  ✅ Expired members sort BEFORE expiring-soon
  ✅ Expiring-soon sort BEFORE no-membership
  ✅ No-membership sort BEFORE active
  ✅ Within same status: sort by last payment date descending (most recent first)
  ✅ Same payment date: sort by expiry date, then name (deterministic tie-break)

EDGE CASES:
  ✅ Zero members → summary shows all zeros, no crash
  ✅ Single member → works correctly
  ✅ All members active → table shows all white rows

EMAIL CONTENT ASSERTIONS:
  ✅ Revenue figure is current IST month only (not all-time total)
  ✅ Cash + UPI split in summary is correct
  ✅ Expired rows use red background (inline style, not class)
  ✅ Expiring ≤7 days rows use amber background
  ✅ No membership rows use blue background
  ✅ Active rows use white background
```

---

### TEST SUITE 7 — Settings
**File:** `__tests__/integration/api/settings.test.ts`

```
GET /api/settings
  ✅ Returns current settings for authenticated admin
  ✅ Missing optional fields return null/undefined (not crash)
  ❌ Unauthenticated → 401

PATCH /api/settings
  ✅ Save backup_email → persisted, returned on next GET
  ✅ Save WhatsApp group link → persisted
  ✅ Partial update (only gym name) → other fields unchanged
  ❌ Invalid email format for backup_email → 400
  ❌ Unauthenticated → 401

REGRESSION (from Phase B):
  ✅ Per-section save: saving gym profile does not affect notification settings
  ✅ After save: GET returns updated values (cache invalidated)
  ✅ Partial cache shape (missing optional paths) → page does not crash
```

---

### TEST SUITE 8 — Security Regression
**File:** `__tests__/integration/api/security.test.ts`

```
For EVERY protected API route (members, memberships, payments, reports, settings, cron):

AUTH:
  ❌ Unauthenticated request → 401 (never 200, never 500)
  ❌ Expired session → 401

INPUT:
  ❌ Malformed JSON body → 400 (never 500)
  ❌ Completely empty body → 400
  ❌ XSS payload in string fields: '<script>alert(1)</script>'
    → Stored/returned as escaped string, never executed

RESPONSE CLEANLINESS:
  ✅ No password, token, CRON_SECRET, or SUPABASE_SERVICE_KEY in any response
  ✅ No internal stack traces in 5xx responses
  ✅ No Supabase row-level error details exposed to client
```

---

### TEST SUITE 9 — Date Utility Unit Tests
**File:** `__tests__/unit/lib/dateUtils.test.ts`

```
getMembershipStatus(endDate):
  ✅ endDate = yesterday IST → 'expired'
  ✅ endDate = today IST → 'expiring' (0 days = still show as expiring, not expired)
     OR 'expired' — document the exact rule and test the boundary
  ✅ endDate = 7 days from now → 'expiring'
  ✅ endDate = 8 days from now → 'active'
  ✅ endDate = null/undefined → 'no-plan'

getDaysRemaining(endDate):
  ✅ 7 days from now → 7
  ✅ 1 day from now → 1
  ✅ Today → 0
  ✅ Yesterday → -1
  ✅ null → defined fallback (0 or -1 — document and test)

IST month bounds:
  ✅ Payment at 1 Jan 00:00 IST → within January
  ✅ Payment at 31 Dec 23:59 IST → within December
  ✅ UTC midnight on Jan 1 = Dec 31 18:30 IST → verify month assignment is IST-based
```

---

### TEST SUITE 10 — Component Tests

#### `MembershipForm.test.tsx`
```
✅ Renders with empty state — no plans loaded
✅ Renders with loaded plans — dropdown populated
✅ Selects plan → end date auto-calculates and displays
✅ High fee warning shown when fee > 50,000
✅ Warning shown when active membership exists
✅ Inline field errors shown on submit with empty required fields
✅ Submit button disabled while form is submitting
✅ On success: onSuccess callback called / redirect happens
✅ On API error: error message displayed (not just console.error)
```

#### `PaymentForm.test.tsx`
```
✅ Default mode is Cash (filled/selected state)
✅ Clicking UPI (QR) → UPI section shown
✅ UPI hint shown when UPI ID not configured in settings
✅ Submit disabled until mode selected
✅ Submit disabled while in-flight (prevents double submit)
✅ Error message shown on API failure
✅ "Confirm payment" / "Record Payment" button label is correct
```

#### `FlowStepIndicator.test.tsx`
```
✅ Renders 3 steps with labels "Info", "Plan", "Pay"
✅ Complete step shows checkmark icon
✅ Active step shows filled numbered circle
✅ Pending step shows outline numbered circle
✅ Labels do NOT truncate at 375px viewport width
✅ All 3 steps visible simultaneously on 375px viewport
```

#### `StatusBadge.test.tsx`
```
✅ status='active' → green colors + CheckCircle icon + "Active" text
✅ status='expiring' → amber colors + Clock icon + "Expiring" text
✅ status='expired' → red colors + AlertCircle icon + "Expired" text
✅ status='no-plan' → blue colors + MinusCircle icon + "No plan" text
✅ All badges have both icon AND text (never color alone)
```

#### `PlansManager.test.tsx`
```
✅ "Duration (months)" label is visible for the duration field
✅ "1 month" (singular) for duration=1
✅ "3 months" (plural) for duration=3
✅ Active plan shows "Deactivate" button
✅ Inactive plan shows "Activate" button
✅ Add plan button is full-width
```

---

## 1.4 Coverage Gates

```bash
npm run test -- --coverage
```

Required minimums:
```
lib/dateUtils.ts                          ≥ 90% branch
lib/validations/*.ts                      ≥ 90% branch
app/api/members/route.ts                  ≥ 85% branch
app/api/memberships/route.ts              ≥ 85% branch
app/api/payments/route.ts                 ≥ 85% branch
app/api/cron/backup/route.ts              ≥ 85% branch
app/api/cron/reminders/route.ts           ≥ 85% branch
app/api/reports/summary/route.ts          ≥ 80% branch
components/payments/PaymentForm.tsx       ≥ 80% branch
components/memberships/MembershipForm.tsx ≥ 80% branch
components/settings/PlansManager.tsx      ≥ 75% branch
components/ui/FlowStepIndicator.tsx       ≥ 95% branch  ← critical path
```

---

# PART 2 — MESSAGE EXCELLENCE

> You have full creative freedom on content, tone, and design.  
> Hard constraints: accurate, warm, professional, Indian context (₹, IST, "gym").  
> Every variable must have a fallback — never render `undefined` or blank.

---

## 2.1 Message Design Principles

Applied to every message across all channels:

1. **Personal** — use first name, not "Dear Member" or "Hello"
2. **Specific** — exact plan name, exact dates, exact amount — never generic
3. **Actionable** — always tell them what to do next
4. **Brief** — WhatsApp: readable in 3 seconds. Email: scannable in 10 seconds.
5. **Warm** — friendly gym owner tone. Not corporate. Not robotic.
6. **IST dates** — always format as: `25 Apr 2026` (DD Mon YYYY)
7. **Indian currency** — always `₹1,500` (with comma, rupee symbol, no decimal for whole numbers)
8. **Fallbacks** — if first name unavailable, use full name. If plan unavailable, use "your membership".

---

## 2.2 Email Templates

### Welcome Email
**Trigger:** New member created with email  
**File:** `lib/mailer.ts` — the welcome email function

```
SUBJECT:
Welcome to {GymName}, {FirstName}! 🎉

BODY (HTML — responsive, inline CSS):

[GYM LOGO or initials circle]

Hi {FirstName},

Welcome to {GymName}! We're thrilled to have you. 💪

Your membership is all set:

┌──────────────────────────────────┐
│  Member Code:   {MemberCode}     │
│  Plan:          {PlanName}       │
│  Valid From:    {StartDate}      │
│  Valid Until:   {EndDate}        │
│  Amount Paid:   ₹{Amount}        │
└──────────────────────────────────┘

[If WhatsApp group configured:]
Join our member community and stay updated:
→ {WhatsAppGroupLink}

Show your member code at the front desk anytime.

See you at the gym!
{GymName} Team

—
📍 {GymAddress}
📞 {GymPhone}
```

---

### Payment Receipt Email
**Trigger:** Payment recorded  
**File:** `lib/mailer.ts` — the receipt email function

```
SUBJECT:
Receipt ✓ ₹{Amount} | {GymName} | #{ReceiptNumber}

BODY (HTML):

[GYM LOGO or initials]

Payment Confirmed ✓

Hi {FirstName},

Thank you for your payment. Here's your receipt:

═══════════════════════════════════════
  {GymName}
  Receipt #{ReceiptNumber}         {PaymentDate}
───────────────────────────────────────
  Member:    {FullName} ({MemberCode})
  Plan:      {PlanName}
  Period:    {StartDate} → {EndDate}
  Mode:      {Cash / UPI}
  Amount:    ₹{Amount}
═══════════════════════════════════════

Please keep this email as your receipt.

Your membership is valid until {EndDate}.
We'll remind you a week before it expires — no surprises!

See you at the gym 💪
{GymName} Team

—
📍 {GymAddress} · 📞 {GymPhone}
```

---

### Reminder Email — 7 Days
**Trigger:** Cron, membership expiring in 7 days

```
SUBJECT:
⏰ {FirstName}, your membership expires in 7 days — {GymName}

BODY:

Hi {FirstName},

Just a heads-up — your {PlanName} membership at {GymName} 
expires on {ExpiryDate}, which is 7 days away.

Renew before it expires to keep your routine going without a gap.

To renew, contact us:
📱 {GymPhone} (WhatsApp or call)
📍 {GymAddress}

See you at the gym!
{GymName} Team
```

---

### Reminder Email — 1 Day
**Trigger:** Cron, membership expiring tomorrow

```
SUBJECT:
🚨 Last day! Your membership expires tomorrow — {GymName}

BODY:

Hi {FirstName},

Your {PlanName} membership expires tomorrow ({ExpiryDate}).

Renew today to avoid any gap in your training!

📱 {GymPhone}

{GymName} Team
```

---

### Reminder Email — Expired
**Trigger:** Cron, membership expired

```
SUBJECT:
Your membership has expired — come back to {GymName}!

BODY:

Hi {FirstName},

Your {PlanName} membership expired on {ExpiryDate}.

We'd love to have you back! Renew now and jump right back into your routine — 
your progress is waiting.

📱 {GymPhone}
📍 {GymAddress}

Whenever you're ready, we're here. 💪
{GymName} Team
```

---

## 2.3 WhatsApp Message Templates

All WhatsApp messages use `wa.me/{mobile}?text={encodeURIComponent(message)}`.  
Tone: conversational, short, emoji where natural. Bold with `*asterisks*`.

---

### Welcome WhatsApp
**Trigger:** Admin taps "Send Welcome" on receipt screen (first time per member)  
**Condition:** `welcome_wa_sent === false`

```
Hi {FirstName}! 👋

Welcome to *{GymName}*! We're so glad you joined us 🏋️

Here are your membership details:
• *Member Code:* {MemberCode}
• *Plan:* {PlanName}
• *Valid:* {StartDate} – {EndDate}

[If group link configured:]
📲 Join our WhatsApp group for updates & tips:
{WhatsAppGroupLink}

See you at the gym! 💪
— *{GymName}* Team
```

---

### Receipt WhatsApp
**Trigger:** Admin taps "Send Receipt" on receipt screen

```
Hi {FirstName}!

Here's your receipt from *{GymName}* 🧾

• *Receipt #:* {ReceiptNumber}
• *Date:* {PaymentDate}
• *Plan:* {PlanName}
• *Valid:* {StartDate} – {EndDate}
• *Paid:* ₹{Amount} ({Mode})

Thank you! See you at the gym 🏋️
```

---

### Reminder WhatsApp — 7 Days
**Trigger:** Admin sends reminder, 7 days to expiry

```
Hi {FirstName}! 

Quick reminder — your *{GymName}* membership expires in *7 days* on {ExpiryDate}.

Renew soon to keep your momentum going! 💪

📱 {GymPhone}
```

---

### Reminder WhatsApp — 1 Day
**Trigger:** Admin sends reminder, 1 day to expiry

```
Hi {FirstName}! ⏰

Your *{GymName}* membership expires *tomorrow* ({ExpiryDate}).

Please renew today to avoid any gap!

📱 {GymPhone}
```

---

### Reminder WhatsApp — Expired
**Trigger:** Admin sends reminder, membership expired

```
Hi {FirstName},

Your *{GymName}* membership expired on {ExpiryDate}.

We miss you at the gym! 🏋️ Come back and renew — 
your hard work shouldn't go to waste.

📱 {GymPhone}
📍 {GymAddress}

We're here whenever you're ready 💪
```

---

## 2.4 Backup Email Template

**Trigger:** Cron `0 3 */5 * *`  
**Recipient:** Admin/owner  
**Observed issues (Screen 20):** Too many columns for mobile email, no color legend, row colors may not use inline CSS

```
SUBJECT:
[If expired > 0]: SM FITNESS — Backup {Date} | {ActiveCount} active ⚠ {ExpiredCount} expired
[If expired = 0]: SM FITNESS — Backup {Date} | {ActiveCount} active members

IMPROVEMENTS vs current (Screen 20):

1. SUMMARY BAR (keep dark background — it works):
   Improve layout to 2 rows for mobile readability:
   
   Row 1: Total: {N} | Active: {N} | Expiring soon: {N}
   Row 2: Expired: {N} | No plan: {N}
   Row 3: This month revenue: ₹{Amount} | Cash: ₹{Cash} | UPI: ₹{UPI}

2. COLOR LEGEND (add below summary bar):
   <table> with 4 small color swatches:
   🔴 Expired  |  🟡 Expiring soon  |  🔵 No membership  |  ⚪ Active

3. TABLE (reduce from 8 to 6 columns for mobile readability):
   Name | Mobile | Plan | Expiry | Days Left | Last Paid
   Remove: Amount, Mode (these are visible in the financial summary above)
   
   All row background colors MUST use inline style:
   style="background-color: #FEE2E2"  ← expired (red-100)
   style="background-color: #FEF3C7"  ← expiring (amber-100)
   style="background-color: #DBEAFE"  ← no plan (blue-100)
   style="background-color: #FFFFFF"  ← active
   
   NOT Tailwind classes (email clients strip them)

4. TABLE SORT (keep current — it's correct):
   Expired → Expiring soon → No plan → Active
   Within status: by last payment date descending

5. FOOTER:
   Automated backup from {GymName} admin system.
   Next backup in approximately 5 days.
```

---

## 2.5 PDF Report Template

**Trigger:** Admin clicks "Export PDF" on Reports page

```
IMPROVEMENTS vs current:

HEADER:
  {GymName} — Revenue Report
  Period: {MonthYear} | Generated: {Date} {Time} IST

SUMMARY SECTION (box style):
  ┌─────────────────────────────────────┐
  │ Total Revenue:    ₹{Amount}         │
  │ Cash:             ₹{CashAmount}     │
  │ UPI:              ₹{UPIAmount}      │
  │ Transactions:     {Count}           │
  └─────────────────────────────────────┘

DETAILED TABLE:
  Columns: #, Date, Member Name, Member Code, Plan, Amount, Mode
  - All amounts RIGHT-ALIGNED
  - Column headers: BOLD
  - Alternating row shade: white / #F9FAFB for readability
  - Date format: DD Mon YYYY (not ISO)

PLAN BREAKDOWN (if multiple plans exist):
  Plan Name     | Transactions | Total
  Monthly       |     18       | ₹12,600
  Quarterly     |      5       | ₹15,000
  ─────────────────────────────────────
  Total         |     23       | ₹27,600
  (Total row: bold, double top border)

FOOTER:
  {GymName} | Exported on {Date} | Page {X} of {Y}
```

---

## 2.6 SMS Templates (If/When Implemented)

Currently not implemented — document as ready-to-use when SMS is added:

```
7-day reminder (max 160 chars):
"{GymName}: Hi {FirstName}, your {Plan} expires in 7 days on {ExpiryDate}. 
Renew now! Call {Phone}"

1-day reminder:
"{GymName}: Hi {FirstName}, membership expires TOMORROW {ExpiryDate}. 
Renew today! {Phone}"

Expired:
"{GymName}: Hi {FirstName}, membership expired {ExpiryDate}. 
Come back & renew! {Phone}"

Welcome:
"{GymName}: Welcome {FirstName}! Your {Plan} is active till {EndDate}. 
Code: {MemberCode}. See you!"
```

---

## 2.7 Message Implementation Checklist

For every message type, verify before marking done:

- [ ] Member's **first name** extracted correctly (`name.split(' ')[0]`)
- [ ] **Fallback**: if first name empty, use full name; if plan empty, use "your membership"
- [ ] **Dates** formatted as `DD Mon YYYY` (e.g., "25 Apr 2026") — NOT ISO, NOT slash format
- [ ] **Amounts** formatted as `₹1,500` (Indian comma format, rupee symbol, no decimals for whole)
- [ ] **Gym name** sourced from settings, not hardcoded
- [ ] **WhatsApp text** is `encodeURIComponent`-encoded correctly
- [ ] **WhatsApp bold** uses `*asterisks*` not markdown `**`
- [ ] **Email HTML** uses inline `style=""` attributes for all colors and fonts
- [ ] **Email subject** is specific — includes amount for receipts, dates for reminders
- [ ] **No broken variables** — test with a member missing optional fields (no email, no plan)
- [ ] **email_logs** entry created for every send attempt (sent or failed)
- [ ] **Backup email** row colors use inline CSS `style="background-color: #HEX"` not Tailwind

---

# PART 3 — FINAL VERIFICATION

## 3.1 Full UAT Pass

Go through every item in `docs/UAT_CHECKLIST.md` and verify ✅.

Focus extra attention on items that Phase B touched:
- [ ] `flow=new_member` complete flow: step 1 → step 2 → step 3 → receipt (no broken redirects)
- [ ] Step labels "Info" / "Plan" / "Pay" are readable on 375px viewport
- [ ] Per-section settings saves work independently
- [ ] UPI payment flow works with QR (file input fix didn't break upload)
- [ ] One-payment-per-membership rule still enforced after refactor
- [ ] WhatsApp deep links open WhatsApp with correct prefilled message
- [ ] `welcome_wa_sent` flag set to true after welcome WhatsApp sent
- [ ] Receipt email sends with improved template
- [ ] Backup email sends with updated layout and inline CSS colors
- [ ] Cron routes: reminders accepts Bearer + x-cron-secret; backup accepts Bearer only
- [ ] Soft delete: archived member has `is_active = false` in DB, row still present

## 3.2 Regression Test Run

```bash
npm run test -- --coverage
```

All 10 test suites must pass. Coverage gates (section 1.4) must be met.

## 3.3 Message Preview Verification

For each message channel:
1. Trigger with test data (member with all fields + member with minimal fields)
2. Verify no `undefined`, `null`, or blank variable placeholders appear
3. Verify IST dates render correctly
4. Verify ₹ amounts format correctly
5. WhatsApp: tap the deep link — confirm prefilled message appears correctly in WhatsApp
6. Email: send to a test inbox — verify rendering in Gmail mobile + desktop

## 3.4 Production Readiness Sign-off

- [ ] All Phase A 🔴 Critical findings: DONE
- [ ] All Phase A 🟡 Medium findings: DONE
- [ ] All Phase A 🟢 Nice-to-have: done where feasible
- [ ] Test coverage meets all gates in section 1.4
- [ ] Full UAT checklist: all items ✅
- [ ] All message templates verified with test data
- [ ] `npm run lint` — zero errors, zero warnings
- [ ] `npm run build` — succeeds, zero errors
- [ ] No `console.log` in production code
- [ ] No hardcoded secrets, no API keys in code
- [ ] Cron auth verified (wrong token → 401 on both routes)

---

*Phase C complete. SM FITNESS is production-ready.*
