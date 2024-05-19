cd test
mkdir asset-canister 2>/dev/null
cd asset-canister

WASM_NAME=assetstorage.wasm.gz
if [ ! -f $WASM_NAME ]; then
  wget https://github.com/dfinity/sdk/raw/0.19.0/src/distributed/assetstorage.wasm.gz -O assetstorage.wasm.gz
else
  echo "Asset Canister Wasm already exists"
fi