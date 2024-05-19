cd .azle

TOKEN_CANISTER_NAME=token
PROVISION_CANISTER_NAME=provision
ASSET_PROXY_CANISTER_NAME=asset_proxy

GZIP_FILE_TOKEN="${TOKEN_CANISTER_NAME}.wasm.gz"
FILE_TOKEN="${TOKEN_CANISTER_NAME}.wasm"

GZIP_FILE_PROVISION="${PROVISION_CANISTER_NAME}.wasm.gz"
FILE_PROVISION="${PROVISION_CANISTER_NAME}.wasm"

GZIP_FILE_ASSET_PROXY="${ASSET_PROXY_CANISTER_NAME}.wasm.gz"
FILE_ASSET_PROXY="${ASSET_PROXY_CANISTER_NAME}.wasm"

cd $TOKEN_CANISTER_NAME
if [ ! -f $GZIP_FILE_TOKEN ]; then
  if [ -f $FILE_TOKEN ]; then
    gzip -k $FILE_TOKEN
  else
    echo "Can't find wasm binary"
    exit 1
  fi
fi

cd ../$PROVISION_CANISTER_NAME
if [ ! -f $GZIP_FILE_PROVISION ]; then
  if [ -f $FILE_PROVISION ]; then
    gzip -k $FILE_PROVISION
  else
    echo "Can't find wasm binary"
    exit 1
  fi
fi

cd ../$ASSET_PROXY_CANISTER_NAME
if [ ! -f $GZIP_FILE_ASSET_PROXY ]; then
  if [ -f $FILE_ASSET_PROXY ]; then
    gzip -k $FILE_ASSET_PROXY
  else
    echo "Can't find wasm binary"
    exit 1
  fi
fi