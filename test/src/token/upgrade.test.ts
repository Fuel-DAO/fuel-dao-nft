import { generateRandomIdentity } from "@hadronous/pic";
import { resolve } from "path";
import { IDL } from "@dfinity/candid";
import { tokenFixture, initTestSuite } from "../utils/pocket-ic";
import { tokenInit } from "../utils/canister";
import { SampleCollectionInit } from "../utils/sample";
import { deriveSubaccount } from "../../../src/common/token";

describe("token Upgrade Check", () => {
  const suite = initTestSuite();
  let token: tokenFixture;
  const controllerAccount = generateRandomIdentity();
  const userAccount = generateRandomIdentity();

  const testInitMetadata = {
    ...SampleCollectionInit,
    name: "Test Token",
    symbol: "TEST",
    price: 100_000n,
    collection_owner: controllerAccount.getPrincipal()
  };

  beforeAll(async () => {
    await suite.setup();

    const minterAccount = generateRandomIdentity();
    const icpLedger = await suite.deployIcpLedgerCanister(minterAccount.getPrincipal());
    icpLedger.actor.setIdentity(minterAccount);

    testInitMetadata.token = icpLedger.canisterId;

    token = await suite.deployTokenCanister(testInitMetadata, {
      sender: controllerAccount.getPrincipal(),
      controllers: [controllerAccount.getPrincipal()],
    });

    token.actor.setIdentity(userAccount);
    const subaccount = deriveSubaccount(userAccount.getPrincipal());

    await icpLedger.actor.icrc1_transfer({
      from_subaccount: [],
      to: {
        owner: token.canisterId,
        subaccount: [subaccount],
      },
      fee: [],
      memo: [],
      created_at_time: [],
      amount: testInitMetadata.price * 2n,
    });

    await token.actor.book_tokens({ quantity: 1n });

    token.actor.setIdentity(controllerAccount);
    await token.actor.accept_sale();
  });

  afterAll(suite.teardown);

  describe("upgrade success", () => {
    it("initial config", async () => {
      const metadata = await token.actor.get_metadata();
      expect(metadata).toMatchObject(testInitMetadata);

      const tokens = await token.actor.icrc7_tokens([], []);
      expect(tokens).toHaveLength(1);

      const userTokens = await token.actor.icrc7_tokens_of(
        {
          owner: userAccount.getPrincipal(),
          subaccount: [],
        },
        [],
        [],
      );
      expect(userTokens).toHaveLength(1);

      const saleStatus = await token.actor.get_sale_status();
      expect('Accepted' in saleStatus).toBe(true);

      const bookedTokens = await token.actor.get_total_booked_tokens();
      expect(bookedTokens).toBe(1n);

      const userBookedCount = await token.actor.get_booked_tokens([userAccount.getPrincipal()]);
      expect(userBookedCount).toBe(1n);
    });

    it("upgrade", async () => {
      const instance = await suite.getInstance();
      await instance.tick(10);

      await instance.upgradeCanister({
        sender: controllerAccount.getPrincipal(),
        canisterId: token.canisterId,
        wasm: resolve(".azle", "token", "token.wasm.gz"),
        arg: IDL.encode(tokenInit({ IDL }), [{ Upgrade: null }]),
      });

      const metadata = await token.actor.get_metadata();
      expect(metadata).toMatchObject(testInitMetadata);

      const tokens = await token.actor.icrc7_tokens([], []);
      expect(tokens).toHaveLength(1);

      const userTokens = await token.actor.icrc7_tokens_of(
        {
          owner: userAccount.getPrincipal(),
          subaccount: [],
        },
        [],
        [],
      );
      expect(userTokens).toHaveLength(1);

      const saleStatus = await token.actor.get_sale_status();
      expect('Accepted' in saleStatus).toBe(true);

      const bookedTokens = await token.actor.get_total_booked_tokens();
      expect(bookedTokens).toBe(1n);

      const userBookedCount = await token.actor.get_booked_tokens([userAccount.getPrincipal()]);
      expect(userBookedCount).toBe(1n);
    });
  });
});
