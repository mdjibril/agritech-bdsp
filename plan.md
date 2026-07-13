# VALUE-4-VALUE (V4V) INCLUSIVE AGRICULTURAL DPI - MASTER DEVELOPMENT PLAN

## Executive Summary
**Goal:** Deploy an Inclusive Agricultural Digital Public Infrastructure (DPI) for Nigeria serving 9 distinct marketplace roles across 4 access channels (USSD, WhatsApp, Web, Mobile App) with 0% smartphone exclusion.
**Target Baseline:** 100 Users in Chikun LGA (60 via KBS Students, 40 via 2 Certified BDSPs. 50% Women baseline).
**Regulatory Mandates:** Local hosting (MySQL InnoDB, `utf8mb4_unicode_ci` in Nigeria region), NDPC Act 2023 data retention constraints, and automated NITDA 2019 audit logging.

---

## Phase 1: Local Prototype Schema Setup
*Objective: Initialize baseline local repositories and relational tracking tables.*

- [x] **Task 1.1:** Initialize Git source control hierarchy (`/backend`, `/frontend`, `/whatsapp-bot`) **[ACHIEVED]**
- [x] **Task 1.2:** Provision local development relational storage instance **[ACHIEVED]**
- [x] **Task 1.3:** Setup local target mock tables (`users`, `network_members`, `posts`, `hubs`, `deals`, `activity_log`) **[ACHIEVED]**

---

## Phase 2: Core Prototype Business Logic
*Objective: Build standard authentication, role access validation, and posting lifecycles.*

- [x] **Task 2.1:** Implement phone identification and password hashing routines **[ACHIEVED]**
- [x] **Task 2.2:** Configure `is_bdsp` validation check barriers across secure platform routes **[ACHIEVED]**
- [x] **Task 2.3:** Deploy mock transactional escrow status states (`Funds-Held-Placeholder`) **[ACHIEVED]**

---

## Phase 3: DB Migration & Full Marketplace Upgrade (Round 2)
*Objective: Refactor the database layout into an enterprise-ready 6-table relational mode to support full marketplace mechanics, banking fields, and dual-lock escrow logic.*

- [ ] **Task 3.1:** Execute data migration scripts to drop prototype layout tables and instantiate the upgraded `v4v_dpi` database using the production DDL:

### Upgraded Table 1: `actors`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `actor_id` | BIGINT UNSIGNED | **PK** | Auto Increment |
| `actor_type` | ENUM | - | `'SHF','AGGREGATOR','INPUT_VENDOR','LOGISTICS','BDSP','KBS','AGRA','INVESTOR','V4V_ADMIN'` |
| `full_name` | VARCHAR(255) | - | Required |
| `phone` | VARCHAR(20) | **Unique** | Required Index for WhatsApp OTP Sign-Up |
| `channel` | ENUM | - | `'USSD','WHATSAPP','WEB','APP'` (Default: `'WHATSAPP'`) |
| `bank_name` | VARCHAR(100) | - | Required for payout routing |
| `account_number` | VARCHAR(20) | - | Required for payout routing |
| `state` | VARCHAR(50) | - | Default: `'Kaduna'` |
| `lga` | VARCHAR(100) | - | Composite Index Target |
| `gps_lat` | DECIMAL(10,8) | - | Target for precision logistics routing |
| `gps_lng` | DECIMAL(11,8) | - | Target for precision logistics routing |
| `kyc_status` | ENUM | - | `'PENDING','VERIFIED','REJECTED'` (Default: `'PENDING'`) |
| `gender` | ENUM | - | `'MALE','FEMALE','OTHER'` (IFC KPI target) |
| `bdsp_id` | BIGINT UNSIGNED | **FK** | References `actors(actor_id)` ON DELETE SET NULL (Tracks Mini-Networks) |
| `wallet_balance` | DECIMAL(15,2) | - | Default: `0.00` |
| `created_at` | TIMESTAMP | - | Default: `CURRENT_TIMESTAMP` |
| `updated_at` | TIMESTAMP | - | Default `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` |

### Upgraded Table 2: `transactions`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `tx_id` | BIGINT UNSIGNED | **PK** | Auto Increment |
| `buyer_id` | BIGINT UNSIGNED | **FK** | References `actors(actor_id)` |
| `seller_id` | BIGINT UNSIGNED | **FK** | References `actors(actor_id)` |
| `logistics_id` | BIGINT UNSIGNED | **FK** | References `actors(actor_id)` (Assigned Logistics Partner) |
| `commodity` | VARCHAR(100) | - | Required (e.g., `'Maize'`, `'Soybean'`, or input items) |
| `quantity_kg` | DECIMAL(12,2) | - | Required volume metric |
| `unit_price` | DECIMAL(12,2) | - | Required unit pricing ledger value |
| `total_amount` | DECIMAL(15,2) | **Generated** | `ALWAYS AS (quantity_kg * unit_price) STORED` |
| `status` | ENUM | - | `'INITIATED','IN_ESCROW','DISPATCHED','DELIVERED','COMPLETED','DISPUTED'` |
| `trucker_pod_confirmed`| BOOLEAN | - | Default: `FALSE` (Part 1 of Dual POD Lock) |
| `buyer_pod_confirmed`  | BOOLEAN | - | Default: `FALSE` (Part 2 of Dual POD Lock) |
| `escrow_required`| BOOLEAN | **Generated** | `ALWAYS AS (total_amount > 50) STORED` |
| `commission_v4v` | DECIMAL(15,2) | - | Auto-calculated share |
| `commission_bdsp`| DECIMAL(15,2) | - | Auto-calculated share |

### Upgraded Table 3: `escrow`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `escrow_id` | BIGINT UNSIGNED | **PK** | Auto Increment |
| `tx_id` | BIGINT UNSIGNED | **FK / Unique**| References `transactions(tx_id)` ON DELETE CASCADE |
| `amount` | DECIMAL(15,2) | - | Required active transaction value metric |
| `funded_by` | BIGINT UNSIGNED | **FK** | References `actors(actor_id)` (Buyer Link) |
| `status` | ENUM | - | `'HELD','RELEASED_TO_SELLER','REFUNDED_TO_BUYER'` |
| `funded_at` | TIMESTAMP | - | Default: `CURRENT_TIMESTAMP` |
| `released_at` | TIMESTAMP | - | Nullable confirmation timestamp parameter |

### Upgraded Table 4: `loans`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `loan_id` | BIGINT UNSIGNED | **PK** | Auto Increment |
| `actor_id` | BIGINT UNSIGNED | **FK** | References `actors(actor_id)` |
| `lender_bank` | VARCHAR(100) | - | Target Bank Identity (e.g., `'BOA'`) |
| `amount` | DECIMAL(15,2) | - | Capital total |
| `tenor_months` | INT | - | Credit timeline window parameter |
| `interest_rate` | DECIMAL(5,2) | - | Numerical percentage calculation value |
| `credit_score` | INT | - | Calculated index using historical transaction metrics |
| `status` | ENUM | - | `'APPLIED','APPROVED','DISBURSED','REPAID','DEFAULTED'` |
| `insurance_policy_id`| VARCHAR(100)| - | Cross-reference link to active NAIC/AXA policy |

### Upgraded Table 5: `insurance_policies`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `policy_id` | BIGINT UNSIGNED | **PK** | Auto Increment |
| `actor_id` | BIGINT UNSIGNED | **FK** | References `actors(actor_id)` |
| `provider` | ENUM | - | `'NAIC'`,`'AXA'` |
| `policy_type` | ENUM | - | `'CROP'`, `'LIVESTOCK'`, `'EQUIPMENT'` |
| `premium` | DECIMAL(12,2) | - | Calculated buyer insurance liability value |
| `sum_insured` | DECIMAL(15,2) | - | Financial coverage envelope capacity |
| `status` | ENUM | - | `'ACTIVE'`, `'CLAIMED'`, `'EXPIRED'` |
| `commission_v4v` | DECIMAL(12,2) | - | Auto-calculated coverage margin (**12% constant**) |

### Upgraded Table 6: `training_records`
| Field Name | Type | Key/Relation | Target Options / Constraints |
| :--- | :--- | :---: | :--- |
| `record_id` | BIGINT UNSIGNED | **PK** | Auto Increment |
| `actor_id` | BIGINT UNSIGNED | **FK** | References `actors(actor_id)` |
| `course_name` | VARCHAR(255) | - | e.g., `'Financial Literacy'`, `'Climate-Smart Farming'` |
| `provider` | VARCHAR(100) | - | Default: `'KBS TRAINING HUB'` |
| `status` | ENUM | - | `'ENROLLED'`, `'COMPLETED'`, `'FAILED'` |

- [ ] **Task 3.2:** Configure database performance tracking indexes on `actors(actor_type, state)`, `transactions(status)`, and composite structural mappings on `training_records(actor_id, course_name)`.
- [ ] **Task 3.3:** Inject production mock seed data containing baseline entities across all 9 roles to test end-to-end interactions.

---

## Phase 4: Enterprise API & Dual-Lock Middleware Extension
*Objective: Build core business logic handling 9-role signups, automatic commissions, and double-confirmation tracking.*

- [ ] **Task 4.1:** Build standard authentication pipelines using an internal Phone + Mock WhatsApp OTP validation simulator that requires bank details on signup.
- [ ] **Task 4.2:** Implement the **NDPC Regulatory Consent Middleware**:
  > Intercept all structural write commands on `/actors/register`. If explicit user data-consent flags are missing, block execution and return `Error 400: { "status": "error", "message": "NDPC data privacy consent required" }`.
- [ ] **Task 4.3:** Program the **Automated Marketplace Revenue Engine Hook**:
  > Create an async database listener to fire upon successful deal creation. If transaction total exceeds $50, lock funds in escrow and calculate platform distribution margins:
  > `commission_v4v = total_amount * 0.02 * 0.70`
  > `commission_bdsp = total_amount * 0.02 * 0.30`
- [ ] **Task 4.4:** Build the **Dual POD Escalation Verification Route** (`/api/v1/transactions/:id/confirm-pod`):
  > Accept flags for either `trucker_pod_confirmed` or `buyer_pod_confirmed`. Escrow funds state cannot transition to `RELEASED_TO_SELLER` until both boolean records resolve to true.
- [ ] **Task 4.5:** Implement automated text logging handlers to mirror all transactional modifications into local audit trail storage to maintain strict NITDA 2019 compliance.

---

## Phase 5: Local Document Engines & Partner Mocking
*Objective: Construct localized template rendering engines without using external cloud platform APIs.*

- [ ] **Task 5.1:** Integrate a decoupled local document compiler library (e.g., `FPDF` or `jsPDF`) into the core runtime engine.
- [ ] **Task 5.2:** Build the standardized **Escrow Account Confirmation Voucher Template** mapping out tracking references, payment amounts, and holding locks. Save generated documents directly to local project paths: `/var/www/v4v.ng/pdfs/`.
- [ ] **Task 5.3:** Build the standardized **Digital Insurance Certificate Template** pulling active relational data parameters directly from `insurance_policies`.
- [ ] **Task 5.4:** Create structured API data mocking switches to return test data configurations representing external systems like NAIC, AXA, or partner bank systems.

---

## Phase 6: Role-Based Dashboards & Frontend Layouts
*Objective: Build a mobile-optimized frontend using persistent branding headers (KBS, AGRA logos) and separate view configurations mapped to the 9 user roles.*

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

---

## Phase 7: Validation, Compliance, & Production Hardening
*Objective: Run multi-channel verification tests and extract compliance audit trails.*

- [ ] **Task 7.1:** Execute end-to-end multi-channel sync validation tracking (Register user via simulated WhatsApp data payload -> confirm matching database record entry inside `actors` -> inspect real-time visual output on the Web Management Grid).
- [ ] **Task 7.2:** Build the **IFC Monitoring & Evaluation Data Webhook Endpoint** (`/webhooks/ifc`) to summarize and export aggregate data, including total transaction volume, lending portfolios, and women onboarding ratios.
- [ ] **Task 7.3:** Verify the **NITDA Secure Compliance Extraction Endpoint** (`/api/v1/activity/export`), ensuring it properly compiles and streams active transaction logs into a clean, comma-separated format.