cd test
mkdir index-canister 2>/dev/null
cd index-canister

WASM_NAME=index.wasm.gz
RELEASE=f58424c4ba894ab8a12c8e223655d5d378fb1010
if [ -f $WASM_NAME ]; then
  rm $WASM_NAME
fi

wget "https://download.dfinity.systems/ic/${RELEASE}/canisters/ic-icp-index-canister.wasm.gz" -O $WASM_NAME