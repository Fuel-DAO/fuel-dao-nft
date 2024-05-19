import { generateRandomIdentity } from "@hadronous/pic";
import {
  assetProxyActor,
  assetProxyFixture,
  initTestSuite,
  managementActor,
} from "../utils/pocket-ic";
import { resolve } from "path";
import { IDL } from "@dfinity/candid";
import { assetProxyInit } from "../utils/canister";

describe("asset_proxy Upgrade Check", () => {
  const suite = initTestSuite();
  let assetProxy: assetProxyFixture;
  const provisionCanisterId = generateRandomIdentity();
  const tempAssetCanisterId = generateRandomIdentity();
  const controllerAccount = generateRandomIdentity();

  beforeAll(async () => {
    await suite.setup();

    assetProxy = await suite.deployAssetProxyCanister({
      sender: controllerAccount.getPrincipal(),
      controllers: [controllerAccount.getPrincipal()],
    });

    assetProxy.actor.setIdentity(controllerAccount);
  });

  afterAll(suite.teardown);

  describe("upgrade success", () => {
    it("initial config", async () => {
      await assetProxy.actor.set_provision_canister(provisionCanisterId.getPrincipal());
      await assetProxy.actor.set_temp_asset_canister(tempAssetCanisterId.getPrincipal());

      const storedProvisionCanisterId = await assetProxy.actor.get_provision_canister();
      const storedTempAssetCanisterId = await assetProxy.actor.get_temp_asset_canister();

      expect(storedProvisionCanisterId.toText()).toBe(provisionCanisterId.getPrincipal().toText());
      expect(storedTempAssetCanisterId.toText()).toBe(tempAssetCanisterId.getPrincipal().toText());
    });

    it("upgrade", async () => {
      const instance = await suite.getInstance();
      await instance.tick(10);

      await instance.upgradeCanister({
        sender: controllerAccount.getPrincipal(),
        canisterId: assetProxy.canisterId,
        wasm: resolve(".azle", "asset_proxy", "asset_proxy.wasm.gz"),
        arg: IDL.encode(assetProxyInit({ IDL }), [[{ Upgrade: null }]]),
      });

      const storedProvisionCanisterId = await assetProxy.actor.get_provision_canister();
      const storedTempAssetCanisterId = await assetProxy.actor.get_temp_asset_canister();

      expect(storedProvisionCanisterId.toText()).toBe(provisionCanisterId.getPrincipal().toText());
      expect(storedTempAssetCanisterId.toText()).toBe(tempAssetCanisterId.getPrincipal().toText());
    });
  });
});
