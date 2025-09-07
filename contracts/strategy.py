# contracts/strategy.py
from pyteal import *

# Global state keys
G_OP     = Bytes("op")       # "<" | ">" | "="
G_THR    = Bytes("thr")      # uint: threshold * 1e6
G_SIDE   = Bytes("side")     # "BUY" | "SELL"
G_PCTBP  = Bytes("pctbp")    # uint: percent in basis points
G_TRADES = Bytes("trades")   # uint: tick counter

def approval():
    # CREATE: args = [op, thr_u6, side, pctbp]
    on_create = Seq(
        Assert(Txn.application_args.length() == Int(4)),
        App.globalPut(G_OP, Txn.application_args[0]),
        App.globalPut(G_THR, Btoi(Txn.application_args[1])),
        App.globalPut(G_SIDE, Txn.application_args[2]),
        App.globalPut(G_PCTBP, Btoi(Txn.application_args[3])),
        App.globalPut(G_TRADES, Int(0)),
        Approve(),
    )

    # NOOP: args = ["tick", price_u6]
    price = ScratchVar(TealType.uint64)  # define outside Seq

    on_tick = Seq(
        Assert(And(
            Txn.application_args.length() == Int(2),
            Txn.application_args[0] == Bytes("tick"),
        )),
        price.store(Btoi(Txn.application_args[1])),
        If(
            Or(
                And(App.globalGet(G_OP) == Bytes("<"), price.load() < App.globalGet(G_THR)),
                And(App.globalGet(G_OP) == Bytes(">"), price.load() > App.globalGet(G_THR)),
                And(App.globalGet(G_OP) == Bytes("="), price.load() == App.globalGet(G_THR)),
            )
        ).Then(
            App.globalPut(G_TRADES, App.globalGet(G_TRADES) + Int(1))
        ),
        Approve(),
    )

    program = Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.NoOp, on_tick],
        [Txn.on_completion() == OnComplete.DeleteApplication, Approve()],
        [Txn.on_completion() == OnComplete.UpdateApplication, Reject()],
        [Txn.on_completion() == OnComplete.CloseOut, Approve()],
        [Txn.on_completion() == OnComplete.OptIn, Approve()],
        [Txn.on_completion() == OnComplete.ClearState, Approve()],
    )
    return program

def clear():
    return Approve()

if __name__ == "__main__":
    import sys
    mode = sys.argv[1] if len(sys.argv) > 1 else "app"
    if mode == "app":
        print(compileTeal(approval(), mode=Mode.Application, version=8))
    else:
        print(compileTeal(clear(), mode=Mode.Application, version=8))