import { generateRandomIdentity } from "@hadronous/pic";
import { provisionActor, initTestSuite } from "../utils/pocket-ic";
import { expectResultIsErr, expectResultIsOk } from "../utils/common";

describe("Provision Canister Admins", () => {
  let actor: provisionActor;
  const suite = initTestSuite();
  const alice = generateRandomIdentity();
  const bob = generateRandomIdentity();
  const chloe = generateRandomIdentity();

  beforeAll(async () => {
    await suite.setup();
    actor = (
      await suite.deployProvisionCanister({
        sender: chloe.getPrincipal(),
      })
    ).actor;
    actor.setIdentity(chloe);
  });

  afterAll(suite.teardown);

  describe("is_admin", () => {
    it("true for deployer", async () => {
      const result = await actor.is_admin([]);
      expect(result).toBe(true);
    });

    it("false for non-admins", async () => {
      const result = await actor.is_admin([alice.getPrincipal()]);
      expect(result).toBe(false);
    });
  });

  describe("add_admin", () => {
    it("success - controllers can add admins", async () => {
      const addAdminResult = await actor.add_admin(alice.getPrincipal());
      expectResultIsOk(addAdminResult);

      const isAliceAdmin = await actor.is_admin([alice.getPrincipal()]);
      expect(isAliceAdmin).toBe(true);
    });

    it("fails for non-controllers", async () => {
      actor.setIdentity(alice);

      const addAdminResult = await actor.add_admin(bob.getPrincipal());
      expectResultIsErr(addAdminResult);
      expect(addAdminResult.Err).toBe("Only controllers are allowed");

      const isBobAdmin = await actor.is_admin([bob.getPrincipal()]);
      expect(isBobAdmin).toBe(false);

      actor.setIdentity(chloe);
    });
  });

  describe("remove_admin", () => {
    it("success - removes admin", async () => {
      const removeAdminResult = await actor.remove_admin(alice.getPrincipal());
      expectResultIsOk(removeAdminResult);

      const isAliceAdmin = await actor.is_admin([alice.getPrincipal()]);
      expect(isAliceAdmin).toBe(false);
    });

    it("fails for non-controllers", async () => {
      actor.setIdentity(alice);

      const removeAdminResult = await actor.remove_admin(chloe.getPrincipal());
      expectResultIsErr(removeAdminResult);
      expect(removeAdminResult.Err).toBe("Only controllers are allowed");

      const isChloeAdmin = await actor.is_admin([chloe.getPrincipal()]);
      expect(isChloeAdmin).toBe(true);

      actor.setIdentity(chloe);
    });
  });
});
