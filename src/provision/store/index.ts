import { RequestStore as RequestStoreClass } from "./request";
import { AdminStore as AdminStoreClass } from "./admin";
import { CanisterStore as CanisterStoreClass } from "./canister";
import { WasmChunkedStore as WasmChunkedStoreClass } from "./wasm_chunked";

export const TokenCanisterWasmStore = new WasmChunkedStoreClass();
export const AssetCanisterWasmStore = new WasmChunkedStoreClass();
export const RequestStore = new RequestStoreClass();
export const AdminStore = new AdminStoreClass();
export const AssetProxyCanisterStore = new CanisterStoreClass();

export const StorePersistIndex = {
  token_wasm: TokenCanisterWasmStore,
  asset_wasm: AssetCanisterWasmStore,
  requests: RequestStore,
  admins: AdminStore,
  asset_proxy: AssetProxyCanisterStore,
};
