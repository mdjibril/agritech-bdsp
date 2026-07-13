BEGIN;

-- ============================================================
-- PHASE 3: ENTERPRISE SEED DATA
-- 25 actors across all 9 roles, 10 transactions, escrow
-- records, loans, insurance policies, training records,
-- and audit log entries.
-- ============================================================

-- ============================================================
-- ACTORS (25 rows, all 9 roles)
-- OVERRIDING SYSTEM VALUE ensures deterministic IDs for FK refs
-- ============================================================

INSERT INTO actors (
  actor_id, actor_type, full_name, phone, password_hash, channel,
  bank_name, account_number, state, lga, gps_lat, gps_lng,
  kyc_status, gender, bdsp_id, wallet_balance
)
OVERRIDING SYSTEM VALUE
VALUES
  -- BDSP (2) — Certified by KBS, manage SHF networks
  (1, 'BDSP', 'Amina Yusuf',      '+2348100000001', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'GTBank',    '0012345678', 'Kaduna', 'Chikun',  10.52000000, 7.34000000,
   'VERIFIED', 'FEMALE', NULL,   125000.00),
  (2, 'BDSP', 'Musa Danjuma',     '+2348100000002', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'Zenith',    '0098765432', 'Kaduna', 'Chikun',  10.47200000, 7.41600000,
   'VERIFIED', 'MALE',   NULL,    98500.00),

  -- SHF (8) — Smallholder farmers, half under each BDSP
  (3, 'SHF', 'Fatima Abubakar',   '+2348100000003', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WHATSAPP',
   'UBA',       '0123456001', 'Kaduna', 'Chikun',  10.51500000, 7.33500000,
   'VERIFIED', 'FEMALE', 1,      32000.00),
  (4, 'SHF', 'Ibrahim Tanko',     '+2348100000004', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WHATSAPP',
   'First Bank','0123456002', 'Kaduna', 'Chikun',  10.51800000, 7.33800000,
   'PENDING',  'MALE',   1,      15000.00),
  (5, 'SHF', 'Ngozi Okonkwo',     '+2348100000005', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'USSD',
   'Access',    '0123456003', 'Kaduna', 'Chikun',  10.51000000, 7.33000000,
   'VERIFIED', 'FEMALE', 1,      28500.00),
  (6, 'SHF', 'Sunday Ochai',      '+2348100000006', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WHATSAPP',
   'GTBank',    '0123456004', 'Kaduna', 'Chikun',  10.52200000, 7.34200000,
   'VERIFIED', 'MALE',   1,      41000.00),
  (7, 'SHF', 'Rukaiya Suleiman',  '+2348100000007', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WHATSAPP',
   'Zenith',    '0123456005', 'Kaduna', 'Chikun',  10.46500000, 7.41000000,
   'PENDING',  'FEMALE', 2,      22000.00),
  (8, 'SHF', 'Peter Yohanna',     '+2348100000008', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'USSD',
   'UBA',       '0123456006', 'Kaduna', 'Chikun',  10.46800000, 7.41300000,
   'VERIFIED', 'MALE',   2,      36000.00),
  (9, 'SHF', 'Hauwa Ibrahim',     '+2348100000009', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WHATSAPP',
   'First Bank','0123456007', 'Kaduna', 'Chikun',  10.47500000, 7.42000000,
   'VERIFIED', 'FEMALE', 2,      19000.00),
  (10, 'SHF', 'Danladi Bako',     '+2348100000010', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WHATSAPP',
   'Access',    '0123456008', 'Kaduna', 'Chikun',  10.47000000, 7.41500000,
   'REJECTED', 'MALE',   2,       5000.00),

  -- AGGREGATOR (3) — Bulk commodity buyers
  (11, 'AGGREGATOR', 'Emeka Okafor',   '+2348100000011', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'GTBank',    '0112233445', 'Kaduna', 'Chikun',  10.53000000, 7.35000000,
   'VERIFIED', 'MALE',   NULL,   500000.00),
  (12, 'AGGREGATOR', 'Bola Adewale',   '+2348100000012', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'Zenith',    '0112233446', 'Kaduna', 'Chikun',  10.53500000, 7.35500000,
   'VERIFIED', 'FEMALE', NULL,   750000.00),
  (13, 'AGGREGATOR', 'Sani Bello',     '+2348100000013', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WHATSAPP',
   'UBA',       '0112233447', 'Kaduna', 'Chikun',  10.52800000, 7.34800000,
   'VERIFIED', 'MALE',   NULL,   320000.00),

  -- INPUT_VENDOR (3) — Farm input suppliers
  (14, 'INPUT_VENDOR', 'Chinedu Obi',    '+2348100000014', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'First Bank','0223344556', 'Kaduna', 'Chikun',  10.49000000, 7.38000000,
   'VERIFIED', 'MALE',   NULL,   200000.00),
  (15, 'INPUT_VENDOR', 'Grace Okonkwo',  '+2348100000015', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WHATSAPP',
   'Access',    '0223344557', 'Kaduna', 'Chikun',  10.49500000, 7.38500000,
   'VERIFIED', 'FEMALE', NULL,   180000.00),
  (16, 'INPUT_VENDOR', 'Tunde Balogun',  '+2348100000016', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'USSD',
   'GTBank',    '0223344558', 'Kaduna', 'Chikun',  10.48500000, 7.37500000,
   'PENDING',  'MALE',   NULL,    45000.00),

  -- LOGISTICS (3) — Transport and delivery partners
  (17, 'LOGISTICS', 'Usman Garba',     '+2348100000017', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WHATSAPP',
   'Zenith',    '0334455667', 'Kaduna', 'Chikun',  10.50500000, 7.40000000,
   'VERIFIED', 'MALE',   NULL,    65000.00),
  (18, 'LOGISTICS', 'Sarah John',      '+2348100000018', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'UBA',       '0334455668', 'Kaduna', 'Chikun',  10.50000000, 7.39500000,
   'VERIFIED', 'FEMALE', NULL,    52000.00),
  (19, 'LOGISTICS', 'Yakubu Musa',     '+2348100000019', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'USSD',
   'First Bank','0334455669', 'Kaduna', 'Chikun',  10.51000000, 7.40500000,
   'PENDING',  'MALE',   NULL,    18000.00),

  -- KBS (2) — Training and certification body
  (20, 'KBS', 'Dr. Nnenna Okafor', '+2348100000020', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'GTBank',    '0445566778', 'Kaduna', 'Chikun',  10.54000000, 7.36000000,
   'VERIFIED', 'FEMALE', NULL,   500000.00),
  (21, 'KBS', 'Mrs. Hauwa Bello',  '+2348100000021', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'Access',    '0445566779', 'Kaduna', 'Chikun',  10.54500000, 7.36500000,
   'VERIFIED', 'FEMALE', NULL,   480000.00),

  -- AGRA (1) — Strategic agricultural partner
  (22, 'AGRA', 'Chinedu Agu',      '+2348100000022', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'Zenith',    '0556677880', 'Kaduna', 'Chikun',  10.55000000, 7.37000000,
   'VERIFIED', 'MALE',   NULL,   1000000.00),

  -- INVESTOR (2) — Capital providers
  (23, 'INVESTOR', 'Alhaji Shehu Idris','+2348100000023', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'First Bank','0667788991', 'Kaduna', 'Chikun',  10.55500000, 7.37500000,
   'VERIFIED', 'MALE',   NULL,   2500000.00),
  (24, 'INVESTOR', 'Dr. Folashade Adeleke','+2348100000024', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'UBA',       '0667788992', 'Kaduna', 'Chikun',  10.56000000, 7.38000000,
   'VERIFIED', 'FEMALE', NULL,   3000000.00),

  -- V4V_ADMIN (1) — Platform administrator
  (25, 'V4V_ADMIN', 'Admin User',    '+2348100000099', '$2b$12$V9WW4S1/fjq4SBy4UbFC3OrKEyxKmJiS1v1Q7Mo/Y.OhPq4ZoVIYC', 'WEB',
   'GTBank',    '0998877665', 'Kaduna', 'Chikun',  10.50000000, 7.35000000,
   'VERIFIED', 'OTHER',  NULL,   100000.00);

-- ============================================================
-- TRANSACTIONS (10 rows across all lifecycle statuses)
-- Total_amount and escrow_required are GENERATED ALWAYS columns
-- Commissions are set by BEFORE INSERT trigger
-- ============================================================

INSERT INTO transactions (
  tx_id, buyer_id, seller_id, logistics_id,
  commodity, quantity_kg, unit_price,
  status, trucker_pod_confirmed, buyer_pod_confirmed
)
OVERRIDING SYSTEM VALUE
VALUES
  -- Freshly initiated
  (1,  11, 3,  17, 'Maize',    5000.00, 450.00, 'INITIATED',   FALSE, FALSE),
  (2,  12, 7,  18, 'Soybean',  3000.00, 520.00, 'INITIATED',   FALSE, FALSE),

  -- In escrow — funds locked, awaiting dispatch
  (3,  11, 4,  17, 'Maize',    8000.00, 430.00, 'IN_ESCROW',   FALSE, FALSE),
  (4,  13, 8,  19, 'Sorghum',  4000.00, 380.00, 'IN_ESCROW',   FALSE, FALSE),

  -- Dispatched — trucker POD confirmed, buyer still pending
  (5,  12, 5,  18, 'Maize',    6000.00, 440.00, 'DISPATCHED',  TRUE,  FALSE),
  (6,  11, 9,  17, 'Rice',     2500.00, 620.00, 'DISPATCHED',  TRUE,  FALSE),

  -- Delivered — both PODs confirmed, awaiting completion
  (7,  12, 6,  18, 'Cassava',  10000.00, 250.00, 'DELIVERED',   TRUE,  TRUE),

  -- Completed — fully settled transactions
  (8,  13, 3,  19, 'Maize',    3500.00, 460.00, 'COMPLETED',   TRUE,  TRUE),
  (9,  11, 8,  17, 'Soybean',  2000.00, 540.00, 'COMPLETED',   TRUE,  TRUE),

  -- Disputed — conflict scenario, escrow funds frozen
  (10, 13, 10, 19, 'Maize',    1500.00, 480.00, 'DISPUTED',    FALSE, FALSE);

-- ============================================================
-- ESCROW (2 records matching IN_ESCROW transactions)
-- ============================================================

INSERT INTO escrow (tx_id, amount, funded_by, status)
VALUES
  (3, 3440000.00, 11, 'HELD'),
  (4, 1520000.00, 13, 'HELD');

-- ============================================================
-- LOANS (2 records)
-- ============================================================

INSERT INTO loans (
  actor_id, lender_bank, amount, tenor_months,
  interest_rate, credit_score, status
) VALUES
  (3,  'BOA',   500000.00, 6,  5.50, 72, 'APPLIED'),
  (6,  'BOA',   800000.00, 12, 7.00, 65, 'APPROVED');

-- ============================================================
-- INSURANCE POLICIES (2 records)
-- ============================================================

INSERT INTO insurance_policies (
  actor_id, provider, policy_type, premium,
  sum_insured, status
) VALUES
  (3,  'NAIC', 'CROP',      12000.00, 600000.00, 'ACTIVE'),
  (7,  'AXA',  'LIVESTOCK', 15000.00, 800000.00, 'ACTIVE');

-- ============================================================
-- TRAINING RECORDS (3 records)
-- ============================================================

INSERT INTO training_records (
  actor_id, course_name, provider, status
) VALUES
  (3,  'Financial Literacy',     'KBS TRAINING HUB', 'COMPLETED'),
  (4,  'Climate-Smart Farming',  'KBS TRAINING HUB', 'COMPLETED'),
  (7,  'Financial Literacy',     'KBS TRAINING HUB', 'ENROLLED');

-- ============================================================
-- ACTIVITY LOG (5 entries mirroring seed actions)
-- ============================================================

INSERT INTO activity_log (actor_id, action, timestamp) VALUES
  (1,  'BDSP seed profile created',                '2026-05-03 10:00:00+01'),
  (2,  'BDSP seed profile created',                '2026-05-03 10:05:00+01'),
  (11, 'Transaction 1 initiated: 5000kg Maize',    '2026-05-06 09:00:00+01'),
  (11, 'Escrow funded for transaction 3: ₦3,440,000', '2026-05-06 10:30:00+01'),
  (20, 'KBS training record created for actor 3',  '2026-05-10 14:00:00+01');

-- Advance identity sequences past seed values for clean auto-increment
SELECT setval('actors_actor_id_seq', 25, true);
SELECT setval('transactions_tx_id_seq', 10, true);
SELECT setval('escrow_escrow_id_seq', 2, true);
SELECT setval('loans_loan_id_seq', 2, true);
SELECT setval('insurance_policies_policy_id_seq', 2, true);
SELECT setval('training_records_record_id_seq', 3, true);
SELECT setval('activity_log_log_id_seq', 5, true);

COMMIT;
