BEGIN;

CREATE SEQUENCE IF NOT EXISTS users_user_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS network_members_network_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS posts_post_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS deals_deal_id_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS activity_log_log_id_seq START WITH 1;

CREATE OR REPLACE FUNCTION prefixed_id(prefix text, seq_name text, width integer DEFAULT 3)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN prefix || lpad(nextval(seq_name)::text, width, '0');
END;
$$;

CREATE TABLE users (
  user_id text PRIMARY KEY DEFAULT prefixed_id('USR_', 'users_user_id_seq'),
  onboarded_by text NOT NULL CHECK (onboarded_by IN ('KBS_Student', 'BDSP_01', 'Self')),
  full_name text NOT NULL,
  phone text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  primary_role text NOT NULL CHECK (primary_role IN ('SHF', 'Buyer', 'Input Dealer', 'Logistics')),
  secondary_roles text[] NOT NULL DEFAULT '{}' CHECK (secondary_roles <@ ARRAY['SHF', 'Buyer', 'Input Dealer', 'Logistics']::text[]),
  is_bdsp boolean NOT NULL DEFAULT false,
  bdsp_certified_by text,
  gender text NOT NULL CHECK (gender IN ('Male', 'Female')),
  lga text NOT NULL DEFAULT 'Chikun' CHECK (lga = 'Chikun'),
  ward text,
  gps_lat numeric(9,6),
  gps_lng numeric(9,6),
  crops text[] NOT NULL DEFAULT '{}',
  livestock text[] NOT NULL DEFAULT '{}',
  inputs_sold text[] NOT NULL DEFAULT '{}',
  ndpc_consent boolean NOT NULL CHECK (ndpc_consent IS TRUE),
  consent_timestamp timestamptz NOT NULL DEFAULT now(),
  data_retention_until date NOT NULL DEFAULT ((now() + interval '2 years')::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_bdsp_certification_required CHECK (
    (is_bdsp = false AND bdsp_certified_by IS NULL)
    OR (is_bdsp = true AND bdsp_certified_by IS NOT NULL)
  ),
  CONSTRAINT users_gps_lat_range CHECK (gps_lat IS NULL OR gps_lat BETWEEN -90 AND 90),
  CONSTRAINT users_gps_lng_range CHECK (gps_lng IS NULL OR gps_lng BETWEEN -180 AND 180),
  CONSTRAINT users_data_retention_after_consent CHECK (data_retention_until >= consent_timestamp::date)
);

CREATE TABLE network_members (
  network_id text PRIMARY KEY DEFAULT prefixed_id('NET_', 'network_members_network_id_seq'),
  bdsp_user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  member_user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT network_members_no_self_membership CHECK (bdsp_user_id <> member_user_id),
  CONSTRAINT network_members_unique_pair UNIQUE (bdsp_user_id, member_user_id)
);

CREATE TABLE posts (
  post_id text PRIMARY KEY DEFAULT prefixed_id('PST_', 'posts_post_id_seq'),
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_type text NOT NULL CHECK (post_type IN ('SELL', 'BUY')),
  category text NOT NULL CHECK (category IN ('Crop', 'Livestock', 'Input')),
  item_name text NOT NULL,
  quantity numeric(14,2) NOT NULL CHECK (quantity > 0),
  unit text NOT NULL CHECK (unit IN ('MT', 'Bags', 'Heads')),
  price_per_unit numeric(14,2) NOT NULL CHECK (price_per_unit >= 0),
  lga text NOT NULL DEFAULT 'Chikun' CHECK (lga = 'Chikun'),
  interested_count integer NOT NULL DEFAULT 0 CHECK (interested_count >= 0),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Hub-Formed', 'Closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hubs (
  hub_id text PRIMARY KEY,
  formed_by_bdsp_id text NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  category text NOT NULL CHECK (category IN ('Crop', 'Livestock', 'Input')),
  item_name text NOT NULL,
  member_user_ids text[] NOT NULL CHECK (array_length(member_user_ids, 1) >= 1),
  logistics_user_id text REFERENCES users(user_id) ON DELETE SET NULL,
  total_quantity numeric(14,2) NOT NULL CHECK (total_quantity > 0),
  post_ids text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Formed' CHECK (status IN ('Formed', 'Logistics-Assigned', 'Completed'))
);

CREATE TABLE deals (
  deal_id text PRIMARY KEY DEFAULT prefixed_id('DL_', 'deals_deal_id_seq'),
  hub_id text NOT NULL REFERENCES hubs(hub_id) ON DELETE RESTRICT,
  bdsp_user_id text NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  buyer_user_id text NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  seller_user_ids text[] NOT NULL CHECK (array_length(seller_user_ids, 1) >= 1),
  logistics_user_id text REFERENCES users(user_id) ON DELETE SET NULL,
  deal_value numeric(14,2) NOT NULL CHECK (deal_value >= 0),
  escrow_status text NOT NULL DEFAULT 'Funds-Held-Placeholder' CHECK (escrow_status IN ('Funds-Held-Placeholder', 'Released', 'Cancelled')),
  insurance_status text NOT NULL DEFAULT 'Certificate-Issued-Placeholder' CHECK (insurance_status IN ('Certificate-Issued-Placeholder', 'Pending', 'Expired')),
  v4v_revenue numeric(14,2) NOT NULL DEFAULT 0 CHECK (v4v_revenue >= 0),
  bdsp_commission numeric(14,2) NOT NULL DEFAULT 0 CHECK (bdsp_commission >= 0),
  buyer_confirmed_at timestamptz,
  logistics_confirmed_at timestamptz,
  seller_confirmed_at timestamptz,
  CONSTRAINT deals_no_confirm_when_cancelled CHECK (
    (escrow_status = 'Cancelled' AND buyer_confirmed_at IS NULL
     AND logistics_confirmed_at IS NULL AND seller_confirmed_at IS NULL)
    OR escrow_status != 'Cancelled'
  )
);

CREATE TABLE activity_log (
  log_id text PRIMARY KEY DEFAULT prefixed_id('LOG_', 'activity_log_log_id_seq'),
  user_id text NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  action text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION assert_user_is_bdsp(user_id_to_check text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE user_id = user_id_to_check AND is_bdsp = true
  ) THEN
    RAISE EXCEPTION 'User % must be a certified BDSP', user_id_to_check;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION assert_user_has_role(user_id_to_check text, expected_role text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF user_id_to_check IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM users
    WHERE user_id = user_id_to_check
      AND (primary_role = expected_role OR expected_role = ANY(secondary_roles))
  ) THEN
    RAISE EXCEPTION 'User % must have role %', user_id_to_check, expected_role;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_network_members_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_user_is_bdsp(NEW.bdsp_user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER network_members_rules
BEFORE INSERT OR UPDATE ON network_members
FOR EACH ROW EXECUTE FUNCTION enforce_network_members_rules();

CREATE OR REPLACE FUNCTION enforce_hub_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_user_is_bdsp(NEW.formed_by_bdsp_id);
  PERFORM assert_user_has_role(NEW.logistics_user_id, 'Logistics');
  RETURN NEW;
END;
$$;

CREATE TRIGGER hubs_rules
BEFORE INSERT OR UPDATE ON hubs
FOR EACH ROW EXECUTE FUNCTION enforce_hub_rules();

CREATE OR REPLACE FUNCTION enforce_deal_rules_and_commissions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_user_is_bdsp(NEW.bdsp_user_id);
  PERFORM assert_user_has_role(NEW.buyer_user_id, 'Buyer');
  PERFORM assert_user_has_role(NEW.logistics_user_id, 'Logistics');

  NEW.v4v_revenue := round(NEW.deal_value * 0.70, 2);
  NEW.bdsp_commission := round(NEW.deal_value * 0.30, 2);
  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_rules_and_commissions
BEFORE INSERT OR UPDATE ON deals
FOR EACH ROW EXECUTE FUNCTION enforce_deal_rules_and_commissions();

CREATE INDEX users_phone_idx ON users(phone);
CREATE INDEX users_lga_gender_idx ON users(lga, gender);
CREATE INDEX network_members_bdsp_idx ON network_members(bdsp_user_id);
CREATE INDEX posts_lga_status_idx ON posts(lga, status);
CREATE INDEX hubs_status_idx ON hubs(status);
CREATE INDEX deals_escrow_status_idx ON deals(escrow_status);
CREATE INDEX activity_log_user_timestamp_idx ON activity_log(user_id, timestamp DESC);

COMMIT;
