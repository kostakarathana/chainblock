# scripts/tick.py
import json, os, sys
from algosdk.v2client import algod
from algosdk import account, transaction
from algosdk.mnemonic import to_private_key

ALGOD_ADDR  = os.getenv("ALGOD_ADDR", "http://localhost:4001")
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
CALLER_MN   = os.getenv("CREATOR_MN")   # reuse creator for simplicity

def main():
    if not CALLER_MN:
        print(json.dumps({"error": "Missing CREATOR_MN env var"}))
        sys.exit(1)

    payload = json.loads(sys.stdin.read() or "{}")
    app_id = int(payload["appId"])
    price  = float(payload.get("price", 0.24))
    price_u6 = int(round(price * 1_000_000))

    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDR)
    sk = to_private_key(CALLER_MN)
    sender = account.address_from_private_key(sk)
    sp = client.suggested_params()

    args = [b"tick", price_u6.to_bytes(8, "big")]
    txn = transaction.ApplicationNoOpTxn(sender=sender, sp=sp, index=app_id, app_args=args)
    stxn = txn.sign(sk)
    txid = client.send_transaction(stxn)
    transaction.wait_for_confirmation(client, txid, 4)

    print(json.dumps({"txId": txid}))

if __name__ == "__main__":
    main()