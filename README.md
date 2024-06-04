# Fuel-DAO Backend Repository

Repository containing the backend Azle canisters for FuelDAO.

---

Deployed Canister IDs can be found in: [canister_ids.json](https://github.com/Fuel-DAO/fuel-dao-nft/blob/main/canister_ids.json)

---

## Verfying builds

Module hashes:
```
Provision Canister: 0x0498a02fa82a1d46151887daf8c860c4d4560595c3cf76292767d80bc76e8b97
Asset Proxy: 0x2a63f338f45c53e06ff2adf615ff5f15793c3d678c7c80c439c4787a2b274e10
Token: 0x5ac36759c174c06612f2092cc7f548f23d6b11e98d846fd0e435eb3767e34c25
```

To build canister source locally:
- Build the canisters locally using:
  ```
  dfx canister create --all
  dfx build asset_proxy
  dfx build provision
  dfx build token
  ```
- Get the module hash of the local builds:
  ```
  sha256sum ./.dfx/local/canisters/token/token.wasm.gz
  sha256sum ./.dfx/local/canisters/provision/provision.wasm.gz
  sha256sum ./.dfx/local/canisters/asset_proxy/asset_proxy.wasm.gz
  ```