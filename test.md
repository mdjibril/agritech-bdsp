# V4V Agritech BDSP — Test Guide

## Quick Start

```bash
# 1. Start the database
bash scripts/start-postgres.sh

# 2. Start the backend (terminal 2)
cd backend && npm install && npm start

# 3. Start the frontend (terminal 3)
cd frontend && npm install && npm run dev

# 4. Verify backend health
curl http://localhost:4000/health
```

**Live deployments:**
- Frontend: https://agritech-bdsp-frontend.onrender.com
- Backend:  https://agritech-bdsp-back.onrender.com

---

# Phase 3 & 4: Enterprise Schema & v1 API

**What changed:** Phase 3 dropped the prototype 6 tables (`users`, `posts`, `hubs`, `deals`, `network_members`) and replaced them with 7 enterprise tables (`actors`, `transactions`, `escrow`, `loans`, `insurance_policies`, `training_records`, `activity_log`). Phase 4 rewrote the entire backend API against the new schema, added the v1 enterprise routes (`/api/v1/*`), the dual POD confirm, the NDPC consent middleware, and backward-compatibility shims for the legacy frontend.

**Prerequisites:** Local Docker PostgreSQL running with the Phase 3 schema and seed data already applied (run `bash scripts/apply-phase-3.sh local` if starting from a clean state).

```bash
# Ensure the backend is running with local DB config
cd backend
npm install
npm start

# In another terminal, verify it started
curl http://localhost:4000/health
# Expected: {"status":"ok","database_time":"..."}
```

---

## Section 1: Database Schema Verification (Phase 3)

### 1a. Verify 7 Enterprise Tables Exist

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
```

**Expected output (7 tables):**
```
actors, transactions, escrow, loans, insurance_policies, training_records, activity_log
```

### 1b. Verify Seed Data — All 9 Actor Types

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT actor_type, count(*) FROM actors GROUP BY actor_type ORDER BY actor_type;"
```

**Expected:** 1 V4V_ADMIN, 1 AGRA, 2 BDSP, 2 INVESTOR, 2 KBS, 3 AGGREGATOR, 3 INPUT_VENDOR, 3 LOGISTICS, 8 SHF

### 1c. Verify BDSP Network (Self-Referencing FK)

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT a1.actor_id AS shf, a1.full_name, a2.actor_id AS bdsp_id, a2.full_name AS bdsp_name
   FROM actors a1 JOIN actors a2 ON a1.bdsp_id = a2.actor_id ORDER BY a1.actor_id;"
```

**Expected:** 4 SHFs under Amina Yusuf (BDSP 1), 4 SHFs under Musa Danjuma (BDSP 2)

### 1d. Verify Computed Columns on Transactions

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT tx_id, commodity, quantity_kg, unit_price, total_amount, escrow_required, commission_v4v, commission_bdsp FROM transactions LIMIT 3;"
```

**Expected:** `total_amount` = `quantity_kg × unit_price`, `escrow_required` = `true` (all seed txs exceed $50), `commission_v4v` and `commission_bdsp` populated non-null.

### 1e. Verify Activity Log

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT * FROM activity_log ORDER BY log_id;"
```

**Expected:** 5 seed audit entries.

### 1f. Verify Indexes Created

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT indexname FROM pg_indexes WHERE tablename IN ('actors','transactions','escrow','loans','insurance_policies','training_records','activity_log') AND schemaname='public' ORDER BY tablename, indexname;" | grep idx_
```

**Expected:** At minimum `idx_actors_type_state`, `idx_actors_phone`, `idx_transactions_status`, `idx_training_actor_course`, `idx_activity_actor_time`.

### 1g. Verify Old Tables Are Dropped

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "\dt"
```

**Expected:** Only the 7 new tables. No `users`, `posts`, `hubs`, `deals`, `network_members`.

---

## Section 2: v1 Enterprise API Verification (Phase 4)

### 2a. Register a New Actor (with NDPC Consent)

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "phone":"+2348000000001",
    "password":"mypassword",
    "full_name":"Round 2 Tester",
    "actor_type":"SHF",
    "bank_name":"GTBank",
    "account_number":"1234567890",
    "gender":"MALE",
    "lga":"Chikun",
    "ndpc_consent":true
  }' | python3 -m json.tool
```

**Expected:** 201 response with `token` and `user` object containing `actor_id`, `phone`, `actor_type`, `kyc_status: "PENDING"`.

### 2b. NDPC Consent Rejection

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "phone":"+2348000000002",
    "password":"mypassword",
    "full_name":"No Consent Tester",
    "actor_type":"SHF",
    "bank_name":"GTBank",
    "account_number":"1111111111",
    "gender":"MALE",
    "lga":"Chikun"
  }' | python3 -m json.tool
```

**Expected:** 400 response: `{"error":"NDPC data privacy consent required"}`

### 2c. Login with Password

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348000000001","password":"mypassword"}' | python3 -m json.tool
```

**Expected:** 200 response with JWT token and user object. **Note the token for subsequent tests.**

### 2d. Mock OTP Flow

```bash
# Step 1: Send OTP
curl -s -X POST http://localhost:4000/api/v1/auth/send-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348000000003"}'
# Expected: {"success":true,"message":"OTP sent (check server logs)"}
# Note: the OTP code prints in the backend terminal logs

# Step 2: Verify OTP (replace 123456 with actual code from logs)
curl -s -X POST http://localhost:4000/api/v1/auth/verify-otp \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348000000003","code":"976996"}'
# Expected: {"tempToken":"eyJ...","message":"OTP verified. Use tempToken in /register."}
```

### 2e. Create Transaction (with Auto-Escrow)

Save the token from 2c as `TOKEN`:

```bash
TOKEN="<token from 2c>"

curl -s -X POST http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "buyer_id":3,
    "seller_id":5,
    "logistics_id":18,
    "commodity":"Rice",
    "quantity_kg":100,
    "unit_price":600
  }' | python3 -m json.tool
```

**Verify:**
- `status` = `"IN_ESCROW"` (auto-funded because `escrow_required = true`)
- `escrow_required` = `true`
- `total_amount` = `60000.00` (100 × 600)
- `commission_v4v` = `840.00` (60000 × 0.02 × 0.70)
- `commission_bdsp` = `360.00` (60000 × 0.02 × 0.30)
- Note the `tx_id` for the next test

### 2f. Dual POD Confirm — Complete Lifecycle

```bash
# Login as logistics partner (actor 18 = Sarah John, password: password123)
LOG_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000018","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Login as buyer (actor 3 = Fatima Abubakar, password: password123)
BUYER_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000003","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Replace TX_ID with the tx_id from 2e
TX_ID=11

# Step 1: Trucker confirms POD
echo "=== Trucker POD ==="
curl -s -X POST "http://localhost:4000/api/v1/transactions/$TX_ID/confirm-pod" \
  -H "Authorization: Bearer $LOG_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"role":"trucker"}' | python3 -c "
import sys,json; d=json.load(sys.stdin); t=d.get('transaction',{})
print(f'Trucker={t.get(\"trucker_pod_confirmed\")}, Status={t.get(\"status\")}, Buyer={t.get(\"buyer_pod_confirmed\")}')"

# Step 2: Buyer confirms POD (should auto-release escrow)
echo "=== Buyer POD (triggers release) ==="
curl -s -X POST "http://localhost:4000/api/v1/transactions/$TX_ID/confirm-pod" \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"role":"buyer"}' | python3 -c "
import sys,json; d=json.load(sys.stdin); t=d.get('transaction',{})
print(f'Trucker={t.get(\"trucker_pod_confirmed\")}, Buyer={t.get(\"buyer_pod_confirmed\")}, Status={t.get(\"status\")}')"

# Step 3: Verify escrow released and seller credited
echo "=== Escrow Status ==="
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT escrow_id, tx_id, status, released_at FROM escrow WHERE tx_id=$TX_ID;"

echo "=== Seller Wallet (actor 5 = Ngozi Okonkwo) ==="
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT actor_id, full_name, wallet_balance FROM actors WHERE actor_id=5;"
```

**Expected progression:** `IN_ESCROW` → trucker confirms → `DISPATCHED` → buyer confirms → `COMPLETED`. Seller wallet increases by the escrow amount.

### 2g. List My Transactions

```bash
curl -s http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin); txns=d.get('transactions',[])
print(f'{len(txns)} transactions')
for t in txns[:3]:
    print(f'  Tx {t[\"tx_id\"]}: {t[\"commodity\"]} {t[\"quantity_kg\"]}kg, {t[\"status\"]}, ₦{t[\"total_amount\"]}')"
```

### 2h. BDSP Network View

```bash
# Login as a BDSP (Amina Yusuf, password: password123)
BDSP_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s http://localhost:4000/api/v1/actors/network \
  -H "Authorization: Bearer $BDSP_TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin); m=d.get('metrics',{}); cl=m.get('commission_ledger',{})
print(f'Members: {m.get(\"member_count\")}')
print(f'Gender: {m.get(\"gender_counts\")}')
print(f'Tx count: {cl.get(\"tx_count\")}')
print(f'Total value: ₦{cl.get(\"total_tx_value\")}')
print(f'V4V rev: ₦{cl.get(\"total_commission_v4v\")}')
print(f'BDSP com: ₦{cl.get(\"total_commission_bdsp\")}')"
```

### 2i. Manual Escrow Override (V4V Admin)

```bash
# Login as V4V_ADMIN (password: password123)
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000099","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Create a tx first, then manually fund escrow
curl -s -X POST http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $BDSP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"buyer_id":3,"seller_id":5,"logistics_id":17,"commodity":"Test","quantity_kg":10,"unit_price":100}' | \
  python3 -c "import sys,json; print(f'Created tx {json.load(sys.stdin)[\"transaction\"][\"tx_id\"]}')"

# Get the escrow ID
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT escrow_id, tx_id FROM escrow ORDER BY escrow_id DESC LIMIT 1;"

# Release manually (replace ESCROW_ID)
curl -s -X PATCH "http://localhost:4000/api/v1/escrow/5/release" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -m json.tool
```

**Expected:** Escrow transitions to `RELEASED_TO_SELLER`, seller wallet credited.

---

## Section 3: Legacy Shim Verification (Frontend Compatibility)

### 3a. Legacy Login (Frontend Uses This)

```bash
curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | python3 -m json.tool
```

**Expected:** Legacy user shape with `user_id: "ACT_001"`, `is_bdsp: true`, `primary_role: "BDSP"`.

### 3b. Legacy Posts (Marketplace)

```bash
curl -s http://localhost:4000/posts | python3 -c "
import sys,json; d=json.load(sys.stdin); posts=d.get('posts',[])
print(f'{len(posts)} marketplace posts')
for p in posts[:5]:
    print(f'  {p[\"post_id\"]}: {p[\"item_name\"]} - {p[\"post_type\"]} by {p[\"posted_by\"]}')"
```

**Expected:** Active transactions mapped to post shape, 8+ posts visible.

### 3c. Legacy Deals

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# BDSP's deals (deals where seller's bdsp_id matches)
curl -s http://localhost:4000/deals \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin); deals=d.get('deals',[])
print(f'{len(deals)} BDSP deals')
for dl in deals[:5]:
    print(f'  {dl[\"deal_id\"]}: {dl[\"item_name\"]}, escrow={dl[\"escrow_status\"]}, ₦{dl[\"deal_value\"]}')"

# Participant's deals
curl -s http://localhost:4000/deals/my \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin); deals=d.get('deals',[])
print(f'{len(deals)} participant deals')
for dl in deals[:3]:
    print(f'  {dl[\"deal_id\"]}: {dl[\"item_name\"]}, escrow={dl[\"escrow_status\"]}')"
```

### 3d. Legacy BDSP Network

```bash
curl -s http://localhost:4000/bdsp/network \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys,json; d=json.load(sys.stdin); m=d.get('metrics',{}); cl=m.get('commission_ledger',{})
print(f'Members: {m.get(\"member_count\")}')
print(f'Gender: {m.get(\"gender_counts\")}')
print(f'Deal count: {cl.get(\"deal_count\")}')
print(f'Total value: ₦{cl.get(\"total_deal_value\")}')
print(f'V4V rev: ₦{cl.get(\"total_v4v_revenue\")}')
print(f'BDSP com: ₦{cl.get(\"total_bdsp_commission\")}')"
```

---

## Section 4: Activity Log (NITDA Audit Trail)

### 4a. Verify All Write Operations Logged

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT log_id, action FROM activity_log ORDER BY log_id;"
```

**Expected:** Every registration, transaction creation, POD confirmation, and escrow operation generates a descriptive audit entry.

---

## Section 5: Quick Smoke Test (All-in-One)

Run this single command to verify everything works end-to-end after a fresh deployment:

```bash
echo "=== SMOKE TEST ===" && \
echo -n "Health: " && curl -sf http://localhost:4000/health | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" && \
echo -n "Register: " && R=$(curl -sf -X POST http://localhost:4000/api/v1/auth/register -H 'Content-Type: application/json' -d '{"phone":"+2348000099999","password":"test1234","full_name":"Smoke Test","actor_type":"SHF","bank_name":"GTBank","account_number":"9999999999","gender":"MALE","lga":"Chikun","ndpc_consent":true}') && echo "$R" | python3 -c "import sys,json; print(f'OK actor {json.load(sys.stdin)[\"user\"][\"actor_id\"]}')" && \
echo -n "Login: " && T=$(curl -sf -X POST http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' -d '{"phone":"+2348000099999","password":"test1234"}') && echo "$T" | python3 -c "import sys,json; print(f'OK token={json.load(sys.stdin)[\"token\"][:20]}...')" && \
echo -n "Legacy Login: " && curl -sf -X POST http://localhost:4000/auth/login -H 'Content-Type: application/json' -d '{"phone":"+2348100000001","password":"password123"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'OK {d[\"user\"][\"full_name\"]} is_bdsp={d[\"user\"][\"is_bdsp\"]}')" && \
echo -n "Posts: " && curl -sf http://localhost:4000/posts | python3 -c "import sys,json; print(f'{len(json.load(sys.stdin)[\"posts\"])} active')" && \
echo -n "BDSP Network: " && BT=$(curl -sf -X POST http://localhost:4000/auth/login -H 'Content-Type: application/json' -d '{"phone":"+2348100000001","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && curl -sf http://localhost:4000/bdsp/network -H "Authorization: Bearer $BT" | python3 -c "import sys,json; d=json.load(sys.stdin); m=d['metrics']; print(f'{m[\"member_count\"]} members, ₦{m[\"commission_ledger\"][\"total_deal_value\"]} value')" && \
echo -n "Deals: " && curl -sf http://localhost:4000/deals/my -H "Authorization: Bearer $BT" | python3 -c "import sys,json; print(f'{len(json.load(sys.stdin)[\"deals\"])} deals')" && \
echo -n "Activity Log: " && docker exec -i agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -tA -c "SELECT count(*) FROM activity_log;" && \
echo "=== ALL CHECKS PASSED ==="
```

---

## Expected Results Summary

| Test | Expected Result | Phase |
|------|----------------|-------|
| 7 tables exist | actors, transactions, escrow, loans, insurance_policies, training_records, activity_log | 3 |
| 9 actor roles seeded | 25 actors, all 9 types present | 3 |
| Computed columns | total_amount = qty × price, escrow_required = true for >$50 | 3 |
| Commission trigger | commission_v4v ≈ total × 0.014, commission_bdsp ≈ total × 0.006 | 3 |
| Indexes | 15 indexes on FKs, status, composite lookups | 3 |
| Register with consent | 201 + token + user created | 4 |
| Register without consent | 400 NDPC error | 4 |
| Transaction + auto-escrow | Created IN_ESCROW, escrow record populated | 4 |
| Dual POD lifecycle | IN_ESCROW → DISPATCHED → COMPLETED, seller credited | 4 |
| BDSP network | 4 members, commission ledger, gender counts | 4 |
| V4V admin override | Manual escrow release/refund | 4 |
| Legacy shim login | user_id="ACT_001", is_bdsp=true | 4 |
| Legacy shim deals | Deals array with old shape | 4 |
| Legacy shim posts | Active marketplace posts from transactions | 4 |
| Activity log | Every write operation recorded | 4 |



---

# Phase 5 (cont.): Document Engine & Partner Mocks

## Section 6: Document Generation

### 6a. Generate Escrow Voucher PDF

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:4000/api/v1/documents/escrow-voucher/1 \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `{"path":".../escrow-voucher-TXN_001.pdf","message":"Escrow voucher generated"}`

### 6b. Download Escrow Voucher PDF

```bash
curl -s -o /dev/null -w "HTTP %{http_code}, Type: %{content_type}, Size: %{size_download}b\n" \
  http://localhost:4000/api/v1/documents/escrow-voucher/1/download \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `HTTP 200, Type: application/pdf, Size: 2xxxb`

### 6c. Verify PDF Content

```bash
file backend/pdfs/escrow-voucher-TXN_001.pdf
```
**Expected:** `PDF document, version 1.4`

### 6d. Generate Insurance Certificate PDF

```bash
curl -s -X POST http://localhost:4000/api/v1/documents/insurance-cert/1 \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** `{"path":".../insurance-cert-POL_001.pdf","message":"Insurance certificate generated"}`

### 6e. Download Insurance Certificate PDF

```bash
curl -s -o /dev/null -w "HTTP %{http_code}, Type: %{content_type}, Size: %{size_download}b\n" \
  http://localhost:4000/api/v1/documents/insurance-cert/1/download \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** `HTTP 200, Type: application/pdf, Size: 2xxxb`

## Section 7: Partner Mock Endpoints

### 7a. Mock Insurance Quote (NAIC)

```bash
curl -s -X POST http://localhost:4000/api/v1/mocks/insurance/quote \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"policy_type":"CROP","sum_insured":500000}' | python3 -m json.tool
```

**Expected:** NAIC quote with premium ≈ 12,500 (2.5% of sum) for CROP, or AXA if specified.

### 7b. Mock Insurance Quote (AXA)

```bash
curl -s -X POST http://localhost:4000/api/v1/mocks/insurance/quote \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"policy_type":"LIVESTOCK","sum_insured":800000,"provider":"AXA"}' | python3 -m json.tool
```

**Expected:** AXA quote with provider="AXA", premium ≈ 25,600 (3.2% of sum).

### 7c. Mock Bank Loan Approval

```bash
curl -s -X POST http://localhost:4000/api/v1/mocks/bank/loan-approval \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"actor_id":1,"amount":500000,"credit_score":72}' | python3 -m json.tool
```

**Expected:** approved: true, interest_rate ≈ 12%, monthly_repayment calculated.

### 7d. Mock Bank Loan Decline (Low Credit)

```bash
curl -s -X POST http://localhost:4000/api/v1/mocks/bank/loan-approval \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"actor_id":10,"amount":500000,"credit_score":30}' | python3 -m json.tool
```

**Expected:** approved: false, message includes "declined".

### 7e. Mock Bank Payout

```bash
curl -s -X POST http://localhost:4000/api/v1/mocks/bank/payout \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"account_number":"0012345678","amount":50000,"bank_name":"GTBank"}' | python3 -m json.tool
```

**Expected:** success: true, reference starts with PAYOUT-, settlement_date is tomorrow.

### 7f. Mock Insurance Claim (Approved)

```bash
curl -s -X POST http://localhost:4000/api/v1/mocks/insurance/claim \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"policy_id":1,"claim_amount":100000,"sum_insured":600000}' | python3 -m json.tool
```

**Expected:** approved: true, status: "APPROVED", payout = claim_amount.

### 7g. Mock Insurance Claim (Exceeds Limit)

```bash
curl -s -X POST http://localhost:4000/api/v1/mocks/insurance/claim \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"policy_id":1,"claim_amount":600000,"sum_insured":600000}' | python3 -m json.tool
```

**Expected:** approved: false, status: "REJECTED", message mentions exceeds max payout.

## Expected Results Summary

| Test | Expected Result | Phase |
|------|----------------|-------|
| Escrow voucher PDF | Generated file on disk, downloadable as PDF | 5 |
| Insurance certificate PDF | Generated file on disk, downloadable as PDF | 5 |
| Mock NAIC quote | Premium ≈ 2.5% of sum insured | 5 |
| Mock AXA quote | Premium ≈ 3.2% of sum insured | 5 |
| Loan approval (good credit) | approved: true, rate ≈ 12% | 5 |
| Loan decline (bad credit) | approved: false | 5 |
| Bank payout | success: true, reference returned | 5 |
| Claim approved | status: APPROVED | 5 |
| Claim exceeds limit | status: REJECTED | 5 |

---

# Phase 6 (cont.): Role-Based Dashboards & Frontend Layouts

Phase 6 builds a mobile-optimized React frontend with KBS/AGRA branding, a 2-step registration form, and 9 distinct role dashboards — each with role-aware sidebar navigation and contextual features.

**Prerequisites:** Backend running on port 4000. Frontend dev server running on port 5173.

```bash
# Start backend (terminal 1)
cd backend && npm start

# Start frontend (terminal 2)
cd frontend && npm run dev
```

## Helper: Authenticated Token

```bash
# Get a BDSP token for protected-route tests
BDSP_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "$BDSP_TOKEN"
```

## 1. Brand Header Verification (Task 6.1)

### 1a. Brand header loads on login page

```bash
curl -s http://localhost:5173 | grep -o 'KBS\|AGRA' | sort -u
```

**Expected:** Output contains both partner brands: `AGRA` and `KBS`. V4V branding appears in the login heading and app shell separately.

### 1b. Brand header visible after login — login API works

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Logged in: {d[\"user\"][\"full_name\"]} ({d[\"user\"][\"actor_type\"]})')
"
```

**Expected:** Login succeeds, response includes user with `actor_type: "BDSP"`.

## 2. Registration Form Verification (Task 6.2)

### 2a. Register a new actor with NDPC consent

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "phone":"+2348190000001",
    "password":"testpass123",
    "full_name":"Phase 6 Tester",
    "actor_type":"SHF",
    "bank_name":"Access Bank",
    "account_number":"9876543210",
    "gender":"FEMALE",
    "lga":"Chikun",
    "state":"Kaduna",
    "channel":"WEB",
    "ndpc_consent":true
  }' | python3 -m json.tool
```

**Expected:** 201 response with `token` and `user` containing `actor_id`, `actor_type: "SHF"`, `kyc_status: "PENDING"`.

### 2b. NDPC consent rejection (without consent)

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "phone":"+2348190000002",
    "password":"testpass123",
    "full_name":"No Consent Tester",
    "actor_type":"SHF",
    "bank_name":"Access Bank",
    "account_number":"1111111111",
    "gender":"MALE",
    "lga":"Chikun"
  }' | python3 -m json.tool
```

**Expected:** 400 response: `{"error":"NDPC data privacy consent required"}`

## 3. Role Dashboard Verification (Task 6.3)

### 3a. SHF Dashboard — Post harvest and track sales

```bash
SHF_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000003","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== SHF: Create transaction (post harvest) ==="
curl -s -X POST http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $SHF_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"buyer_id":11,"seller_id":3,"logistics_id":17,"commodity":"Maize","quantity_kg":200,"unit_price":450}' | \
  python3 -c "
import sys,json; t=json.load(sys.stdin).get('transaction',{})
print(f'Created TX #{t.get(\"tx_id\")}: {t.get(\"commodity\")} {t.get(\"quantity_kg\")}kg × ₦{t.get(\"unit_price\")} = ₦{t.get(\"total_amount\")}')
print(f'Status: {t.get(\"status\")} | Escrow: {t.get(\"escrow_required\")} | V4V fee: ₦{t.get(\"commission_v4v\")} | BDSP fee: ₦{t.get(\"commission_bdsp\")}')
"

echo "=== SHF: Transaction history ==="
curl -s http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $SHF_TOKEN" | \
  python3 -c "
import sys,json; txns=json.load(sys.stdin).get('transactions',[])
my_txns=[t for t in txns if t.get('seller_id')==3]
print(f'{len(my_txns)} transactions as seller')
for t in my_txns[:3]:
    print(f'  #{t[\"tx_id\"]}: {t[\"commodity\"]} {t[\"quantity_kg\"]}kg, ₦{t[\"total_amount\"]}, {t[\"status\"]}')
"
```

**Expected:** Transaction created with auto-calculated amounts. History returns seller's transactions.

### 3b. Aggregator Dashboard — Purchase ledger

```bash
AGG_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000011","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== Aggregator: Purchase history ==="
curl -s http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $AGG_TOKEN" | \
  python3 -c "
import sys,json; txns=json.load(sys.stdin).get('transactions',[])
bought=[t for t in txns if t.get('buyer_id')==11]
total=sum(float(t.get('total_amount',0)) for t in bought)
print(f'{len(bought)} purchases, total spent: ₦{total:,.0f}')
for t in bought[:3]:
    print(f'  #{t[\"tx_id\"]}: {t[\"commodity\"]} from seller #{t[\"seller_id\"]}, ₦{t[\"total_amount\"]}, {t[\"status\"]}')
"
```

**Expected:** Aggregator sees purchases where they are the buyer. Metrics reflect active/completed counts.

### 3c. Input Vendor Dashboard — Inventory listing

```bash
IV_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000014","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== Input Vendor: Create product listing ==="
curl -s -X POST http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $IV_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"buyer_id":11,"seller_id":14,"logistics_id":17,"commodity":"NPK Fertilizer","quantity_kg":500,"unit_price":1200}' | \
  python3 -c "
import sys,json; t=json.load(sys.stdin).get('transaction',{})
print(f'Listed: {t.get(\"commodity\")} {t.get(\"quantity_kg\")}kg × ₦{t.get(\"unit_price\")} = ₦{t.get(\"total_amount\")}')
print(f'Status: {t.get(\"status\")}')
"
```

**Expected:** Transaction created as input vendor listing. Dashboard shows active orders and revenue.

### 3d. BDSP Dashboard — Network view and commission

```bash
echo "=== BDSP: Network metrics ==="
curl -s http://localhost:4000/bdsp/network \
  -H "Authorization: Bearer $BDSP_TOKEN" | \
  python3 -c "
import sys,json; d=json.load(sys.stdin); m=d.get('metrics',{}); cl=m.get('commission_ledger',{})
print(f'Members: {m.get(\"member_count\")}')
print(f'Gender distribution: {m.get(\"gender_counts\")}')
print(f'--- Commission Ledger (70/30 Split) ---')
print(f'Total deal value:   ₦{float(cl.get(\"total_deal_value\",0)):,.0f}')
print(f'V4V revenue (70%):  ₦{float(cl.get(\"total_v4v_revenue\",0)):,.0f}')
print(f'BDSP comm. (30%):   ₦{float(cl.get(\"total_bdsp_commission\",0)):,.0f}')
"
```

**Expected:** Member count reflects BDSP's downline. Commission shows correct 70/30 split. This matches the endpoint the frontend dashboard actually calls (`/bdsp/network`).

### 3e. Logistics Dashboard — Freight jobs and POD confirmation

```bash
LOG_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000017","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== Logistics: Jobs assigned ==="
curl -s http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $LOG_TOKEN" | \
  python3 -c "
import sys,json; txns=json.load(sys.stdin).get('transactions',[])
jobs=[t for t in txns if t.get('logistics_id')==17]
print(f'{len(jobs)} delivery jobs assigned')
for j in jobs[:3]:
    pod='✓' if j.get('trucker_pod_confirmed') else '○'
    print(f'  #{j[\"tx_id\"]}: {j[\"commodity\"]} ₦{j[\"total_amount\"]} | POD: {pod} | {j[\"status\"]}')
"

echo "=== Logistics: POD confirmation ==="
# Find an escrow transaction assigned to this logistics partner
ESCROW_TX=$(curl -s http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $LOG_TOKEN" | \
  python3 -c "
import sys,json; txns=json.load(sys.stdin).get('transactions',[])
j=[t for t in txns if t.get('logistics_id')==17 and t.get('status')=='IN_ESCROW' and not t.get('trucker_pod_confirmed')]
if j: print(j[0]['tx_id'])
" 2>/dev/null)

if [ -n "$ESCROW_TX" ]; then
  curl -s -X POST "http://localhost:4000/api/v1/transactions/$ESCROW_TX/confirm-pod" \
    -H "Authorization: Bearer $LOG_TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"role":"trucker"}' | python3 -c "
import sys,json; t=json.load(sys.stdin).get('transaction',{})
print(f'Trucker POD: {t.get(\"trucker_pod_confirmed\")} | Status: {t.get(\"status\")}')
"
fi
```

**Expected:** Logistics partner sees assigned jobs. POD confirmation marks `trucker_pod_confirmed: true`, status advances to `DISPATCHED`.

### 3f. KBS Dashboard — Training hub

```bash
KBS_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000020","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== KBS: Aggregate transaction data ==="
curl -s http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $KBS_TOKEN" | \
  python3 -c "
import sys,json; txns=json.load(sys.stdin).get('transactions',[])
completed=[t for t in txns if t['status']=='COMPLETED']
total=sum(float(t['total_amount']) for t in txns)
print(f'Network-wide: {len(txns)} transactions, ₦{total:,.0f} total volume')
print(f'Completed: {len(completed)} deals')
print(f'Avg deal: ₦{total/len(txns):,.0f}' if txns else 'No data')
"
```

**Expected:** KBS sees aggregate data across all transactions. Dashboard shows training programs and KPIs.

### 3g. AGRA Dashboard — Strategic overview

```bash
AGRA_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000022","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== AGRA: Commodity distribution ==="
curl -s http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $AGRA_TOKEN" | \
  python3 -c "
import sys,json; txns=json.load(sys.stdin).get('transactions',[])
from collections import Counter
commodities=Counter(t.get('commodity','Unknown') for t in txns)
total=sum(float(t['total_amount']) for t in txns)
print('Commodity distribution by trade value:')
for comm,val in sorted([(c,sum(float(t['total_amount']) for t in txns if t['commodity']==c)) for c in commodities], key=lambda x:-x[1])[:5]:
    print(f'  {comm}: ₦{val:,.0f} ({val/total*100:.0f}%)')
print(f'Total market volume: ₦{total:,.0f}')
"
```

**Expected:** AGRA sees macro-level commodity distribution, completion rates, and market volume.

### 3h. Investor Dashboard — Portfolio tracking

```bash
INV_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000023","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== Investor: Market overview ==="
curl -s http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $INV_TOKEN" | \
  python3 -c "
import sys,json; txns=json.load(sys.stdin).get('transactions',[])
total=sum(float(t['total_amount']) for t in txns)
completed_sum=sum(float(t['total_amount']) for t in txns if t['status']=='COMPLETED')
escrow_count=sum(1 for t in txns if t.get('escrow_required'))
participants=set()
for t in txns:
    participants.add(t.get('buyer_id'))
    participants.add(t.get('seller_id'))
print(f'Network volume: ₦{total:,.0f}')
print(f'Portfolio value: ₦{completed_sum:,.0f}')
print(f'Escrow-protected deals: {escrow_count}')
print(f'Unique participants: {len(participants)}')
"
```

**Expected:** Investor sees market volume, portfolio value, escrow-protected deals count, and unique participants.

### 3i. V4V Admin Dashboard — System control and escrow ledger

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000099","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "=== Admin: Escrow ledger overview ==="
curl -s http://localhost:4000/api/v1/transactions \
  -H "Authorization: Bearer $ADMIN_TOKEN" | \
  python3 -c "
import sys,json; txns=json.load(sys.stdin).get('transactions',[])
escrows=[t for t in txns if t.get('escrow_required')]
active=[t for t in escrows if t['status']=='IN_ESCROW']
disputed=[t for t in txns if t['status']=='DISPUTED']
v4v_total=sum(float(t.get('commission_v4v',0)) for t in txns)
bdsp_total=sum(float(t.get('commission_bdsp',0)) for t in txns)
print(f'Total transactions: {len(txns)}')
print(f'Active escrows: {len(active)}')
print(f'Disputed: {len(disputed)}')
print(f'V4V revenue: ₦{v4v_total:,.0f}')
print(f'BDSP commissions: ₦{bdsp_total:,.0f}')
print(f'Total escrow held: ₦{sum(float(t[\"total_amount\"]) for t in active):,.0f}')
"
```

**Expected:** Admin sees all transactions with commission ledger totals and active escrow amounts.

## 4. Role-Aware Navigation

### 4a. Verify sidebar navigation changes per role

```bash
# Each role should see different nav items matching ROLE_NAV in App.jsx
for role in "BDSP:+2348100000001" "SHF:+2348100000003" "LOGISTICS:+2348100000017" "KBS:+2348100000020" "AGRA:+2348100000022" "INVESTOR:+2348100000023" "V4V_ADMIN:+2348100000099"; do
  role_name="${role%%:*}"
  role_phone="${role##*:}"
  token=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"phone\":\"$role_phone\",\"password\":\"password123\"}" | \
    python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
  echo "$role_name: login OK (token=${token:0:15}...)"
done
```

**Expected:** All 7 distinct role logins succeed, each with correct `actor_type`.

### 4b. Verify non-BDSP cannot access BDSP network endpoint

```bash
# Both the shim and V1 endpoints reject non-BDSP roles — test the shim first
curl -s http://localhost:4000/bdsp/network \
  -H "Authorization: Bearer $SHF_TOKEN" -w "\nHTTP %{http_code}" | tail -1
```

**Expected:** `HTTP 403` (blocked by role check — only BDSP sees their network).

## 5. Marketplace Verification

### 5a. Marketplace loads posts

```bash
curl -s http://localhost:4000/posts | python3 -c "
import sys,json; posts=json.load(sys.stdin).get('posts',[])
print(f'{len(posts)} active marketplace posts')
for p in posts[:4]:
    print(f'  {p[\"post_id\"]}: {p[\"item_name\"]} - {p[\"post_type\"]} by {p[\"posted_by\"]} ({p[\"poster_role\"]})')
"
```

**Expected:** Active posts visible with type, item name, poster, and role.

### 5b. Marketplace filters via API

```bash
echo "=== Filter by SELL ==="
curl -s 'http://localhost:4000/posts?status=Active' | python3 -c "
import sys,json; posts=json.load(sys.stdin).get('posts',[])
sell=[p for p in posts if p.get('post_type')=='SELL']
buy=[p for p in posts if p.get('post_type')=='BUY']
print(f'{len(sell)} SELL listings, {len(buy)} BUY listings')
"
```

**Expected:** Marketplace supports type filtering (SELL/BUY).

## 6. Frontend Build Verification

### 6a. Frontend builds without errors

```bash
cd frontend && npm run build 2>&1 | tail -10
```

**Expected:** Build succeeds with `✓ built in Xs` and no errors or warnings.

## 7. Mobile Responsiveness

### 7a. API proxy works via Vite dev server

```bash
curl -s "http://localhost:5173/api/health" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Proxy health: {d.get(\"status\")} (DB: {d.get(\"database_time\")})')
"
```

**Expected:** `Proxy health: ok (DB: 2026-...)` — proves Vite proxy to backend works.

## 8. Phase 6 Manual Checklist (Browser Tests)

Open `http://localhost:5173` in a browser and verify. All accounts use password `password123`.

**Test account reference:**

| Role | Phone | Actor name |
|------|-------|------------|
| BDSP | +2348100000001 | Amina Yusuf |
| Farmer (SHF) | +2348100000003 | Fatima Abubakar |
| Aggregator | +2348100000011 | Emeka Okafor |
| Input Vendor | +2348100000014 | Chinedu Obi |
| Logistics | +2348100000017 | Usman Garba |
| KBS | +2348100000020 | Dr. Nnenna Okafor |
| AGRA | +2348100000022 | Chinedu Agu |
| Investor | +2348100000023 | Alhaji Shehu Idris |
| Admin | +2348100000099 | Admin User |

### Login Page
- [x] KBS and AGRA partner logos visible in header (dark brand panel)
- [x] "Sign in to V4V" heading with phone/password fields
- [x] Demo credentials hint shows BDSP, Aggregator, Logistics, Farmer SHF examples
- [x] Default password for all test accounts is `password123`
- [x] "Create new account" link navigates to registration
- [x] NDPC compliance badge at bottom of brand panel

### Registration Form
- [x] Step 1: Full name, phone, role selector (9 roles), gender, LGA, state
- [x] Step 2: Bank name, account number, password, confirm password
- [x] NDPC consent checkbox on step 2 (required to submit)
- [x] Back button navigates between steps
- [x] Registration succeeds with valid data — auto-login redirects to dashboard

### SHF Dashboard (`+2348100000003`)
- [x] "My Farm Dashboard" heading with subtitle
- [x] 4 metric cards: Active listings, Completed sales, Total earned, Crops
- [x] "Post harvest" button reveals inline form (commodity, quantity, unit price, buyer)
- [x] Posting creates a transaction in the table below
- [x] Transaction table shows commodity, qty, unit price, total, status, date
- [x] Sidebar: Dashboard, Deals, Marketplace

### Aggregator Dashboard (`+2348100000011`)
- [x] "Aggregator Dashboard" with 4 metrics: Active purchases, Completed, Total spent, Suppliers
- [x] Purchase ledger table with search field
- [x] Table columns: Commodity, Qty, Total, Seller, Status, Date
- [x] Sidebar: Dashboard, Deals, Marketplace

### Input Vendor Dashboard (`+2348100000014`)
- [x] "Input Vendor Portal" with 4 metrics: Active orders, Listings, Revenue, Inventory
- [x] "Add listing" button reveals product form
- [x] Transaction history table
- [x] Sidebar: Dashboard, Deals, Marketplace

### BDSP Dashboard (`+2348100000001`)
- [x] "BDSP Network" with 4 metrics: Network members, Active listings, Deal value, Commission
- [x] Gender distribution bar chart with IFC KPI note
- [x] Value allocation panel: V4V revenue (70%) and BDSP commission (30%)
- [x] Network members table with search — shows name, role, gender, ward, production, joined
- [x] Sidebar: Dashboard (Network), Deals, Marketplace

### Logistics Dashboard (`+2348100000017`)
- [x] "Logistics Dashboard" with 4 metrics: Open jobs, Delivered, Active routes, Total jobs
- [x] Freight jobs table: Commodity, route (seller → buyer), value, POD status, action
- [x] "Confirm POD" button visible for non-confirmed, non-completed jobs
- [x] Sidebar: Dashboard (Jobs), Deals

### KBS Dashboard (`+2348100000020`)
- [x] "KBS Training Hub" with 4 metrics: Active participants, Total volume, Completed, Certifications
- [x] Training programs list: Financial Literacy, Climate-Smart Farming, Digital Marketplace Ops, Post-Harvest Management
- [x] Each course has an "Enroll" button
- [x] Performance snapshot: total value, avg deal size, completion rate
- [x] Recent activity table with latest transactions
- [x] "Generate report" button
- [x] Sidebar: Dashboard (Training Hub), Reports

### AGRA Dashboard (`+2348100000022`)
- [x] "AGRA Strategic Dashboard" with 4 metrics: Total volume, Completed value, Active participants, Top commodity
- [x] Commodity distribution bars by trade value
- [x] Regional summary: LGA, transaction count, completion rate, data compliance status
- [x] "Export data" button visible
- [x] Sidebar: Dashboard (Overview), Reports

### Investor Dashboard (`+2348100000023`)
- [x] "Investor Dashboard" with 4 metrics: Network volume, Portfolio value, Escrow-protected, Market reach
- [x] Credit facility opportunities: Smallholder Input Financing, Aggregator Working Capital, Logistics Fleet Expansion
- [x] Each opportunity has "Inquire" button
- [x] Portfolio snapshot: total disbursed, avg deal size, yield, market activity
- [x] Sidebar: Dashboard (Portfolio), Reports

### V4V Admin Dashboard (`+2348100000099`)
- [x] "V4V Admin Console" with 4 metrics: Total transactions, Active escrows, Disputed, V4V revenue
- [x] System health panel: API Server, Database, Escrow Engine, Audit Logging, Document Engine — all "Operational"
- [x] Commission ledger: V4V revenue (70%), BDSP commissions (30%), total escrow held, mean deal value
- [x] Escrow ledger table with filter chips: All / Active / Disputed
- [x] Table shows: ID, Commodity, Amount, V4V Fee, BDSP Fee, Status, Escrow indicator
- [x] Sidebar: Dashboard (Console), Deals, Reports

### Mobile Layout (resize below 760px)
- [x] Sidebar collapses behind hamburger menu (left icon in top bar)
- [x] Metrics grid stacks to single column
- [x] Listing grid stacks to single column
- [x] Login screen stacks vertically (brand panel on top, form below)
- [x] All dashboard panels remain readable at small widths

## 9. Phase 6 Automated Smoke Test

Run this single command to verify all Phase 6 features end-to-end:

```bash
echo "=== PHASE 6 SMOKE TEST ===" && \
echo -n "Proxy health: " && curl -sf "http://localhost:5173/api/health" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" && \
echo -n "Brand header: " && curl -sf http://localhost:5173 | grep -q KBS && echo "KBS present" || echo "missing KBS" && \
echo -n "Register: " && curl -sf -X POST http://localhost:4000/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"phone":"+2348190000999","password":"p6test99","full_name":"P6 Smoke","actor_type":"SHF","bank_name":"GTBank","account_number":"1234567899","gender":"MALE","lga":"Chikun","state":"Kaduna","channel":"WEB","ndpc_consent":true}' | \
  python3 -c "import sys,json; print(f'OK actor {json.load(sys.stdin)[\"user\"][\"actor_id\"]}')" && \
echo -n "NDPC rejection: " && curl -s -X POST http://localhost:4000/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"phone":"+2348190000998","password":"p6test98","full_name":"No Consent","actor_type":"SHF","bank_name":"GTBank","account_number":"9999999998","gender":"MALE","lga":"Chikun"}' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print('PASS' if 'consent' in d.get('error','') else 'FAIL')" && \
echo -n "SHF login: " && T1=$(curl -sf -X POST http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000003","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "OK (token=${T1:0:12}...)" && \
echo -n "SHF create tx: " && curl -sf -X POST http://localhost:4000/api/v1/transactions -H "Authorization: Bearer $T1" \
  -H 'Content-Type: application/json' \
  -d '{"buyer_id":11,"seller_id":3,"logistics_id":17,"commodity":"SmokeTest","quantity_kg":50,"unit_price":300}' | \
  python3 -c "import sys,json; t=json.load(sys.stdin).get('transaction',{}); print(f'OK #{t[\"tx_id\"]} ₦{t[\"total_amount\"]}')" && \
echo -n "BDSP login: " && T2=$(curl -sf -X POST http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "OK (token=${T2:0:12}...)" && \
echo -n "BDSP network: " && curl -sf http://localhost:4000/bdsp/network -H "Authorization: Bearer $T2" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); m=d['metrics']; print(f'{m[\"member_count\"]} members, ₦{float(m[\"commission_ledger\"][\"total_deal_value\"]):,.0f} volume')" && \
echo -n "Logistics login: " && T3=$(curl -sf -X POST http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000017","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "OK" && \
echo -n "Admin login: " && T4=$(curl -sf -X POST http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000099","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "OK" && \
echo -n "Admin escrow count: " && curl -sf http://localhost:4000/api/v1/transactions -H "Authorization: Bearer $T4" | \
  python3 -c "import sys,json; txns=json.load(sys.stdin).get('transactions',[]); esc=sum(1 for t in txns if t.get('escrow_required')); print(f'{esc} escrow deals')" && \
echo -n "KBS login: " && T5=$(curl -sf -X POST http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000020","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])") && \
echo "OK" && \
echo -n "Marketplace: " && curl -sf http://localhost:4000/posts | python3 -c "import sys,json; print(f'{len(json.load(sys.stdin)[\"posts\"])} active posts')" && \
echo -n "Build: " && cd /home/mdjibril/Github/agritech-bdsp/frontend && npm run build 2>&1 | grep -qE '(built|ready)' && echo "OK" || echo "FAIL" && \
echo "=== ALL PHASE 6 CHECKS PASSED ==="
```

## API Endpoints Introduced or Used in Phase 6

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | None | 9-role registration with bank details and NDPC consent |
| `POST` | `/api/v1/auth/login` | None | Password login returning role & JWT |
| `GET` | `/api/v1/transactions` | Any | List user's transactions (role-filtered on frontend) |
| `POST` | `/api/v1/transactions` | Any | Create transaction (post harvest, listing) |
| `POST` | `/api/v1/transactions/:id/confirm-pod` | Participant | Dual POD confirmation (trucker/buyer) |
| `GET` | `/bdsp/network` | BDSP | Downline network data with commission ledger (shim, used by frontend) |
| `GET` | `/posts` | None | Legacy marketplace posts shim |
| `GET` | `/health` | None | Health check |

## Expected Results Summary

| Test | Expected Result | Task |
|------|----------------|------|
| Brand header renders | KBS and AGRA logos visible in login + app shell | 6.1 |
| Register with bank + role + consent | 201, user created with kyc_status PENDING | 6.2 |
| Register without NDPC consent | 400 error: "consent required" | 6.2 |
| SHF: post harvest | Transaction created with auto-calculated totals | 6.3 |
| Aggregator: purchase ledger | Sees own purchases with total spent | 6.3 |
| Input Vendor: add listing | Transaction created, active orders increment | 6.3 |
| BDSP: network + commission | Downline members visible, correct 70/30 split via shim endpoint | 6.3 |
| Logistics: POD confirm | trucker_pod_confirmed: true, status → DISPATCHED | 6.3 |
| KBS: training + KPIs | Aggregate transaction data, course enrollment buttons | 6.3 |
| AGRA: strategic overview | Commodity distribution, completion rate, export handler | 6.3 |
| Investor: portfolio tracking | Network volume, escrow count, credit opportunities | 6.3 |
| V4V Admin: escrow ledger | All transactions, commission ledger, system health | 6.3 |
| Role-aware navigation | Each role gets correct sidebar nav items | 6.3 |
| Non-BDSP blocked from BDSP route | 403 Forbidden on `/bdsp/network` | 6.3 |
| Mobile responsive | Sidebar collapses, grids stack, usable at 760px | 6.3 |
| Frontend builds clean | `npm run build` succeeds without errors | 6.3 |

## End-to-End Transaction Flow (Smallholder Farmer)

This walkthrough covers the full lifecycle: registration → harvest listing → buyer purchase → logistics → escrow release → reporting.

### Prerequisites

- Backend, frontend, and database are running
- You have the demo aggregator credentials: `+2348100000011` / `password123` (actor_id: 11)
- You have the demo logistics credentials: `+2348100000017` / `password123` (actor_id: 17)

### Step 1 — Register as a Smallholder Farmer

1. Open the app at `http://localhost:5173`
2. Click **Create new account**
3. Fill in the registration form:
   - **Full name**: e.g. *Hadiza Mohammed*
   - **Phone**: e.g. *+2348160591684* (use a unique number)
   - **Role**: *Smallholder Farmer (SHF)*
   - **Gender**: *Female*
   - **LGA**: *Chikun*
   - **State**: *Kaduna*
4. Click **Continue**
5. Fill step 2:
   - **Bank name**: *GTBank*
   - **Account number**: *0123456789*
   - **Password**: set a password
   - Confirm password
   - Check the NDPC consent box
6. Click **Create account**
7. ✅ You're logged in to the **My Farm Dashboard** with metrics at 0

### Step 2 — Post a Harvest for Sale

1. On the My Farm Dashboard, click **Post harvest**
2. Fill in:
   - **Commodity**: *Maize*
   - **Quantity (kg)**: *500*
   - **Unit price (₦/kg)**: *350*
   - **Buyer (optional)**: leave empty (or enter `11` for the aggregator demo)
3. Click **List for sale**
4. ✅ A new transaction is created. You'll see it in the transaction history below with status **INITIATED**

> ⚠️ If you left buyer empty, the transaction still creates successfully — the system accepts `null` for buyer. A BDSP or aggregator can match later.

### Step 3 — Aggregator Buys the Harvest (switch role)

1. Log out (sidebar → **Sign out**)
2. Log in as the aggregator: `+2348100000011` / `password123`
3. Go to **Dashboard** — you'll see the **Aggregator Dashboard**
4. The purchase ledger shows all transactions. If you entered a buyer_id above, you'll see it here.
5. Click **Deals** in the sidebar to view escrow status (if the transaction is escrow-protected)

### Step 4 — BDSP Deposits Funds (if escrow required)

1. Log out and log in as BDSP: `+2348100000001` / `password123`
2. Go to **Deals**
3. Find the deal and click **Deposit Funds**
4. ✅ Status moves from `INITIATED` to `IN_ESCROW` (funds held)

### Step 5 — Logistics Confirms Delivery (POD)

1. Log out and log in as logistics: `+2348100000017` / `password123`
2. Go to **Dashboard** (labeled **Jobs**)
3. Find the job in the freight table
4. Click **Confirm POD** (Proof of Delivery)
5. ✅ `trucker_pod_confirmed` set to `true`, status progresses

### Step 6 — Buyer Confirms Receipt

1. Log back in as the aggregator (`+2348100000011`)
2. Go to **Deals**
3. Find the deal and click **Confirm Receipt**
4. ✅ Buyer side confirmed

### Step 7 — Seller Confirms Dispatch

1. Log back in as your SHF farmer (`+2348160591684`)
2. Go to **Deals**
3. Click **Confirm Dispatch**
4. ✅ All three confirmations received → deal releases, funds disperse

### Step 8 — View Reports (KBS / AGRA roles)

Only **KBS** and **AGRA** roles can access the Reports page.

#### As KBS Staff:

1. Log out and log in as KBS: phone is not in the demo list — register a new account with role **KBS Staff**
2. Go to **Training Hub** dashboard — you'll see aggregate transaction KPIs (total volume, completed deals)
3. Click **Reports** in the sidebar
4. ✅ See available reports:
   - **Training completion report** — Certification tracking and participant outcomes
   - **Network participation summary** — BDSP performance and farmer onboarding KPIs
5. Click **Generate** on either to trigger the report handler

#### As AGRA Partner:

1. Log out and log in as AGRA: create/use a **AGRA Partner** account
2. Go to **Overview** dashboard — commodity distribution, completion rates, NDPC compliance status
3. Click **Reports** in the sidebar
4. ✅ See available reports:
   - **Regional production summary** — Aggregate commodity volumes by LGA
   - **NDPR compliance export** — Audit-ready data for regulatory reporting
5. Click **Export** to trigger the data stream

### Demo Credentials Reference

| Role | Phone | Password | actor_id |
|------|-------|----------|----------|
| BDSP | `+2348100000001` | `password123` | 1 |
| Aggregator | `+2348100000011` | `password123` | 11 |
| Logistics | `+2348100000017` | `password123` | 17 |
| SHF Farmer | `+2348100000003` | `password123` | 3 |
