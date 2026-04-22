# AG Rental — Three-Tier Equipment Rental App

A three-tier application for an equipment rental company.

- **Tier 1** — React + Vite frontend (`frontend/`), deploy to **Vercel**
- **Tier 2** — Node.js + Express REST API (`backend/`), deploy to **Railway**
- **Tier 3** — PostgreSQL managed database, deploy to **Railway**

Three user roles:

- **Client** — rent equipment, schedule inspections, make payments, file repair claims
- **Admin** — manage equipment, inspections, payments, repair claims
- **Mechanic** — view equipment list, handle repair claims

---

## Quick start (local dev, Docker)

You need Docker Desktop running.

```bash
cp .env.example .env
docker compose up --build
```

Then:

- Web: <http://localhost:5174>
- API: <http://localhost:4001>
- Postgres: `localhost:5433` (user `rental`, password `rental`, db `rental`)

Ports are read from `.env` (`WEB_PORT`, `API_PORT`, `DB_PORT`). Change them there if you still have a conflict.

Migrations run automatically on API boot. The single admin account is auto-created on first boot with the credentials from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults: `admin@ag-rental.local` / `admin123`).

**Default accounts:**

- **Admin** — one only, seeded automatically. Log in at `/login` with the `ADMIN_*` credentials. Admins cannot be created through the UI.
- **Clients** — self-register via the **Register** link in the top right.
- **Mechanics** — created by the admin from `/admin/mechanics`.

---

## Quick start (local dev, no Docker)

```bash
# 1. Postgres
createdb rental
psql rental < backend/migrations/001_init.sql

# 2. Backend
cd backend
cp .env.example .env   # edit DATABASE_URL / JWT_SECRET
npm install
npm run dev

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

---

## Deployment

### Database — Railway Postgres

1. Create a new Railway project → **Add a service** → **Database** → **PostgreSQL**.
2. Copy the `DATABASE_URL` connection string from the Variables tab.
3. Open Railway's **Data** tab for the DB and run the SQL from `backend/migrations/001_init.sql`, **or** `psql $DATABASE_URL < backend/migrations/001_init.sql` from your machine.

### API — Railway Node service

1. In the same Railway project → **Add a service** → **GitHub repo** (or **Empty service** + deploy from CLI).
2. Set the **root directory** to `backend/`.
3. Set environment variables:
   - `DATABASE_URL` — link from the Postgres service (Railway variable reference)
   - `JWT_SECRET` — long random string
   - `CORS_ORIGIN` — your Vercel URL, e.g. `https://ag-rental.vercel.app`
   - `PORT` — Railway sets this automatically; the app reads it
4. Build/start commands are in `package.json` (`npm install` / `npm start`).
5. Once deployed, note the public URL (e.g. `https://ag-rental-api.up.railway.app`).

### Frontend — Vercel

1. Import the repo in Vercel.
2. Set the **root directory** to `frontend/`.
3. Build command: `npm run build` — output directory: `dist`.
4. Environment variable:
   - `VITE_API_URL` — your Railway API URL (e.g. `https://ag-rental-api.up.railway.app`)
5. Deploy. Vercel will give you a URL; put that URL into the API's `CORS_ORIGIN` variable and redeploy the API.

---

## Project layout

```
.
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── migrations/001_init.sql
│   └── src/
│       ├── server.js
│       ├── db.js
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js
│           ├── equipment.js
│           ├── rentals.js
│           ├── inspections.js
│           ├── payments.js
│           └── repairClaims.js
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── lib/api.js
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── IconCard.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── Home.jsx
            ├── Login.jsx
            ├── Register.jsx
            ├── client/
            ├── admin/
            └── mechanic/
```

---

## Data model

- **users** — id, email, password_hash, name, role (`client` / `admin` / `mechanic`)
- **equipment** — id, name, unit_number, category, description, monthly_rate, status (`available` / `rented` / `maintenance`)
- **rentals** — id, client_id, equipment_id, start_date, end_date, status, total_amount
- **inspections** — id, equipment_id, inspector_id, rental_id?, notes, status, inspected_at
- **payments** — id, rental_id, client_id, amount, status (`pending` / `paid` / `refunded`), method, paid_at
- **repair_claims** — id, equipment_id, client_id?, mechanic_id?, description, status (`open` / `in_progress` / `resolved` / `rejected`), resolution_notes, resolved_at

---

## Auth

JWT (HS256) in `Authorization: Bearer <token>`. Token carries `{ id, email, role, name }`.
Middleware in `backend/src/middleware/auth.js` exposes `requireAuth` and `requireRole('admin', …)`.

## Notes

- Payments are an internal ledger — there's no real processor. Admin marks payments `paid`.
- The frontend reads `VITE_API_URL`; if unset it defaults to `http://localhost:4000`.
  In `docker compose`, it's set from `API_PORT` (default `4001`).
- Swap `JWT_SECRET` before any real deployment.
