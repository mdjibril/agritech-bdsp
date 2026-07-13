# VALUE-4-VALUE (V4V) INCLUSIVE AGRICULTURAL DPI - MASTER DEVELOPMENT PLAN

## Executive Summary
**Goal:** Deploy an Inclusive Agricultural Digital Public Infrastructure (DPI) for Nigeria serving 9 distinct marketplace roles across 4 access channels (USSD, WhatsApp, Web, Mobile App) with 0% smartphone exclusion.
**Target Baseline:** 100 Users in Chikun LGA (60 via KBS Students, 40 via 2 Certified BDSPs. 50% Women baseline).
**Regulatory Mandates:** Local hosting (PostgreSQL Engine, `UTC+1 / Africa/Lagos` default timezone setting), NDPC Act 2023 data retention constraints, and automated NITDA 2019 audit logging.
**Git Workflow:** Strict feature-branch isolation. No direct commits to `main`. Every phase requires a new branch (`feature/phase-X-...`) and a verified merge request back to `main` upon completion.

---

## Phase 1: Local Prototype Schema Setup
*Objective: Initialize baseline local repositories and relational tracking tables.*

- [x] **Task 1.1:** Initialize Git source control hierarchy (`/backend`, `/frontend`, `/whatsapp-bot`)
- [x] **Task 1.2:** Provision local development relational storage instance
- [x] **Task 1.3:** Setup local target mock tables (`users`, `network_members`, `posts`, `hubs`, `deals`, `activity_log`)

---

## Phase 2: Core Prototype Business Logic
*Objective: Build standard authentication, role access validation, and posting lifecycles.*

- [x] **Task 2.1:** Implement phone identification and password hashing routines
- [x] **Task 2.2:** Configure `is_bdsp` validation check barriers across secure platform routes
- [x] **Task 2.3:** Deploy mock transactional escrow status states (`Funds-Held-Placeholder`)

---

## Phase 3: DB Migration & Full Marketplace Upgrade (Round 2)
*Objective: Refactor the database layout into an enterprise-ready 6-table relational model on PostgreSQL to support full marketplace mechanics, banking fields, and dual-lock escrow logic.*

- [x] **Task 3.0 (Git Workflow):** Created and checked out feature branch:
  `git checkout -b feature/phase-3-postgres-migration`
- [x] **Task 3.1:** Executed migration script to drop prototype tables and instantiate the enterprise 7-table schema (`actors`, `transactions`, `escrow`, `loans`, `insurance_policies`, `training_records`, `activity_log`) with GENERATED ALWAYS AS IDENTITY PKs, CHECK constraints, and self-referencing `bdsp_id` FK:

### Upgraded Table 1: `actors`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `actor_id` | BIGINT | **PK** | `GENERATED ALWAYS AS IDENTITY` |
| `actor_type` | VARCHAR(50) | - | CHECK IN (`'SHF','AGGREGATOR','INPUT_VENDOR','LOGISTICS','BDSP','KBS','AGRA','INVESTOR','V4V_ADMIN'`) |
| `full_name` | VARCHAR(255) | - | Required |
| `phone` | VARCHAR(20) | **Unique** | Required Index for WhatsApp OTP Sign-Up |
| `channel` | VARCHAR(20) | - | CHECK IN (`'USSD','WHATSAPP','WEB','APP'`) Default: `'WHATSAPP'` |
| `bank_name` | VARCHAR(100) | - | Required for payout routing |
| `account_number` | VARCHAR(20) | - | Required for payout routing |
| `state` | VARCHAR(50) | - | Default: `'Kaduna'` |
| `lga` | VARCHAR(100) | - | Composite Index Target |
| `gps_lat` | NUMERIC(10,8) | - | Target for precision logistics routing |
| `gps_lng` | NUMERIC(11,8) | - | Target for precision logistics routing |
| `kyc_status` | VARCHAR(20) | - | CHECK IN (`'PENDING','VERIFIED','REJECTED'`) Default: `'PENDING'` |
| `gender` | VARCHAR(15) | - | CHECK IN (`'MALE','FEMALE','OTHER'`) (IFC KPI target) |
| `bdsp_id` | BIGINT | **FK** | References `actors(actor_id)` ON DELETE SET NULL (Tracks Mini-Networks) |
| `wallet_balance` | NUMERIC(15,2) | - | Default: `0.00` |
| `created_at` | TIMESTAMPTZ | - | Default: `NOW()` |
| `updated_at` | TIMESTAMPTZ | - | Default `NOW()` |

### Upgraded Table 2: `transactions`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `tx_id` | BIGINT | **PK** | `GENERATED ALWAYS AS IDENTITY` |
| `buyer_id` | BIGINT | **FK** | References `actors(actor_id)` |
| `seller_id` | BIGINT | **FK** | References `actors(actor_id)` |
| `logistics_id` | BIGINT | **FK** | References `actors(actor_id)` (Assigned Logistics Partner) |
| `commodity` | VARCHAR(100) | - | Required (e.g., `'Maize'`, `'Soybean'`, or input items) |
| `quantity_kg` | NUMERIC(12,2) | - | Required volume metric |
| `unit_price` | NUMERIC(12,2) | - | Required unit pricing ledger value |
| `total_amount` | NUMERIC(15,2) | **Generated** | `GENERATED ALWAYS AS (quantity_kg * unit_price) STORED` |
| `status` | VARCHAR(30) | - | CHECK IN (`'INITIATED','IN_ESCROW','DISPATCHED','DELIVERED','COMPLETED','DISPUTED'`) |
| `trucker_pod_confirmed`| BOOLEAN | - | Default: `FALSE` (Part 1 of Dual POD Lock) |
| `buyer_pod_confirmed`  | BOOLEAN | - | Default: `FALSE` (Part 2 of Dual POD Lock) |
| `escrow_required`| BOOLEAN | **Generated** | `GENERATED ALWAYS AS (CASE WHEN (quantity_kg * unit_price) > 50 THEN TRUE ELSE FALSE END) STORED` |
| `commission_v4v` | NUMERIC(15,2) | - | Auto-calculated share |
| `commission_bdsp`| NUMERIC(15,2) | - | Auto-calculated share |

### Upgraded Table 3: `escrow`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `escrow_id` | BIGINT | **PK** | `GENERATED ALWAYS AS IDENTITY` |
| `tx_id` | BIGINT | **FK / Unique**| References `transactions(tx_id)` ON DELETE CASCADE |
| `amount` | NUMERIC(15,2) | - | Required active transaction value metric |
| `funded_by` | BIGINT | **FK** | References `actors(actor_id)` (Buyer Link) |
| `status` | VARCHAR(30) | - | CHECK IN (`'HELD','RELEASED_TO_SELLER','REFUNDED_TO_BUYER'`) |
| `funded_at` | TIMESTAMPTZ | - | Default: `NOW()` |
| `released_at` | TIMESTAMPTZ | - | Nullable confirmation timestamp parameter |

### Upgraded Table 4: `loans`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `loan_id` | BIGINT | **PK** | `GENERATED ALWAYS AS IDENTITY` |
| `actor_id` | BIGINT | **FK** | References `actors(actor_id)` |
| `lender_bank` | VARCHAR(100) | - | Target Bank Identity (e.g., `'BOA'`) |
| `amount` | NUMERIC(15,2) | - | Capital total |
| `tenor_months` | INT | - | Credit timeline window parameter |
| `interest_rate` | NUMERIC(5,2) | - | Numerical percentage calculation value |
| `credit_score` | INT | - | Calculated index using historical transaction metrics |
| `status` | VARCHAR(30) | - | CHECK IN (`'APPLIED','APPROVED','DISBURSED','REPAID','DEFAULTED'`) |
| `insurance_policy_id`| VARCHAR(100)| - | Cross-reference link to active NAIC/AXA policy |

### Upgraded Table 5: `insurance_policies`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `policy_id` | BIGINT | **PK** | `GENERATED ALWAYS AS IDENTITY` |
| `actor_id` | BIGINT | **FK** | References `actors(actor_id)` |
| `provider` | VARCHAR(30) | - | CHECK IN (`'NAIC'`,`'AXA'`) |
| `policy_type` | VARCHAR(30) | - | CHECK IN (`'CROP'`, `'LIVESTOCK'`, `'EQUIPMENT'`) |
| `premium` | NUMERIC(12,2) | - | Calculated buyer insurance liability value |
| `sum_insured` | NUMERIC(15,2) | - | Financial coverage envelope capacity |
| `status` | VARCHAR(30) | - | CHECK IN (`'ACTIVE'`, `'CLAIMED'`, `'EXPIRED'`) |
| `commission_v4v` | NUMERIC(12,2) | - | Auto-calculated coverage margin (**12% constant**) |

### Upgraded Table 6: `training_records`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `record_id` | BIGINT | **PK** | `GENERATED ALWAYS AS IDENTITY` |
| `actor_id` | BIGINT | **FK** | References `actors(actor_id)` |
| `course_name` | VARCHAR(255) | - | e.g., `'Financial Literacy'`, `'Climate-Smart Farming'` |
| `provider` | VARCHAR(100) | - | Default: `'KBS TRAINING HUB'` |
| `status` | VARCHAR(30) | - | CHECK IN (`'ENROLLED'`, `'COMPLETED'`, `'FAILED'`) |

- [x] **Task 3.2:** Configured performance indexes on `actors(actor_type, state)`, `transactions(status)`, `training_records(actor_id, course_name)`, plus 11 additional indexes on FKs and status columns across all tables.
- [x] **Task 3.3:** Injected 25 seed actors across all 9 roles with realistic Nigerian names, bank details, and BDSP network relationships, plus 10 transactions covering all lifecycle statuses, 2 escrow records, 2 loans, 2 insurance policies, 3 training records, and 5 audit log entries.
- [ ] **Task 3.4 (Git Workflow):** Commit changes, push to remote, and merge `feature/phase-3-postgres-migration` back to `main`.
  `git add . && git commit -m "Phase 3 complete: Upgraded 6-table Postgres schema"`
  `git checkout main && git merge feature/phase-3-postgres-migration`

---

## Phase 4: Enterprise API & Dual-Lock Middleware Extension
*Objective: Build core business logic handling 9-role signups, automatic commissions, and double-confirmation tracking.*

- [ ] **Task 4.0 (Git Workflow):** Create and checkout a new isolated API development branch:
  `git checkout -b feature/phase-4-middleware-api`
- [ ] **Task 4.1:** Build standard authentication pipelines using an internal Phone + Mock WhatsApp OTP validation simulator that requires bank details on signup.
- [ ] **Task 4.2:** Implement the **NDPC Regulatory Consent Middleware**:
  > Intercept all structural write commands on `/actors/register`. If explicit user data-consent flags are missing, block execution and return `Error 400: { "status": "error", "message": "NDPC data privacy consent required" }`.
- [ ] **Task 4.3:** Program the **Automated Marketplace Revenue Engine Hook**:
  > Create an async database listener or application service hook to fire upon successful deal creation. If transaction total exceeds $50, lock funds in escrow and calculate platform distribution margins:
  > `commission_v4v = total_amount * 0.02 * 0.70`
  > `commission_bdsp = total_amount * 0.02 * 0.30`
- [ ] **Task 4.4:** Build the **Dual POD Escalation Verification Route** (`/api/v1/transactions/:id/confirm-pod`):
  > Accept flags for either `trucker_pod_confirmed` or `buyer_pod_confirmed`. Escrow funds state cannot transition to `RELEASED_TO_SELLER` until both boolean records resolve to true.
- [ ] **Task 4.5:** Implement automated text logging handlers to mirror all transactional modifications into local audit trail storage to maintain strict NITDA 2019 compliance.
- [ ] **Task 4.6 (Git Workflow):** Commit changes, push to remote, and merge `feature/phase-4-middleware-api` back to `main`.
  `git add . && git commit -m "Phase 4 complete: Dual-lock logic & 9-role API endpoints"`
  `git checkout main && git merge feature/phase-4-middleware-api`

---

## Phase 5: Local Document Engines & Partner Mocking
*Objective: Construct localized template rendering engines without using external cloud platform APIs.*

- [ ] **Task 5.0 (Git Workflow):** Create and checkout a new isolated document engine branch:
  `git checkout -b feature/phase-5-document-engines`
- [ ] **Task 5.1:** Integrate a decoupled local document compiler library (e.g., `FPDF` or `jsPDF`) into the core runtime engine.
- [ ] **Task 5.2:** Build the standardized **Escrow Account Confirmation Voucher Template** mapping out tracking references, payment amounts, and holding locks. Save generated documents directly to local project paths: `/var/www/v4v.ng/pdfs/`.
- [ ] **Task 5.3:** Build the standardized **Digital Insurance Certificate Template** pulling active relational data parameters directly from `insurance_policies`.
- [ ] **Task 5.4:** Create structured API data mocking switches to return test data configurations representing external services like NAIC, AXA, or partner bank systems.
- [ ] **Task 5.5 (Git Workflow):** Commit changes, push to remote, and merge `feature/phase-5-document-engines` back to `main`.
  `git add . && git commit -m "Phase 5 complete: Local document engines & partner mocks operational"`
  `git checkout main && git merge feature/phase-5-document-engines`

---

## Phase 6: Role-Based Dashboards & Frontend Layouts
*Objective: Build a mobile-optimized frontend using persistent branding headers (KBS, AGRA logos) and separate view configurations mapped to the 9 user roles.*

- [ ] **Task 6.0 (Git Workflow):** Create and checkout a new isolated frontend development branch:
  `git checkout -b feature/phase-6-role-dashboards`
- [ ] **Task 6.1:** Place high-visibility **KBS and AGRA partner branding logos** into the master layout application header across all application states.
- [ ] **Task 6.2:** Develop registration interfaces capturing phone records, custom bank detail entries, and an explicit role assignment selector field.
- [ ] **Task 6.3:** Implement the **9 Distinct Role Dashboards** via dynamic conditional state parameters:
  *   **SHF Interface:** Form inputs to post crop harvests, clean visualization vectors to view pending aggregator offers, and live payout status monitors.
  *   **Aggregator Interface:** Live purchasing dashboard to search distributed SHF harvest offers, batch procurement filters, and logistics assignment tools.
  *   **Input Vendor Interface:** Inventory listing management portal, real-time inbound product order alerts, and transaction history cards.
  *   **BDSP Interface:** Downline network view (list of farmers onboarded by their specific account ID), commission trackers, and localized performance KPI cards.
  *   **Logistics Partner Interface:** Open freight/delivery job acceptance boards, routing maps, and double-lock POD submission controls (Trucker confirmation switch).
  *   **KBS Interface:** Training hub master view, digital student/BDSP certification action triggers, and global performance report generation toolsets.
  *   **AGRA Interface:** High-level strategic analytical layout, aggregate macroeconomic regional production summaries, and automated NDPR-compliant export handlers.
  *   **Investor Interface:** Capital distribution tracking maps, open credit facility opportunities, and aggregated agricultural loan portfolio trackers.
  *   **V4V Admin Interface:** Comprehensive system control panel, open escrow ledger overrides, manual conflict reconciliation workflows, and system health monitors.
- [ ] **Task 6.4 (Git Workflow):** Commit changes, push to remote, and merge `feature/phase-6-role-dashboards` back to `main`.
  `git add . && git commit -m "Phase 6 complete: 9 role dashboards & branding integration"`
  `git checkout main && git merge feature/phase-6-role-dashboards`

---

## Phase 7: Validation, Compliance, & Production Hardening
*Objective: Run multi-channel verification tests and extract compliance audit trails.*

- [ ] **Task 7.0 (Git Workflow):** Create and checkout a new isolated stabilization and hardening branch:
  `git checkout -b feature/phase-7-compliance-validation`
- [ ] **Task 7.1:** Execute end-to-end multi-channel sync validation tracking (Register user via simulated WhatsApp data payload -> confirm matching database record entry inside `actors` -> inspect real-time visual output on the Web Management Grid).
- [ ] **Task 7.2:** Build the **IFC Monitoring & Evaluation Data Webhook Endpoint** (`/webhooks/ifc`) to summarize and export aggregate data, including total transaction volume, lending portfolios, and women onboarding ratios.
- [ ] **Task 7.3:** Verify the **NITDA Secure Compliance Extraction Endpoint** (`/api/v1/activity/export`), ensuring it properly compiles and streams active transaction logs into a clean, comma-separated format.
- [ ] **Task 7.4 (Git Workflow):** Commit changes, push to remote, and merge `feature/phase-7-compliance-validation` back to `main`.
  `git add . && git commit -m "Phase 7 complete: End-to-end validation & platform production ready"`
  `git checkout main && git merge feature/phase-7-compliance-validation`