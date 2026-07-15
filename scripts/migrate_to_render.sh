#!/bin/bash
set -e

LOCAL="postgresql://agritech:agritech_dev_password@localhost:5432/agritech_bdsp"
RENDER=$(grep ^DATABASE_URL /home/mdjibril/Github/agritech-bdsp/.env | head -1 | sed 's/^DATABASE_URL=//')

echo "=== Step 1: Find missing actors by phone ==="
# Get phones on Render
psql "$RENDER" -t -A -c "SELECT phone FROM actors ORDER BY phone" > /tmp/render_phones.txt
# Get missing phones from local
psql "$LOCAL" -t -A -c "SELECT phone FROM actors ORDER BY phone" > /tmp/local_phones.txt
sort -o /tmp/render_phones.txt /tmp/render_phones.txt
sort -o /tmp/local_phones.txt /tmp/local_phones.txt
comm -23 /tmp/local_phones.txt /tmp/render_phones.txt > /tmp/missing_phones.txt
echo "Missing phones: $(wc -l < /tmp/missing_phones.txt)"

if [ -s /tmp/missing_phones.txt ]; then
  echo "=== Step 2: Insert missing actors ==="
  psql "$LOCAL" -t -A -F $'\t' \
    -c "SELECT actor_id, actor_type, full_name, phone, password_hash, channel, bank_name, account_number, gender, lga, state, kyc_status, COALESCE(bdsp_id, 0), wallet_balance, created_at
        FROM actors ORDER BY actor_id" |
  while IFS=$'\t' read -r id atype name phone phash channel bank acct gender lga state kyc bdsp wallet created; do
    if grep -Fxq "$phone" /tmp/missing_phones.txt; then
      bdsp_val=$([ "$bdsp" = "0" ] && echo "NULL" || echo "$bdsp")
      name_esc=$(echo "$name" | sed "s/'/''/g")
      psql "$RENDER" -c "INSERT INTO actors (actor_id, actor_type, full_name, phone, password_hash, channel, bank_name, account_number, gender, lga, state, kyc_status, bdsp_id, wallet_balance, created_at)
        OVERRIDING SYSTEM VALUE
        VALUES ($id, '$atype', '$name_esc', '$phone', '$phash', '$channel', '$bank', '$acct', '$gender', '$lga', '$state', '$kyc', $bdsp_val, $wallet, '$created');" 2>&1 | grep -v "INSERT\|WARNING" || true
      echo "  Inserted actor $id: $name"
    fi
  done
fi

echo "=== Step 3: Fix actor sequence ==="
MAX_ID=$(psql "$LOCAL" -t -A -c "SELECT MAX(actor_id) FROM actors")
psql "$RENDER" -c "SELECT setval('actors_actor_id_seq', GREATEST((SELECT MAX(actor_id) FROM actors), $MAX_ID));"

echo "=== Step 4: Find missing transactions by tx_id ==="
psql "$RENDER" -t -A -c "SELECT tx_id FROM transactions ORDER BY tx_id" > /tmp/render_tx.txt
psql "$LOCAL" -t -A -c "SELECT tx_id FROM transactions ORDER BY tx_id" > /tmp/local_tx.txt
comm -23 /tmp/local_tx.txt /tmp/render_tx.txt > /tmp/missing_tx.txt
echo "Missing transactions: $(wc -l < /tmp/missing_tx.txt)"

if [ -s /tmp/missing_tx.txt ]; then
  echo "=== Step 5: Insert missing transactions ==="
  psql "$LOCAL" -t -A -F $'\t' \
    -c "SELECT tx_id, buyer_id, seller_id, COALESCE(logistics_id, 0), commodity, quantity_kg, unit_price, total_amount, status, escrow_required, commission_v4v, commission_bdsp, trucker_pod_confirmed, buyer_pod_confirmed, created_at, updated_at
        FROM transactions ORDER BY tx_id" |
  while IFS=$'\t' read -r tx_id buyer seller logist comm qty uprice total status escrow c4v cbdsp trucker bpod created updated; do
    if grep -Fxq "$tx_id" /tmp/missing_tx.txt; then
      logist_val=$([ "$logist" = "0" ] && echo "NULL" || echo "$logist")
      psql "$RENDER" -c "INSERT INTO transactions (tx_id, buyer_id, seller_id, logistics_id, commodity, quantity_kg, unit_price, total_amount, status, escrow_required, commission_v4v, commission_bdsp, trucker_pod_confirmed, buyer_pod_confirmed, created_at, updated_at)
        OVERRIDING SYSTEM VALUE
        VALUES ($tx_id, $buyer, $seller, $logist_val, '$comm', $qty, $uprice, $total, '$status', $escrow, $c4v, $cbdsp, $trucker, $bpod, '$created', '$updated');" 2>&1 | grep -v "INSERT\|WARNING" || true
      echo "  Inserted tx $tx_id: $comm"
    fi
  done
fi

echo "=== Step 6: Fix transaction sequence ==="
MAX_TX=$(psql "$LOCAL" -t -A -c "SELECT MAX(tx_id) FROM transactions")
psql "$RENDER" -c "SELECT setval('transactions_tx_id_seq', GREATEST((SELECT MAX(tx_id) FROM transactions), $MAX_TX));"

echo "=== Step 7: Find missing escrow by tx_id ==="
psql "$RENDER" -t -A -c "SELECT tx_id FROM escrow ORDER BY tx_id" > /tmp/render_escrow.txt
psql "$LOCAL" -t -A -c "SELECT tx_id FROM escrow ORDER BY tx_id" > /tmp/local_escrow.txt
comm -23 /tmp/local_escrow.txt /tmp/render_escrow.txt > /tmp/missing_escrow.txt
echo "Missing escrow: $(wc -l < /tmp/missing_escrow.txt)"

if [ -s /tmp/missing_escrow.txt ]; then
  echo "=== Step 8: Insert missing escrow ==="
  psql "$LOCAL" -t -A -F $'\t' \
    -c "SELECT tx_id, amount, funded_by, status, created_at, COALESCE(released_at::text, '') FROM escrow ORDER BY tx_id" |
  while IFS=$'\t' read -r tx_id amount funded_by status created released; do
    if grep -Fxq "$tx_id" /tmp/missing_escrow.txt; then
      released_val=$([ -z "$released" ] && echo "NULL" || echo "'$released'")
      psql "$RENDER" -c "INSERT INTO escrow (tx_id, amount, funded_by, status, created_at, released_at)
        VALUES ($tx_id, $amount, $funded_by, '$status', '$created', $released_val);" 2>&1 | grep -v "INSERT\|WARNING" || true
      echo "  Inserted escrow for tx $tx_id"
    fi
  done
fi

echo "=== Migration complete ==="
psql "$RENDER" -c "SELECT 'actors' AS tbl, COUNT(*) AS cnt FROM actors
  UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
  UNION ALL SELECT 'escrow', COUNT(*) FROM escrow;"

rm -f /tmp/render_phones.txt /tmp/local_phones.txt /tmp/missing_phones.txt
rm -f /tmp/render_tx.txt /tmp/local_tx.txt /tmp/missing_tx.txt
rm -f /tmp/render_escrow.txt /tmp/local_escrow.txt /tmp/missing_escrow.txt
