import { generateRandomIdentity } from "@hadronous/pic";
import {
  assetActor,
  assetFixture,
  assetProxyActor,
  assetProxyFixture,
  initTestSuite,
} from "../utils/pocket-ic";
import { Principal } from "@dfinity/principal";
import { expectResultIsErr, expectResultIsOk } from "../utils/common";

describe("asset_proxy", () => {
  let assetProxyActor: assetProxyActor, tempAssetActor: assetActor, extraAssetActor: assetActor;
  let tempAssetId: Principal, extraAssetId: Principal;
  const provisionAccount = generateRandomIdentity();
  const controllerAccount = generateRandomIdentity();
  const suite = initTestSuite();

  beforeAll(async () => {
    await suite.setup();

    const assetProxy = await suite.deployAssetProxyCanister({
      sender: controllerAccount.getPrincipal(),
    });
    const tempAsset = await suite.deployAssetCanister();
    const extraAsset = await suite.deployAssetCanister();

    assetProxyActor = assetProxy.actor;
    tempAssetActor = tempAsset.actor;
    extraAssetActor = extraAsset.actor;

    tempAssetId = tempAsset.canisterId;
    extraAssetId = extraAsset.canisterId;

    await tempAsset.actor.grant_permission({
      to_principal: assetProxy.canisterId,
      permission: {
        Commit: null,
      },
    });

    await extraAsset.actor.grant_permission({
      to_principal: assetProxy.canisterId,
      permission: {
        Commit: null,
      },
    });
  });

  afterAll(suite.teardown);

  describe("set_provision_canister", () => {
    it("failure on non-controller call", async () => {
      const account = generateRandomIdentity();
      assetProxyActor.setIdentity(account);

      const res = await assetProxyActor.set_provision_canister(provisionAccount.getPrincipal());
      expectResultIsErr(res);
    });

    it("success", async () => {
      assetProxyActor.setIdentity(controllerAccount);

      const res = await assetProxyActor.set_provision_canister(provisionAccount.getPrincipal());
      expectResultIsOk(res);

      const storedProvisionId = await assetProxyActor.get_provision_canister();
      expect(storedProvisionId.toString()).toBe(provisionAccount.getPrincipal().toString());
    });
  });

  describe("set_temp_asset_canister", () => {
    it("failure on non-controller call", async () => {
      const account = generateRandomIdentity();
      assetProxyActor.setIdentity(account);

      const res = await assetProxyActor.set_temp_asset_canister(tempAssetId);
      expectResultIsErr(res);
    });

    it("success", async () => {
      assetProxyActor.setIdentity(controllerAccount);

      const res = await assetProxyActor.set_temp_asset_canister(tempAssetId);
      expectResultIsOk(res);

      const storedTempAssetId = await assetProxyActor.get_temp_asset_canister();
      expect(storedTempAssetId.toString()).toBe(tempAssetId.toString());
    });
  });

  describe("store", () => {
    it("fails on anonymous user", async () => {
      assetProxyActor.setPrincipal(Principal.anonymous());

      const res = await assetProxyActor.store({
        key: "anonymous_test.txt",
        content_type: "text/plain",
        content_encoding: "identity",
        content: "Hello World".split("").map((v) => v.charCodeAt(0)),
        sha256: [],
      });

      expectResultIsErr(res);
      expect(res.Err).toBe("Anonymous users not allowed");
    });

    it("success", async () => {
      const fileBytes = "Hello World".split("").map((v) => v.charCodeAt(0));
      const account = generateRandomIdentity();
      assetProxyActor.setIdentity(account);

      const res = await assetProxyActor.store({
        key: "store_test.txt",
        content_type: "text/plain",
        content_encoding: "identity",
        content: fileBytes,
        sha256: [],
      });

      expectResultIsOk(res);

      const file = await tempAssetActor.get({
        key: "store_test.txt",
        accept_encodings: ["identity"],
      });

      expect(Array.from(file.content)).toEqual(fileBytes);
    });
  });

  describe("prune", () => {
    it("fails on non-controller user", async () => {
      assetProxyActor.setPrincipal(Principal.anonymous());

      const res = await assetProxyActor.prune(["store_test.txt"]);

      expectResultIsErr(res);
      expect(res.Err).toBe("Only controllers are allowed");
    });

    it("success", async () => {
      assetProxyActor.setIdentity(controllerAccount);

      const res = await assetProxyActor.prune(["store_test.txt"]);
      expectResultIsOk(res);

      const files = await tempAssetActor.list({});
      expect(files.every((file) => file.key !== "store_test.txt")).toBe(true);
    });
  });

  describe("reject_files", () => {
    beforeAll(async () => {
      await assetProxyActor.store({
        key: "reject_test_1.txt",
        content_type: "text/plain",
        content_encoding: "identity",
        content: "Hello World".split("").map((v) => v.charCodeAt(0)),
        sha256: [],
      });

      await assetProxyActor.store({
        key: "reject_test_2.txt",
        content_type: "text/plain",
        content_encoding: "identity",
        content: "Hello World".split("").map((v) => v.charCodeAt(0)),
        sha256: [],
      });
    });

    it("seed file added", async () => {
      const files = await tempAssetActor.list({});
      expect(files.some((file) => file.key === "reject_test_1.txt")).toBe(true);
      expect(files.some((file) => file.key === "reject_test_2.txt")).toBe(true);
    });

    it("fails on non-provision caller", async () => {
      const account = generateRandomIdentity();
      assetProxyActor.setIdentity(account);

      const res = await assetProxyActor.reject_files(["reject_test_1.txt", "reject_test_2.txt"]);
      expectResultIsErr(res);
    });

    it("success", async () => {
      assetProxyActor.setIdentity(provisionAccount);

      const res = await assetProxyActor.reject_files(["reject_test_1.txt", "reject_test_2.txt"]);
      expectResultIsOk(res);

      const files = await tempAssetActor.list({});
      expect(files.every((file) => file.key !== "reject_test_1.txt")).toBe(true);
      expect(files.every((file) => file.key !== "reject_test_2.txt")).toBe(true);
    });
  });

  describe("approve_files", () => {
    beforeAll(async () => {
      await assetProxyActor.store({
        key: "approve_test_1.txt",
        content_type: "text/plain",
        content_encoding: "identity",
        content: "Hello World".split("").map((v) => v.charCodeAt(0)),
        sha256: [],
      });

      await assetProxyActor.store({
        key: "approve_test_2.txt",
        content_type: "text/plain",
        content_encoding: "identity",
        content: "Hello World".split("").map((v) => v.charCodeAt(0)),
        sha256: [],
      });
    });

    it("seed file added", async () => {
      const files = await tempAssetActor.list({});
      expect(files.some((file) => file.key === "approve_test_1.txt")).toBe(true);
      expect(files.some((file) => file.key === "approve_test_2.txt")).toBe(true);
    });

    it("fails on non-provision caller", async () => {
      const account = generateRandomIdentity();
      assetProxyActor.setIdentity(account);

      const res = await assetProxyActor.approve_files({
        files: ["approve_test_1.txt", "approve_test_2.txt"],
        asset_canister: extraAssetId,
      });
      expectResultIsErr(res);
    });

    it("success", async () => {
      assetProxyActor.setIdentity(provisionAccount);

      const res = await assetProxyActor.approve_files({
        files: ["approve_test_1.txt", "approve_test_2.txt"],
        asset_canister: extraAssetId,
      });
      expectResultIsOk(res);

      const files = await tempAssetActor.list({});
      expect(files.every((file) => file.key !== "approve_test_1.txt")).toBe(true);
      expect(files.every((file) => file.key !== "approve_test_2.txt")).toBe(true);

      const destFiles = await extraAssetActor.list({});
      expect(destFiles.some((file) => file.key === "approve_test_1.txt")).toBe(true);
      expect(destFiles.some((file) => file.key === "approve_test_2.txt")).toBe(true);
    });
  });
});
