# Certificate Desk Deployment Guide (Vercel + Neon + Vercel Blob)

This guide walks through deploying the project on Vercel using a Neon PostgreSQL database and Vercel Blob storage.

---

## 1. Prerequisites

- Node.js 18+ and npm installed locally.
- GitHub repository containing the project (root folder: `autocertificate/`).
- Accounts for **Neon** (PostgreSQL) and **Vercel**.

Install dependencies locally once:

```bash
npm install
```

---

## 2. Database Setup (Neon)

1. Sign in at [https://neon.tech](https://neon.tech) and create a new project.
2. Note the generated connection string (will be used as `DATABASE_URL`).
3. Open the Neon SQL editor and run the schema located at `database/neon-schema.sql` to create the required tables.

---

## 3. Enable Blob Storage (Vercel)

1. In the Vercel dashboard, open your project (or create a new one).
2. Navigate to **Storage → Blob** and create a store.
3. Generate a **Read/Write token** and save it. This will be used as `BLOB_READ_WRITE_TOKEN`.

---

## 4. Configure Environment Variables

In Vercel, go to **Project → Settings → Environment Variables** and add:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Neon connection string (`postgres://user:password@host:port/database?sslmode=require`). |
| `BLOB_READ_WRITE_TOKEN` | Read/write token from Vercel Blob. |
| `SMTP_HOST` | SMTP server hostname. |
| `SMTP_PORT` | SMTP port (e.g., `587`). |
| `SMTP_SECURE` | `true` for TLS (e.g., `465`), otherwise `false`. |
| `SMTP_USER` | SMTP username or API key. |
| `SMTP_PASSWORD` | SMTP password or API key secret. |
| `EMAIL_FROM` | Default sender, e.g., `"Certificates Desk <no-reply@example.com>"`. |
| `CERT_TEXT_X`, `CERT_TEXT_Y`, `CERT_FONT_SIZE`, etc. | Optional placement defaults defined in `.env.example`. |

> Tip: copy `.env.example` to `.env` locally during testing and fill in these values.

---

## 5. Deploy to Vercel

1. Connect your GitHub repository to Vercel.
2. When prompted for project settings:
   - **Framework Preset**: `Other`.
   - **Project Root**: `autocertificate`.
   - **Install Command**: `npm install` (default).
   - **Build Command**: leave blank (Vercel uses `@vercel/node` for `server.js`).
   - **Output Directory**: leave blank.
3. Trigger the first deployment.

`vercel.json` already maps the `/api` and static routes for the serverless function.

---

## 6. Post-Deployment Checks

After the build succeeds:

1. Upload a certificate template via the UI.
2. Import participants (CSV or Excel) to ensure Neon is reachable.
3. Generate certificates and verify:
   - Files open/download correctly (served from Vercel Blob).
   - Emails arrive with PDF attachments.
4. Export CSV / Excel from the certificates dashboard; links should resolve using the deployed domain.

---

## 7. Local Development Notes

- To run the server locally, supply the same environment variables in a `.env` file.
- Neon supports branching; you can create a development branch and update `DATABASE_URL` accordingly.
- Vercel Blob usage is automatically bypassed when `BLOB_READ_WRITE_TOKEN` is not present; in that case files are stored under the local `storage/` directory.

---

## 8. Troubleshooting

| Issue | Resolution |
| --- | --- |
| `ECONNREFUSED` / database errors | Verify `DATABASE_URL` and Neon IP allow list. |
| Upload succeeds locally but not in production | Ensure the Blob token is set and not expired. |
| Emails not sending | Check SMTP credentials and firewall, and review Vercel logs. |
| Certificate links broken | Confirm `buildCertificateUrl` in controllers returns full HTTPS URLs (requires correct `req` host headers). |

---

Deployment is now ready. For any updates, redeploy by pushing changes to the linked branch or using the Vercel CLI.
