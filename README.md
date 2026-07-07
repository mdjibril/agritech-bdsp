# Agritech BDSP V4V POC

Phase 1 establishes the repository structure and PostgreSQL database foundation for the six-table V4V proof of concept.

## Structure

- `backend/db/migrations`: PostgreSQL schema migrations.
- `backend/db/seeds`: deterministic development seed data.
- `frontend`: reserved for the web platform.
- `whatsapp-bot`: reserved for the WhatsApp channel.

## Local Database

1. Copy `.env.example` to `.env` and adjust credentials if needed.
2. Start PostgreSQL with Docker Compose if available:

```bash
docker compose up -d postgres
```

If this machine does not have the Docker Compose plugin, use the helper script:

```bash
bash scripts/start-postgres.sh
```

The container loads the migration and seed SQL on first initialization. If the named Docker volume already exists, reset it before re-running initialization.

```bash
docker compose down -v
docker compose up -d postgres
```

## Backend API

```bash
cd backend
npm install
npm run dev
```

The API listens on `http://localhost:4000` by default. Check it with:

```bash
curl http://localhost:4000/health
```

## WhatsApp POC Webhook

Phase 3 uses the backend listener at:

```text
GET  /whatsapp/webhook
POST /whatsapp/webhook
```

Local test payloads can be sent without Meta credentials:

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"REGISTER"}'
```

See `whatsapp-bot/README.md` for the full conversation test.

## Live Database

You can use a managed PostgreSQL database instead of local Docker. Good POC options are Supabase, Neon, Render PostgreSQL, Railway, or AWS RDS.

After creating the database, run `backend/db/migrations/001_init_v4v_schema.sql`, then `backend/db/seeds/001_seed_phase_1.sql`, and set `DATABASE_URL` in `.env` to the provider connection string.
