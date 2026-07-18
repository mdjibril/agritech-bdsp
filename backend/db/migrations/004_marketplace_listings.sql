-- 004_marketplace_listings.sql
-- Allow transactions without a buyer (open marketplace listings)
-- and add the LISTED status.

ALTER TABLE transactions
  ALTER COLUMN buyer_id DROP NOT NULL;

ALTER TABLE transactions
  DROP CONSTRAINT transactions_status_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_status_check
  CHECK (status IN (
    'LISTED','INITIATED','IN_ESCROW','DISPATCHED','DELIVERED','COMPLETED','DISPUTED'
  ));
