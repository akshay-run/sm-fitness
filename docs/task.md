I'm building a gym admin PWA called **SM FITNESS** (Next.js / React, deployed on Vercel). I'm attaching screenshots of all current screens. Please do a full audit and implement the following improvements:

---

### 1. Performance & Loading
- Add **skeleton loaders** on every page (Dashboard stats cards, Members list, Payments list, Reports table) so the UI doesn't feel blank while fetching.
- Implement **SWR or React Query** for data fetching with caching and background revalidation to reduce perceived load time.
- Add `loading.tsx` route-level loading states for Next.js app router.
- Lazy load heavy components (photo preview, receipt modal).

---

### 2. Login Page
- Add a **"Forgot password?"** link below the Sign In button.
- Show a loading spinner on the Sign In button while authenticating.

---

### 3. Dashboard
- Add a **mini bar/line chart** inside the Revenue card showing last 6 months revenue trend (use Recharts or Chart.js).
- The "Expiring in 7d" card should be **clickable** and navigate directly to the filtered members list.

---

### 4. WhatsApp Reminder Message (Critical)
When admin clicks the **WhatsApp** button on a member card or from the expiring members list, open WhatsApp with a **pre-filled message** using `https://wa.me/<mobile>?text=<encoded_message>`.

The message should be:
```
Hello [Member Name] 👋

This is a reminder from *SM FITNESS* 🏋️

Your gym membership is expiring on *[Expiry Date]*.

Please renew before it expires to continue your fitness journey without interruption 💪

For renewal, contact us or visit the gym.

Thank you!
— SM FITNESS Team
```
- Also add a **"Send bulk reminder"** button on the Dashboard's "Expiring in 7 days" section that opens WhatsApp/SMS for each expiring member one by one with the same pre-filled message.

---

### 5. Reports Page — Major Improvements
- Remove reliance on any backend-generated export warnings or banners. Build the entire Reports section from scratch on the frontend.
- Add a **dropdown to select export scope**: This Month / Last Month / This Quarter / Last Quarter / All Time.
- Based on selection, show a summary table with: payment count, cash total, UPI total, grand total, and a full payments list (member name, date, plan, amount, mode).
- Add **Export as PDF** button — generates a clean PDF with gym name, selected period, summary stats, and payments table.
- Add **Export as Excel/CSV** button for the selected period.
- Add a **plan-wise breakdown** table: members per plan and revenue per plan.
- Add a **member growth chart** (total members per month, using Recharts or Chart.js).
- in report we can also add how many new member are joined and if needed then not coming members

---

### 6. Member Detail Page
- Add a **membership history** section below current membership — show past memberships with plan, duration, fee, date.
- Add a **confirmation dialog** ("Are you sure you want to deactivate this member?") before the Deactivate action executes.
- Show member's **age** calculated from DOB if available.

---

### 7. Create Membership
- Show plan options clearly in the dropdown with duration and default price as hint text.
- Dates remain auto-calculated (no manual override needed).

---

### 8. Gym Settings Page (New Page)
Add a **Settings** page accessible from the Menu with:
- Gym name, address, phone number
- UPI ID and a UPI QR code upload (displayed on the payment screen and receipt)
- Logo upload (shown on receipts)
- Plan management: add / edit / delete plans (name, duration in months, default price)

---

### 9. Receipt
- Include **gym address and phone** in the receipt card.
- If a gym logo is configured in Settings, display it at the top of the receipt.

---

### 10. General UX Polish
- Add **toast notifications** for all success/error actions (member created, payment recorded, membership assigned, etc.) using `react-hot-toast` or `sonner`.
- All destructive action buttons (Deactivate) must be red and always show a confirmation dialog before executing.
- Add proper **empty state UI** (icon + message) when member list is empty, no payments exist, or no data for selected report period.
- Ensure all pages have proper `<title>` meta tags for PWA compliance.

---
###11. Add Member Form — Field Audit

Review the current Add Member form  and make the following changes:

**Make Required (currently marked optional but must be required):**
- `Email` — must be required, not optional. The app already sends payment receipts via email, so collecting it at registration is critical. Update label from "Email (optional)" to "Email *" and add validation.

**Remove these fields entirely (unnecessary complexity for a small gym):**
- `Emergency contact name` — not relevant for a gym admin fees app, adds friction during registration
- `Emergency contact phone` — same reason, remove

**Keep as optional (these are fine as-is):**
- Date of birth (optional) — useful for showing member age on profile
- Gender (optional)
- Address (optional)
- Admin notes (optional)

**Add these new fields:**
- `Blood Group (optional)` — dropdown (A+, A-, B+, B-, O+, O-, AB+, AB-). Useful gym safety info, commonly collected during gym registration in India.
- `Joining Date` — should default to today but be editable. Currently the system auto-sets "Member since" to creation date which is correct, but make this field visible on the form so admin can backfill older members with their actual joining date.

**Form UX improvements:**
- Show a progress hint like "Step 1 of 1 — Basic Info" since the form is long and scrollable
- Group fields visually into two sections: **Required Info** (name, mobile, email) and **Additional Info** (DOB, gender, address, blood group, admin notes) with a subtle divider
- "Create member" button should be sticky at the bottom on mobile so the user doesn't need to scroll to find it

### 12. Testing — Automated Test Suite
Create a proper automated testing setup for this project. This is a production-level gym management PWA so testing must be thorough.

**Setup:**
- Use **Vitest** (or Jest) for unit and integration tests
- Use **React Testing Library** for component tests
- Use **Playwright** for end-to-end (E2E) tests

**Write test files for the following:**

Unit / Integration Tests:
- Auth: login with valid credentials, login with invalid credentials, logout
- Dashboard: stats cards render correct values, revenue chart renders, expiring members section shows correct count
- Members: add member form validation (name required, mobile 10 digits required), member list renders, search by name/mobile works, active/inactive filter works
- Member Detail: membership history renders, deactivate confirmation dialog appears before action, WhatsApp link generates correct pre-filled URL with correct member name and expiry date
- Create Membership: plan dropdown renders options, fee field accepts numeric input, submit creates membership correctly
- Payments: payment list renders with correct date/mode/amount, record payment marks as paid, receipt generates with correct data
- Reports: export scope dropdown works, PDF export triggers download, CSV export triggers download, plan-wise breakdown table renders correctly
- Settings: gym name/address/phone save correctly, plan add/edit/delete works

E2E Tests (Playwright):
- Full flow: Login → Add member → Assign membership → Record payment → View receipt
- Full flow: Login → Go to Members → Search member → Open → Send WhatsApp reminder (verify correct URL is generated)
- Full flow: Login → Go to Reports → Select "This Month" → Export PDF
- Login failure with wrong credentials shows error
- Logout redirects to login page

**Also generate a `README-testing.md`** that explains how to run unit tests, integration tests, and E2E tests locally and in CI.

---

Please go through all attached screenshots to understand the existing UI structure, pages, and design language. Keep the existing **black and white minimal design** consistent across all new additions and changes.