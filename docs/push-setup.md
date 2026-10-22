# Push Notifications Setup Guide for "Two"

This guide outlines the end-to-end setup required for remote push notifications to deliver reliable message alerts between partners.

---

## 1. Prerequisites and Architecture Overview

Remote push notifications rely on four components:
1. **Physical Devices / APKs**: Push tokens are only generated on physical Android devices running a development build (`expo run:android`) or standalone production APK. Expo Go does not support remote push notifications in SDK 53+.
2. **EAS Project**: Configured via EAS CLI, providing a valid `projectId` linked to the application bundle.
3. **Firebase Cloud Messaging (FCM v1)**: Google Cloud service account key uploaded to the Expo Dashboard to authorise Expo to forward pushes to Android devices via FCM.
4. **Supabase Edge Function (`notify-partner`)**: Triggered via database webhook whenever a row is inserted into `public.messages`.

---

## 2. EAS Project Configuration

1. Log in to EAS:
   ```bash
   npx eas-cli login
   ```
2. Initialize or link your project:
   ```bash
   npx eas-cli init
   ```
3. Set `EAS_PROJECT_ID` in your `.env` file matching the generated UUID:
   ```env
   EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
4. Verify `app.json` contains:
   ```json
   "extra": {
     "eas": {
       "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
     }
   }
   ```

---

## 3. Firebase Cloud Messaging (FCM v1) Credentials

1. Go to the [Firebase Console](https://console.firebase.google.com/) and open or create your project.
2. In **Project Settings** → **General**:
   - Register your Android app with package name `app.twocouple`.
   - Download `google-services.json` and place it in the project root (ensure it is git-ignored).
3. In **Project Settings** → **Service Accounts**:
   - Click **Generate new private key** (JSON format).
4. In the [Expo Dashboard](https://expo.dev/):
   - Navigate to your project → **Credentials** → **Android**.
   - Under **FCM V1 Service Account Key**, upload the private key JSON file downloaded from Firebase.

---

## 4. Deploying the Edge Function

1. Ensure the Supabase CLI is authenticated:
   ```bash
   npx supabase login
   ```
2. Link your remote Supabase project:
   ```bash
   npx supabase link --project-ref <your-project-id>
   ```
3. Deploy the `notify-partner` Edge Function with `--no-verify-jwt`:
   ```bash
   npx supabase functions deploy notify-partner --no-verify-jwt
   ```
4. (Optional) Set an Expo access token if rate limiting or enhanced delivery is required:
   ```bash
   npx supabase secrets set EXPO_ACCESS_TOKEN=your-token-here
   ```

---

## 5. Setting Up the Database Webhook

In your Supabase project dashboard:
1. Navigate to **Database** → **Webhooks**.
2. Click **Create a new hook**:
   - **Name**: `notify-partner-on-message`
   - **Table**: `public.messages`
   - **Events**: Check `Insert` only
   - **Type**: `Supabase Edge Function`
   - **Edge Function**: Select `notify-partner`
   - **HTTP Method**: `POST`
   - **Timeout**: `5000` ms
3. Click **Save**.

Alternatively, create an HTTP trigger using PostgreSQL `pg_net` or database trigger if preferred.

---

## 6. Verifying & Troubleshooting

### Check Push Status inside the App
1. Open the app on a physical Android device.
2. Go to **Settings** → **Notifications**.
3. Confirm **Push status** displays: `Active (token registered)`.
4. Tap **Send test notification** to confirm local notification channels and system permissions are active.

### Test Edge Function Directly via `curl`
```bash
curl -X POST 'https://<your-project-ref>.supabase.co/functions/v1/notify-partner' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <service-role-key>' \
  -d '{
    "type": "INSERT",
    "table": "messages",
    "record": {
      "id": "00000000-0000-0000-0000-000000000001",
      "couple_id": "<your-couple-id>",
      "sender_id": "<sender-user-id>",
      "body": "Test message",
      "deleted_at": null
    }
  }'
```

Expected response:
```json
{
  "ok": true,
  "requested": 1,
  "stale": 0,
  "failures": 0
}
```

### Review Failed Deliveries
If push fails to deliver, inspect the `public.push_failures` table in Supabase SQL editor:
```sql
select * from public.push_failures order by created_at desc limit 10;
```
Common ticket errors:
- `DeviceNotRegistered`: Automatically pruned from `public.push_tokens`.
- `InvalidCredentials` / `SenderIdMismatch`: FCM credentials in Expo Dashboard do not match `google-services.json`.
- `MessageRateExceeded`: Sending messages too quickly in a burst.
