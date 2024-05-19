import { Principal } from "@dfinity/principal";
import { provisionActor, initTestSuite } from "../utils/pocket-ic";
import { generateRandomIdentity } from "@hadronous/pic";
import { expectResultIsErr, expectResultIsOk, isNone, isSome } from "../utils/common";
import { SampleCollectionRequest } from "../utils/sample";

const testMetadata = {
  ...SampleCollectionRequest,
  name: "Test Token",
  symbol: "TEST",
};

describe("Collection Requests", () => {
  let actor: provisionActor;
  const suite = initTestSuite();
  const alice = generateRandomIdentity();

  beforeAll(async () => {
    await suite.setup();
    actor = (await suite.deployProvisionCanister()).actor;
  });

  afterAll(suite.teardown);

  describe("add_collection_request", () => {
    it("fails on anonymous user", async () => {
      actor.setPrincipal(Principal.anonymous());

      const addCollectionResult = await actor.add_collection_request(testMetadata);
      expectResultIsErr(addCollectionResult);
      expect(addCollectionResult.Err).toBe("Anonymous users not allowed");

      const pendingRequestIds = await actor.get_pending_requests();
      expect(pendingRequestIds).toHaveLength(0);

      actor.setIdentity(alice);
    });

    it("success - adds request", async () => {
      const addCollectionResult = await actor.add_collection_request(testMetadata);
      expectResultIsOk(addCollectionResult);
      expect(addCollectionResult.Ok).toBeGreaterThanOrEqual(0);
      const id = addCollectionResult.Ok;

      const pendingRequestIds = await actor.get_pending_requests();
      expect(pendingRequestIds).toEqual([id]);

      const request = await actor.get_request_info(id);
      expect(request).toEqual([
        {
          metadata: [testMetadata],
          collection_owner: alice.getPrincipal(),
          approval_status: { Pending: null },
          token_canister: [],
          asset_canister: [],
        },
      ]);
    });
  });

  describe("get_request_info", () => {
    it("returns None on non-existent request id", async () => {
      const request = await actor.get_request_info(999n);
      expect(isNone(request)).toBe(true);
    });
  });
});
