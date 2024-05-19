import { provisionActor, initTestSuite } from "../utils/pocket-ic";
import { generateRandomIdentity } from "@hadronous/pic";
import { expectResultIsErr, expectResultIsOk, isSome } from "../utils/common";
import { SampleCollectionRequest } from "../utils/sample";
import { configureCanisters } from "../utils/deploy";
import { Principal } from "@dfinity/principal";
import { Vec, nat } from "azle";

const testMetadata = {
  ...SampleCollectionRequest,
  name: "Test Token",
  symbol: "TEST",
};

describe("Collection Requests", () => {
  let actor: provisionActor;
  const suite = initTestSuite();
  const admin = generateRandomIdentity();

  const draftCollectionCount = 1;
  const publishedCollectionCount = 2;
  const totalCollectionCount = draftCollectionCount + publishedCollectionCount;

  let publishedCollections: any[] = [];

  async function seed() {
    const collections = await Promise.all(
      new Array(totalCollectionCount).fill(undefined).map(async () => {
        const res = await actor.add_collection_request(testMetadata);
        expectResultIsOk(res);

        return res.Ok;
      }),
    );

    await Promise.all(
      collections.slice(0, publishedCollectionCount).map((id) => actor.approve_request(id)),
    );

    publishedCollections = await Promise.all(
      collections.slice(0, publishedCollectionCount).map(async (id) => {
        const collection = await actor.get_request_info(id);
        return {
          id,
          token_canister: collection[0]?.token_canister[0]!,
          asset_canister: collection[0]?.asset_canister[0]!,
        };
      }),
    );
  }

  beforeAll(async () => {
    await suite.setup();
    const provision = await suite.deployProvisionCanister();
    const assetProxy = await suite.deployAssetProxyCanister();
    const tempAsset = await suite.deployAssetCanister();

    const managementActor = await suite.attachToManagementCanister();

    await configureCanisters(
      {
        provision,
        assetProxy,
        tempAsset,
        management: {
          canisterId: Principal.from("aaaaa-aa"),
          actor: managementActor,
        },
      },
      admin.getPrincipal(),
    );

    actor = provision.actor;
    actor.setIdentity(admin);

    await seed();
  });

  afterAll(suite.teardown);

  it("list_collections", async () => {
    const listedCollections = await actor.list_collections();
    expect(listedCollections.sort()).toEqual(publishedCollections.sort());
  });
});
