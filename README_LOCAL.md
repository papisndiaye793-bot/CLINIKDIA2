# ClinikDia — Local development

This workspace is configured for local development with a Vite frontend and a NestJS + Prisma backend.

Quick start (macOS / Linux):

1. Install dependencies

```bash
# Frontend
npm --prefix . install
# Backend
npm --prefix server install
```

2. Start backend (development, watches files) — uses local SQLite `server/dev.db`:

```bash
# from repo root
npm --prefix server run prisma:generate
npx prisma db push --schema server/prisma/schema.prisma
npm --prefix server run seed
npm --prefix server run start:dev
```

3. Start frontend

```bash
npm run dev
# open http://localhost:5180
```

Notes
- The frontend proxies `/api` to `http://localhost:3001` (see `vite.config.ts`).
- Seeded admin account: `b.camara@clinikdia.sn` / `Admin1234`. Change the password on first login.
- DB in this local setup is SQLite at `server/dev.db` (convenient for local dev). Adjust `server/.env` to use PostgreSQL in production.

Files changed during integration:
- `src/lib/api.ts`
- `src/components/Layout.tsx`
- `server/.env` (points to `file:./dev.db`)
- `server/prisma/schema.prisma` (adapted for local dev)
- `server/prisma/seed.ts` (serialize permissions)

If you want I can commit these changes and push to a remote branch.