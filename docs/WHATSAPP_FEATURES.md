# SM FITNESS — WhatsApp Features

## How it works

All WhatsApp actions use **deep links** (`wa.me`). There is no WhatsApp Business API, no extra cost, and no provider signup. The admin taps a button, WhatsApp opens with a **prefilled message**, and the admin taps **Send**.

## Available actions

1. **Send Welcome (one-time per member)**  
   - Shown on the **payment receipt** screen after a payment is recorded, when the member has at least one membership and **`welcome_wa_sent`** is false.  
   - After the link is used, the app sets **`welcome_wa_sent`** to true so the buttons are replaced by **Welcome sent ✓**.  
   - If **Settings → Gym WhatsApp group link** is set, the message includes that line.

2. **Send Receipt**  
   - On the payment receipt screen: share receipt details (receipt number, plan, dates, amount).

3. **Send Reminder**  
   - From the member list, member profile, dashboard renewal table, or bulk tools.  
   - Wording depends on days until expiry or if already expired.

## Setup

- Add the gym **WhatsApp group invite** under **Settings → Notifications & Backup**.  
- Use the **Test** button next to the field to open the link in a new tab and confirm it works before sharing with members.
