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
  const alice = generateRandomIdentity();
  const bob = generateRandomIdentity();

  async function addSeedRequest() {
    actor.setIdentity(bob);
    const res = await actor.add_collection_request(testMetadata);
    actor.setIdentity(alice);

    expectResultIsOk(res);
    return res.Ok;
  }

  beforeAll(async () => {
    await suite.setup();
    const provision = await suite.deployProvisionCanister();
    actor = provision.actor;

    const managementActor = await suite.attachToManagementCanister();

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

    const assetProxy = await suite.deployAssetProxyCanister();
    const tempAsset = await suite.deployAssetCanister();

    await assetProxy.actor.set_provision_canister(provision.canisterId);
    await assetProxy.actor.set_temp_asset_canister(tempAsset.canisterId);
    await provision.actor.set_asset_proxy_canister(assetProxy.canisterId);

    await actor.add_admin(alice.getPrincipal());
    actor.setIdentity(alice);
  });

  afterAll(suite.teardown);

  describe("reject_request", () => {
    let requestId: bigint | undefined;

    beforeAll(async () => {
      requestId = await addSeedRequest();
    });

    it("fails for non-admin", async () => {
      expect(requestId).not.toBeUndefined();
      if (requestId === undefined) return;

      actor.setIdentity(bob);

      const result = await actor.reject_request(requestId);
      expectResultIsErr(result);
      expect(result.Err).toBe("The user does not have admin access.");

      const request = await actor.get_request_info(requestId);
      expect(request).toEqual([
        {
          metadata: [testMetadata],
          collection_owner: bob.getPrincipal(),
          approval_status: { Pending: null },
          token_canister: [],
          asset_canister: [],
        },
      ]);
    });

    it("fails for non-existent id", async () => {
      actor.setIdentity(alice);

      const result = await actor.reject_request(999n);
      expectResultIsErr(result);
      expect(result.Err).toBe("No request exists with the given id.");
    });

    it("success - request rejected", async () => {
      expect(requestId).not.toBeUndefined();
      if (requestId === undefined) return;

      actor.setIdentity(alice);

      const result = await actor.reject_request(requestId);
      expectResultIsOk(result);

      const request = await actor.get_request_info(requestId);
      expect(request).toEqual([
        {
          metadata: [],
          collection_owner: bob.getPrincipal(),
          approval_status: { Rejected: null },
          token_canister: [],
          asset_canister: [],
        },
      ]);
    });
  });

  describe("approve_request", () => {
    let requestId: bigint | undefined;

    beforeAll(async () => {
      requestId = await addSeedRequest();
    });

    it("fails for non-admin", async () => {
      expect(requestId).not.toBeUndefined();
      if (requestId === undefined) return;

      actor.setIdentity(bob);

      const result = await actor.approve_request(requestId);
      expectResultIsErr(result);
      expect(result.Err).toBe("The user does not have admin access.");

      const request = await actor.get_request_info(requestId);
      expect(request).toEqual([
        {
          metadata: [testMetadata],
          collection_owner: bob.getPrincipal(),
          approval_status: { Pending: null },
          token_canister: [],
          asset_canister: [],
        },
      ]);
    });

    it("fails for non-existent id", async () => {
      actor.setIdentity(alice);

      const result = await actor.approve_request(999n);
      expectResultIsErr(result);
      expect(result.Err).toBe("No request exists with the given id.");
    });

    it("success - request approved", async () => {
      expect(requestId).not.toBeUndefined();
      if (requestId === undefined) return;

      actor.setIdentity(alice);

      const result = await actor.approve_request(requestId);
      expectResultIsOk(result);

      const request = await actor.get_request_info(requestId);
      expect(request).toMatchObject([
        {
          metadata: [],
          collection_owner: bob.getPrincipal(),
          approval_status: { Approved: null },
        },
      ]);
      expect(isSome(request[0]!.token_canister)).toBe(true);
      if (!isSome(request[0]!.token_canister)) return;

      const tokenCanisterId = request[0]!.token_canister[0];
      const tokenActor = suite.attachToTokenCanister(tokenCanisterId);
      expect(result.Ok.token_canister.toString()).toBe(tokenCanisterId.toString());

      const name = await tokenActor.icrc7_name();
      const symbol = await tokenActor.icrc7_symbol();

      expect(name).toBe(testMetadata.name);
      expect(symbol).toBe(testMetadata.symbol);

      const assetCanisterId = request[0]!.asset_canister[0]!;
      const assetActor = suite.attachToAssetCanister(assetCanisterId);
      expect(result.Ok.asset_canister.toString()).toBe(assetCanisterId.toString());

      const tokenPermsValidationRes = await assetActor.validate_grant_permission({
        to_principal: tokenCanisterId,
        permission: {
          ManagePermissions: null,
        },
      });

      const ownerPermsValidationRes = await assetActor.validate_grant_permission({
        to_principal: bob.getPrincipal(),
        permission: {
          Commit: null,
        },
      });

      expect("Ok" in tokenPermsValidationRes).toBe(true);
      expect("Ok" in ownerPermsValidationRes).toBe(true);
    });
  });
});
