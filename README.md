# 💬 Two — a private space for two

[![React Native](https://img.shields.io/badge/React_Native-Expo_Router-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Android](https://img.shields.io/badge/Android-8.0+-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://www.android.com/)
[![Status](https://img.shields.io/badge/Status-Not_Yet_Deployed-orange?style=for-the-badge)]()
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

A small Android application for exactly two people: a private one-to-one chat and a shared calendar, backed by a hosted Supabase project on the free tier.

**Status:** complete application source, database migrations, Row Level Security policies, automated unit tests, and pgTAP database tests. It has not been run against a live Supabase project or on physical devices from this environment — see [What has and has not been verified](#what-has-and-has-not-been-verified).

## Table of Contents

- [Architecture](#architecture)
- [Security Model](#security-model)
- [Zero-Cost Assessment](#zero-cost-assessment)
- [Setup](#setup)
- [What has and has not been verified](#what-has-and-has-not-been-verified)
- [Manual Verification Procedure](#manual-verification-procedure)
- [Known Limitations](#known-limitations)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Remaining Manual Steps](#remaining-manual-steps)
- [Contributing](#contributing)
- [License](#license)

---

## Architecture

```
┌──────────── Android phone A ────────────┐        ┌──────────── Android phone B ────────────┐
│                                          │        │                                          │
│  Expo Router screens                     │        │  Expo Router screens                     │
│        │                                 │        │        │                                 │
│  Repository layer (SQLite)               │        │  Repository layer (SQLite)               │
│        │                                 │        │        │                                 │
│  ┌─────▼──────────┐   ┌───────────────┐  │        │  ┌─────▼──────────┐   ┌───────────────┐  │
│  │ SQLite(SQLCipher)│  │ outbox queue  │  │        │  │ SQLite(SQLCipher)│  │ outbox queue  │  │
│  └────────────────┘   └───────┬───────┘  │        │  └────────────────┘   └───────┬───────┘  │
│                               │          │        │                               │          │
└───────────────────────────────┼──────────┘        └───────────────────────────────┼──────────┘
                                │  HTTPS (anon key, RLS enforced)                   │
                                ▼                                                    ▼
            ┌──────────────────────────────────────────────────────────────────────────┐
            │  Supabase (hosted, free tier, always on, not your hardware)              │
            │                                                                          │
            │  Postgres + RLS ── SECURITY DEFINER RPCs (writes)                       │
            │  Realtime ──────── hint only, delivery not guaranteed                   │
            │  Edge Function ─── notify-partner → Expo Push API                       │
            └──────────────────────────────────────────────────────────────────────────┘
```

### Why not peer-to-peer

Direct P2P fails three of the requirements:

| Requirement | Hosted backend | P2P |
|---|---|---|
| Sync while one phone is offline | Server holds the row | Impossible — no third party stores it |
| Notifications while the app is closed | Edge Function → Expo Push | Needs an always-on relay |
| Works across mobile networks / CGNAT | Public HTTPS endpoint | Needs STUN/TURN relay |

A hosted free tier is the always-on third party. No device you own needs to be powered on. That is the distinction that satisfies "no personal server".

### The synchronisation model

Local-first, with the server as the authority:

1. A message or event is written to SQLite **and** to the outbox in one `withExclusiveTransactionAsync` transaction — it can never appear in the UI without being queued for sync.
2. The outbox drains through an idempotent RPC. The primary key is a client-generated UUID, so a retry after a timeout upserts the same row instead of creating a duplicate.
3. A pull loop reconciles against the server on launch, on foreground, every 30 seconds while active, and whenever a Realtime event arrives.
4. **Realtime is a hint, never a transport.** Delivery is best-effort, and under RLS `payload.old` carries only the primary key — conflicts are resolved by re-fetching the row and comparing `updated_at`, never from the event payload.

### Honest message states

| State | Meaning |
|---|---|
| `pending` | Stored on this device, not yet confirmed by the server |
| `sent` | The server confirmed the row is persisted |
| `failed` | Retryable failure, shown with a retry control |

There is no "delivered" state. A successful push ticket is not proof the recipient's phone displayed anything.

---

## Security Model

**End-to-end encryption is not implemented.** The Supabase project operator, and anyone with database or administrative access, can technically read message content.

What is implemented:

- TLS for all network traffic
- Encryption at rest by the database provider
- **SQLCipher** on the device — a lost phone does not expose a plaintext chat database
- Strict RLS on every table, with grants reviewed separately from policies
- All writes go through `SECURITY DEFINER` RPCs that re-validate membership and sender identity themselves
- No message content in push payloads, logs, or crash reports
- No analytics, no advertising SDKs, no third-party tracking
- The `service_role` key is never in the app bundle

### Why grants and policies are both checked

They are two independent gates. A grant decides whether a role may touch the table at all (failure raises `42501` before any policy runs); a policy decides which rows. Adding a policy never revokes an existing grant, and new tables in `public` can arrive with `anon` privileges already granted. Every migration therefore does:

```sql
revoke all on public.messages from anon;
grant select on public.messages to authenticated;   -- writes go through RPCs only
alter table public.messages enable row level security;
-- then policies
```

### Why a `SECURITY DEFINER` helper exists

A policy on `messages` that reads `couple_members`, plus a policy on `couple_members` that reads `couples`, produces:

```
42P17  infinite recursion detected in policy for relation
```

and every query fails for both partners. `public.is_couple_member(uuid)` breaks the cycle by running as `postgres` (which has `BYPASSRLS`). It is declared with `set search_path = ''`, fully schema-qualified names, and `execute` granted only to `authenticated`. Those are security requirements, not style.

### Pairing

1. User A creates an account and calls `create_couple()`.
2. `create_invitation()` returns a 24-byte random code **once** — only its SHA-256 hash is stored. It expires in 48 hours and can be revoked.
3. User B calls `redeem_invitation(code)`. The function locks the invitation row, takes a per-couple advisory lock, then checks used/revoked/expired and that the space still has fewer than two members — all inside one transaction.
4. A third account cannot join: `couple_members` has a unique index on `user_id`, and the RPC refuses a space that already has two members.
5. Malformed and unknown codes return the same error, so redemption cannot be used to probe which codes exist.

### Recovery

- **Forgot password:** not recoverable in this build — no reset email is configured. Keep the password safe.
- **New phone:** sign in with the same credentials; history is re-downloaded.
- **Lost account:** the space is lost. There is no transfer flow in v1. This is the deliberate tradeoff between easy recovery and keeping the space restricted to two people.

---

## Zero-Cost Assessment

Every figure below is a hard limit that returns errors or pauses the project.

### Supabase Free

| Resource | Free limit | Impact here |
|---|---|---|
| Database size | 500 MB | ~1–2M short messages — not a constraint for two people |
| Egress | 5 GB / month | Text payloads; generous by orders of magnitude |
| Edge Function invocations | 500,000 / month | A few hundred messages/day is negligible |
| Realtime connections | 200 concurrent | You need 2 |
| Monthly active users | 50,000 | You need 2 |
| Active projects | 2 | You need 1 |
| **Inactivity pause** | **after 7 days** | The one real risk — see below |

**The 7-day pause** is the only free-tier behaviour likely to bite. If neither partner opens the app for a week, the project pauses and wakes on the next request (a latency blip, not data loss). Optional mitigation, at zero cost, entirely inside Supabase:

```sql
-- Run once in the SQL editor (pg_cron is available on the free tier).
select cron.schedule(
  'keepalive',
  '0 3 */5 * *',          -- every 5 days
  $$ select 1 from public.couples limit 1; $$
);
```

Do not add an external uptime monitor for this — it introduces an account and a dependency for a problem the database can solve itself.

### Expo Free

| Resource | Free limit |
|---|---|
| EAS Build | 15 Android + 15 iOS builds / month, low-priority queue |
| Push notifications | Free, 600/second per project |

Fifteen Android builds is enough to ship but tight during iteration. Use `npx expo run:android` locally (unlimited) for day-to-day work and reserve EAS builds for the installable APK.

### Costs that would appear only if you deviate

| Deviation | Cost |
|---|---|
| > 500 MB database, > 2 projects | Supabase Pro, $25/mo |
| iOS distribution | Apple Developer Program, $99/yr |
| Public Play Store listing | Google Play Console, $25 one-time |

None are triggered by this app. Sideloading an APK needs no Play account.

> Zero cost is a current property of the free tiers, not a guarantee. Provider terms, quotas and inactivity policies change. Re-check before relying on these numbers long-term.

---

## Setup

### Prerequisites

- Node.js 20 or newer
- Android Studio (for a local build) **or** an Expo account (for an EAS cloud build)
- Two physical Android phones — push notifications do not work on emulators
- The Supabase CLI: `npm i -g supabase`

### 1. Create the backend

```bash
# Create a project at https://supabase.com/dashboard (free plan, no card required)
# Then link this repository to it:
supabase login
supabase link --project-ref <your-project-ref>

# Apply the migrations (schema, RLS, RPCs, realtime publication)
supabase db push

# Verify the security policies work correctly
supabase test db
```

`supabase test db` runs the four pgTAP suites in `supabase/tests/`. **Do not continue until they pass.** They assert that a third account sees nothing, that an expired or reused invitation is refused, that a client cannot `INSERT` into `messages` directly, and that a partner cannot modify a private event.

### 2. Configure the app

```bash
cp .env.example .env
```

Fill in from **Project Settings → API**:

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

> Use the **anon / publishable** key. Never the `service_role` key — it bypasses RLS.

```bash
npm install
npx expo install --fix     # reconciles every package against the installed SDK
eas init                   # creates the EAS project; copy the id into EAS_PROJECT_ID
```

### 3. Build and install on both phones

Push notifications require a development or preview build. Expo Go does not support remote push from SDK 53 onward, and on older SDKs it silently uses Expo's own credentials — which hides missing FCM configuration until the first real build.

```bash
# One-time: create a Firebase project, generate an FCM V1 service account key,
# then upload it to Expo.
eas credentials            # Android → Google Service Account → upload the JSON key

# Build the installable APK
eas build --profile preview --platform android
```

Download the resulting `.apk` on each phone and install it. You will need to allow "install unknown apps" for the browser or file manager you use.

### 4. Enable message notifications

Deploy the function:

```bash
supabase functions deploy notify-partner --no-verify-jwt
```

Create the webhook in **Dashboard → Database → Webhooks**:

- Table: `messages`
- Events: `INSERT`
- Type: Supabase Edge Function
- Function: `notify-partner`

The function needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, which the platform injects automatically. `EXPO_ACCESS_TOKEN` is optional (only if you enable Expo push security).

### 5. Pair the two phones

1. **Phone A:** create an account → *Create our space* → *Generate invitation code*
2. Send the code to Phone B (copy or use the Share button)
3. **Phone B:** create an account → *I have an invitation* → paste the code → Join
4. Both phones now show the same chat and calendar

### 6. Run the automated tests

```bash
npm run typecheck     # tsc --noEmit, strict mode
npm test              # jest unit tests
supabase test db      # pgTAP database and RLS tests
```

---

## What has and has not been verified

### Written and reviewed

- Database migrations, RLS policies, grants, `SECURITY DEFINER` helpers, RPCs
- pgTAP test suites for membership, invitations, messages, and events
- Local SQLite schema, migrator, repositories, outbox, sync engine
- Jest tests for backoff, conflict resolution, date/DST handling, error redaction, reminder scheduling
- All screens, the design system, and the Edge Function

### Not verified in this environment

| Item | Why |
|---|---|
| `supabase test db` passing | Requires a linked live project or a local Docker stack |
| `npm test` output | Requires `npm install` to complete |
| `tsc --noEmit` clean | Same |
| EAS build succeeding | Requires an Expo account and FCM credentials |
| SQLCipher working on device | Must be confirmed on the built APK |
| Two-device end-to-end flow | Requires two physical phones |

Nothing in this document claims those steps have been run. Run them, and treat any failure as real.

---

## Manual Verification Procedure

Work through this in order. Every step is observable.

| # | Step | Expected |
|---|---|---|
| 1 | Install the APK on both phones | App launches to sign-in |
| 2 | Phone A: sign up, create space, generate code | A long code is shown once |
| 3 | Phone B: sign up, redeem the code | Both phones show the same empty chat |
| 4 | Phone B: try to redeem the same code again with a new account | Rejected: already used / space full |
| 5 | Phone A sends "hello" | Appears immediately as pending, then sent |
| 6 | Phone B | Message appears within a few seconds |
| 7 | Phone B replies | Phone A receives it |
| 8 | Phone A creates an event for tomorrow | Visible on both calendars |
| 9 | Phone B edits the event title | Phone A shows the new title |
| 10 | Phone A creates a private event | Phone B never sees it, even after sync |
| 11 | Phone A: airplane mode, send "offline" | Appears with a pending clock icon |
| 12 | Phone A: still offline, edit an event | Saved locally, marked waiting |
| 13 | Phone A: disable airplane mode | Message and event sync — no duplicates |
| 14 | Kill both apps, reopen | History and events are still there |
| 15 | Phone B: uninstall, reinstall, sign in | History re-downloads |
| 16 | Phone B is backgrounded; Phone A sends a message | Generic "New message" push — no text in the notification |
| 17 | Tap the notification | Opens the chat |
| 18 | Set an event reminder 10 minutes out, close the app | Local notification fires with no network |
| 19 | Third account attempts to read the couple via the API | Returns zero rows |

Step 19 can be done with `curl` using the anon key and a third account's JWT — it must return an empty array, not an error and not data.

---

## Known Limitations

1. **No end-to-end encryption.** The operator can read messages. Stated in the app's Settings screen and here.
2. **No password reset.** Supabase's reset flow requires configuring email delivery — deliberately out of scope for v1. Keep the password safe.
3. **No account transfer.** Losing the account loses the space.
4. **No recurring events.** Correct recurrence with exceptions and per-instance time zones is a project in itself; v1 prioritises reliability.
5. **Text-only chat.** No attachments, voice notes, reactions, typing indicators, or read receipts.
6. **No event editing UI.** Create and delete are implemented; the RPC supports editing and a partner may edit shared events through it, but there is no edit screen yet. This is the most visible gap.
7. **7-day inactivity pause** unless the optional `pg_cron` keepalive is enabled.
8. **Push is best-effort.** Aggressive Android battery optimisation (Xiaomi, Huawei, Samsung) can delay delivery — `dontkillmyapp.com` is the relevant reference.
9. **No iOS build.** Android only, as specified.

---

## Project Structure

```
app/                          # Expo Router routes
  (auth)/                     # Sign-in, sign-up
  (onboarding)/               # Create space, join with code
  (app)/(tabs)/               # Home, chat, calendar, settings
  (app)/event/                # New event, event detail
src/
  auth/AuthProvider.tsx       # Session and membership context
  sync/                       # Engine, remote port, realtime, backoff, merge
  db/                         # SQLite schema, migrator, repositories, outbox
  components/                 # Design system
  theme/                      # Tokens and provider (light/dark)
  notifications/              # Local reminders, push registration
  utils/                      # Date/DST, error redaction
  __tests__/                  # Jest unit tests
supabase/
  migrations/                 # Schema → membership → RLS → RPCs → realtime
  functions/notify-partner/   # Edge Function (generic push payload)
  tests/                      # pgTAP RLS suites
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Partner sees no realtime updates, no errors | Table not in the `supabase_realtime` publication | Migration `0005` handles it — verify in Dashboard → Database → Publications |
| `42P17 infinite recursion detected in policy` | A policy subqueries `couple_members` directly | Route it through `is_couple_member()` |
| `42501` on a query the policy should allow | Missing grant | Check `grant select on ... to authenticated` |
| Push works in dev, silent in the release build | Expo Go used Expo's credentials | Upload the FCM V1 key via `eas credentials` |
| First message after opening is missed | Write landed in the gap between `SUBSCRIBED` and the listener | The 30-second pull loop and foreground reconcile cover it |
| Duplicate messages | Upsert missing `ON CONFLICT (id)` | All writes go through the RPC — verify the migration applied |
| All-day event on the wrong day | Stored as `timestamptz` | The schema's `CHECK` constraint prevents this — verify the migration |
| App crashes on launch with SQLCipher enabled | Old `expo-sqlite` | `npx expo install --fix` — then test the built APK |
| `getExpoPushTokenAsync` hangs | Missing `projectId` | Set `EAS_PROJECT_ID` and run `eas init` |

---

## Remaining Manual Steps

1. Create the Supabase project and run `supabase db push` + `supabase test db`
2. Fill in `.env` with the URL and anon key
3. `eas init`, then upload an FCM V1 service account key with `eas credentials`
4. `eas build --profile preview --platform android`
5. Install the APK on both phones and pair
6. Deploy `notify-partner` and create the `messages` INSERT webhook
7. Optionally schedule the `pg_cron` keepalive

Everything else is in this repository.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes with a clear message
4. Open a Pull Request

For bugs or questions, open an [Issue](https://github.com/mirconegri/two/issues). When reporting a sync or push issue, include your device model, Android version, and whether the failure is reproducible offline.

### Author

**Mirco Negri** — Computer Science @ UniTrento

[![Portfolio](https://img.shields.io/badge/Portfolio-00599C?style=for-the-badge&logo=globe&logoColor=white)](https://mirconegri.com)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/mirconegri)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/mirco-negri-263810225)
[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:mirconegri06@gmail.com)

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.