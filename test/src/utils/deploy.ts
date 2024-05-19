import { Principal } from "@dfinity/principal";
import {
  ASSET_CANISTER_WASM,
  TOKEN_CANISTER_WASM,
  getModuleHash,
  loadWasmChunksToCanister,
} from "./wasm";
import {
  assetProxyService,
  assetService,
  managementService,
  provisionService,
} from "./canister.js";

type CanisterFixture<T> = {
  canisterId: Principal;
  actor: T;
};

export async function configureCanisters(
  fixtures: {
    provision: CanisterFixture<provisionService>;
    tempAsset: CanisterFixture<assetService>;
    assetProxy: CanisterFixture<assetProxyService>;
    management: CanisterFixture<managementService>;
  },
  caller?: Principal,
) {
  // Grant asset_proxy permissions for temp_asset
  await fixtures.tempAsset.actor.grant_permission({
    to_principal: fixtures.assetProxy.canisterId,
    permission: {
      Commit: null,
    },
  });

  // set canister ids in each of the canister
  await fixtures.assetProxy.actor.set_provision_canister(fixtures.provision.canisterId);
  await fixtures.assetProxy.actor.set_temp_asset_canister(fixtures.tempAsset.canisterId);
  await fixtures.provision.actor.set_asset_proxy_canister(fixtures.assetProxy.canisterId);

  // make provision canister a controller of itself (for use as store_canister for chunks)
  const {
    settings: { controllers: provisionControllers },
  } = await fixtures.management.actor.canister_status({
    canister_id: fixtures.provision.canisterId,
  });
  await fixtures.management.actor.update_settings({
    canister_id: fixtures.provision.canisterId,
    settings: {
      freezing_threshold: [],
      compute_allocation: [],
      memory_allocation: [],
      controllers: [[...provisionControllers, fixtures.provision.canisterId]],
      reserved_cycles_limit: [],
      log_visibility: [],
    },
    sender_canister_version: [],
  });

  // load wasms in provision canister
  const assetWasmChunks = await loadWasmChunksToCanister(
    fixtures.management.actor,
    ASSET_CANISTER_WASM,
    fixtures.provision.canisterId,
  );
  const tokenWasmChunks = await loadWasmChunksToCanister(
    fixtures.management.actor,
    TOKEN_CANISTER_WASM,
    fixtures.provision.canisterId,
  );

  await fixtures.provision.actor.set_asset_canister_wasm({
    moduleHash: await getModuleHash(ASSET_CANISTER_WASM),
    chunkHashes: assetWasmChunks,
  });

  await fixtures.provision.actor.set_token_canister_wasm({
    moduleHash: await getModuleHash(TOKEN_CANISTER_WASM),
    chunkHashes: tokenWasmChunks,
  });

  // set caller principal as admin
  if (caller) await fixtures.provision.actor.add_admin(caller);
}
