import { CanisterStore } from "./canister";

export const TempAssetCanisterStore = new CanisterStore();
export const ProvisionCanisterStore = new CanisterStore();

export const StorePersistIndex = {
  temp_asset_canister: TempAssetCanisterStore,
  provision_canister: ProvisionCanisterStore,
};
