import { generateRandomIdentity } from "@hadronous/pic";
import {
  expectResultIsErr,
  expectResultIsOk,
  loadAssetCanisterWasm,
  loadTokenCanisterWasm,
} from "../utils/common";
import { provisionActor, initTestSuite } from "../utils/pocket-ic";

describe("Provision Canister", () => {
  let actor: provisionActor;
  const suite = initTestSuite();
  const alice = generateRandomIdentity();
  const bob = generateRandomIdentity();

  let tokenCanisterWasm: Uint8Array;
  let assetCanisterWasm: Uint8Array;

  beforeAll(async () => {
    await suite.setup();
    actor = (await suite.deployProvisionCanister({ sender: alice.getPrincipal() })).actor;

    tokenCanisterWasm = await loadTokenCanisterWasm();
    assetCanisterWasm = await loadAssetCanisterWasm();
  });

  afterAll(suite.teardown);

  describe("set_token_canister_wasm", () => {
    it("fails for non-controllers", async () => {
      actor.setIdentity(bob);

      const result = await actor.set_token_canister_wasm({
        moduleHash: [],
        chunkHashes: [],
      });
      expectResultIsErr(result);
      expect(result.Err).toBe("Only controllers are allowed");
    });

    it("success - updates wasm", async () => {
      actor.setIdentity(alice);

      const result = await actor.set_token_canister_wasm({
        moduleHash: [],
        chunkHashes: [],
      });
      expectResultIsOk(result);
    });
  });

  describe("set_asset_canister_wasm", () => {
    it("fails for non-controllers", async () => {
      actor.setIdentity(bob);

      const result = await actor.set_asset_canister_wasm({
        moduleHash: [],
        chunkHashes: [],
      });
      expectResultIsErr(result);
      expect(result.Err).toBe("Only controllers are allowed");
    });

    it("success - updates wasm", async () => {
      actor.setIdentity(alice);

      const result = await actor.set_asset_canister_wasm({
        moduleHash: [],
        chunkHashes: [],
      });
      expectResultIsOk(result);
    });
  });
});
