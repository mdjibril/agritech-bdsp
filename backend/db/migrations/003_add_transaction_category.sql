BEGIN;

ALTER TABLE transactions
  ADD COLUMN category VARCHAR(20) NOT NULL DEFAULT 'Crop'
    CHECK (category IN ('Crop', 'Livestock', 'Input'));

CREATE INDEX idx_transactions_category ON transactions(category);

COMMIT;
