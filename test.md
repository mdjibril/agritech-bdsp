# start-backend
```bash
cd backend
npm install
npm start
```
# start-frontend
```bash
cd frontend
npm install
npm run dev
```
# start-database
```bash
bash scripts/start-postgres.sh
```


# Phase 1 and Phase 2 Test Guide

Run these checks from the project root unless a command says otherwise.

```bash
cd /home/mdjibril/Github/agritech-bdsp
```

## Completed Test Order

- [x] Database starts successfully.
- [x] Six tables exist.
- [x] Seed data contains at least 62 users.
- [x] Seed data contains 2 certified BDSP users.
- [x] Each seeded BDSP has 30 network members.
- [x] Seeded deal has the correct 70/30 V4V/BDSP split.
- [x] Backend starts on port 4000.
- [x] `/health` returns `ok`.
- [x] Seeded BDSP can login.
- [x] `/posts` returns marketplace listings.
- [x] Unauthenticated BDSP route returns `401`.
- [x] Authenticated BDSP route returns network metrics.
- [x] Authenticated user can create a post.
- [x] BDSP can create a hub.
- [x] BDSP can create a deal.
- [x] Deal auto-calculates commission.
- [x] Activity log records API write actions.
- [x] WhatsApp webhook verification returns the Meta challenge.
- [x] WhatsApp registration flow captures user details and NDPC consent.
- [x] WhatsApp listing flow creates a marketplace post.

## 1. Start The Database

```bash
bash scripts/start-postgres.sh
```

Expected result:

```text
PostgreSQL container: agritech-bdsp-postgres
DATABASE_URL=postgresql://agritech:agritech_dev_password@localhost:5432/agritech_bdsp
```

Check that the container is running:

```bash
docker ps
```

Expected result: output includes `agritech-bdsp-postgres`.

## 2. Verify Phase 1 Database Tables

```bash
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -c "\dt"
```

Expected result:

```text
users
network_members
posts
hubs
deals
activity_log
```

Check seeded users:

```bash
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -c "SELECT COUNT(*) FROM users;"
```

Expected result: at least `62`.

Check certified BDSP users:

```bash
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -c "SELECT user_id, full_name, phone, is_bdsp FROM users WHERE is_bdsp = true;"
```

Expected result: `USR_001` and `USR_002`.

Check BDSP network sizes:

```bash
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -c "SELECT bdsp_user_id, COUNT(*) FROM network_members GROUP BY bdsp_user_id ORDER BY bdsp_user_id;"
```

Expected result:

```text
USR_001 | 30
USR_002 | 30
```

Check commission split:

```bash
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -c "SELECT deal_id, deal_value, v4v_revenue, bdsp_commission FROM deals;"
```

Expected result for `DL_001`:

```text
deal_value: 11040000.00
v4v_revenue: 7728000.00
bdsp_commission: 3312000.00
```

## 3. Start The Backend API

```bash
cd backend
npm install
npm start
```

Expected result:

```text
Agritech BDSP API listening on http://localhost:4000
```

Use a second terminal for the remaining commands.

## 4. Verify API Health

```bash
curl http://localhost:4000/health
```

Expected result:

```json
{"status":"ok","database_time":"..."}
```

## 5. Verify Login

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000001","password":"password123"}'
```

Expected result: response includes `user.user_id` as `USR_001`, `user.is_bdsp` as `true`, and a `token`.

Copy the token:

```bash
TOKEN="paste_token_here"
```

Verify the logged-in user:

```bash
curl http://localhost:4000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Expected result: current user details for `USR_001`.

## 6. Verify Marketplace Posts

```bash
curl http://localhost:4000/posts
```

Expected result: seeded posts such as `PST_001`, `PST_002`, `PST_003`, and `PST_004`.

## 7. Verify Authenticated Post Creation

```bash
curl -X POST http://localhost:4000/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "post_type":"SELL",
    "category":"Crop",
    "item_name":"Maize",
    "quantity":5,
    "unit":"Bags",
    "price_per_unit":47000
  }'
```

Expected result: a new post with an auto-generated `post_id`.

## 8. Verify BDSP Route Protection

Without a token:

```bash
curl -i http://localhost:4000/bdsp/network
```

Expected result: `401 Unauthorized`.

With a BDSP token:

```bash
curl http://localhost:4000/bdsp/network \
  -H "Authorization: Bearer $TOKEN"
```

Expected result:

```text
member_count: 30
gender_counts present
post_summary present
commission_ledger present
```

## 9. Verify Hub Creation

```bash
curl -X POST http://localhost:4000/hubs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "hub_id":"CHK-C02",
    "category":"Crop",
    "item_name":"Maize",
    "member_user_ids":["USR_003","USR_007"],
    "logistics_user_id":"USR_005",
    "total_quantity":18,
    "status":"Logistics-Assigned"
  }'
```

Expected result: new hub `CHK-C02`.

## 10. Verify Deal Creation And Commission Trigger

```bash
curl -X POST http://localhost:4000/deals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "hub_id":"CHK-C02",
    "buyer_user_id":"USR_004",
    "seller_user_ids":["USR_003","USR_007"],
    "logistics_user_id":"USR_005",
    "deal_value":1000000
  }'
```

Expected result:

```json
"deal_value":"1000000.00",
"v4v_revenue":"700000.00",
"bdsp_commission":"300000.00"
```

## 11. Verify Audit Logs

```bash
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -c "SELECT user_id, action, timestamp FROM activity_log ORDER BY timestamp DESC LIMIT 10;"
```

Expected result: recent actions such as post creation, hub creation, deal creation, or user registration.

## 12. Verify Phase 3 WhatsApp Webhook Verification

Restart the backend before this test so it loads the Phase 3 routes:

```bash
# In the terminal running the old backend, press Ctrl+C first.
cd backend
npm start
```

If the response is `{"error":"Route not found"}`, an older backend process is
still using port `4000`. Stop that process, restart `npm start`, and retry.

```bash
curl "http://localhost:4000/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=agritech_v4v_verify_token&hub.challenge=phase3-ok"
```

Expected result:

```text
phase3-ok
```

## 13. Verify WhatsApp Registration Flow

Use the same `from` phone number for each step.

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"REGISTER"}'
```

Expected result: reply asks for full name.

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"Phase Three Farmer"}'
```

Expected result: reply asks for phone number.

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"+2348100888000"}'
```

Expected result: reply asks for primary role.

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"SHF"}'
```

Expected result: reply asks for gender.

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"Female"}'
```

Expected result: reply asks for LGA.

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"Chikun"}'
```

Expected result: reply shows the NDPC consent notice.

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"YES"}'
```

Expected result:

```text
Registration complete. Your V4V ID is USR_...
```

Confirm the user exists:

```bash
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -c "SELECT user_id, full_name, phone, primary_role, ndpc_consent FROM users WHERE phone = '+2348100888000';"
```

Expected result: one user row with `ndpc_consent` as `t`.

## 14. Verify WhatsApp Listing Flow

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"POST"}'
```

Expected result: reply asks for `SELL` or `BUY`.

Continue the flow:

```bash
curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"SELL"}'

curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"Crop"}'

curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"Maize"}'

curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"5"}'

curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"Bags"}'

curl -X POST http://localhost:4000/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"from":"+2348100888000","text":"47000"}'
```

Expected final result:

```text
Listing created: PST_...
```

Confirm the post exists:

```bash
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -c "SELECT post_id, user_id, post_type, category, item_name, quantity, unit, price_per_unit FROM posts ORDER BY post_id DESC LIMIT 5;"
```

Expected result: recent `SELL Crop Maize` listing.

## 15. Verify Phase 4 Web App

Start the frontend in a new terminal:

```bash
cd /home/mdjibril/Github/agritech-bdsp/frontend
npm install
npm run dev
```

Expected result:

```text
Local: http://localhost:5173/
```

Open `http://localhost:5173` in your browser.

### Phase 4 Manual Checklist (Browser Tests)

- [x] Frontend scaffold and dashboard screens implemented.
- [x] Role-aware login flow implemented.
- [x] BDSP network dashboard implemented.
- [x] Marketplace filters include type, category, search, and LGA.
- [x] Login screen loads in the browser.
- [x] Demo BDSP login succeeds with `+2348100000001 / password123`.
- [x] Overview screen shows member, listing, deal value, and commission metrics.
- [x] Network screen lists mapped members from `network_members`.
- [x] Marketplace shows live listings for guest users.
- [x] Marketplace refresh button reloads the current listings.
- [x] Marketplace filters narrow results correctly.
- [x] Mobile layout remains usable below `760px`.

### Known Fixes Applied

**Missing `created_at` column on `posts` table** — the migration schema was missing `created_at` on the `posts` table, but the `GET /posts` query referenced `p.created_at` in the `ORDER BY` and `SELECT` clauses. Fixed by:

1. Adding `created_at timestamptz NOT NULL DEFAULT now()` to the `posts` table DDL in `backend/db/migrations/001_init_v4v_schema.sql`
2. Running `ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()` on the existing database

If you do a full `docker compose down -v` + `docker compose up`, the fresh migration will include the column automatically.

### Phase 4 Automated Verification

Run these after both the backend and frontend are running.

#### 15a. Guest marketplace access

```bash
curl -s http://localhost:5173 | head -c 500
```

Expected result: HTML containing `V4V Agritech Network` and a script tag pointing to `/src/main.jsx`.

#### 15b. Vite API proxy works

Because Vite proxies `/api` to the backend on `:4000`, the frontend can reach backend endpoints through the dev server. Verify the proxy:

```bash
curl -s "http://localhost:5173/api/posts?status=Active" | python3 -m json.tool | head -20
```

Expected result: JSON array of posts with `posted_by`, `poster_role`, `lga`, and `price_per_unit`. This proves the Vite proxy is live and the frontend can reach the backend.

#### 15c. Login API works through the proxy

```bash
curl -s -X POST "http://localhost:5173/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000001","password":"password123"}' | python3 -m json.tool
```

Expected result: response includes `user.user_id: "USR_001"`, `user.is_bdsp: true`, and a `token`.

#### 15d. BDSP network endpoint works through the proxy

Extract the token and query the network endpoint:

```bash
TOKEN=$(curl -s -X POST "http://localhost:5173/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000001","password":"password123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s "http://localhost:5173/api/bdsp/network" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected result:

```json
{
    "bdsp_user_id": "USR_001",
    "metrics": {
        "member_count": 30,
        "gender_counts": { ... },
        "post_summary": [ ... ],
        "commission_ledger": { ... }
    },
    "members": [ ... ]
}
```

Key checks:
- `member_count` is `30`
- `commission_ledger` contains `total_deal_value`, `total_v4v_revenue`, `total_bdsp_commission`
- `members` is an array of 30 user objects

#### 15e. Verify 70/30 commission split through the proxy

```bash
TOKEN=$(curl -s -X POST "http://localhost:5173/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000001","password":"password123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s "http://localhost:5173/api/bdsp/network" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
l = d['metrics']['commission_ledger']
total = float(l['total_deal_value'])
v4v = float(l['total_v4v_revenue'])
comm = float(l['total_bdsp_commission'])
print(f'Deal value:    {total}')
print(f'V4V revenue:   {v4v}  ({v4v/total*100:.0f}%)')
print(f'BDSP comm:     {comm}  ({comm/total*100:.0f}%)')
"
```

Expected result: V4V is 70%, BDSP commission is 30% of total deal value.

#### 15f. Confirm non-BDSP users don't see the BDSP navigation

```bash
TOKEN=$(curl -s -X POST "http://localhost:5173/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000011","password":"password123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s "http://localhost:5173/api/bdsp/network" \
  -H "Authorization: Bearer $TOKEN" -o /dev/null -w "%{http_code}"
```

Expected result: `403` (non-BDSP user blocked by `requireBdsp` middleware).

### Browser Test Instructions

Open `http://localhost:5173` in a browser and run through these manually:

1. **Guest market access** — click `Browse public marketplace` without logging in. The marketplace grid should load active listings. Confirm: listing cards show SELL/BUY type, item name, price, quantity, owner, and LGA. Filters (type, category, LGA, search) should narrow results.

2. **BDSP login** — use `+2348100000001` / `password123`. After login:
   - Left sidebar shows **Overview**, **Network**, **Marketplace**
   - Overview shows 4 metric cards: Network members (30), Active listings, Deal value, BDSP commission
   - Gender distribution bar chart renders
   - Value allocation panel shows 70/30 split

3. **Network members** — click Network in the sidebar:
   - Table shows 30 rows with Member (name + ID), Role, Gender, Ward, Production profile, Joined
   - Search field filters rows in real-time

4. **Marketplace filters** — click Marketplace:
   - Type dropdown: All → SELL → BUY narrows cards
   - Category dropdown: filter by Crop / Livestock / Input
   - LGA dropdown: shows "All LGAs" and "Chikun"
   - Search: typing "maize" filters cards by item name, poster, or LGA
   - Refresh button reloads listings

5. **Mobile layout** — resize browser below 760px:
   - Sidebar collapses behind hamburger menu
   - Metrics grid stacks to single column
   - Listing grid stacks to single column
   - Login screen stacks vertically (brand panel on top, form below)

## 16. Verify Phase 5 Escrow & Deal Simulation

Phase 5 adds a 3-party confirmation flow for escrow deals. When all 3 parties (buyer, logistics, seller) confirm, the deal auto-releases, the hub completes, and the linked posts close.

### Prerequisites

The backend must be running on port 4000. If you did a fresh database reset, also run the schema migration:

```bash
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -c "
ALTER TABLE deals
  ADD COLUMN buyer_confirmed_at timestamptz,
  ADD COLUMN logistics_confirmed_at timestamptz,
  ADD COLUMN seller_confirmed_at timestamptz,
  ADD CONSTRAINT deals_no_confirm_when_cancelled CHECK (
    (escrow_status = 'Cancelled' AND buyer_confirmed_at IS NULL
     AND logistics_confirmed_at IS NULL AND seller_confirmed_at IS NULL)
    OR escrow_status != 'Cancelled'
  );
ALTER TABLE hubs ADD COLUMN post_ids text[] NOT NULL DEFAULT '{}';
UPDATE hubs SET post_ids = '{PST_001,PST_003}' WHERE hub_id = 'CHK-C01';
"
```

### Reset before testing

Each test run starts by resetting `DL_001` to a clean state. Run this before every pass through 16a-16h:

```bash
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -c "
UPDATE deals SET
  escrow_status = 'Funds-Held-Placeholder',
  buyer_confirmed_at = NULL,
  logistics_confirmed_at = NULL,
  seller_confirmed_at = NULL
WHERE deal_id = 'DL_001';
UPDATE hubs SET status = 'Logistics-Assigned' WHERE hub_id = 'CHK-C01';
UPDATE posts SET status = 'Active' WHERE post_id IN ('PST_001', 'PST_003');
"
```

### 16a. Verify participant-scoped deal list

```bash
# BDSP sees deals they manage
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000001","password":"password123"}' | python3 -c "
import sys,json;d=json.load(sys.stdin);print('Token:',d['token'][:20]+'...')
with open('/tmp/t_bdsp','w') as f:f.write(d['token'])
"

curl -s http://localhost:4000/deals/my \
  -H "Authorization: Bearer $(cat /tmp/t_bdsp)" | python3 -c "
import sys,json;d=json.load(sys.stdin)
print(f'BDSP sees {len(d[\"deals\"])} deals')
for dl in d['deals']:
  print(f'  {dl[\"deal_id\"]} - {dl[\"escrow_status\"]} - {dl[\"item_name\"]} - ₦{float(dl[\"deal_value\"]):,.0f}')
"
```

Expected result: BDSP sees `DL_001` and `DL_002`. Both show escrow status, item name, and deal value.

```bash
# Buyer sees deals they participate in
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000004","password":"password123"}' | python3 -c "
import sys,json;d=json.load(sys.stdin)
with open('/tmp/t_buyer','w') as f:f.write(d['token'])
print(f'Buyer token saved')
"

curl -s http://localhost:4000/deals/my \
  -H "Authorization: Bearer $(cat /tmp/t_buyer)" | python3 -c "
import sys,json;d=json.load(sys.stdin)
print(f'Buyer sees {len(d[\"deals\"])} deals')
"
```

Expected result: Buyer sees at least `DL_001`.

### 16b. Verify deposit endpoint

```bash
curl -s -X PATCH http://localhost:4000/deals/DL_001/deposit \
  -H "Authorization: Bearer $(cat /tmp/t_bdsp)" | python3 -c "
import sys,json;d=json.load(sys.stdin)['deal']
print(f'Escrow status after deposit: {d[\"escrow_status\"]}')
"
```

Expected result: `Escrow status after deposit: Funds-Held-Placeholder`

### 16c. Verify buyer confirmation

```bash
curl -s -X PATCH http://localhost:4000/deals/DL_001/confirm/buyer \
  -H "Authorization: Bearer $(cat /tmp/t_buyer)" | python3 -c "
import sys,json;d=json.load(sys.stdin)['deal']
print(f'Buyer confirmed: {d[\"buyer_confirmed_at\"]}')
print(f'Escrow status: {d[\"escrow_status\"]}')
"
```

Expected result: `buyer_confirmed_at` is a timestamp. Escrow still `Funds-Held-Placeholder`.

### 16d. Verify seller confirmation

```bash
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000003","password":"password123"}' | python3 -c "
import sys,json;d=json.load(sys.stdin)
with open('/tmp/t_seller','w') as f:f.write(d['token'])
"

curl -s -X PATCH http://localhost:4000/deals/DL_001/confirm/seller \
  -H "Authorization: Bearer $(cat /tmp/t_seller)" | python3 -c "
import sys,json;d=json.load(sys.stdin)['deal']
print(f'Seller confirmed: {d[\"seller_confirmed_at\"]}')
print(f'Escrow status: {d[\"escrow_status\"]}')
"
```

Expected result: `seller_confirmed_at` is a timestamp. Escrow still `Funds-Held-Placeholder`.

### 16e. Verify logistics confirmation triggers auto-release

```bash
curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000005","password":"password123"}' | python3 -c "
import sys,json;d=json.load(sys.stdin)
with open('/tmp/t_log','w') as f:f.write(d['token'])
"

curl -s -X PATCH http://localhost:4000/deals/DL_001/confirm/logistics \
  -H "Authorization: Bearer $(cat /tmp/t_log)" | python3 -c "
import sys,json;d=json.load(sys.stdin)['deal']
print(f'Logistics confirmed: {d[\"logistics_confirmed_at\"]}')
print(f'Escrow status: {d[\"escrow_status\"]}')
print(f'Buyer: {\"✓\" if d[\"buyer_confirmed_at\"] else \"○\"}')
print(f'Logistics: {\"✓\" if d[\"logistics_confirmed_at\"] else \"○\"}')
print(f'Seller: {\"✓\" if d[\"seller_confirmed_at\"] else \"○\"}')
"
```

Expected result:
```
Logistics confirmed: 2026-07-07T...
Escrow status: Released
Buyer: ✓
Logistics: ✓
Seller: ✓
```

### 16f. Verify hub and posts updated after auto-release

```bash
echo "=== Hub status ==="
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -t -c "SELECT hub_id, status FROM hubs WHERE hub_id = 'CHK-C01';"

echo "=== Post statuses ==="
docker exec agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -t -c "SELECT post_id, status FROM posts WHERE post_id IN ('PST_001','PST_003');"
```

Expected result:
```
 CHK-C01 | Completed
 PST_001 | Closed
 PST_003 | Closed
```

### 16g. Verify cancel endpoint

```bash
# BDSP cancels a deal
curl -s -X PATCH http://localhost:4000/deals/DL_001/cancel \
  -H "Authorization: Bearer $(cat /tmp/t_bdsp)" | python3 -c "
import sys,json;d=json.load(sys.stdin)['deal']
print(f'After cancel: escrow_status={d[\"escrow_status\"]}')
"
```

Expected result: `After cancel: escrow_status=Cancelled`

Note: if you already released DL_001 in 16e, the cancel will fail with `Cannot cancel a released deal` — that's correct behavior.

### 16h. Verify non-participant access is blocked

```bash
TOKEN_RANDOM=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000006","password":"password123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s http://localhost:4000/deals/DL_001 \
  -H "Authorization: Bearer $TOKEN_RANDOM" -o /dev/null -w "%{http_code}"
```

Expected result: `403`

### Phase 5 Manual Checklist (Browser Tests)

- [x] Login screen shows demo credentials for all roles.
- [x] BDSP login: Deals tab appears in sidebar.
- [x] BDSP Deals page shows DL_001 with "Funds Held" badge.
- [x] Click DL_001 expands to show confirmation track (3 empty circles) and "Deposit Funds" + "Cancel Deal" buttons.
- [x] Click "Deposit Funds" — badge stays "Funds Held".
- [x] Logout, login as Buyer (+2348100000004) — Deals tab appears, DL_001 shows "Confirm Receipt" button.
- [x] Click "Confirm Receipt" — buyer circle fills with checkmark.
- [x] Logout, login as Seller (+2348100000003) — Deals tab appears, DL_001 shows "Confirm Dispatch" button.
- [x] Click "Confirm Dispatch" — seller circle fills with checkmark.
- [x] Logout, login as Logistics (+2348100000005) — Deals tab appears, DL_001 shows "Confirm Delivery" button.
- [x] Click "Confirm Delivery" — all 3 circles fill, deal shows "Released" badge, release banner appears.
- [x] Deal details section shows hub info, participant IDs, V4V revenue, and BDSP commission.
- [x] Cancel button only visible to BDSP and only for non-Released deals.
- [x] Mobile layout: deal cards stack, confirmation track wraps, buttons stack.

### API Endpoints Summary

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/deals/my` | Any | Deals where user is a participant |
| `GET` | `/deals/:dealId` | Participant | Single deal with hub info |
| `PATCH` | `/deals/:dealId/deposit` | BDSP | Set escrow to Funds-Held-Placeholder |
| `PATCH` | `/deals/:dealId/confirm/buyer` | Buyer | Set buyer_confirmed_at |
| `PATCH` | `/deals/:dealId/confirm/logistics` | Logistics | Set logistics_confirmed_at |
| `PATCH` | `/deals/:dealId/confirm/seller` | Seller | Set seller_confirmed_at |
| `PATCH` | `/deals/:dealId/cancel` | BDSP | Set escrow to Cancelled |

### Known Fixes Applied

**Missing `created_at` on `posts` table** — added `created_at timestamptz NOT NULL DEFAULT now()` to the schema and `ALTER TABLE` on the existing database. Previously caused `column p.created_at does not exist` error on marketplace.

## Fresh Reset

Only run this if you are okay deleting local test data:

```bash
docker stop agritech-bdsp-postgres
docker rm agritech-bdsp-postgres
docker volume rm agritech_bdsp_postgres_data
bash scripts/start-postgres.sh
```

## 17. Phase 6: Deploy to Render

### 17a. Production config hardening

The backend config (`backend/src/config.js`) now uses a `requireEnv()` helper that:
- **In production** (`NODE_ENV=production`): crashes on startup if `DATABASE_URL`, `JWT_SECRET`, or `WHATSAPP_VERIFY_TOKEN` are missing
- **In development**: logs a warning and uses insecure defaults

### 17b. Required environment variables

These must be set in Render's dashboard or a `.env` file:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string from Render |
| `JWT_SECRET` | Yes | Strong random string (`openssl rand -hex 32`) |
| `NODE_ENV` | Yes | Set to `production` on Render |
| `PORT` | No | Defaults to `4000`, Render assigns automatically |
| `WHATSAPP_VERIFY_TOKEN` | Yes if using WhatsApp | Must match Meta webhook config |
| `WHATSAPP_ACCESS_TOKEN` | If using WhatsApp | Meta Cloud API token |
| `WHATSAPP_PHONE_NUMBER_ID` | If using WhatsApp | Meta phone number ID |

### 17c. Deploy backend to Render

1. Push the repo to GitHub
2. In Render Dashboard → **New Web Service** → connect GitHub repo
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: (leave blank — no build step needed)
   - **Start Command**: `node src/server.js`
   - **Health Check Path**: `/health`
4. Add environment variables from section 17b
5. Deploy

After deploy, run migrations and seed data:

```bash
# Load the environment from the repo root if needed
cd /home/mdjibril/Github/agritech-bdsp
set -a
source .env
set +a

# Apply the schema and seed data to the Render PostgreSQL instance
psql "${DATABASE_URL}?sslmode=require" -f backend/db/migrations/001_init_v4v_schema.sql
psql "${DATABASE_URL}?sslmode=require" -f backend/db/seeds/001_seed_phase_1.sql
```

Verified result from the successful run:

```text
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE TABLE
...
COMMIT
```

The seed script completed successfully and populated the `users`, `network_members`, `posts`, `hubs`, `deals`, and `activity_log` tables.

### 17d. Deploy frontend to Render

1. Render Dashboard → **New Static Site** → connect GitHub repo
2. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **SPA Redirects**: ensure the app serves `index.html` for deep links (Render static site requires a rewrite rule such as `/* /index.html 200`)
3. Set environment variable: `VITE_API_URL=https://agritech-bdsp-back.onrender.com`
4. Deploy

### 17e. Verify deployment

```bash
# Health check
curl https://agritech-bdsp-back.onrender.com/health

# Login
curl -X POST https://agritech-bdsp-back.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+2348100000001","password":"password123"}'

# Marketplace
curl https://agritech-bdsp-back.onrender.com/posts?status=Active
```

Verified successful response from the deployed backend:

```json
{"status":"ok","database_time":"..."}
```

And the login endpoint returned a valid auth payload after the schema and seed data were applied.

### Dockerfile

A `Dockerfile` exists at `backend/Dockerfile` if you prefer container-based deployment instead of Render's buildpack system. It uses `node:20-alpine` and runs `npm ci --only=production`.

### 17f. Post-deployment verification checklist

- [ ] `curl https://your-app.onrender.com/health` returns `{"status":"ok","database_time":"..."}`
- [ ] Login works: `curl -X POST ... /auth/login` returns a user + token
- [ ] Marketplace returns posts: `curl ... /posts?status=Active`
- [ ] Frontend loads at `https://your-frontend.onrender.com` with no console errors
- [ ] Marketplace grid loads and filters work (type, category, LGA)
- [ ] Login redirects to role-appropriate dashboard
- [ ] BDSP dashboard shows network metrics and commission ledger

### 17g. CI/CD — Automated deploy with GitHub Actions

A GitHub Actions workflow is configured at `.github/workflows/deploy.yml`. It triggers on every push to the `main` branch:

1. **Checkout** — pulls the latest code
2. **Notify Render** — sends a POST to Render's Deploy Hook URL, triggering a fresh build and deploy of the backend web service

**To enable the workflow:**

1. Go to your **Render Dashboard** → **Web Service** (backend) → **Settings** → **Deploy Hooks**
2. Click **Generate Deploy Hook** and copy the URL
3. Go to your **GitHub repo** → **Settings** → **Secrets and variables** → **Actions**
4. Add a new repository secret named `RENDER_DEPLOY_HOOK_URL` with the copied URL
5. Push to `main` — the workflow runs automatically

**Optional: Manual deploy via curl**

```bash
curl -X POST https://api.render.com/deploy/srv-xxx?key=yyy
```

You can find the exact deploy hook URL in your Render dashboard.

### 17h. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Backend health check fails (502) | Missing env vars | Check `DATABASE_URL`, `JWT_SECRET` are set in Render dashboard |
| DB connection timeout | Render PostgreSQL not provisioned | Create a Postgres DB in Render and copy the connection string |
| `Cannot read properties of null` | Missing seed data | SSH into Render shell or run `psql` to apply migrations + seeds |
| Frontend blank page | API URL mismatch | Verify `VITE_API_URL` in Render static site env matches backend URL |
| Auth returns 401 on deployed site | JWT secret mismatch | Ensure `JWT_SECRET` is the same value used during seed data creation |
| 3rd party confirm blocked | Escrow not in Funds-Held | Run deposit endpoint first (`PATCH /deals/:id/deposit`)

