# V4V Agritech BDSP — Test Guide

## Quick Start

```bash
# 1. Start the database
bash scripts/start-postgres.sh

# 2. Start the backend (terminal 2)
cd backend && npm start

# 3. Start the frontend (terminal 3)
cd frontend && npm run dev
```

**Live deployments:**
- Frontend: https://agritech-bdsp-frontend.onrender.com
- Backend:  https://agritech-bdsp-back.onrender.com

**Test accounts (password: `password123` for all):**

| Role | Phone | Actor ID | Name |
|------|-------|----------|------|
| BDSP | +2348100000001 | 1 | Amina Yusuf |
| SHF Farmer | +2348100000003 | 3 | Fatima Abubakar |
| Aggregator | +2348100000011 | 11 | Emeka Okafor |
| Input Vendor | +2348100000014 | 14 | Chinedu Obi |
| Logistics | +2348100000017 | 17 | Usman Garba |
| KBS | +2348100000020 | 20 | Dr. Nnenna Okafor |
| AGRA | +2348100000022 | 22 | Chinedu Agu |
| Investor | +2348100000023 | 23 | Alhaji Shehu Idris |
| V4V Admin | +2348100000099 | 25 | Admin User |

---

# Phase 3: Enterprise Schema (Database Verification)

These tests verify the 7-table relational model, computed columns, indexes, and seed data. Database-level checks remain terminal since they verify internal state directly.

## 3.1 Verify 7 Enterprise Tables Exist

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;"
```

**Expected:** `actors, activity_log, escrow, insurance_policies, loans, training_records, transactions`

## 3.2 Verify All 9 Actor Types Seeded

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT actor_type, count(*) FROM actors GROUP BY actor_type ORDER BY actor_type;"
```

**Expected:** At least 1 entry for each of: AGGREGATOR, AGRA, BDSP, INPUT_VENDOR, INVESTOR, KBS, LOGISTICS, SHF, V4V_ADMIN

## 3.3 Verify Computed Columns on Transactions

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT tx_id, commodity, quantity_kg, unit_price, total_amount, escrow_required FROM transactions ORDER BY tx_id LIMIT 5;"
```

**Expected:** `total_amount = quantity_kg × unit_price` (generated column). `escrow_required = true` when total > 50.

## 3.4 Verify Commission Auto-Trigger

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT tx_id, total_amount, commission_v4v, commission_bdsp FROM transactions ORDER BY tx_id LIMIT 5;"
```

**Expected:** `commission_v4v ≈ total_amount × 0.014` (2% × 70%). `commission_bdsp ≈ total_amount × 0.006` (2% × 30%).

## 3.5 Verify Indexes

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('actors','transactions','training_records','activity_log') ORDER BY tablename, indexname;" | grep idx_
```

**Expected:** `idx_actors_type_state`, `idx_transactions_status`, `idx_training_actor_course`, `idx_activity_actor_time` plus FK indexes.

## 3.6 Verify is_platform Column Exists

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT actor_id, actor_type, is_platform FROM actors WHERE actor_type IN ('BDSP','V4V_ADMIN') ORDER BY actor_id;"
```

**Expected:** BDSPs have `is_platform = false`. V4V_ADMIN has `is_platform = true`.

---

# Phase 4: Enterprise API & Dual-Lock Middleware

## 4.1 Registration & NDPC Consent (Browser)

> Use `agent-browser` to navigate to the login page, click "Create new account", fill the registration form, and verify NDPC consent enforcement.

**Browser test steps:**
1. Navigate to the frontend URL
2. Click "Create new account"
3. Fill step 1: full name, unique phone, role "Smallholder Farmer", gender, LGA, state
4. Click "Continue"
5. Fill step 2: bank name, account number, password
6. **Submit without checking NDPC consent** → should be blocked
7. Check NDPC consent box, submit → registration succeeds
8. Verify auto-redirect to SHF Dashboard with metrics at zero

**Expected:** Registration blocked without consent. With consent: user created, auto-login, SHF Dashboard loads.

## 4.2 Login (Browser)

> Use `agent-browser` to log in as each role and verify the correct dashboard loads.

**Browser test steps:**
1. Navigate to login page
2. Enter phone `+2348100000001` and password `password123`
3. Click "Sign in"
4. Verify the BDSP Network dashboard loads with metrics
5. Verify sidebar shows "Dashboard", "Deals", "Marketplace"

**Expected:** Login succeeds. Dashboard heading matches role. Sidebar items are role-specific.

## 4.3 Transaction Creation with Auto-Escrow (Browser)

> Use `agent-browser` to log in as SHF, post a harvest, and verify auto-escrow.

**Browser test steps:**
1. Log in as SHF (`+2348100000003`)
2. Click "Post harvest"
3. Fill form: Commodity "Maize", Quantity 500, Unit price 350
4. Click "List for sale"
5. Verify the transaction appears in the history table below

**Verify in database:**
```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT tx_id, commodity, quantity_kg, unit_price, total_amount, status, escrow_required, commission_v4v, commission_bdsp FROM transactions ORDER BY tx_id DESC LIMIT 1;"
```

**Expected:** `status = 'IN_ESCROW'`, `escrow_required = true`, commissions auto-calculated.

## 4.4 Dual POD Confirmation Lifecycle (Browser)

> Use `agent-browser` to complete the full POD flow: trucker confirms → buyer confirms → escrow releases.

**Browser test steps:**
1. Log in as Logistics (`+2348100000017`), go to Deals page
2. Find an active deal and click "Confirm POD"
3. Log out, log in as Aggregator (`+2348100000011`), go to Deals
4. Find the same deal and click "Confirm Receipt"
5. Verify deal status shows COMPLETED

**Verify in database:**
```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT tx_id, status, trucker_pod_confirmed, buyer_pod_confirmed FROM transactions ORDER BY tx_id DESC LIMIT 3;"
```

**Expected:** Both POD flags `true`, status progresses to COMPLETED.

## 4.5 NDPC Consent Rejection (Terminal — API only)

```bash
curl -s -X POST http://localhost:4000/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "phone":"+2348190000001",
    "password":"test123",
    "full_name":"No Consent User",
    "actor_type":"SHF",
    "bank_name":"GTBank",
    "account_number":"1111111111",
    "gender":"MALE",
    "lga":"Chikun"
  }' | python3 -m json.tool
```

**Expected:** `{"error":"NDPC data privacy consent required"}` (400)

## 4.6 Activity Log Verification (Terminal)

```bash
docker exec -i agritech-bdsp-postgres \
  psql -U agritech -d agritech_bdsp -c \
  "SELECT log_id, actor_id, action, timestamp FROM activity_log ORDER BY log_id DESC LIMIT 10;"
```

**Expected:** Every registration, login, transaction creation, and POD confirmation generates an audit entry.

---

# Phase 5: Document Engines & Partner Mocks

## 5.1 Generate Escrow Voucher (Browser + Terminal)

> Use `agent-browser` to generate a voucher via the API, then verify the PDF file on disk.

**Browser test steps:**
1. Log in as BDSP (`+2348100000001`)
2. Navigate to a deal with escrow
3. Verify escrow details display correctly in the deal card
4. The voucher generation is API-triggered — verify via terminal:

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:4000/api/v1/documents/escrow-voucher/1 \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

**Expected:** Response contains `path` to the generated PDF. File exists on disk.

```bash
file backend/pdfs/escrow-voucher-TXN_001.pdf
# Expected: PDF document, version 1.4
```

## 5.2 Generate Insurance Certificate (Terminal)

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

curl -s -X POST http://localhost:4000/api/v1/documents/insurance-cert/1 \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

file backend/pdfs/insurance-cert-POL_001.pdf
```

**Expected:** PDF generated for insurance policy #1. File exists on disk.

## 5.3 Partner Mock Endpoints (Terminal — API only)

These are pure API endpoints with no UI. Test via terminal.

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Mock insurance quote (NAIC)
echo "=== NAIC Insurance Quote ==="
curl -s -X POST http://localhost:4000/api/v1/mocks/insurance/quote \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"policy_type":"CROP","sum_insured":500000}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Provider: {d.get(\"provider\")} | Premium: ₦{d.get(\"premium\")} | Sum insured: ₦{d.get(\"sum_insured\")}')"

# Mock bank loan approval (good credit)
echo "=== Loan Approval ==="
curl -s -X POST http://localhost:4000/api/v1/mocks/bank/loan-approval \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"actor_id":1,"amount":500000,"credit_score":72}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Approved: {d.get(\"approved\")} | Interest: {d.get(\"interest_rate\")}% | Monthly: ₦{d.get(\"monthly_repayment\")}')"

# Mock bank payout
echo "=== Bank Payout ==="
curl -s -X POST http://localhost:4000/api/v1/mocks/bank/payout \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"account_number":"0012345678","amount":50000,"bank_name":"GTBank"}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Success: {d.get(\"success\")} | Ref: {d.get(\"reference\")}')"

# Mock insurance claim
echo "=== Insurance Claim ==="
curl -s -X POST http://localhost:4000/api/v1/mocks/insurance/claim \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"policy_id":1,"claim_amount":100000,"sum_insured":600000}' | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Approved: {d.get(\"approved\")} | Status: {d.get(\"status\")} | Payout: ₦{d.get(\"payout\")}')"
```

**Expected:** NAIC quote ~2.5% premium. Loan approved for credit score > 50. Payout returns reference. Claim approved when within sum insured.

---

# Phase 6: Role-Based Dashboards (Browser)

All 9 dashboards are UI-only — test them in the browser.

## 6.1 Brand Header Verification (Browser)

> Use `agent-browser` to verify KBS and AGRA logos appear on the login page and all dashboards.

**Browser test steps:**
1. Navigate to the login page
2. Verify the brand panel shows KBS and AGRA partner logos
3. Verify V4V logo appears in the brand mark area
4. Log in as any role → verify the top bar shows the brand header
5. Verify NDPC compliance badge is visible in the login brand panel

**Expected:** KBS, AGRA, and V4V branding visible on login and all dashboard views.

## 6.2 Registration Form (Browser)

> Use `agent-browser` to complete the 2-step registration flow.

**Browser test steps:**
1. Click "Create new account" from login page
2. Verify step 1 shows: full name, phone, role selector (9 roles), gender, LGA, state
3. Fill all fields and click "Continue"
4. Verify step 2 shows: bank name, account number, password, confirm password, NDPC consent checkbox
5. Verify "Back" button returns to step 1
6. Verify NDPC consent checkbox is required
7. Submit with consent checked → auto-login to dashboard

**Expected:** 2-step form works. Registration creates account. Auto-login redirects to correct dashboard.

## 6.3 SHF Dashboard (Browser)

> Use `agent-browser` to log in as a farmer and verify dashboard features.

**Browser test steps:**
1. Log in as `+2348100000003` / `password123`
2. Verify heading: "My Farm Dashboard"
3. Verify 4 metric cards: Active listings, Completed sales, Total earned, Crops
4. Click "Post harvest" → verify form appears with commodity, quantity, unit price fields
5. Fill form and submit → verify transaction appears in history table below
6. Verify KBS Training Hub section shows available courses
7. Click "Enroll" on a course → verify enrollment updates
8. Verify the "Scan Harvest Health" button opens a modal with spoilage risk mock
9. Verify the floating chat bubble (bottom-right) opens the AI Advisor modal

**Expected:** Post harvest creates transaction. Course enrollment works. AI POC placeholders display correctly.

## 6.4 Aggregator Dashboard (Browser)

> Use `agent-browser` to log in as an aggregator and verify purchase ledger.

**Browser test steps:**
1. Log in as `+2348100000011` / `password123`
2. Verify heading: "Aggregator Dashboard"
3. Verify 4 metrics: Active purchases, Completed, Total spent, Suppliers
4. Verify purchase ledger table with search field
5. Type a commodity name in the search → verify table filters
6. Click "Post buy request" → verify form appears
7. Verify the Market Trend Forecast card shows the static chart mockup
8. Verify the "Subscribe — ₦1,000/month" button is present (greyed out)

**Expected:** Purchase ledger filters correctly. Market trend chart displays. Post buy request form works.

## 6.5 BDSP Dashboard (Browser)

> Use `agent-browser` to log in as a BDSP and verify network view.

**Browser test steps:**
1. Log in as `+2348100000001` / `password123`
2. Verify heading: "BDSP Network"
3. Verify 4 metrics: Network members, Active listings, Deal value, Commission
4. Verify gender distribution panel with IFC KPI note
5. Verify commission panel: BDSP commission (30%)
6. Verify network members table shows downline farmers with name, role, gender, ward

**Expected:** Network members table shows SHFs under this BDSP. Commission values are non-zero.

## 6.6 Logistics Dashboard (Browser)

> Use `agent-browser` to log in and verify freight jobs.

**Browser test steps:**
1. Log in as `+2348100000017` / `password123`
2. Verify heading includes "Logistics"
3. Verify metrics: Open jobs, Delivered, Active routes
4. Verify freight jobs table with commodity, route, value, POD status
5. Find a non-confirmed job and click "Confirm POD"
6. Verify POD status updates

**Expected:** Jobs assigned to this logistics partner are listed. POD confirmation works.

## 6.7 KBS Dashboard (Browser)

> Use `agent-browser` to log in as KBS and verify training hub.

**Browser test steps:**
1. Log in as `+2348100000020` / `password123`
2. Verify heading: "KBS Training Hub"
3. Verify 4 metrics: Active participants, Total volume, Completed, Certifications
4. Verify training programs list with 4 courses
5. Verify each course shows enrollment count and certification count
6. Click "Generate report" → verify report filters appear (course, status, gender)
7. Click "Export CSV" → verify CSV downloads
8. Verify the "Generate IFAD/AGRA Impact Report (AI)" button opens a modal
9. Verify the modal shows loading bar, report preview, and ₦500,000 billing note

**Expected:** Training programs display correctly. Report filters work. CSV exports. AI report modal works.

## 6.8 AGRA Dashboard (Browser)

> Use `agent-browser` to log in and verify strategic overview.

**Browser test steps:**
1. Log in as `+2348100000022` / `password123`
2. Verify heading: "AGRA Strategic Dashboard"
3. Verify 4 metrics: Total volume, Completed value, Active participants, Top commodity
4. Verify commodity distribution bars by trade value
5. Verify regional summary panel with LGA, transaction count, completion rate
6. Verify "Export data" button is visible

**Expected:** Commodity distribution bars are proportional. Export button present.

## 6.9 Investor Dashboard (Browser)

> Use `agent-browser` to verify portfolio tracking and AI card.

**Browser test steps:**
1. Log in as `+2348100000023` / `password123`
2. Verify heading: "Investor Dashboard"
3. Verify 4 metrics: Network volume, Portfolio value, Escrow-protected, Market reach
4. Verify 3 credit facility opportunities with "Inquire" buttons
5. Verify the "Risk & Yield Prediction (AI)" card with 86% confidence score
6. Verify yield forecast, revenue projection, credit viability metrics
7. Verify "Buy profile — ₦2,000/farmer" button is greyed out

**Expected:** Credit opportunities listed. AI prediction card displays with static mock data.

## 6.10 V4V Admin Dashboard (Browser)

> Use `agent-browser` to verify admin console with all filters.

**Browser test steps:**
1. Log in as `+2348100000099` / `password123`
2. Verify heading: "V4V Admin Console"
3. Verify 4 metrics: Total transactions, Active escrows, Disputed, Registered users
4. Verify system health panel — all 5 services show "Operational"
5. Verify commission ledger shows Phase 7 revenue breakdown
6. Verify BDSP Network section lists certified BDSPs
7. Verify User Registry — test role filter (select SHF)
8. Verify BDSP ID filter — select a BDSP, verify only their SHFs appear
9. Verify Escrow Ledger with filter chips (all / active / completed / disputed)
10. Verify Training Reports section with course/status/gender filters

**Expected:** All filters work. Commission ledger has values. BDSP filter returns only SHFs under that BDSP.

## 6.11 Marketplace (Browser)

> Use `agent-browser` to browse marketplace listings.

**Browser test steps:**
1. Log in as any role with Marketplace access (BDSP, Aggregator, SHF, Input Vendor)
2. Click "Marketplace" in the sidebar
3. Verify tabs: Sell listings, Buy requests, Recent deals
4. Verify search field and category/LGA filters
5. Click a listing → verify details expand (commodity, price, seller, escrow requirement)

**Expected:** Listings load. Tabs switch content. Filters narrow results.

## 6.12 Reports (Browser — KBS / AGRA / V4V Admin)

> Use `agent-browser` to verify the Reports page with Phase 8 filters.

**Browser test steps:**
1. Log in as V4V Admin (`+2348100000099`)
2. Click "Reports" in the sidebar
3. Verify 3 report types: Completed Transactions, Farmer Participation, Financial Summary
4. Click "Generate" on Completed Transactions → verify date filters, gender filter, BDSP ID filter appear
5. Select "Female" from gender → verify table filters to only female sellers
6. Click "Export CSV" → verify download triggers
7. Generate Farmer Participation report → verify BDSP ID filter and gender filter
8. Select a BDSP from the dropdown → verify only their SHFs appear
9. Verify table includes BDSP column

**Expected:** All filters work on reports. Gender filter narrows results. BDSP filter shows correct SHFs.

## 6.13 Mobile Responsiveness (Browser)

> Use `agent-browser` to verify mobile layout at viewport width 760px or below.

**Browser test steps:**
1. Set viewport to 375×812 (iPhone)
2. Navigate to login page → verify brand panel stacks above login form
3. Log in → verify sidebar is collapsed behind hamburger menu
4. Click hamburger → verify sidebar slides open
5. Verify metrics grid stacks to single column
6. Verify tables are horizontally scrollable

**Expected:** Mobile layout is usable. No content is cut off.

---

# Phase 7: Financial & Commission Mechanics

## 7.1 Commission Ledger Verification (Browser)

> Use `agent-browser` to verify the commission breakdown in the V4V Admin dashboard.

**Browser test steps:**
1. Log in as `+2348100000099`
2. Scroll to "Commission Ledger" panel
3. Verify breakdown shows:
   - Marketplace Fee (1%)
   - Logistics Coordination (10% of freight)
   - Insurance Pool Total (2%)
   - → Insurance Provider (80% of pool)
   - → Gateway Reserve (2% of pool)
   - → BDSP Share (40% of 18% residual)
   - → Operations Reserve (20% of 18% residual)
   - Consolidated V4V Revenue
4. Verify all values are non-zero (if transactions exist)

**Expected:** All commission line items display with calculated values.

## 7.2 Escrow Ledger with Financial Columns (Browser)

> Use `agent-browser` to verify escrow transactions show all Phase 7 financial columns.

**Browser test steps:**
1. Log in as `+2348100000099`
2. Scroll to "Escrow Ledger" table
3. Verify columns: ID, Commodity, Base, Insurance, Mkt Fee, Log. Coord, Total Invoice, V4V Rev, BDSP, Status
4. Verify Total Invoice = Base + Insurance + Mkt Fee + Log. Coord + Logistics Fee
5. Switch between filter tabs (all / active / completed / disputed)

**Expected:** Financial columns populated. Total Invoice calculation correct. Filters work.

## 7.3 BDSP Commission in BDSP Dashboard (Browser)

> Use `agent-browser` to verify BDSP sees their commission.

**Browser test steps:**
1. Log in as `+2348100000001`
2. Verify commission split panel shows correct 70/30 values
3. Verify total deal value and BDSP commission are consistent with transactions under this BDSP's SHFs

**Expected:** Commission values reflect transactions from this BDSP's network members.

---

# Phase 8: AI Integration & Monetization POC (Browser)

## 8.1 Farm Advisor Chatbot (Browser)

> Use `agent-browser` to verify the floating chat bubble and advisor modal on the SHF Dashboard.

**Browser test steps:**
1. Log in as `+2348100000003`
2. Verify floating chat bubble (green circle with message icon) in the bottom-right corner
3. Click the chat bubble → modal opens with "Ask V4V Farm Advisor" title
4. Verify mock conversation: AI greeting → user question about maize leaves → AI response about nitrogen deficiency
5. Verify Premium Subscription card shows ₦500/month and "Coming soon" button
6. Close the modal

**Expected:** Chat bubble opens modal with mock conversation. Premium card is non-functional (greyed out).

## 8.2 Harvest Health Scanner (Browser)

> Use `agent-browser` to verify the harvest scan modal.

**Browser test steps:**
1. Log in as `+2348100000003`
2. Click "Scan harvest health" button
3. Verify modal shows "Scan Harvest Health" title
4. Verify mock tomato image placeholder with `tomatoes_harvest_sample.jpg` label
5. Verify "30% Spoilage Risk" badge with warning triangle
6. Verify "Confirm ₦50 deduction via wallet" button is greyed out
7. Close the modal

**Expected:** Static mock UI with spoilage badge. Pay-per-scan button disabled.

## 8.3 Market Trend Forecast (Browser)

> Use `agent-browser` to verify the static chart on the Aggregator Dashboard.

**Browser test steps:**
1. Log in as `+2348100000011`
2. Scroll to "Market Trend Forecast (AI)" card
3. Verify bar chart mockup shows 12 bars (Jan–Dec)
4. Verify legend: Maize (green) and Soybean (lime)
5. Verify "Subscribe — ₦1,000/month for 48hr early alerts" button is greyed out

**Expected:** Static bar chart renders. Subscription button disabled.

## 8.4 Risk & Yield Prediction (Browser)

> Use `agent-browser` to verify the AI prediction card on the Investor Dashboard.

**Browser test steps:**
1. Log in as `+2348100000023`
2. Verify "Risk & Yield Prediction (AI)" card with brain icon
3. Verify 86% confidence score circle for Farmer A (Maize, Chikun LGA)
4. Verify 4 metric boxes: Yield forecast (3,200 kg), Revenue projection (₦1.2M), Credit viability (Highly viable), Crop risk level (Low)
5. Verify "Buy profile — ₦2,000/farmer" and "Request underwriting report" buttons are greyed out
6. Verify "B2B SaaS" pricing note at bottom

**Expected:** Static prediction card with mock data. All buttons disabled.

## 8.5 IFAD/AGRA Impact Report Generator (Browser)

> Use `agent-browser` to verify the report modal on the KBS Dashboard.

**Browser test steps:**
1. Log in as `+2348100000020`
2. Scroll to Training Programs section
3. Click "Generate IFAD/AGRA Impact Report (AI)" button
4. Verify modal opens with animated loading bar
5. Verify "Compiling AI insights..." text with spinner
6. Verify report preview shows: Total SHFs trained, Women participants with %, Courses delivered, Certification rate, Transaction volume, Completed transactions
7. Verify "Generate Report (₦500,000)" button is greyed out
8. Verify pricing note "₦500,000 per comprehensive report"
9. Click "Close preview"

**Expected:** Modal loads with live stats. Loading bar animates. Generate button disabled.

---

# Phase 6 Manual Checklist (Quick Visual Sweep)

Open the frontend in a browser and log in with each account (password: `password123`):

| Role | Phone | Verify |
|------|-------|--------|
| BDSP | +2348100000001 | Network metrics, gender distribution, commission split, downline table |
| SHF | +2348100000003 | Post harvest form, transaction history, training hub, AI chat bubble, harvest scan |
| Aggregator | +2348100000011 | Purchase ledger with search, market trend chart |
| Input Vendor | +2348100000014 | Inventory listings, order alerts |
| Logistics | +2348100000017 | Freight jobs, POD confirmation button |
| KBS | +2348100000020 | Training programs, enrollment, AI impact report button |
| AGRA | +2348100000022 | Commodity bars, regional summary, export button |
| Investor | +2348100000023 | Credit opportunities, AI prediction card |
| V4V Admin | +2348100000099 | Escrow ledger, commission breakdown, BDSP filter, user registry, training reports |

**Sidebar check:** Each role should only see nav items relevant to their role (Dashboard → Deals → Marketplace for traders; Dashboard → Reports for KBS/AGRA/Investor; Dashboard → Deals → Reports for Admin).

**Mobile check:** Resize to phone width. Hamburger menu works. Tables scroll horizontally. Forms are usable.

---

# Full Smoke Test (Automated — Terminal)

Run this to verify all API endpoints and database state in one go:

```bash
echo "=== V4V SMOKE TEST ===" && \
echo -n "Health: " && curl -sf http://localhost:4000/health | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" && \
echo -n "DB Tables: " && docker exec -i agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" && \
echo -n "Actors: " && docker exec -i agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -tA -c "SELECT count(*) FROM actors;" && \
echo -n "Transactions: " && docker exec -i agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -tA -c "SELECT count(*) FROM transactions;" && \
echo -n "Register: " && curl -sf -X POST http://localhost:4000/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"phone":"+2348199999999","password":"smoke123","full_name":"Smoke Test","actor_type":"SHF","bank_name":"GTBank","account_number":"9999999999","gender":"MALE","lga":"Chikun","ndpc_consent":true}' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(f'OK actor {d[\"user\"][\"actor_id\"]}')" && \
echo -n "Login: " && T=$(curl -sf -X POST http://localhost:4000/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"phone":"+2348100000001","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'][:15])") && \
echo "OK (token=$T...)" && \
echo -n "Create TX: " && curl -sf -X POST http://localhost:4000/api/v1/transactions -H "Authorization: Bearer $T" \
  -H 'Content-Type: application/json' \
  -d '{"buyer_id":11,"seller_id":3,"logistics_id":17,"commodity":"SmokeTest","quantity_kg":10,"unit_price":100}' | \
  python3 -c "import sys,json; t=json.load(sys.stdin).get('transaction',{}); print(f'OK #{t[\"tx_id\"]} ₦{t[\"total_amount\"]} escrow={t[\"escrow_required\"]}')" && \
echo -n "Activity Log: " && docker exec -i agritech-bdsp-postgres psql -U agritech -d agritech_bdsp -tA -c "SELECT count(*) FROM activity_log;" && \
echo -n "Frontend Build: " && cd /home/mdjibril/Github/agritech-bdsp/frontend && npm run build 2>&1 | grep -q 'built' && echo "OK" && \
echo "=== ALL CHECKS PASSED ==="
```

---

# Phase 10: Website Deployment Guide

This guide covers deploying the marketing website, connecting a custom domain via **DomainKing**, setting up subdomains for the dashboard, and provisioning professional email via Zoho Mail.

---

## Step 1 — Purchase Domain on DomainKing

1. Go to [domainking.ng](https://domainking.ng) and search for your preferred domain
2. Purchase: `v4vagritech.com.ng`
3. After payment, the domain appears in your DomainKing dashboard

---

## Step 2 — Deploy Website to Render (Static Site)

### 2a. Create a new Static Site on Render

1. Log into [render.com](https://render.com)
2. Click **New → Static Site**
3. Connect your GitHub/GitLab repo (`mdjibril/agritech-bdsp`)
4. Configure:
   - **Name:** `v4v-website`
   - **Branch:** `main`
   - **Root Directory:** `website`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
5. Click **Create Static Site**

Render will build and deploy. You get a temporary URL like `agritech-v4v-website.onrender.com`.

### 2b. Test the deployment

```bash
curl -s https://agritech-v4v-website.onrender.com | head -20
```

**Expected:** Full HTML page with V4V AGRITECH branding, navigation, and hero section.

---

## Step 3 — Set Up Custom Domain on Render

### 3a. Add custom domain to the Static Site

1. In Render, go to the `v4v-website` dashboard
2. Click **Settings → Custom Domains**
3. Add: `v4vagritech.com`
4. Render gives you a CNAME target (e.g., `www.v4vagritech.com → agritech-v4v-website.onrender.com`)
5. Note the **CNAME record value** Render provides — you'll need this in Step 4

### 3b. Also add the www subdomain

1. Add a second custom domain: `www.v4vagritech.com`
2. Render redirects it automatically, or you can point it to the same target

---

## Step 4 — Configure DNS Records on DomainKing

### What DomainKing auto-created when you made the DNS zone

DomainKing auto-generates hosting defaults when you create a zone with an IP. Your zone currently has these records:

| Name | Type | Value | Action |
|------|------|-------|--------|
| `ftp` | A | `216.24.57.1` | **DELETE** — not using FTP |
| `mail` | A | `216.24.57.1` | **DELETE** — Zoho handles mail |
| `pop` | A | `216.24.57.1` | **DELETE** — Zoho handles mail |
| `smtp` | A | `216.24.57.1` | **DELETE** — Zoho handles mail |
| `@` (root) | A | `216.24.57.1` | **KEEP** — this is your root domain ✓ |
| `www` | A | `216.24.57.1` | **DELETE** — replace with Canonical |
| `@` | NS | `dan1.host-ww.net.` | **KEEP** — DomainKing nameserver ✓ |
| `@` | NS | `dan2.host-ww.net.` | **KEEP** — DomainKing nameserver ✓ |
| `@` | MX | `mail.v4vagritech.com.ng.` | **DELETE** — replace with Zoho MX |
| `@` | TXT | `v=spf1 a mx ip4:102.218.215.41 ~all` | **DELETE** — replace with Zoho SPF |

### Step-by-step changes to make

#### Step 4a — DELETE these 4 auto-created A records

DomainKing created these hosting defaults. You don't need them — Zoho handles email, not your server:
- **ftp** (A record)
- **mail** (A record)
- **pop** (A record)
- **smtp** (A record)

#### Step 4b — DELETE www A record, then CREATE www Canonical Record

1. Delete the `www` **A record** (cannot have both A and CNAME for the same name)
2. Create a new **Canonical Record** (DomainKing's term for CNAME):

| Field | Value |
|---|---|
| Type | **Canonical Record** |
| Name | `www.v4vagritech.com.ng` |
| Target | `agritech-v4v-website.onrender.com.` |

> ⚠️ **Trailing dot is critical.** Without it, DomainKing appends your domain and creates `onrender.com.v4vagritech.com.ng` — invalid.

#### Step 4c — CREATE app Canonical Record

| Field | Value |
|---|---|
| Type | **Canonical Record** |
| Name | `app.v4vagritech.com.ng` |
| Target | `agritech-bdsp-frontend.onrender.com.` |

#### Step 4d — DELETE the auto-created MX record

DomainKing created: `@ MX 10 mail.v4vagritech.com.ng.` — this routes mail to your server. Delete it.

#### Step 4e — DELETE the auto-created TXT (SPF) record

DomainKing created: `"v=spf1 a mx ip4:102.218.215.41 ~all"` — this authorizes the wrong server. Delete it.

#### Step 4f — KEEP these records as-is

| Name | Type | Value | Notes |
|------|------|-------|-------|
| `@` (root) | A | `216.24.57.1` | Your Render IP — correct |
| `@` | NS | `dan1.host-ww.net.` | DomainKing nameserver |
| `@` | NS | `dan2.host-ww.net.` | DomainKing nameserver |

### What your DNS zone should look like after cleanup

| Name | Type | Value | Priority |
|------|------|-------|----------|
| `v4vagritech.com.ng` | A | `216.24.57.1` | - |
| `www.v4vagritech.com.ng` | Canonical (CNAME) | `agritech-v4v-website.onrender.com` | - |
| `app.v4vagritech.com.ng` | Canonical (CNAME) | `agritech-bdsp-frontend.onrender.com` | - |
| `v4vagritech.com.ng` | NS | `dan1.host-ww.net.` | - |
| `v4vagritech.com.ng` | NS | `dan2.host-ww.net.` | - |

> ⚠️ **Do NOT add any MX or TXT records yet.** Zoho email is set up in Step 7. DNS is a dependency chain: get the website working first, then configure email. Mixing records too early causes the "CNAME and other data" error you saw.

---

## Step 5 — Verify DNS Propagation

```bash
dig v4vagritech.com.ng A
dig www.v4vagritech.com.ng CNAME
dig app.v4vagritech.com.ng CNAME
```

Wait 15-30 minutes. Render auto-provisions SSL once DNS resolves.

---

## Step 6 — Update Login Links in Website Code

After DNS is live, update the Login button URLs from the temporary Render URL to the custom subdomain.

### Files to update:
- **`website/src/components/Header.jsx`** — Login button in nav
- **`website/src/components/Footer.jsx`** — "Login to Platform" button
- **`website/src/pages/HomePage.jsx`** — Hero and Platform section login buttons
- **`website/src/pages/SolutionsPage.jsx`** — Platform CTA login button
- **`website/src/pages/PlatformPage.jsx`** — "Login Here" link

```jsx
// Replace all instances of:
href="https://agritech-bdsp-frontend.onrender.com"

// With:
href="https://app.v4vagritech.com.ng"
```

After updating, commit and push. Render auto-redeploys from the `main` branch.

---

## Step 7 — Set Up Zoho Mail (Free Tier — up to 5 users)

### 7a. Create Zoho Mail account

1. Go to [zoho.com/mail](https://www.zoho.com/mail)
2. Click **Sign Up → Business Email**
3. Select **"I have a domain"** and enter `v4vagritech.com`
4. Choose the **Free Plan** (up to 5 users, 5GB each)
5. Create the first account: `phillip.makama@v4vagritech.com`

### 7b. Verify domain ownership (TXT Record)

Zoho gives you a verification code. In DomainKing:

- Type: **TXT Record**
- Name: `v4vagritech.com.ng`
- Value: `zoho-verification=xxxxxxxxx`
- TTL: 3600

Wait 5-10 minutes, click **Verify** in Zoho.

### 7c. Add MX Records for email delivery

In DomainKing:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX Record | `v4vagritech.com.ng` | `mx.zoho.com` | 10 |
| MX Record | `v4vagritech.com.ng` | `mx2.zoho.com` | 20 |
| MX Record | `v4vagritech.com.ng` | `mx3.zoho.com` | 50 |

### 7d. Add SPF + DKIM Records

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT Record | `v4vagritech.com.ng` | `v=spf1 include:zoho.com ~all` | 3600 |

Zoho also provides a DKIM record. In Zoho Admin → Domains → DKIM:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT Record | `zoho._domainkey.v4vagritech.com.ng` | (value from Zoho) | 3600 |

### 7e. Create info@ account

Zoho Admin → **Users** → **Add User** → Username: `info`

### 7f. Test email

```bash
# From any email account, send a test email to phillip.makama@v4vagritech.com
# Verify it lands in the Zoho inbox (not spam)

# Also test sending from Zoho to an external address (e.g., Gmail)
```

---

## Step 8 — Update Contact Form (Optional)

The contact form on the website currently shows an alert. To make it send real email, update `ContactPage.jsx`:

```jsx
// Replace:
onSubmit={(e) => { e.preventDefault(); alert('Message received!'); }}

// With a POST to a lightweight backend or a service like Formspree:
onSubmit={async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  await fetch('https://formspree.io/f/your-form-id', {
    method: 'POST',
    body: formData,
  });
  alert('Message sent! We will get back to you shortly.');
}}
```

---

## DNS Record Summary (Full List for DomainKing)

| Type (DomainKing) | Name | Value | Priority | Purpose |
|---|---|---|---|---|
| A Record | `v4vagritech.com.ng` | `216.24.57.1` | - | Root website |
| Canonical Record (CNAME) | `www.v4vagritech.com.ng` | `agritech-v4v-website.onrender.com.` | - | www redirect |
| Canonical Record (CNAME) | `app.v4vagritech.com.ng` | `agritech-bdsp-frontend.onrender.com.` | - | Dashboard |
| Canonical Record (CNAME) | `api.v4vagritech.com.ng` | `agritech-bdsp-back.onrender.com.` | - | Backend API |
| MX Record | `v4vagritech.com.ng` | `mx.zoho.com` | 10 | Email |
| MX Record | `v4vagritech.com.ng` | `mx2.zoho.com` | 20 | Email |
| MX Record | `v4vagritech.com.ng` | `mx3.zoho.com` | 50 | Email |
| TXT Record | `v4vagritech.com.ng` | `v=spf1 include:zoho.com ~all` | - | SPF |
| TXT Record | `v4vagritech.com.ng` | `zoho-verification=...` | - | Verification |
| TXT Record | `zoho._domainkey.v4vagritech.com.ng` | `v=DKIM1; k=rsa; p=...` | - | DKIM |

---

## Final Verification Checklist

- [ ] `v4vagritech.com.ng` loads the marketing website with HTTPS
- [ ] `www.v4vagritech.com.ng` redirects to `v4vagritech.com.ng`
- [ ] `app.v4vagritech.com.ng` loads the dashboard login page
- [ ] `phillip.makama@v4vagritech.com.ng` receives email
- [ ] `info@v4vagritech.com.ng` receives email
- [ ] Sending from Zoho to Gmail works (not marked as spam)
- [ ] Login buttons on all website pages point to `app.v4vagritech.com.ng`
- [ ] All partner logos load correctly
- [ ] Mobile hamburger menu works on phone viewport
