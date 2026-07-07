# VALUE-4-VALUE (V4V) Proof of Concept (POC) Plan

## Executive Summary
**Goal:** Build a 2-channel (Web + WhatsApp), 1-database platform to onboard 100 users in Chikun LGA.
**Core Mechanics:** Role-based access (SHF, Buyer, Input Dealer, Logistics), BDSP badge logic, and a simulated 3-way Escrow transaction lifecycle.
**Compliance:** NDPC Act 2023 consent capture and NITDA 2019 Audit Trails.
**Field Target:** 100 Users in Chikun LGA (60 via KBS Students, 40 via 2 BDSPs. 50% Women baseline).

---

## Phase 1: Architecture & Database Initialization
*Objective: Set up the foundational database schema and project repositories using the finalized 6-table relational structure.*

- [ ] **Task 1.1:** Initialize Git repository and project structure (`/backend`, `/frontend`, `/whatsapp-bot`).
- [ ] **Task 1.2:** Provision a PostgreSQL database instance.
- [ ] **Task 1.3:** Create database migration files mapping out the strict 6-table layout detailed below:

### Table 1: `users`
| Field Name | Type | Required | Options/Example | Notes |
| :--- | :--- | :---: | :--- | :--- |
| `user_id` | Text | Yes | `USR_001` | **PK**. Auto-generated: `USR_` + 3 digits |
| `onboarded_by` | Dropdown | Yes | `KBS_Student`, `BDSP_01`, `Self` | Outlines onboarding agent track |
| `full_name` | Text | Yes | Aisha Bello | User legal identity |
| `phone` | Text | Yes | `+2348102529947` | **Unique**. Standard login identity ID |
| `password_hash` | Text | Yes | - | Securely hashed auth credentials |
| `primary_role` | Dropdown | Yes | `SHF`, `Buyer`, `Input Dealer`, `Logistics` | Primary operation type |
| `secondary_roles`| Multi-select | No | `SHF`, `Buyer`, `Input Dealer`, `Logistics` | Handles multi-role matrix configuration |
| `is_bdsp` | Boolean | Yes | `True`, `False` | Baseline default: `False` |
| `bdsp_certified_by`| Text | No | `KBS` | Certifying institution string |
| `gender` | Dropdown | Yes | `Male`, `Female` | Required KPI tracking for IFC metrics |
| `lga` | Text | Yes | `Chikun` | Forced local baseline filter for POC |
| `ward` | Text | No | `Rido` | Granular regional identity mapping |
| `gps_lat` | Number | No | `10.5200` | Precision routing parameter |
| `gps_lng` | Number | No | `7.3400` | Precision routing parameter |
| `crops` | Multi-select | No | `Maize`, `Soybean` | Active market commodity index |
| `livestock` | Multi-select | No | `Goats`, `Poultry`, `Piggery` | Active market livestock index |
| `inputs_sold` | Multi-select | No | `NPK`, `Seed` | Operational input parameters |
| `ndpc_consent` | Boolean | Yes | `True` | **NDPC Mandated** data compilation agreement |
| `consent_timestamp`| DateTime | Yes | `2026-05-03 10:00` | Legal compliance timestamping |
| `data_retention_until`| Date | Yes | `2028-05-03` | Automated window (Forced 2-year expiration) |
| `created_at` | DateTime | Yes | `2026-05-01 10:00` | System auto-timestamp |

### Table 2: `network_members`
| Field Name | Type | Required | Example / Relation | Notes |
| :--- | :--- | :---: | :--- | :--- |
| `network_id` | Text | Yes | `NET_001` | **PK**. Unique entry index |
| `bdsp_user_id` | Text | Yes | FK Relation: `users.user_id` | Identifies handling network manager |
| `member_user_id`| Text | Yes | FK Relation: `users.user_id` | Downline user mapping reference |
| `joined_at` | DateTime | Yes | `2026-05-03` | System timestamp tracking connection |

### Table 3: `posts`
| Field Name | Type | Required | Options/Example | Notes |
| :--- | :--- | :---: | :--- | :--- |
| `post_id` | Text | Yes | `PST_001` | **PK**. Unique listing indicator |
| `user_id` | Text | Yes | FK Relation: `users.user_id` | Tracks owner of the listing entry |
| `post_type` | Dropdown | Yes | `SELL`, `BUY` | Nature of transaction intent |
| `category` | Dropdown | Yes | `Crop`, `Livestock`, `Input` | System categorization label |
| `item_name` | Text | Yes | `Maize`, `NPK`, `Goats` | Plain text identifier |
| `quantity` | Number | Yes | `23` | Quantitative volume entry |
| `unit` | Dropdown | Yes | `MT`, `Bags`, `Heads` | Standardized payload volume measurement |
| `price_per_unit` | Number | Yes | `480000` | Unit price value configuration |
| `lga` | Text | Yes | `Chikun` | Operational boundary assignment |
| `interested_count`| Number | No | `12` | Aggregated engagement counter metric |
| `status` | Dropdown | Yes | `Active`, `Hub-Formed`, `Closed` | State management lifecycle tracking |

### Table 4: `hubs`
| Field Name | Type | Required | Options/Example | Notes |
| :--- | :--- | :---: | :--- | :--- |
| `hub_id` | Text | Yes | `CHK-C01` | **PK**. Aggregated cluster container index |
| `formed_by_bdsp_id`| Text | Yes | FK Relation: `users.user_id` | Validates managing agent status validation |
| `category` | Dropdown | Yes | `Crop`, `Livestock`, `Input` | Matches child entry categories |
| `item_name` | Text | Yes | `Maize` | Name matching index |
| `member_user_ids`| List of Text| Yes | `[USR_001, USR_002]` | Array listing aggregated supply nodes |
| `logistics_user_id`| Text | No | FK Relation: `users.user_id` | Assigned transporter link |
| `total_quantity` | Number | Yes | `23` | Summarized aggregate supply volume |
| `status` | Dropdown | Yes | `Formed`, `Logistics-Assigned`, `Completed` | Cluster state engine tracking |

### Table 5: `deals`
| Field Name | Type | Required | Options/Example | Notes |
| :--- | :--- | :---: | :--- | :--- |
| `deal_id` | Text | Yes | `DL_001` | **PK**. Legal escrow transaction container |
| `hub_id` | Text | Yes | FK Relation: `hubs.hub_id` | Maps back to consolidated hub entry |
| `bdsp_user_id` | Text | Yes | FK Relation: `users.user_id` | Direct link to calculate the **30% commission** |
| `buyer_user_id` | Text | Yes | FK Relation: `users.user_id` | Escrow structural engine buyer reference |
| `seller_user_ids`| List of Text| Yes | `[USR_001]` | Array of destination downline suppliers |
| `logistics_user_id`| Text | No | FK Relation: `users.user_id` | Logistics node payment extraction link |
| `deal_value` | Number | Yes | `11040000` | Full contract currency value tracking |
| `escrow_status` | Dropdown | Yes | `Funds-Held-Placeholder` | Live financial state execution indicator |
| `insurance_status`| Dropdown | Yes | `Certificate-Issued-Placeholder`| Integrated partner contract placeholder |
| `v4v_revenue` | Number | Yes | - | Auto-calculated calculation: **70% of revenue** |
| `bdsp_commission`| Number | Yes | - | Auto-calculated calculation: **30% of revenue** |

### Table 6: `activity_log`
*Serves directly as the automated NITDA Compliance Audit Trail.*
| Field Name | Type | Required | Example | Notes |
| :--- | :--- | :---: | :--- | :--- |
| `log_id` | Text | Yes | `LOG_001` | **PK**. Audit record tracker |
| `user_id` | Text | Yes | FK Relation: `users.user_id` | Actor tracking identity identifier |
| `action` | Text | Yes | `Posted Broadcast`, `Formed Hub` | Strict action declaration tracking |
| `timestamp` | DateTime | Yes | `2026-05-10 14:23` | System execution tracking timestamp |

- [ ] **Task 1.4:** Seed the PostgreSQL schema with 2 Certified BDSP structures, 60 KBS student parameters, and test LGA bounds.

---

## Phase 2: Core Backend API Development
*Objective: Build the unified REST engine to parse requests from both Web and WhatsApp channels.*

- [ ] **Task 2.1:** Build registration and login authentication routines mapping directly against the user model fields.
- [ ] **Task 2.2:** Establish middleware to read the `is_bdsp` flag. Restrict network aggregation views and hub compilation parameters to `is_bdsp=True`.
- [ ] **Task 2.3:** Implement `posts` pipeline to process BUY/SELL listings securely linking to `user_id`.
- [ ] **Task 2.4:** Build hub processing logic. Enable BDSPs to aggregate an array of text IDs (`member_user_ids`) into a cohesive cluster.
- [ ] **Task 2.5:** Program database triggers/hooks to automatically compute the **70% V4V / 30% BDSP Commission split** inside `TABLE 5: deals`.
- [ ] **Task 2.6:** Configure global event middleware to log every transaction automatically to `TABLE 6: activity_log` for NITDA audit capability.

---

## Phase 3: WhatsApp Bot Integration (Channel 1)
*Objective: Deploy a lightweight interactive bot interface for field user operations.*

- [ ] **Task 3.1:** Connect a backend listener to process inbound webhooks from the Meta Cloud API / BSP wrapper.
- [ ] **Task 3.2:** Build conversational text routing tree mapping out interactive registration prompts:
  - Capture Name -> Phone -> Primary Role -> LGA selection (`Chikun`).
  - Output explicit **NDPC Data Consent notice**. Capture `True` via button click before recording user to `TABLE 1`.
- [ ] **Task 3.3:** Build interactive listing tree. Enable farmers and suppliers to configure items (`Maize`, `NPK`), selecting `SELL` or `BUY` type properties to feed `TABLE 3`.

---

## Phase 4: Web Platform Development (Channel 2)
*Objective: Create the management dashboards for administrative tracking and BDSP cluster oversight.*

- [ ] **Task 4.1:** Scaffold frontend framework architecture with custom theme elements matching enterprise parameters.
- [ ] **Task 4.2:** Design login interfaces that read user roles directly from database fields.
- [ ] **Task 4.3:** Build BDSP Network Management Interface:
  - Dynamically read mappings from `TABLE 2: network_members`.
  - Display user distribution metrics, active postings, and aggregate the commission calculations ledger.
- [ ] **Task 4.4:** Construct the global marketplace timeline grid allowing users to view real-time listings filterable by LGA parameters.

---

## Phase 5: Escrow Logic & Deal Simulation
*Objective: Implement the safe 3-way delivery verification system required for tokenized fund release.*

- [ ] **Task 5.1:** Program mock transaction triggers. Introduce a "Deposit Funds" mechanism to change `escrow_status` safely to `Funds-Held-Placeholder`.
- [ ] **Task 5.2:** Build separate multi-party authorization tracking endpoints:
  - Buyer validation endpoint (Confirms receipt at point of delivery).
  - Trucker confirmation tracking endpoint (Confirms successful haulage transit delivery).
  - Seller transaction tracking authorization endpoint (Confirms original product dispatch).
- [ ] **Task 5.3:** Create the automated background transaction service worker:
  - *Rule Engine:* Listen for change statuses. When Buyer Confirm = `True` AND Trucker Confirm = `True` AND Seller Confirm = `True`:
  - Automatically update `escrow_status` to "Released", disperse values, and update status records instantly across `hubs` and `posts`.

---

## Phase 6: QA, End-to-End Testing & Cloud Deployment
*Objective: Validate multi-channel data operations and launch the live staging cluster.*

- [ ] **Task 6.1:** Run multi-channel verification tests (e.g., Post a crop listing via WhatsApp bot interface -> confirm matching database persistence inside `TABLE 3` -> inspect near real-time rendering on the Web Marketplace grid).
- [ ] **Task 6.2:** Verify strict foreign key constraints across relational entries. Ensure automated ID assignment scripts run precisely (`USR_001` -> `USR_002`).
- [ ] **Task 6.3:** Deploy backend API engine and PostgreSQL database to chosen staging cloud environments.
- [ ] **Task 6.4:** Execute complete walkthrough simulation involving 1 test BDSP onboarding a new smallholder farmer via WhatsApp, assembling an aggregated hub, processing a mock payment loop, and verifying the audit trail entry.