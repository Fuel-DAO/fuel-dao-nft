import { generateRandomIdentity } from "@hadronous/pic";
import { tokenActor, icpLedgerActor, initTestSuite, icpLedgerIndexActor } from "../utils/pocket-ic";
import { Principal } from "@dfinity/principal";
import { expectResultIsErr, expectResultIsOk } from "../utils/common";
import { Result, nat } from "azle";
import { SubAccount } from "../../dfx_generated/icp_ledger/icp_ledger.did";
import { deriveSubaccount } from "../../../src/common/token";

const TOKEN_PRICE = 100000n;
const TRANSFER_FEE = 10_000n;

describe("Token", () => {
  let tokenActor: tokenActor, icpLedgerActor: icpLedgerActor, icpLedgerIndexActor: icpLedgerIndexActor, tokenId: Principal;
  const suite = initTestSuite();
  const investorAccountA = generateRandomIdentity();
  const investorAccountB = generateRandomIdentity();
  const collectionOwner = generateRandomIdentity();
  const minterAccount = generateRandomIdentity();
  const intermediaryMinter = generateRandomIdentity();
  const treasuryAccount = generateRandomIdentity();

  async function mintICPToAccount(amount: nat, principal: Principal, subaccount?: SubAccount) {
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

  async function icpAccountBalance(principal: Principal, subaccount?: SubAccount): Promise<nat> {
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

    tokenActor.setIdentity(investorAccountA);
    const escrowSubaccountA = (await tokenActor.get_escrow_account()).account.subaccount;
    await mintICPToAccount(TOKEN_PRICE * 2n + TRANSFER_FEE, tokenId, escrowSubaccountA);
    await tokenActor.book_tokens({ quantity: 2n });
    
    tokenActor.setIdentity(investorAccountB);
    const escrowSubaccountB = (await tokenActor.get_escrow_account()).account.subaccount;
    await mintICPToAccount(TOKEN_PRICE * 1n + TRANSFER_FEE, tokenId, escrowSubaccountB);
    await tokenActor.book_tokens({ quantity: 1n });
  });

  afterAll(suite.teardown);

  describe("accept_sale", () => {
    it("fails on non-owner", async () => {
      tokenActor.setPrincipal(Principal.anonymous());

      const acceptSaleResult = await tokenActor.accept_sale();
      expectResultIsErr(acceptSaleResult);
      expect(acceptSaleResult.Err).toBe("Unauthorized.");
    });

    it("success", async () => {
      tokenActor.setIdentity(collectionOwner);

      const acceptSaleResult = await tokenActor.accept_sale();
      expectResultIsOk(acceptSaleResult);

      const treasuryBalance = await icpAccountBalance(treasuryAccount.getPrincipal());
      expect(treasuryBalance).toBe(3n * TOKEN_PRICE);

      const totalMintedTokens = await tokenActor.icrc7_total_supply();
      expect(totalMintedTokens).toBe(3n);

      const [ mintedTokensBalanceA, mintedTokensBalanceB ] = await tokenActor.icrc7_balance_of([
        { owner: investorAccountA.getPrincipal(), subaccount: [] },
        { owner: investorAccountB.getPrincipal(), subaccount: [] }
      ]);
      expect(mintedTokensBalanceA).toBe(2n);
      expect(mintedTokensBalanceB).toBe(1n);
    });

    it("fail on non-live sale", async () => {
      tokenActor.setIdentity(collectionOwner);

      const acceptSaleResult = await tokenActor.accept_sale();
      expectResultIsErr(acceptSaleResult);
      expect(acceptSaleResult.Err).toBe("Sale not live.");
    })
  });

  describe("book_tokens", () => {
    it("fails - sale not live", async () => {
      tokenActor.setIdentity(investorAccountA);

      const bookRes = await tokenActor.book_tokens({ quantity: 1n });
      expectResultIsErr(bookRes);
      expect(bookRes.Err).toBe("Sale not live.");
    });
  });
});
