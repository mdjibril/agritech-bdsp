BEGIN;

INSERT INTO users (
  user_id, onboarded_by, full_name, phone, password_hash, primary_role,
  secondary_roles, is_bdsp, bdsp_certified_by, gender, lga, ward, gps_lat, gps_lng,
  crops, livestock, inputs_sold, ndpc_consent, consent_timestamp, data_retention_until, created_at
) VALUES
  ('USR_001', 'Self', 'Amina Yusuf', '+2348100000001', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'SHF',
   ARRAY['Buyer'], true, 'KBS', 'Female', 'Chikun', 'Rido', 10.520000, 7.340000,
   ARRAY['Maize', 'Soybean'], ARRAY['Poultry'], ARRAY[]::text[], true, '2026-05-03 10:00:00+01', '2028-05-03', '2026-05-03 10:00:00+01'),
  ('USR_002', 'Self', 'Musa Danjuma', '+2348100000002', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'Input Dealer',
   ARRAY['Logistics', 'Buyer'], true, 'KBS', 'Male', 'Chikun', 'Sabon Tasha', 10.472000, 7.416000,
   ARRAY[]::text[], ARRAY[]::text[], ARRAY['NPK', 'Seed'], true, '2026-05-03 10:05:00+01', '2028-05-03', '2026-05-03 10:05:00+01');

WITH generated_users AS (
  SELECT
    gs,
    'USR_' || lpad((gs + 2)::text, 3, '0') AS user_id,
    'KBS_Student' AS onboarded_by,
    CASE WHEN gs % 2 = 0 THEN 'Female' ELSE 'Male' END AS gender,
    CASE (gs % 4)
      WHEN 0 THEN 'SHF'
      WHEN 1 THEN 'Buyer'
      WHEN 2 THEN 'Input Dealer'
      ELSE 'Logistics'
    END AS primary_role,
    CASE (gs % 5)
      WHEN 0 THEN 'Rido'
      WHEN 1 THEN 'Sabon Tasha'
      WHEN 2 THEN 'Kakau'
      WHEN 3 THEN 'Gwagwada'
      ELSE 'Kujama'
    END AS ward
  FROM generate_series(1, 60) AS gs
)
INSERT INTO users (
  user_id, onboarded_by, full_name, phone, password_hash, primary_role,
  secondary_roles, is_bdsp, bdsp_certified_by, gender, lga, ward, gps_lat, gps_lng,
  crops, livestock, inputs_sold, ndpc_consent, consent_timestamp, data_retention_until, created_at
)
SELECT
  user_id,
  onboarded_by,
  'KBS Test User ' || lpad(gs::text, 2, '0'),
  '+2348100000' || lpad((gs + 2)::text, 3, '0'),
  '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC',
  primary_role,
  CASE
    WHEN primary_role = 'SHF' THEN ARRAY['Buyer']
    WHEN primary_role = 'Buyer' THEN ARRAY['SHF']
    WHEN primary_role = 'Input Dealer' THEN ARRAY['Buyer']
    ELSE ARRAY[]::text[]
  END,
  false,
  NULL,
  gender,
  'Chikun',
  ward,
  10.430000 + (gs * 0.002000),
  7.300000 + (gs * 0.001500),
  CASE WHEN primary_role IN ('SHF', 'Buyer') THEN ARRAY['Maize', 'Soybean'] ELSE ARRAY[]::text[] END,
  CASE WHEN primary_role = 'SHF' THEN ARRAY['Goats', 'Poultry'] ELSE ARRAY[]::text[] END,
  CASE WHEN primary_role = 'Input Dealer' THEN ARRAY['NPK', 'Seed'] ELSE ARRAY[]::text[] END,
  true,
  '2026-05-04 09:00:00+01'::timestamptz + (gs || ' minutes')::interval,
  ('2026-05-04'::date + interval '2 years')::date,
  '2026-05-04 09:00:00+01'::timestamptz + (gs || ' minutes')::interval
FROM generated_users;

INSERT INTO network_members (network_id, bdsp_user_id, member_user_id, joined_at)
SELECT
  'NET_' || lpad(gs::text, 3, '0'),
  CASE WHEN gs <= 30 THEN 'USR_001' ELSE 'USR_002' END,
  'USR_' || lpad((gs + 2)::text, 3, '0'),
  '2026-05-05 08:00:00+01'::timestamptz + (gs || ' minutes')::interval
FROM generate_series(1, 60) AS gs;

INSERT INTO posts (
  post_id, user_id, post_type, category, item_name, quantity, unit,
  price_per_unit, lga, interested_count, status
) VALUES
  ('PST_001', 'USR_003', 'SELL', 'Crop', 'Maize', 12.00, 'Bags', 48000.00, 'Chikun', 4, 'Active'),
  ('PST_002', 'USR_004', 'BUY', 'Crop', 'Soybean', 8.00, 'Bags', 52000.00, 'Chikun', 2, 'Active'),
  ('PST_003', 'USR_005', 'SELL', 'Input', 'NPK', 20.00, 'Bags', 36000.00, 'Chikun', 6, 'Active'),
  ('PST_004', 'USR_006', 'SELL', 'Livestock', 'Goats', 5.00, 'Heads', 70000.00, 'Chikun', 3, 'Active');

INSERT INTO hubs (
  hub_id, formed_by_bdsp_id, category, item_name, member_user_ids,
  logistics_user_id, total_quantity, status, post_ids
) VALUES
  ('CHK-C01', 'USR_001', 'Crop', 'Maize', ARRAY['USR_003', 'USR_007', 'USR_011'], 'USR_005', 23.00, 'Logistics-Assigned', ARRAY['PST_001', 'PST_003']),
  ('CHK-I01', 'USR_002', 'Input', 'NPK', ARRAY['USR_005', 'USR_009'], 'USR_009', 35.00, 'Formed', ARRAY[]::text[]);

INSERT INTO deals (
  deal_id, hub_id, bdsp_user_id, buyer_user_id, seller_user_ids, logistics_user_id,
  deal_value, escrow_status, insurance_status
) VALUES
  ('DL_001', 'CHK-C01', 'USR_001', 'USR_004', ARRAY['USR_003', 'USR_007', 'USR_011'], 'USR_005',
   11040000.00, 'Funds-Held-Placeholder', 'Certificate-Issued-Placeholder');

INSERT INTO activity_log (log_id, user_id, action, timestamp) VALUES
  ('LOG_001', 'USR_001', 'Certified BDSP seed profile created', '2026-05-03 10:00:00+01'),
  ('LOG_002', 'USR_002', 'Certified BDSP seed profile created', '2026-05-03 10:05:00+01'),
  ('LOG_003', 'USR_001', 'Formed Hub CHK-C01', '2026-05-06 12:00:00+01'),
  ('LOG_004', 'USR_004', 'Created placeholder escrow deal DL_001', '2026-05-06 12:30:00+01');

SELECT setval('users_user_id_seq', 62, true);
SELECT setval('network_members_network_id_seq', 60, true);
SELECT setval('posts_post_id_seq', 4, true);
SELECT setval('deals_deal_id_seq', 1, true);
SELECT setval('activity_log_log_id_seq', 4, true);

COMMIT;
