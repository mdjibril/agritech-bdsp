#!/usr/bin/env python3
"""Migrate missing data from local PostgreSQL to Render PostgreSQL."""
import subprocess, sys

LOCAL = "postgresql://agritech:agritech_dev_password@localhost:5432/agritech_bdsp"

with open("/home/mdjibril/Github/agritech-bdsp/.env") as f:
    for line in f:
        line = line.strip()
        if line.startswith("DATABASE_URL=") and not line.startswith("#"):
            RENDER = line.split("=", 1)[1]
            break

def run(db, sql, *args):
    cmd = ["psql", db, "-t", "-A", "-c", sql]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ERROR: {r.stderr.strip()}")
        return []
    return [line for line in r.stdout.strip().split("\n") if line]

def run_csv(db, sql):
    cmd = ["psql", db, "-t", "-A", "-F", "\t", "-c", sql]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"  ERROR: {r.stderr.strip()}")
        return []
    rows = []
    for line in r.stdout.strip().split("\n"):
        if line.strip():
            rows.append(line.split("\t"))
    return rows

def exec_sql(db, sql):
    r = subprocess.run(["psql", db, "-c", sql], capture_output=True, text=True)
    return r.returncode == 0, r.stderr.strip()

# === Step 1: Find missing actors ===
print("=== Step 1: Find missing actors ===")
render_phones = set(run(RENDER, "SELECT phone FROM actors"))
local_rows = run_csv(LOCAL, """
    SELECT actor_id, actor_type, full_name, phone, password_hash, channel,
           bank_name, account_number, gender, lga, state, kyc_status,
           COALESCE(bdsp_id, 0), wallet_balance, created_at
    FROM actors ORDER BY actor_id
""")

id_map = {}  # local_actor_id -> render_actor_id
actor_count = 0
for row in local_rows:
    phone = row[3]
    if phone in render_phones:
        id_map[int(row[0])] = int(row[0])  # already exists
        continue
    # Escape single quotes in text fields
    name = row[2].replace("'", "''")
    phash = row[4].replace("'", "''")
    channel = row[5].replace("'", "''")
    bank = row[6].replace("'", "''")
    acct = row[7].replace("'", "''")
    gender = row[8]
    lga = row[9]
    state = row[10]
    kyc = row[11]
    bdsp = row[12]
    wallet = row[13]
    created = row[14]
    lid = int(row[0])

    # Check if actor_id is already taken on Render
    existing = run(RENDER, f"SELECT 1 FROM actors WHERE actor_id = {lid}")
    if existing:
        # ID conflict — let Render assign a new ID
        ok, err = exec_sql(RENDER, f"""
            INSERT INTO actors (actor_type, full_name, phone, password_hash, channel,
                                bank_name, account_number, gender, lga, state,
                                kyc_status, bdsp_id, wallet_balance, created_at)
            VALUES ('{row[1]}', '{name}', '{phone}', '{phash}', '{channel}',
                    '{bank}', '{acct}', '{gender}', '{lga}', '{state}',
                    '{kyc}', {bdsp if bdsp != '0' else 'NULL'}, {wallet}, '{created}')
            RETURNING actor_id
        """)
        new_id = run(RENDER, f"SELECT actor_id FROM actors WHERE phone = '{phone}'")
        if new_id:
            id_map[lid] = int(new_id[0])
            print(f"  Inserted actor (new id {new_id[0]}) from local id {lid}: {row[2]}")
    else:
        ok, err = exec_sql(RENDER, f"""
            INSERT INTO actors (actor_id, actor_type, full_name, phone, password_hash, channel,
                                bank_name, account_number, gender, lga, state,
                                kyc_status, bdsp_id, wallet_balance, created_at)
            OVERRIDING SYSTEM VALUE
            VALUES ({lid}, '{row[1]}', '{name}', '{phone}', '{phash}', '{channel}',
                    '{bank}', '{acct}', '{gender}', '{lga}', '{state}',
                    '{kyc}', {bdsp if bdsp != '0' else 'NULL'}, {wallet}, '{created}')
        """)
        id_map[lid] = lid
        print(f"  Inserted actor {lid}: {row[2]}")
    actor_count += 1

# Fix sequence
max_id = run(LOCAL, "SELECT MAX(actor_id) FROM actors")[0]
exec_sql(RENDER, f"SELECT setval('actors_actor_id_seq', GREATEST((SELECT MAX(actor_id) FROM actors), {max_id}))")
print(f"  Actors migrated: {actor_count}")

# === Step 2: Find missing transactions ===
print("\n=== Step 2: Find missing transactions ===")
render_tx = set(run(RENDER, "SELECT tx_id FROM transactions"))
local_tx = run_csv(LOCAL, """
    SELECT tx_id, buyer_id, seller_id, COALESCE(logistics_id, 0),
           commodity, quantity_kg, unit_price, total_amount, status,
           escrow_required, commission_v4v, commission_bdsp,
           trucker_pod_confirmed, buyer_pod_confirmed, created_at, updated_at
    FROM transactions ORDER BY tx_id
""")

tx_count = 0
for row in local_tx:
    tid = int(row[0])
    if str(tid) in render_tx:
        continue

    buyer = id_map.get(int(row[1]), int(row[1]))
    seller = id_map.get(int(row[2]), int(row[2]))
    logist = row[3]
    if logist != '0':
        logist = id_map.get(int(logist), int(logist))
    else:
        logist = 'NULL'
    comm = row[4].replace("'", "''")
    qty = row[5]
    uprice = row[6]
    total = row[7]
    status = row[8]
    escrow = 'TRUE' if row[9].lower() == 't' else 'FALSE'
    c4v = row[10]
    cbdsp = row[11]
    trucker = 'TRUE' if row[12].lower() == 't' else 'FALSE'
    bpod = 'TRUE' if row[13].lower() == 't' else 'FALSE'
    created = row[14]
    updated = row[15]

    ok, err = exec_sql(RENDER, f"""
        INSERT INTO transactions (tx_id, buyer_id, seller_id, logistics_id, commodity,
                                  quantity_kg, unit_price, status,
                                  trucker_pod_confirmed, buyer_pod_confirmed,
                                  created_at, updated_at)
        OVERRIDING SYSTEM VALUE
        VALUES ({tid}, {buyer}, {seller}, {logist}, '{comm}',
                {qty}, {uprice}, '{status}',
                {trucker}, {bpod},
                '{created}', '{updated}')
    """)
    if ok:
        print(f"  Inserted tx {tid}: {comm}")
        tx_count += 1
    else:
        print(f"  FAILED tx {tid}: {err}")

# Fix sequence
max_tx = run(LOCAL, "SELECT MAX(tx_id) FROM transactions")[0]
exec_sql(RENDER, f"SELECT setval('transactions_tx_id_seq', GREATEST((SELECT MAX(tx_id) FROM transactions), {max_tx}))")
print(f"  Transactions migrated: {tx_count}")

# === Step 3: Find missing escrow ===
print("\n=== Step 3: Find missing escrow ===")
render_escrow = set(run(RENDER, "SELECT tx_id FROM escrow"))
local_escrow = run_csv(LOCAL, """
    SELECT tx_id, amount, funded_by, status, funded_at, COALESCE(released_at::text, '')
    FROM escrow ORDER BY tx_id
""")

escrow_count = 0
for row in local_escrow:
    tid = int(row[0])
    if str(tid) in render_escrow:
        continue
    amount = row[1]
    funded_by = id_map.get(int(row[2]), int(row[2]))
    status = row[3]
    funded_at = row[4]
    released_at = row[5]
    rel = f"'{released_at}'" if released_at else "NULL"

    ok, err = exec_sql(RENDER, f"""
        INSERT INTO escrow (tx_id, amount, funded_by, status, funded_at, released_at)
        VALUES ({tid}, {amount}, {funded_by}, '{status}', '{funded_at}', {rel})
    """)
    if ok:
        print(f"  Inserted escrow for tx {tid}")
        escrow_count += 1
    else:
        print(f"  FAILED escrow for tx {tid}: {err}")

print(f"  Escrow migrated: {escrow_count}")

# === Summary ===
print("\n=== Migration complete ===")
r = subprocess.run(["psql", RENDER, "-c", """
    SELECT 'actors' AS tbl, COUNT(*) AS cnt FROM actors
    UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
    UNION ALL SELECT 'escrow', COUNT(*) FROM escrow;
"""], capture_output=True, text=True)
print(r.stdout)
