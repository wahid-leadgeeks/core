# Vercel Deployment & Google Cloud Integration Guide

This document provides complete instructions for deploying **CORE (Company Operations, Resources & Environment)** to **Vercel**, configuring **Google Workspace OAuth & Drive/Sheets**, and connecting the remote **Aiven PostgreSQL** database.

---

## 1. Remote Database Configuration (Aiven PostgreSQL)

The remote PostgreSQL database is hosted on Aiven and configured with SSL:

```text
postgres://avnadmin:<YOUR_PASSWORD>@pg-d31a2a7-leadgeeksinc-3d9a.c.aivencloud.com:16316/core?sslmode=require
```

### Database Initialization
- The database schema (`0000_core_foundation.sql`), `sheets_sync_logs` table, canonical reference data (Departments, Roles, Domains), and 10-step spreadsheet records are already migrated and seeded.
- During serverless runtime on Vercel, `ensureDbInitialized()` automatically checks and verifies table integrity on startup.
- To run migrations manually at any time:
  ```bash
  npm run db:migrate
  ```
- To run full spreadsheet ingestion and empirical PostgreSQL verification:
  ```bash
  npm run db:import
  ```

---

## 2. Vercel Environment Variables

In your Vercel Project Settings (**Settings → Environment Variables**), add the following:

| Variable Name | Example Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://avnadmin:<YOUR_PASSWORD>@pg-d31a2a7-leadgeeksinc-3d9a.c.aivencloud.com:16316/core?sslmode=require` | Remote PostgreSQL connection string with SSL |
| `NODE_ENV` | `production` | Node environment |
| `APP_URL` | `https://<your-project>.vercel.app` | Base application URL |
| `NEXTAUTH_URL` | `https://<your-project>.vercel.app` | Base auth URL |
| `NEXTAUTH_SECRET` | `core-dev-super-secret-key-min-32-chars-long` | Cookie session signing secret |
| `AUTH_SECRET` | `core-dev-super-secret-key-min-32-chars-long` | Auth secret fallback |
| `CREDENTIAL_ENCRYPTION_KEY` | `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` | 32-byte hex key for AES-256-GCM hardware PIN encryption |
| `GOOGLE_CLIENT_ID` | `your-google-client-id.apps.googleusercontent.com` | Google Cloud OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | `your-google-client-secret` | Google Cloud OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | *(Optional)* | Custom override. If omitted, CORE dynamically matches incoming host and state. |
| `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` | `true` | Enables Google Workspace Sign-In button on `/login` |
| `GOOGLE_SHEETS_ACCOUNTS_ID` | `15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8` | Authoritative Accounts & Groups Google Sheet ID |
| `GOOGLE_SHEETS_DEVICES_ID` | `1ELcKpCCEYXpI2wg3IIKJ0s3XpfdN92tyiyUOe40S_YQ` | Authoritative Hardware Laptop Google Sheet ID |
| `GOOGLE_SHEETS_SOFTWARE_ID` | `1q_pkNgrfDm7F_fQRF2beOxRvQf9XVE3e4MGPVxSmA5M` | Authoritative Software Tools Google Sheet ID |
| `NEXT_PUBLIC_GOOGLE_SHEETS_ID` | `15kx94mT2qekbcBV5BEHZhb7M25O3smM2JYQZT_ydgz8` | Default public sheet ID |

---

## 3. Google Cloud Console Configuration

To allow users to sign in and import spreadsheets from Google on your Vercel deployment:

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project: `onboarding-copilot` / `core`.
3. Ensure the following APIs are enabled:
   - **Google Sheets API**
   - **Google Drive API**
4. Navigate to **APIs & Services → Credentials → OAuth 2.0 Client IDs**.
5. Edit your Web Application OAuth Client ID:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for local development)
     - `https://<your-project>.vercel.app` (your Vercel production domain)
     - `https://<your-custom-domain.com>` (if using a custom domain)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<your-project>.vercel.app/api/auth/callback/google`
     - `https://<your-custom-domain.com>/api/auth/callback/google`
6. Click **Save**.

---

## 4. Google OAuth Scopes & Permissions

CORE requests the following OAuth 2.0 scopes:

- `openid`: OpenID identity token
- `email`: Authenticated Google Workspace user email
- `profile`: User display name and avatar
- `https://www.googleapis.com/auth/spreadsheets`: Bi-directional read & write access to Google Sheets
- `https://www.googleapis.com/auth/drive.readonly`: Read-only access to browse Google Drive and download Excel (`.xlsx`) files

Tokens are encrypted using AES-256-GCM and stored in HTTP-only secure cookies (`core_google_session`).

---

## 5. Opening & Importing Spreadsheets from Google

Navigate to `/sheets` in your CORE application.

### A. Open via URL or ID
1. Paste any Google Spreadsheet link (`https://docs.google.com/spreadsheets/d/...`), Google Drive file link (`https://drive.google.com/file/d/...`), or raw Document ID into the input bar.
2. Click **Open File**.
3. CORE extracts all worksheet tabs, row counts, and cell matrices.

### B. Browse Google Drive
1. Click **Browse Google Drive**.
2. A modal displays recent Google Spreadsheets and Excel (`.xlsx`) files located in your Google Drive.
3. Click **Open File** on any document to load it into the live spreadsheet viewer.

### C. Local Excel Upload
1. Click **Upload .xlsx / .csv**.
2. Select a local spreadsheet file.
3. CORE parses the sheets instantly in the browser and displays them in the interactive viewer.

### D. Ingesting into PostgreSQL Database
1. When a spreadsheet is open in the viewer, select the target domain:
   - **Full Ingestion (All Domains)**: Imports Accounts, Groups, Devices, and Software.
   - **Identity (Accounts & Groups)**: Ingests user directory and distribution lists.
   - **Assets (Hardware Laptops)**: Ingests laptops, specifications, and encrypted PIN credentials.
   - **Software (Apps & Subscriptions)**: Ingests application catalog and licensing tiers.
2. Click **Import into PostgreSQL**.
3. CORE executes the atomic transaction and generates an immutable audit log and sync log entry.
