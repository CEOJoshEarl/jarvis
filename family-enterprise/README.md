# Family Enterprise

Run the house like a business. Chores assigned automatically, photo proof, parent approval, points, the Sunday meeting.
The Earl family is the first family; everything is family-scoped so others can sign up later.

## Run it

    npm install
    npm run dev      # http://localhost:5173
    npm test         # scheduling and status rules

Without a database connected it runs in demo mode: data stays on the device.

## Layout

- `src/engine/` — the rules, no UI. `earl.ts` is the Earl plan as data (every chore, the kitchen
  rotation, the weekly rotation, Andrew's tiers). `schedule.ts` turns it into dated tasks.
  `status.ts` decides on time, late, missed and auto-approval.
- `src/screens/` — Today, task proof sheet, Approvals, Family week, More (tier, rotation, settings).
- `supabase/migrations/` — multi-tenant schema with row-level security, the private proof bucket,
  rent and fines tables, push subscriptions.

## Rules in force

- On time: 1 point. Late (after the deadline, before midnight): half. Missed at midnight: zero.
- Josh and Vanilla approve or send back proof. A redo counts as late. Proof nobody reviews by midnight is approved automatically.
- Proof files are deleted after 14 days. Videos are capped at 15 seconds.
- Weekly rotation starts Sunday, Nov 29, 2026, in a random order.

## Build phases

1. Logins, schedule, auto-assignment, proof and approvals  ← this
2. Push reminders and Google Calendar sync
3. Points, leaderboard, penalties, fun account, rent reminders and late fees
4. Votes, weekly notes, Sunday meeting with PDF export
5. Onboarding celebrations, join alerts, Jarvis link and Obsidian vault notes
