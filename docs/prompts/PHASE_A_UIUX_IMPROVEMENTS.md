# PHASE A — UI/UX Improvements
## SM FITNESS Admin App — Based on Actual Page's Screen Review (20 Screens)

> **Status:** COMPLETE — all 20 screens analyzed  
> **Agent Role:** Senior Product Designer + Frontend UX Engineer  
> **Ground rule:** Every finding is based on what is visible in the shared screens. No assumptions.

---

## Pages's Screen-by-Screen Analysis

---

### Screen 01 — Login Page

**What I see:** White card on gray background. Title "SM FITNESS Admin", subtitle "Sign in to manage your gym." Email + Password fields with labels. Black "Sign in" button. "Forgot password?" underlined link. Large gray dead space ~40% above and below the card.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🟡 | ~40% of screen height is unused gray space above and below the card — feels like a half-finished page | Vertically center the card: `min-h-screen flex items-center justify-center` on the page wrapper |
| 2 | 🟡 | Password field has no show/hide toggle — admin can't verify what they typed | Add eye icon button inside the password field that toggles `type` between `password` and `text` |
| 3 | 🟡 | No gym logo or any icon — card is purely generic text | Add gym logo (from settings) at the top of the card; fallback to a dumbbell SVG icon |


---

### Screen 02 — Dashboard (Stats Cards + Revenue)

**What I see:** "Dashboard" heading, today's date. "New Member" black CTA. 4 stat cards: Total 28, Active 26, Expired 2, Expiring in 7d 0. Each card has an emoji-in-colored-box icon. Revenue card with ₹50,800 this month, ₹0 last month, and a bar chart where the single bar is solid black.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🟡 | "Expiring in 7d" — the "7d" abbreviation is ambiguous for a non-technical gym owner | Rename to "Expiring Soon" (7 days window is already implied by business logic) |
| 2 | 🟡 | Stat card icons are emoji inside colored boxes — emoji render inconsistently across Android versions and look out of place in a business app | Replace with consistent Lucide SVG icons (`Users`, `CheckCircle2`, `AlertCircle`, `Bell`) inside the same colored boxes |
| 3 | 🟡 | Revenue chart bar is pure black — visually jarring and looks like a placeholder | Change bar color to a brand accent (e.g., `#2563eb` blue or `#16a34a` green for positive revenue) |
| 4 | 🟢 | "New Member" button is well-placed top-right and high-contrast — good | Text wraps to 2 lines — add `whitespace-nowrap` |

---

### Screen 03 — Dashboard (Upcoming Renewals + Recent Payments)

**What I see:** "Upcoming renewals (7 days)" section with a well-designed empty state (🎉 emoji, encouraging text). "Recent payments" table: Member, Amount, Mode, Actions columns. Every single member name shows literally as "Member" — not actual names. Mode column shows "CASH →" or "UPI →" with an arrow. "WA" button in a small white box.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🔴 | All member names in "Recent payments" show as **"Member"** (literal text) — actual names are not rendering | Bug: the query likely returns a `member` relation but the template accesses `payment.member` (which is the relation object/label) instead of `payment.member.name`. Fix the data access path. |
| 2 | 🔴 | "WA" button: tiny white box with text "WA", no icon, approximately 32px — far below 44px touch target minimum | Replace with a proper WhatsApp icon button: green background, white WhatsApp SVG icon, `min-h-[44px] min-w-[44px]`, tooltip "Send WhatsApp reminder" |
| 3 | 🟡 | "member" column have the wrrtien "member" for all payment | replace 'member' with actual first name of the member


---

### Screen 04 — Members List

**What I see:** "Members" heading, "New Member" button. Search bar with placeholder "e.g. Rahul or 98765...". 4 filter tabs that wrap to 2 rows: All(28), Active(26), Expired(2) on row 1; Archived(1) alone on row 2. Member cards: avatar circle, name, GYM code, mobile, "No plan · 22 May 2026", status badge (Active), then WhatsApp/SMS/Archive buttons + "Open →" link.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🟡 | "No plan · 22 May 2026" — an expiry date is shown even when there's "No plan". This is contradictory and confusing | If no active membership: show "No membership" only, no date. Date should only display when a plan is assigned. |
| 2 | 🟡 | Filter tabs wrap to 2 rows because "Archived (1)" overflows — looks like broken layout | Make tabs a single horizontally-scrollable row: `flex overflow-x-auto gap-2 pb-1` with `whitespace-nowrap` on each tab |
| 3 | 🟡 | WhatsApp, SMS, and Archive buttons look visually identical (same border, same size) — Archive is destructive but only differentiated by red text | Archive: smaller, ghost/text-only with trash icon. WhatsApp: subtle green tint. SMS: neutral. |
| 4 | 🟡 | "Open →" link at bottom of card is disconnected from member name at top | Make the entire card tappable (wrapping `<Link>`), with the arrow as a trailing affordance |
| 5 | 🟢 | Generic person avatar placeholder is consistent across all cards | Upgrade to: colored circle with member initials (e.g. "SS" for Sham Sudhar) |

---

### Screen 05 — Member Profile (Active Member)

**What I see:** "Sham Sudhar" + GYM-030. Buttons row 1: Edit (outline) + Add payment (outline). Row 2: Start membership (outline, wider). Row 3: Archive member (red outline). Green active status banner "Active until 22 May 2026 (27 days left)". PERSONAL section: Mobile + Email cards side by side (email truncated at right edge). MEMBERSHIP section: Plan + Fee paid.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🔴 | Email is cut off ("aknshaynikule80@gmai") — the right portion disappears off screen | Use `truncate` with `title` attribute for hover, or display email on a second line with `text-sm break-all` |
| 2 | 🟡 | Button layout has no visual hierarchy — Edit, Add payment, Start membership, Archive all look like similar-weight options | Redesign: Primary action = filled black (Add payment or Start membership based on state). Secondary = outline (Edit). Destructive = text-only red link at bottom, separated by a `<hr>` |
| 2.1 | high | thise above buttons[edit, add payment, start membership] are at rigt side of screen in mobile view and left side(below member id/name) is empty | at that empty space we can photo of the member if availble otherwise avatar
| 3 | 🟡 | No back navigation — only "Menu" top-left which opens the sidebar, not a back action | Add `← Members` breadcrumb link below the top bar |
| 4 | 🟡 | "27 days left" is small text inside the banner | Make days count `font-bold text-lg`: "Active until 22 May 2026 · **27 days left**" |

---

### Screen 06 — Member Profile (Photo + Action Buttons)

**What I see:** Photo section: "Upload" (black button) + "Camera" (outline). Large preview box "No photo" in dashed rectangle. Below it: a separate "Upload" card showing "Upload / Choose an image. We'll compress it before upload. / Choose file No file chosen" — this is the raw browser `<input type="file">` rendered directly. Then: 2×2 grid of action buttons: WhatsApp, SMS, Send Email, Renew.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🔴 | **Raw browser file input is exposed on screen** — "Choose file No file chosen" is the unstyled native `<input type="file">`. This is broken UI. | Hide the `<input type="file">` with `className="hidden"` and trigger it via `ref.current.click()` from the styled "Upload" button. Remove the entire "Upload" card section. |
| 2 | 🔴 | Duplicate "Upload" card below the preview is redundant — there are already Upload/Camera buttons above | Remove the card entirely. this will space at top(below the member id/name) here if photo already available then show and upload and camera button, so here u have fix this with proper UIUX  |
| 3 | 🟡 | "No photo" preview area is a tall empty dashed rectangle — wastes significant vertical space | Replace with a compact circular avatar (96px diameter) showing a person silhouette, matching the style used in the member list |
| 4 | 🟡 | "Compressed to < 200KB" is a technical detail in the section title | Move below the Upload button as help text: `<p class="text-xs text-gray-500">Images are compressed automatically</p>` |
| 5 | 🟡 | "Renew" in the 2×2 action grid is a data operation mixed with communication buttons (WhatsApp, SMS, Email) | Visually separate: communication row (WhatsApp, SMS, Email) and then a separate "Renew membership" button below |

---

### Screen 07 — Payments List Page

**What I see:** "Payments" heading + "New Member" button (oddly placed). Instruction banner. Payments table: Date (wraps to 2 lines: "22 Apr / 2026"), Member (truncated: "Testing R...", "Expiring ..."), Mode (CASH/UPI), Amount (₹700, ₹7,000), Open arrow.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🔴 | Date column wraps to **2 lines** — "22 Apr" on line 1, "2026" on line 2 — makes the table look broken and wastes row height | Use short date without year when same year: "22 Apr". Use `whitespace-nowrap` on the date cell. |
| 2 | 🔴 | Member names truncated — "Testing R...", "Expiring ..." — unidentifiable | Show full name on 2 lines: `<div>Testing Rao<br><span class="text-xs text-gray-500">GYM-029</span></div>` |
| 3 | 🟡 | "New Member" button on the Payments page — admin is viewing payments, this CTA is out of context | Remove from Payments page; keep only on Dashboard and Members page |
| 4 | 🟡 | Instruction banner "To add a payment: open a member → start a membership → then record payment here." is shown on every visit | Show this banner only when the payments list is empty (first time). Once payments exist, remove it. |

---

### Screen 08 — Reports Page

**What I see:** "Reports" heading + subtitle. Full-width black "Export PDF" button at top. "Period" dropdown ("This month"). Date range shown in ISO format: "2026-04-01 to 2026-04-30 (IST)". 4 stat cards in 2×2 grid: Payments 29, Cash ₹32,500, UPI ₹18,300, Total ₹50,800. Then "New members 27" alone (odd placement). "Payments" section heading partially visible.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🟡 | Date range displayed as ISO: "2026-04-01 to 2026-04-30 (IST)" — unfriendly format | Format as: "1 Apr 2026 – 30 Apr 2026 (IST)" |
| 2 | 🟡 | "New members 27" card is alone — the 2×2 grid breaks with an odd number of cards | Either add a complementary stat ("Avg payment: ₹1,752") to pair it, or display it as a full-width card with a horizontal layout |
| 3 | 🟡 | "Export PDF" button is the first thing visible — admin should see data before exporting | Move Export PDF to bottom, or add it as a secondary icon button in the header row alongside "Reports" title |

---
skip screen 9,10,11
---

### Screen 12 — Settings (Notifications & Backup + Global Save)

**What I see:** "Notifications & Backup" section: Backup email address (filled), Gym WhatsApp group link (empty) with "Test" button. One global "Save" black button for the entire settings page. Large empty gap between Save and the Plans section below.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🟡 | Single global "Save" button saves all sections — if admin only changed backup email, they still save everything (risk of overwriting other unsaved changes) | Split into per-section saves: "Save Gym Profile", "Save Payment Details", "Save Notifications" |
| 2 | 🟡 | "Test" button next to WhatsApp link is small with no clear affordance — what does it do? | Label: `↗ Test link` with external link icon. Slightly wider button. |
| 3 | 🟡 | Large empty space between Save button and Plans heading | Reduce gap to normal section spacing (24px), remove visual orphaning |

---

### Screen 13 — Settings (Plans Manager)

**What I see:** "Add plan" form with: Name field (empty), a field containing "1" with NO label visible, Fee (optional) field, "Add plan" button (left-aligned). Plan list: Monthly (Active, "1 months · ₹700", Edit + Deactivate). Quarterly (Inactive, "3 months · —", no action buttons visible).

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🔴 | Duration field in Add Plan shows value "1" with **no label** — admin doesn't know this is months | Add label: `<label>Duration (months)</label>` above the field |
| 2 | 🟡 | "1 months" — grammatical error | Fix: `${d} ${d === 1 ? 'month' : 'months'}` |
| 3 | 🟡 | Inactive plans show no action buttons — can't reactivate Quarterly plan from this screen | Show "Activate" and "Delete" button for inactive plans |
| 4 | 🟡 | "Add plan" button is left-aligned, form fields are full-width | Make "Add plan" button full-width to match form fields |

---

### Screen 14 — New Member Form (Step 1)

**What I see:** "New Member" heading. Step indicator: ① Member (filled) → ② Membership → ③ Payment. Helper text "Mobile and email are required. Other fields are optional." Required info: Full name*, Mobile*, Email (optional). "Save member" fixed button at bottom.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🟡 | Helper text says "Mobile and **email** are required" but the Email field says "(optional)" — direct contradiction | Fix text: "Full name and mobile are required. Email is optional but recommended for sending receipts." |
| 2 | 🟡 | Step labels will truncate on small screens (seen in Screens 17, 18) | Use shorter labels: "Member" → "Info", "Membership" → "Plan", "Payment" → "Pay" — or numbers-only with icons |
| 3 | 🟢 | Red asterisk (*) on required fields — clear | — |
| 4 | 🟢 | Mobile placeholder "98765 43210" with format hint — excellent | — |

---

### Screen 15 — Member Profile (New Member — No Membership)

**What I see:** "Claude test" + GYM-031. Buttons: Edit (small outline) + Start membership (large black filled). Archive member (red outline). "No membership assigned yet" plain text. Teal banner "Next: Start a membership for this member →". PERSONAL section. MEMBERSHIP: Plan "—", Fee paid "—".

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 0 | high | below the member id/name and left of buttons[edit, start membership, archive member] there is empty space | if avaible shows 'photo' of member or else show avator |
| 1 | 🟡 | "No membership assigned yet" plain text sits between Archive button and teal banner — redundant (banner already says the same thing more actionably) | Remove the plain text. The teal banner covers the message and adds action. |
| 2 | 🟡 | Teal banner → arrow is the only tappable area — the whole banner should navigate | Wrap entire banner in `<Link href="...">` |
| 3 | 🟢 | Teal "Next:" banner is an excellent onboarding guide — keep and enhance | Make it pulse subtly (CSS animation) to draw attention |

---

### Screen 16 — Member Profile Scroll (Photo Section)

Same photo section issues as Screen 06 — raw file input, duplicate Upload card visible. Action buttons: WhatsApp, SMS at bottom.

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | 🔴 | Raw browser file input visible again | Same fix as Screen 06 — hide native input |
| 2 | 🔴 | Duplicate Upload card below preview | Remove |

---

### Screen 17 — Save Membership (Step 2)

**What I see:** "Save membership" heading. Step indicator: ✓ Member · ② **Membersh...** (truncated) · ③ Payment. "Member: Claude test." Plan dropdown "Monthly (1 mo) — default ₹700". Fee charged: 700. Blue preview text "Membership will run from 25 Apr 2026 to 25 May 2026 (30 days)". Gray info box "Dates are auto-calculated based on existing active membership (if any)." "Save membership" button.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🔴 | Step 2 label shows as **"Membersh..."** — truncated, unreadable | Rename step to "Plan" — short enough to never truncate |
| 2 | 🟡 | Gray info box "Dates are auto-calculated…" looks like a disabled input field | Restyle as info banner: light blue bg (`bg-blue-50`), info icon, `text-blue-700`, rounded border |
| 3 | 🟢 | Blue real-time date preview is excellent UX — shows exact dates + day count | Keep. Consider making this more prominent (slightly larger font) |

---

### Screen 18 — Payments Step 3 (Add Payment Form)

**What I see:** "Payments" heading. Step indicator: ✓**Mem...** · ✓**Mem...** · ③**Pay...** — all 3 labels truncated. "New Member" button still visible at top. "Add payment" form card: "Member: Claude test · Amount: ₹700", helper text, Cash (black filled) / UPI (QR) (outline) toggle, Notes textarea, "Confirm payment received" button. Below: existing payments table.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🔴 | All 3 step labels show as **"Mem...", "Mem...", "Pay..."** — completely unreadable. The two completed steps are indistinguishable from each other. | Fix immediately: "Info" / "Plan" / "Pay" — or use icons (✓ person, ✓ calendar, 💳 active) |
| 2 | 🟡 | "New Member" button is still visible during the payment step of the onboarding flow — distracting | Hide any CTA buttons not related to the current flow when `?flow=new_member` is present |
| 3 | 🟡 | "Confirm payment received" button label is long and could wrap | Shorten to "Confirm Payment" |
| 4 | 🟢 | Cash/UPI toggle buttons with filled/outline distinction is clear | Add a subtle checkmark or color accent to the selected mode |

---

### Screen 19 — Payment Receipt Page

**What I see:** Receipt number "RCP-2026-0031" as page heading. "Back" button top-right (outline box). "Mode: upi · Amount: ₹700" subtitle. "Receipt email sent ✓" green badge. Receipt card: yellow book icon logo, "SM FITNESS", "Payment Receipt", address, phone. Receipt details: number, date, member name, GYM code, Plan, Duration, Amount, Mode. "Print receipt" button at bottom.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🟡 | **Yellow book icon** is showing as the gym logo on the receipt — this prints on every receipt and looks unprofessional | Fallback: display gym initials ("SM") in a styled circle. Alternatively show a banner with just the gym name when no logo uploaded. Add a prompt: "Add your logo in Settings" |
| 2 | 🟡 | "RCP-2026-0031" as the page `<h1>` heading is confusing — that's the receipt number, not a page title | Change heading to "Payment Receipt" and show the receipt number as a smaller subtitle |
| 3 | 🟡 | WhatsApp actions (Welcome + Share Receipt) are not visible in this scroll — admin has to scroll past the entire receipt card | Move WhatsApp action buttons to appear immediately after the "Receipt email sent ✓" badge, before the receipt card |
| 4 | 🟡 | "Back" button is top-right in a small outline box — inconsistent with the rest of the app navigation | Move to top-left as `← Back` text link, or use consistent `<Button variant="ghost">← Back</Button>` |

---

### Screen 20 — Backup Email (Received in Gmail)

**What I see:** Subject: "SM FITNESS — Member Backup 21 Apr 2026 (22 active members)". Dark blue summary bar: Total 26, Active 22, Expiring this week 0, Expired 1, No plan 3, revenue ₹47,300, Cash ₹29,700, UPI ₹17,600. Table: 8 columns (Name, Mobile, Plan, Expiry, Days Left, Last Paid, Amount, Mode). 3 rows visible with real data and colored rows.

| # | Severity | Issue | Suggested Fix |
|---|----------|-------|---------------|
| 1 | 🟡 | 8-column table is very dense in Gmail mobile — horizontal scrolling is required but not intuitive in email | Reduce to 6 key columns: Name, Mobile, Plan, Expiry, Days Left, Status. Amount/Mode in a separate mini-section or tooltip |
| 2 | 🟡 | No color legend in the email — colors are meaningful (red=expired, amber=expiring) but unexplained | Add a legend below the summary bar: `🔴 Expired  🟡 Expiring soon  🔵 No membership  ⚪ Active` |
| 3 | 🟡 | Row colors must use inline CSS `style=""` attributes for email client compatibility (Gmail strips `<style>` blocks in some cases) | Verify all row colors use `style="background-color: #FEE2E2"` inline, not Tailwind classes |
| 4 | 🟢 | Subject line includes active count — very useful for a quick glance | Enhance: add expired alert when expired > 0: "SM FITNESS — Member Backup 21 Apr 2026 (22 active, ⚠ 1 expired)" |
| 5 | 🟢 | Summary bar with dark background and bold white text is highly readable | — |

---

## Consolidated Improvement Backlog

### 🔴 Critical (Must Fix — Bugs or Broken UI)

| ID | Screen | Issue | Fix |
|----|--------|-------|-----|
| A-C01 | 03 | Member names show as literal "Member" in recent payments | Fix data access: `payment.member.name` not `payment.member` |
| A-C02 | 06, 16 | Raw browser file input "Choose file No file chosen" visible on screen | `hidden` on native input, trigger via `ref.current.click()` from styled button |
| A-C03 | 06, 16 | Duplicate "Upload" card below photo preview | Remove the card entirely |
| A-C04 | 11 | "What is a Code 128 Barcode?" + Triton Store barcode in UPI section | Investigate and remove — wrong library/placeholder rendering |
| A-C05 | 11 | Yellow book icon as gym logo | Fix placeholder: initials circle or camera-icon empty state |
| A-C06 | 07 | Date column wraps to 2 lines ("22 Apr / 2026") | `whitespace-nowrap`, omit year for current year |
| A-C07 | 07, 09 | Member names truncated in payment tables | Full name + GYM code on 2 lines |
| A-C08 | 18 | Step labels all show "Mem..." / "Pay..." — completely unreadable | Rename: "Info" / "Plan" / "Pay" |
| A-C09 | 17 | "Membersh..." step label truncated | Rename step to "Plan" |
| A-C10 | 13 | Duration field in Add Plan has no label | Add "Duration (months)" label |

### 🟡 Medium (Should Fix — UX Quality)

| ID | Screen | Issue | Fix |
|----|--------|-------|-----|
| A-M01 | 01 | Large empty whitespace top and bottom of login | `min-h-screen flex items-center justify-center` |
| A-M02 | 01 | No password show/hide | Add eye icon toggle |
| A-M03 | 02 | "Expiring in 7d" label unclear | Rename "Expiring Soon" |
| A-M04 | 02 | Chart bar is black | Brand accent color |
| A-M05 | 02 | Chart has no x-axis labels | Add month labels |
| A-M06 | 03 | "WA" button is tiny, no icon | Green WhatsApp icon button, 44px minimum |
| A-M07 | 03 | Mode column mixes mode text + arrow | Separate Mode badge from Open arrow |
| A-M08 | 04 | Filter tabs wrap to 2 rows | Single horizontally-scrollable row |
| A-M09 | 04 | "No plan · 22 May 2026" contradictory | Show date only when plan exists |
| A-M10 | 05 | Email truncated off right edge | `break-all` or `truncate` with full value on tap |
| A-M11 | 05 | No back navigation | Add `← Members` breadcrumb |
| A-M12 | 05 | No visual button hierarchy | Primary=filled, Secondary=outline, Destructive=text-red |
| A-M13 | 06 | "No photo" area is a huge empty rectangle | Compact circular avatar placeholder (96px) |
| A-M14 | 06 | "Compressed to < 200KB" in section title | Move to help text below button |
| A-M15 | 06 | Renew mixed with communication buttons | Separate communication vs. operational action groups |
| A-M16 | 07 | "New Member" button on Payments page | Remove |
| A-M17 | 07 | Instruction banner always shows | Only on empty state |
| A-M18 | 08 | ISO date format in period range | "1 Apr 2026 – 30 Apr 2026 (IST)" |
| A-M19 | 08 | "New members" card orphaned | Pair with complementary stat or full-width card |
| A-M20 | 08 | Export PDF before data is visible | Move to bottom or secondary position |
| A-M21 | 09 | Mobile numbers cut off | `overflow-x-auto` on table, scroll hint |
| A-M22 | 10, 12 | No per-section saves | Add save button per section |
| A-M23 | 11 | "Choose File" button unstyled | Match app button style |
| A-M24 | 12 | "Test" button for WhatsApp unclear | Label: `↗ Test link` with icon |
| A-M25 | 13 | "1 months" plural error | `${d === 1 ? 'month' : 'months'}` |
| A-M26 | 13 | Inactive plan has no Activate button | Add "Activate" for inactive plans |
| A-M27 | 14 | Helper text contradicts required fields | Fix text: mobile+name required, email optional |
| A-M28 | 15 | Redundant "No membership" text + banner | Remove plain text |
| A-M29 | 17 | Gray info box looks like disabled input | Restyle as blue info banner |
| A-M30 | 18 | "New Member" button during onboarding flow | Hide when `?flow=new_member` active |
| A-M31 | 18 | "Confirm payment received" label long | Shorten to "Record Payment" |
| A-M32 | 19 | Book icon on receipt | Initials circle fallback + "Add logo in Settings" prompt |
| A-M33 | 19 | "RCP-2026-0031" as page heading | "Payment Receipt" as heading, receipt number as subtitle |
| A-M34 | 19 | WhatsApp actions below fold | Move above receipt card |
| A-M35 | 19 | "Back" button top-right | Move to top-left, `← Back` style |
| A-M36 | 20 | No color legend in backup email | Add legend row below summary bar |
| A-M37 | 20 | 8-column table dense on mobile email | Reduce to 6 key columns |

### 🟢 Nice-to-Have (Polish)

| ID | Screen | Issue | Fix |
|----|--------|-------|-----|
| A-N01 | 01 | No gym logo on login | Add logo from settings |
| A-N02 | 02 | Emoji icons in stat cards | Replace with Lucide SVG icons |
| A-N03 | 04 | Generic person avatar | Colored initials avatar |
| A-N04 | 04 | Archive button same weight as actions | Smaller ghost style with trash icon |
| A-N05 | 15 | Teal banner not fully tappable | Wrap entire banner in `<Link>` |
| A-N06 | 17 | Plan dropdown label long | Simplify: "Monthly · 1 month · ₹700" |
| A-N07 | 20 | Subject doesn't highlight expired | Add "⚠ 1 expired" when expired > 0 |

---

## Design System — Observed State

**What's working:** Consistent card style, bottom nav, heading/subtitle pattern, black primary buttons, status pill badges.

**What needs standardization:**

```
// Step labels — max 6 chars each
Step 1: "Info"    (not "Member")
Step 2: "Plan"    (not "Membership")  
Step 3: "Pay"     (not "Payment")

// Status color tokens (apply consistently everywhere)
Active:   bg-emerald-50 text-emerald-700 border-emerald-200
Expiring: bg-amber-50   text-amber-700   border-amber-200
Expired:  bg-red-50     text-red-700     border-red-200
No Plan:  bg-blue-50    text-blue-700    border-blue-200

// Info banners (replace all gray "info" boxes that look like disabled inputs)
bg-blue-50 border border-blue-200 rounded-md p-3
  <InfoIcon class="text-blue-500 w-4 h-4" />
  <span class="text-blue-700 text-sm">...</span>

// Touch targets — all interactive elements
min-h-[44px] min-w-[44px]

// File inputs — always hidden, always triggered by styled button
<input type="file" className="hidden" ref={fileRef} />
<Button onClick={() => fileRef.current.click()}>Upload</Button>
```

---

*Phase A complete — 20 screens, 10 critical issues, 37 medium issues, 7 nice-to-have improvements identified.*  
*→ Proceed to PHASE_B_CODE_ANALYSIS_REFACTOR.md*
