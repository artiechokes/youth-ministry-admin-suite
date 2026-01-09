# Youth Ministry Admin Suite

This is a fresh Next.js (App Router) app with Prisma + NextAuth. The first focus is the teen registration flow and an admin roster.

## Getting Started

1. Update `.env` with your Postgres `DATABASE_URL`.
2. Run migrations and seed an admin user:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

Default seed credentials (change via env vars before running the seed):
- `ADMIN_EMAIL` (default: `admin@example.com`)
- `ADMIN_PASSWORD` (default: `admin123`)
- `ADMIN_USERNAME` (default: email prefix)

## Current Features

- Teen registration form at `/register`.
- Admin login at `/admin/login`.
- Admin roster list at `/admin/roster` with search/filter.
- Teen detail editing with audit logs.

## Next Steps

We will add parent verification, form builder, attendance kiosk, events, weekly challenge manager, prayer requests, and parent portal workflows.
