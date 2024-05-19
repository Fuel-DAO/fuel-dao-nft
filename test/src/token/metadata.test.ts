import { tokenActor, initTestSuite } from "../utils/pocket-ic";
import { generateRandomIdentity } from "@hadronous/pic";
import { Ok } from "../utils/common";
import { SampleCollectionUpdate } from "../utils/sample";
import { Principal } from "@dfinity/principal";

describe("Metadata", () => {
  let actor: tokenActor;
  const suite = initTestSuite();
  const alice = generateRandomIdentity();
  const bob = generateRandomIdentity();

  const initMetadata = {
    name: "FuelDAO",
    symbol: "FUEL",
    logo: "http://fueldao.io/test-image.png",
    collection_owner: alice.getPrincipal(),
    asset_canister: Principal.anonymous(),
    supply_cap: 10n,
  };

  beforeAll(async () => {
    await suite.setup();
    const assetCanister = await suite.deployAssetCanister();
    initMetadata["asset_canister"] = assetCanister.canisterId;

    const tokenCanister = await suite.deployTokenCanister(initMetadata);
    actor = tokenCanister.actor;
    actor.setIdentity(alice);

    await assetCanister.actor.grant_permission({
      to_principal: tokenCanister.canisterId,
      permission: {
        ManagePermissions: null,
      },
    });
  });

  afterAll(suite.teardown);

  describe("ICRC7 Compliant", () => {
    it("icrc7_name", async () => {
      const name = await actor.icrc7_name();
      expect(name).toBe(initMetadata.name);
    });

    it("icrc7_symbol", async () => {
      const symbol = await actor.icrc7_symbol();
      expect(symbol).toBe(initMetadata.symbol);
    });

    it("icrc7_logo", async () => {
      const logo = await actor.icrc7_logo();
      expect(logo).toHaveLength(1);
      expect(logo).toContain(initMetadata.logo);
    });

    it("icrc7_description", async () => {
      const description = await actor.icrc7_description();
      expect(description).toHaveLength(0);
    });

    it("icrc7_supply_cap", async () => {
      const supply_cap = await actor.icrc7_supply_cap();
      expect(supply_cap).toHaveLength(1);
      expect(supply_cap).toContain(initMetadata.supply_cap);
    });

    it("icrc7_total_supply", async () => {
      const total_supply = await actor.icrc7_total_supply();
      expect(total_supply).toBe(0n);
    });

    it("icrc7_max_query_batch_size", async () => {
      const max_query_batch_size = await actor.icrc7_max_query_batch_size();
      expect(max_query_batch_size).toHaveLength(0);
    });

    it("icrc7_max_update_batch_size", async () => {
      const max_update_batch_size = await actor.icrc7_max_update_batch_size();
      expect(max_update_batch_size).toHaveLength(0);
    });

    it("icrc7_max_default_take_value", async () => {
      const max_default_take_value = await actor.icrc7_max_default_take_value();
      expect(max_default_take_value).toHaveLength(0);
    });

    it("icrc7_max_take_value", async () => {
      const max_take_value = await actor.icrc7_max_take_value();
      expect(max_take_value).toHaveLength(0);
    });

    it("icrc7_max_memo_size", async () => {
      const max_memo_size = await actor.icrc7_max_memo_size();
      expect(max_memo_size).toHaveLength(0);
    });

    it("icrc7_atomic_batch_transfers", async () => {
      const atomic_batch_transfers = await actor.icrc7_atomic_batch_transfers();
      expect(atomic_batch_transfers).toHaveLength(0);
    });

    it("icrc7_tx_window", async () => {
      const tx_window = await actor.icrc7_tx_window();
      expect(tx_window).toHaveLength(0);
    });

    it("icrc7_permitted_drift", async () => {
      const permitted_drift = await actor.icrc7_permitted_drift();
      expect(permitted_drift).toHaveLength(0);
    });

    it("icrc7_collection_metadata", async () => {
      const metadata = await actor.icrc7_collection_metadata();

      expect(metadata).toHaveLength(6);
      expect(metadata).toContainEqual(["icrc7:name", { Text: initMetadata.name }]);
      expect(metadata).toContainEqual(["icrc7:symbol", { Text: initMetadata.symbol }]);
      expect(metadata).toContainEqual(["icrc7:total_supply", { Nat: 0n }]);
      expect(metadata).toContainEqual(["icrc7:supply_cap", { Nat: initMetadata.supply_cap }]);
      expect(metadata).toContainEqual(["icrc7:logo", { Text: initMetadata.logo }]);
    });
  });

  describe("Collection Owner", () => {
    it("change_ownership fails on non-owner calls", async () => {
      actor.setIdentity(bob);
      const res = (await actor.change_ownership(alice.getPrincipal())) as Ok<bigint>;
      actor.setIdentity(alice);

      expect(res.Ok).toBeFalsy();

      const metadata = await actor.get_metadata();
      expect(metadata.collection_owner.toString()).toBe(alice.getPrincipal().toString());
    });

    it("change_ownership success", async () => {
      const res = (await actor.change_ownership(bob.getPrincipal())) as Ok<bigint>;
      expect(res.Ok).toBeTruthy();

      const metadata = await actor.get_metadata();
      expect(metadata.collection_owner.toString()).toBe(bob.getPrincipal().toString());
    });
  });

  describe("Extended Metadata", () => {
    it("update_metadata fails on non-owner calls", async () => {
      const updatedName = "FuelDAO NFT by Bob";

      actor.setIdentity(alice);
      const res = (await actor.update_metadata({
        ...SampleCollectionUpdate,
        name: [updatedName],
      })) as Ok<bigint>;
      actor.setIdentity(bob);

      expect(res.Ok).toBeFalsy();

      const metadata = await actor.icrc7_collection_metadata();
      expect(metadata).toContainEqual(["icrc7:name", { Text: initMetadata.name }]);
    });

    it("update_metadata success", async () => {
      const updatedName = "FuelDAO NFT by Bob";

      const res = (await actor.update_metadata({
        ...SampleCollectionUpdate,
        name: [updatedName],
      })) as Ok<bigint>;

      expect(res.Ok).toBeTruthy();

      const metadata = await actor.icrc7_collection_metadata();
      expect(metadata).toContainEqual(["icrc7:name", { Text: updatedName }]);
    });
  });
});
