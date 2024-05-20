import { generateRandomIdentity } from "@hadronous/pic";
import { resolve } from "path";
import { IDL } from "@dfinity/candid";
import { provisionFixture, initTestSuite, managementActor } from "../utils/pocket-ic";
import { provisionInit } from "../utils/canister";
import { SampleCollectionRequest } from "../utils/sample";
import { expectResultIsOk } from "../utils/common";

describe("provision Upgrade Check", () => {
  const suite = initTestSuite();
  let provision: provisionFixture, managementActor: managementActor;
  const assetProxyCanisterId = generateRandomIdentity();
  const controllerAccount = generateRandomIdentity();
  const userAccount = generateRandomIdentity();
  const fileHash = new Uint8Array([0, 1, 2]);

  beforeAll(async () => {
    await suite.setup();

    provision = await suite.deployProvisionCanister({
      sender: controllerAccount.getPrincipal(),
      controllers: [controllerAccount.getPrincipal()],
    });
    provision.actor.setIdentity(controllerAccount);

    managementActor = await suite.attachToManagementCanister();
    managementActor.setIdentity(controllerAccount);

    await provision.actor.add_admin(userAccount.getPrincipal());
    await provision.actor.set_asset_proxy_canister(assetProxyCanisterId.getPrincipal());

    await managementActor.upload_chunk({
      chunk: "Hello World".split("").map((v) => v.charCodeAt(0)),
      canister_id: provision.canisterId,
    });

    await provision.actor.set_asset_canister_wasm({
      moduleHash: fileHash,
      chunkHashes: [fileHash],
    });

    await provision.actor.set_token_canister_wasm({
      moduleHash: fileHash,
      chunkHashes: [fileHash],
    });

    await provision.actor.add_collection_request({
      ...SampleCollectionRequest,
      name: "Test Token",
    });
  });

  afterAll(suite.teardown);

  describe("upgrade success", () => {
    it("initial config", async () => {
      const storedCanisterId = await provision.actor.get_asset_proxy_canister();
      expect(storedCanisterId.toText()).toBe(assetProxyCanisterId.getPrincipal().toText());

      const assetWasm = await provision.actor.get_asset_canister_wasm();
      expect(assetWasm.moduleHash).toMatchObject(fileHash);
      expect(assetWasm.chunkHashes).toMatchObject([fileHash]);

      const tokenWasm = await provision.actor.get_token_canister_wasm();
      expect(tokenWasm.moduleHash).toMatchObject(fileHash);
      expect(tokenWasm.chunkHashes).toMatchObject([fileHash]);

      const isAdmin = await provision.actor.is_admin([userAccount.getPrincipal()]);
      expect(isAdmin).toBe(true);

      const uploadedChunks = await managementActor.stored_chunks({
        canister_id: provision.canisterId,
      });
      expect(uploadedChunks).toHaveLength(1);

      const pendingRequests = await provision.actor.get_pending_requests();
      expect(pendingRequests).toHaveLength(1);
    });

    it("upgrade", async () => {
      const instance = await suite.getInstance();
      await instance.tick(10);

      await instance.upgradeCanister({
        sender: controllerAccount.getPrincipal(),
        canisterId: provision.canisterId,
        wasm: resolve(".azle", "provision", "provision.wasm.gz"),
        arg: IDL.encode(provisionInit({ IDL }), [[{ Upgrade: null }]]),
      });

      const storedCanisterId = await provision.actor.get_asset_proxy_canister();
      expect(storedCanisterId.toText()).toBe(assetProxyCanisterId.getPrincipal().toText());

      const assetWasm = await provision.actor.get_asset_canister_wasm();
      expect(assetWasm.moduleHash).toMatchObject(fileHash);
      expect(assetWasm.chunkHashes).toMatchObject([fileHash]);

      const tokenWasm = await provision.actor.get_token_canister_wasm();
      expect(tokenWasm.moduleHash).toMatchObject(fileHash);
      expect(tokenWasm.chunkHashes).toMatchObject([fileHash]);

      const isAdmin = await provision.actor.is_admin([userAccount.getPrincipal()]);
      expect(isAdmin).toBe(true);

      const uploadedChunks = await managementActor.stored_chunks({
        canister_id: provision.canisterId,
      });
      expect(uploadedChunks).toHaveLength(1);

      const pendingRequests = await provision.actor.get_pending_requests();
      expect(pendingRequests).toHaveLength(1);

      const addCollectionAfterUpgradeResult = await provision.actor.add_collection_request({
        ...(SampleCollectionRequest),
        name: "Test Token 2"
      });
      expectResultIsOk(addCollectionAfterUpgradeResult);
      expect(addCollectionAfterUpgradeResult.Ok).toBe(2n);

      const pendingRequestsAfterCollectionRequest = await provision.actor.get_pending_requests();
      expect(pendingRequestsAfterCollectionRequest).toHaveLength(2);
    });
  });
});
