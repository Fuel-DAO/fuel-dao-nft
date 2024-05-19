import { Principal } from "@dfinity/principal";
import { configureCanisters } from "../utils/deploy";
import {
  assetActor,
  assetProxyActor,
  tokenActor,
  icpLedgerActor,
  initTestSuite,
  provisionActor,
  provisionFixture,
} from "../utils/pocket-ic";
import { generateRandomIdentity } from "@hadronous/pic";
import { SampleCollectionRequest, SampleCollectionUpdate } from "../utils/sample";
import { expectResultIsOk } from "../utils/common";
import { nat } from "azle";
import { deriveSubaccount } from "../../../src/common/token";

const TRANSFER_FEE = 10_000n;

describe("E2E Test", () => {
  const suite = initTestSuite();
  const adminAccount = generateRandomIdentity();
  const userAccount = generateRandomIdentity();
  const minterAccount = generateRandomIdentity();
  let provisionActor: provisionActor,
    assetProxyActor: assetProxyActor,
    tempAssetActor: assetActor,
    icpLedgerActor: icpLedgerActor,
    tokenActor: tokenActor,
    assetActor: assetActor;
  let icpLedgerId: Principal;
  let requestId: nat;

  beforeAll(async () => {
    await suite.setup();
    const provision = await suite.deployProvisionCanister();
    const assetProxy = await suite.deployAssetProxyCanister();
    const tempAsset = await suite.deployAssetCanister();
    const icpLedger = await suite.deployIcpLedgerCanister(minterAccount.getPrincipal());
    const management = {
      canisterId: Principal.fromText("aaaaa-aa"),
      actor: await suite.attachToManagementCanister(),
    };

    await configureCanisters(
      {
        provision,
        assetProxy,
        tempAsset,
        management,
      },
      adminAccount.getPrincipal(),
    );

    provisionActor = provision.actor;
    assetProxyActor = assetProxy.actor;
    tempAssetActor = tempAsset.actor;
    icpLedgerActor = icpLedger.actor;
    icpLedgerId = icpLedger.canisterId;

    icpLedgerActor.setIdentity(minterAccount);
  });

  afterAll(suite.teardown);

  it("request new collection", async () => {
    provisionActor.setIdentity(userAccount);
    assetProxyActor.setIdentity(userAccount);

    await assetProxyActor.store({
      key: "/document_1.txt",
      content: "Hello World".split("").map((v) => v.charCodeAt(0)),
      content_encoding: "identity",
      content_type: "text/plain",
      sha256: [],
    });

    await assetProxyActor.store({
      key: "/document_2.txt",
      content: "Hello Universe".split("").map((v) => v.charCodeAt(0)),
      content_encoding: "identity",
      content_type: "text/plain",
      sha256: [],
    });

    await assetProxyActor.store({
      key: "/image.txt",
      content: "Hello Universe".split("").map((v) => v.charCodeAt(0)),
      content_encoding: "identity",
      content_type: "text/plain",
      sha256: [],
    });

    const res = await provisionActor.add_collection_request({
      ...SampleCollectionRequest,
      name: "Test Collection",
      symbol: "TEST",
      token: icpLedgerId,
      treasury: userAccount.getPrincipal(),
      supply_cap: 2n,
      price: 90_000_000_000n,
      documents: [
        ["kyc", "/document_1.txt"],
        ["ownership", "/document_2.txt"],
      ],
      images: ["/image.txt"],
    });
    expectResultIsOk(res);
    requestId = res.Ok;

    const pendingRequests = await provisionActor.get_pending_requests();
    expect(pendingRequests).toHaveLength(1);
    expect(pendingRequests[0]).toBe(requestId);
  });

  it("admin approves request", async () => {
    provisionActor.setIdentity(adminAccount);
    assetProxyActor.setIdentity(adminAccount);

    const res = await provisionActor.approve_request(requestId);
    expectResultIsOk(res);

    const requestInfo = await provisionActor.get_request_info(requestId);
    expect("Approved" in requestInfo[0]?.approval_status!).toBe(true);
    expect(requestInfo[0]?.token_canister).toHaveLength(1);
    expect(requestInfo[0]?.asset_canister).toHaveLength(1);

    const tokenCanisterId = requestInfo[0]?.token_canister![0]!;
    const assetCanisterId = requestInfo[0]?.asset_canister![0]!;
    tokenActor = await suite.attachToTokenCanister(tokenCanisterId);
    assetActor = await suite.attachToAssetCanister(assetCanisterId);

    const metadata = await tokenActor.get_metadata();
    expect(metadata.name).toBe("Test Collection");
    expect(metadata.symbol).toBe("TEST");
    expect(metadata.supply_cap).toBe(2n);
    expect(metadata.total_supply).toBe(0n);
    expect(metadata.documents).toHaveLength(2);
    expect(metadata.images).toHaveLength(1);

    const files = await assetActor.list({});
    expect(files).toHaveLength(3);
    expect(files.map((file) => file.key).sort()).toEqual(
      ["/document_1.txt", "/document_2.txt", "/image.txt"].sort(),
    );
  });

  it("edit collection documents", async () => {
    tokenActor.setIdentity(userAccount);
    assetActor.setIdentity(userAccount);

    await assetActor.delete_asset({
      key: "/document_1.txt",
    });

    const res = await tokenActor.update_metadata({
      ...SampleCollectionUpdate,
      documents: [[["ownership", "/document_2.txt"]]],
    });

    expectResultIsOk(res);

    const metadata = await tokenActor.get_metadata();
    expect(metadata.documents).toHaveLength(1);
    expect(metadata.documents[0]).toEqual(["ownership", "/document_2.txt"]);
  });

  it("sale participation", async () => {
    const investorAccount = generateRandomIdentity();
    provisionActor.setIdentity(investorAccount);

    const collections = await provisionActor.list_collections();
    expect(collections).toHaveLength(1);

    const collection = collections[0];
    const tokenActor = await suite.attachToTokenCanister(collection.token_canister);
    tokenActor.setIdentity(investorAccount);
    const price = (await tokenActor.get_metadata()).price;
    const escrowSubaccount = deriveSubaccount(investorAccount.getPrincipal());

    await icpLedgerActor.icrc1_transfer({
      from_subaccount: [],
      to: {
        owner: collection.token_canister,
        subaccount: [escrowSubaccount],
      },
      fee: [],
      memo: [],
      created_at_time: [],
      amount: 2n * price,
    });

    const subaccount = Array(32).fill(2);
    const mintRes = await tokenActor.mint({ subaccount: [subaccount], quantity: 1n });
    expectResultIsOk(mintRes);

    const refundRes = await tokenActor.refund({ subaccount: [subaccount] });
    expectResultIsOk(refundRes);

    const [tokenBalance] = await tokenActor.icrc7_balance_of([
      {
        owner: investorAccount.getPrincipal(),
        subaccount: [subaccount],
      },
    ]);

    const icpBalance = await icpLedgerActor.icrc1_balance_of({
      owner: investorAccount.getPrincipal(),
      subaccount: [subaccount],
    });

    const escrowBalance = await icpLedgerActor.icrc1_balance_of({
      owner: collection.token_canister,
      subaccount: [escrowSubaccount],
    });

    const treasuryBalance = await icpLedgerActor.icrc1_balance_of({
      owner: userAccount.getPrincipal(),
      subaccount: [],
    });

    expect(treasuryBalance).toBe(price);
    expect(escrowBalance).toBe(0n);
    expect(icpBalance).toBe(2n * price - price - 2n * TRANSFER_FEE);
    expect(tokenBalance).toBe(1n);
  });
});
