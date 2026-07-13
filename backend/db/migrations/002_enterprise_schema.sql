BEGIN;

-- ============================================================
-- PHASE 3: ENTERPRISE SCHEMA MIGRATION
-- Drops prototype 6-table layout and creates the production
-- 6-table relational model with 9 actor roles, dual-lock
-- escrow, banking fields, and finance tracking.
-- ============================================================

-- ============================================================
-- SECTION 1: DROP PROTOTYPE SCHEMA
-- Dependency order: deals → hubs → network_members → posts
--                  → activity_log → users
-- ============================================================

DROP TRIGGER IF EXISTS deals_rules_and_commissions ON deals;
DROP FUNCTION IF EXISTS enforce_deal_rules_and_commissions();

DROP TRIGGER IF EXISTS hubs_rules ON hubs;
DROP FUNCTION IF EXISTS enforce_hub_rules();

DROP TRIGGER IF EXISTS network_members_rules ON network_members;
DROP FUNCTION IF EXISTS enforce_network_members_rules();

DROP FUNCTION IF EXISTS assert_user_is_bdsp(text);
DROP FUNCTION IF EXISTS assert_user_has_role(text, text);
DROP FUNCTION IF EXISTS prefixed_id(text, text, int) CASCADE;

DROP TABLE IF EXISTS deals CASCADE;
DROP TABLE IF EXISTS hubs CASCADE;
DROP TABLE IF EXISTS network_members CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP SEQUENCE IF EXISTS users_user_id_seq;
DROP SEQUENCE IF EXISTS network_members_network_id_seq;
DROP SEQUENCE IF EXISTS posts_post_id_seq;
DROP SEQUENCE IF EXISTS deals_deal_id_seq;
DROP SEQUENCE IF EXISTS activity_log_log_id_seq;

-- ============================================================
-- SECTION 2: CREATE ENTERPRISE TABLES
-- ============================================================

-- TABLE 1: actors
-- Core identity registry replacing users + network_members.
-- Supports all 9 marketplace roles with banking, GPS, KYC.
CREATE TABLE actors (
  actor_id       BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_type     VARCHAR(50)   NOT NULL CHECK (actor_type IN (
    'SHF','AGGREGATOR','INPUT_VENDOR','LOGISTICS','BDSP',
    'KBS','AGRA','INVESTOR','V4V_ADMIN'
  )),
  full_name      VARCHAR(255)  NOT NULL,
  phone          VARCHAR(20)   NOT NULL UNIQUE,
  password_hash  VARCHAR(255),
  channel        VARCHAR(20)   NOT NULL DEFAULT 'WHATSAPP'
                                CHECK (channel IN ('USSD','WHATSAPP','WEB','APP')),
  bank_name      VARCHAR(100)  NOT NULL,
  account_number VARCHAR(20)   NOT NULL,
  state          VARCHAR(50)   NOT NULL DEFAULT 'Kaduna',
  lga            VARCHAR(100)  NOT NULL,
  gps_lat        NUMERIC(10,8),
  gps_lng        NUMERIC(11,8),
  kyc_status     VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                                CHECK (kyc_status IN ('PENDING','VERIFIED','REJECTED')),
  gender         VARCHAR(15)   CHECK (gender IN ('MALE','FEMALE','OTHER')),
  bdsp_id        BIGINT        REFERENCES actors(actor_id)
                                ON DELETE SET NULL,
  wallet_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT actors_gps_lat_range  CHECK (gps_lat IS NULL OR gps_lat BETWEEN -90 AND 90),
  CONSTRAINT actors_gps_lng_range  CHECK (gps_lng IS NULL OR gps_lng BETWEEN -180 AND 180)
);

-- TABLE 2: transactions
-- Marketplace trades replacing posts + hubs + deals.
-- Auto-calculates total_amount, escrow_required, and commissions.
CREATE TABLE transactions (
  tx_id                BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  buyer_id             BIGINT        NOT NULL REFERENCES actors(actor_id),
  seller_id            BIGINT        NOT NULL REFERENCES actors(actor_id),
  logistics_id         BIGINT        REFERENCES actors(actor_id),
  commodity            VARCHAR(100)  NOT NULL,
  quantity_kg          NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0),
  unit_price           NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  total_amount         NUMERIC(15,2) GENERATED ALWAYS AS (quantity_kg * unit_price) STORED,
  status               VARCHAR(30)   NOT NULL DEFAULT 'INITIATED'
                                      CHECK (status IN (
    'INITIATED','IN_ESCROW','DISPATCHED','DELIVERED','COMPLETED','DISPUTED'
  )),
  trucker_pod_confirmed BOOLEAN      NOT NULL DEFAULT FALSE,
  buyer_pod_confirmed   BOOLEAN      NOT NULL DEFAULT FALSE,
  escrow_required      BOOLEAN       GENERATED ALWAYS AS (
    CASE WHEN (quantity_kg * unit_price) > 50 THEN TRUE ELSE FALSE END
  ) STORED,
  commission_v4v       NUMERIC(15,2),
  commission_bdsp      NUMERIC(15,2),
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- TABLE 3: escrow
-- Escrow tracking per transaction. One escrow per transaction.
CREATE TABLE escrow (
  escrow_id    BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tx_id        BIGINT        NOT NULL UNIQUE
                              REFERENCES transactions(tx_id)
                              ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL,
  funded_by    BIGINT        NOT NULL REFERENCES actors(actor_id),
  status       VARCHAR(30)   NOT NULL DEFAULT 'HELD'
                              CHECK (status IN (
    'HELD','RELEASED_TO_SELLER','REFUNDED_TO_BUYER'
  )),
  funded_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  released_at  TIMESTAMPTZ
);

-- TABLE 4: loans
-- Agricultural credit facility tracking.
CREATE TABLE loans (
  loan_id            BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id           BIGINT        NOT NULL REFERENCES actors(actor_id),
  lender_bank        VARCHAR(100),
  amount             NUMERIC(15,2),
  tenor_months       INT,
  interest_rate      NUMERIC(5,2),
  credit_score       INT,
  status             VARCHAR(30)   NOT NULL DEFAULT 'APPLIED'
                      CHECK (status IN (
    'APPLIED','APPROVED','DISBURSED','REPAID','DEFAULTED'
  )),
  insurance_policy_id VARCHAR(100),
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- TABLE 5: insurance_policies
-- Crop, livestock, and equipment insurance coverage.
CREATE TABLE insurance_policies (
  policy_id      BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id       BIGINT        NOT NULL REFERENCES actors(actor_id),
  provider       VARCHAR(30)   NOT NULL CHECK (provider IN ('NAIC','AXA')),
  policy_type    VARCHAR(30)   NOT NULL CHECK (policy_type IN ('CROP','LIVESTOCK','EQUIPMENT')),
  premium        NUMERIC(12,2),
  sum_insured    NUMERIC(15,2),
  status         VARCHAR(30)   NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE','CLAIMED','EXPIRED')),
  commission_v4v NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- TABLE 6: training_records
-- KBS training hub enrollment and completion tracking.
CREATE TABLE training_records (
  record_id   BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    BIGINT        NOT NULL REFERENCES actors(actor_id),
  course_name VARCHAR(255)  NOT NULL,
  provider    VARCHAR(100)  NOT NULL DEFAULT 'KBS TRAINING HUB',
  status      VARCHAR(30)   NOT NULL DEFAULT 'ENROLLED'
               CHECK (status IN ('ENROLLED','COMPLETED','FAILED')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- TABLE 7: activity_log (NITDA audit trail)
-- Forward-compatible with Phase 4 automated audit handlers.
CREATE TABLE activity_log (
  log_id    BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id  BIGINT        REFERENCES actors(actor_id),
  action    TEXT          NOT NULL,
  timestamp TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

CREATE INDEX idx_actors_type_state    ON actors(actor_type, state);
CREATE INDEX idx_actors_phone         ON actors(phone);
CREATE INDEX idx_actors_bdsp          ON actors(bdsp_id);
CREATE INDEX idx_actors_lga           ON actors(lga);

CREATE INDEX idx_transactions_status  ON transactions(status);
CREATE INDEX idx_transactions_buyer   ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller  ON transactions(seller_id);

CREATE INDEX idx_escrow_tx            ON escrow(tx_id);
CREATE INDEX idx_escrow_status        ON escrow(status);

CREATE INDEX idx_loans_actor          ON loans(actor_id);
CREATE INDEX idx_loans_status         ON loans(status);

CREATE INDEX idx_insurance_actor      ON insurance_policies(actor_id);
CREATE INDEX idx_insurance_status     ON insurance_policies(status);

CREATE INDEX idx_training_actor_course ON training_records(actor_id, course_name);

CREATE INDEX idx_activity_actor_time   ON activity_log(actor_id, timestamp DESC);

-- ============================================================
-- SECTION 4: COMMISSION AUTO-CALCULATION TRIGGER
-- Calculates 2% platform fee split 70/30 between V4V and BDSP.
-- commission_v4v  = total_amount * 0.02 * 0.70
-- commission_bdsp = total_amount * 0.02 * 0.30
-- ============================================================

CREATE OR REPLACE FUNCTION auto_calculate_commissions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.commission_v4v  := ROUND((NEW.quantity_kg * NEW.unit_price) * 0.02 * 0.70, 2);
  NEW.commission_bdsp := ROUND((NEW.quantity_kg * NEW.unit_price) * 0.02 * 0.30, 2);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_commissions
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_commissions();

COMMIT;
