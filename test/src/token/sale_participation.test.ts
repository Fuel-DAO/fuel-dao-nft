import { generateRandomIdentity } from "@hadronous/pic";
import { tokenActor, icpLedgerActor, initTestSuite, icpLedgerIndexActor } from "../utils/pocket-ic";
import { Principal } from "@dfinity/principal";
import { expectResultIsErr, expectResultIsOk } from "../utils/common";
import { Result, nat } from "azle";
import { deriveSubaccount } from "../../../src/common/token";
import { AccountIdentifier, SubAccount } from "@dfinity/ledger-icp";
import { SubAccount as Subaccount } from "../../dfx_generated/icp_ledger/icp_ledger.did";

const TOKEN_PRICE = 100000n;
const TRANSFER_FEE = 10_000n;

describe("Token", () => {
  let tokenActor: tokenActor, icpLedgerActor: icpLedgerActor, icpLedgerIndexActor: icpLedgerIndexActor, tokenId: Principal;
  const suite = initTestSuite();
  const investorAccount = generateRandomIdentity();
  const collectionOwner = generateRandomIdentity();
  const minterAccount = generateRandomIdentity();
  const intermediaryMinter = generateRandomIdentity();
  const treasuryAccount = generateRandomIdentity();
  let bookedQuantity = 0n;

  async function mintICPToAccount(amount: nat, principal: Principal, subaccount?: Subaccount) {
    icpLedgerActor.setIdentity(minterAccount);

    await icpLedgerActor.icrc1_transfer({
      to: {
        owner: intermediaryMinter.getPrincipal(),
        subaccount: [],
      },
      from_subaccount: [],
      memo: [],
      fee: [],
      created_at_time: [],
      amount: amount + TRANSFER_FEE,
    });

    icpLedgerActor.setIdentity(intermediaryMinter);

    await icpLedgerActor.icrc1_transfer({
      to: {
        owner: principal,
        subaccount: subaccount ? [subaccount] : [],
      },
      from_subaccount: [],
      memo: [],
      fee: [],
      created_at_time: [],
      amount: amount,
    });
  }

  async function icpAccountBalance(principal: Principal, subaccount?: Subaccount): Promise<nat> {
    return await icpLedgerActor.icrc1_balance_of({
      owner: principal,
      subaccount: subaccount ? [subaccount] : [],
    });
  }

  beforeAll(async () => {
    await suite.setup();
    const icpLedgerFixture = await suite.deployIcpLedgerCanister(minterAccount.getPrincipal());
    const icpLedgerIndexFixture = await suite.deployIcpLedgerIndexCanister(icpLedgerFixture.canisterId);
    icpLedgerActor = icpLedgerFixture.actor;
    icpLedgerActor.setIdentity(minterAccount);
    icpLedgerIndexActor = icpLedgerIndexFixture.actor;

    const tokenFixture = await suite.deployTokenCanister({
      price: TOKEN_PRICE,
      token: icpLedgerFixture.canisterId,
      index: icpLedgerIndexFixture.canisterId,
      treasury: treasuryAccount.getPrincipal(),
      supply_cap: 3n,
      collection_owner: collectionOwner.getPrincipal()
    });
    tokenActor = tokenFixture.actor;
    tokenId = tokenFixture.canisterId;
  });

  afterAll(suite.teardown);

  it("get_escrow_account", async () => {
    const account = generateRandomIdentity();
    tokenActor.setIdentity(account);

    const escrowAccount = await tokenActor.get_escrow_account();
    const derivedSubaccount = deriveSubaccount(account.getPrincipal());
    const escrowAccountId = AccountIdentifier.fromPrincipal({
      principal: tokenId,
      subAccount: SubAccount.fromBytes(derivedSubaccount) as SubAccount
    });

    expect(escrowAccount.account.owner.toString()).toBe(tokenId.toString());
    expect(escrowAccount.account.subaccount.toString()).toBe(derivedSubaccount.toString());
    expect(escrowAccount.accountId).toBe(escrowAccountId.toHex());
  });

  describe("book_tokens", () => {
    it("fails for anonymous accounts", async () => {
      tokenActor.setPrincipal(Principal.anonymous());

      const res = await tokenActor.book_tokens({ quantity: 1n });
      expectResultIsErr(res);
      expect(res.Err).toBe("Anonymous users not allowed");
    });

    it("fails for invalid escrow balance", async () => {
      const account = generateRandomIdentity();
      tokenActor.setIdentity(account);
      const escrowSubaccount = (await tokenActor.get_escrow_account()).account.subaccount;

      // should be at least TOKEN_PRICE + TRANSFER_FEE
      await mintICPToAccount(TOKEN_PRICE, tokenId, escrowSubaccount);

      const res = await tokenActor.book_tokens({ quantity: 1n });
      expectResultIsErr(res);
      expect(res.Err).toBe("Invalid balance in escrow.");
    });

    it("success", async () => {
      tokenActor.setIdentity(investorAccount);
      const escrowSubaccount = (await tokenActor.get_escrow_account()).account.subaccount;
      const quantity = 2n;
      bookedQuantity += quantity;

      await mintICPToAccount(TOKEN_PRICE * quantity + TRANSFER_FEE, tokenId, escrowSubaccount);

      const res = await tokenActor.book_tokens({ quantity });
      expectResultIsOk(res);

      const totalBookedCount = await tokenActor.get_total_booked_tokens();
      expect(totalBookedCount).toBe(bookedQuantity);

      const userBookedCount = await tokenActor.get_booked_tokens([investorAccount.getPrincipal()]);
      expect(userBookedCount).toBe(bookedQuantity);

      const escrowBalance = await icpAccountBalance(tokenId, escrowSubaccount);
      expect(escrowBalance).toBe(TOKEN_PRICE * bookedQuantity + TRANSFER_FEE);
    });
    
    it("success - transfer fees required only once", async () => {
      tokenActor.setIdentity(investorAccount);
      const escrowSubaccount = (await tokenActor.get_escrow_account()).account.subaccount;
      const quantity = 1n;
      bookedQuantity += quantity;

      await mintICPToAccount(TOKEN_PRICE * quantity, tokenId, escrowSubaccount);

      const res = await tokenActor.book_tokens({ quantity });
      expectResultIsOk(res);

      const totalBookedCount = await tokenActor.get_total_booked_tokens();
      expect(totalBookedCount).toBe(bookedQuantity);

      const userBookedCount = await tokenActor.get_booked_tokens([investorAccount.getPrincipal()]);
      expect(userBookedCount).toBe(bookedQuantity);

      const escrowBalance = await icpAccountBalance(tokenId, escrowSubaccount);
      expect(escrowBalance).toBe(TOKEN_PRICE * bookedQuantity + TRANSFER_FEE);
    });

    it("fails on exceeding max supply", async () => {
      const account = generateRandomIdentity();
      tokenActor.setIdentity(account);
      const escrowSubaccount = (await tokenActor.get_escrow_account()).account.subaccount;

      await mintICPToAccount(
        TOKEN_PRICE * 2n + TRANSFER_FEE,
        tokenId,
        escrowSubaccount,
      );

      const res = await tokenActor.book_tokens({ quantity: 2n });
      expectResultIsErr(res);
      expect(res.Err).toBe("Supply cap reached.");
    });
  });

  it("get_sale_status", async () => {
    const saleStatus = await tokenActor.get_sale_status();
    expect('Live' in saleStatus).toBe(true);
  });
});
