# scripts/deploy.py
import json, os, base64, subprocess, sys
from algosdk.v2client import algod
from algosdk import account, transaction
from algosdk.mnemonic import to_private_key

ALGOD_ADDR  = os.getenv("ALGOD_ADDR", "http://localhost:4001")
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
CREATOR_MN  = os.getenv("CREATOR_MN")

def compile_teal(client: algod.AlgodClient, teal: str) -> bytes:
    res = client.compile(teal)
    return base64.b64decode(res["result"])

def main():
    if not CREATOR_MN:
        print(json.dumps({"error": "Missing CREATOR_MN env var"}))
        sys.exit(1)

    # Read config JSON from stdin
    cfg = json.loads(sys.stdin.read() or "{}")
    op   = (cfg.get("op")  or "<").encode()
    thr  = int(round(float(cfg.get("thr", 0.2)) * 1_000_000))
    side = (cfg.get("side") or "BUY").encode()
    pct  = float(cfg.get("pct", 0.10))
    pctbp = int(round(pct * 10_000))

    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDR)

    # Compile TEAL by invoking PyTeal module
    approval_teal = subprocess.check_output(["python3", "contracts/strategy.py", "app"]).decode()
    clear_teal    = subprocess.check_output(["python3", "contracts/strategy.py", "clear"]).decode()
    approval_bin  = compile_teal(client, approval_teal)
    clear_bin     = compile_teal(client, clear_teal)

    sk = to_private_key(CREATOR_MN)
    sender = account.address_from_private_key(sk)
    sp = client.suggested_params()

    app_args = [op, thr.to_bytes(8, "big"), side, pctbp.to_bytes(8, "big")]

    txn = transaction.ApplicationCreateTxn(
        sender=sender,
        sp=sp,
        on_complete=transaction.OnComplete.NoOpOC.real,
        approval_program=approval_bin,
        clear_program=clear_bin,
        global_schema=transaction.StateSchema(num_uints=3, num_byte_slices=2),  # fixed
        local_schema=transaction.StateSchema(num_uints=0, num_byte_slices=0),
        app_args=app_args,
    )
    stxn = txn.sign(sk)
    txid = client.send_transaction(stxn)
    res = transaction.wait_for_confirmation(client, txid, 4)
    app_id = res.get("application-index")

    print(json.dumps({"appId": app_id, "txId": txid}))

if __name__ == "__main__":
    main()