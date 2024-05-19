cd test
mkdir ledger-canister 2>/dev/null
cd ledger-canister

WASM_NAME=ledger.wasm.gz
RELEASE=f58424c4ba894ab8a12c8e223655d5d378fb1010
if [ -f $WASM_NAME ]; then
  rm $WASM_NAME
fi

wget "https://download.dfinity.systems/ic/${RELEASE}/canisters/ledger-canister.wasm.gz" -O $WASM_NAME