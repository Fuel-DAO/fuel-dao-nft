import { provisionActor, initTestSuite } from "../utils/pocket-ic";
import { generateRandomIdentity } from "@hadronous/pic";
import { expectResultIsErr, expectResultIsOk, isSome } from "../utils/common";
import { SampleCollectionRequest } from "../utils/sample";
import {
  ASSET_CANISTER_WASM,
  TOKEN_CANISTER_WASM,
  getModuleHash,
  loadWasmChunksToCanister,
} from "../utils/wasm";

const testMetadata = {
  ...SampleCollectionRequest,
  name: "Test Token",
  symbol: "TEST",
};

describe("Collection Requests", () => {
  let actor: provisionActor;
  const suite = initTestSuite();
  const controller = generateRandomIdentity();
  const user = generateRandomIdentity();

  async function addSeedRequest() {
    actor.setIdentity(user);
    const res = await actor.add_collection_request(testMetadata);
    actor.setIdentity(controller);

    expectResultIsOk(res);
    return res.Ok;
  }

  beforeAll(async () => {
    await suite.setup();
    const provision = await suite.deployProvisionCanister({
      sender: controller.getPrincipal(),
    });
    actor = provision.actor;
    actor.setIdentity(controller);

    const managementActor = await suite.attachToManagementCanister();
    managementActor.setIdentity(controller);

    await actor.set_token_canister_wasm({
      moduleHash: await getModuleHash(TOKEN_CANISTER_WASM),
      chunkHashes: await loadWasmChunksToCanister(
        managementActor,
        TOKEN_CANISTER_WASM,
        provision.canisterId,
      ),
    });

    await actor.set_asset_canister_wasm({
      moduleHash: await getModuleHash(ASSET_CANISTER_WASM),
      chunkHashes: await loadWasmChunksToCanister(
        managementActor,
        ASSET_CANISTER_WASM,
        provision.canisterId,
      ),
    });

    const assetProxy = await suite.deployAssetProxyCanister({ sender: controller.getPrincipal() });
    const tempAsset = await suite.deployAssetCanister({ sender: controller.getPrincipal() });

    assetProxy.actor.setIdentity(controller);
    tempAsset.actor.setIdentity(controller);

    await assetProxy.actor.set_provision_canister(provision.canisterId);
    await assetProxy.actor.set_temp_asset_canister(tempAsset.canisterId);
    await provision.actor.set_asset_proxy_canister(assetProxy.canisterId);
  });

  afterAll(suite.teardown);

  it("initial seed", async () => {
    const requestId = await addSeedRequest();
    const res = await actor.approve_request(requestId);
    expectResultIsOk(res);
  });

  it("upgrade canister", async () => {
    await suite.getInstance().tick(10);

    const res = await actor.upgrade_token_canisters();
    expectResultIsOk(res);
  });
});
