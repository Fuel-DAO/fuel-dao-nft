import { generateRandomIdentity } from "@hadronous/pic";
import { tokenActor, icpLedgerActor, initTestSuite } from "../utils/pocket-ic";
import { Principal } from "@dfinity/principal";
import { expectResultIsErr, expectResultIsOk } from "../utils/common";
import { Result, nat } from "azle";
import { SubAccount } from "../../dfx_generated/icp_ledger/icp_ledger.did";
import { deriveSubaccount } from "../../../src/common/token";

const TOKEN_PRICE = 100000n;
const TRANSFER_FEE = 10_000n;

describe("Token", () => {
  let tokenActor: tokenActor, icpLedgerActor: icpLedgerActor, tokenId: Principal;
  const suite = initTestSuite();
  const accountA = generateRandomIdentity();
  const accountB = generateRandomIdentity();
  const accountC = generateRandomIdentity();
  const minterAccount = generateRandomIdentity();
  const treasuryAccount = generateRandomIdentity();
  let mintedTokenId: bigint;

  async function mintICPToAccount(amount: nat, principal: Principal, subaccount?: SubAccount) {
    icpLedgerActor.setIdentity(minterAccount);

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
    icpLedgerActor = icpLedgerFixture.actor;
    icpLedgerActor.setIdentity(minterAccount);

    const tokenFixture = await suite.deployTokenCanister({
      price: TOKEN_PRICE,
      token: icpLedgerFixture.canisterId,
      treasury: treasuryAccount.getPrincipal(),
      supply_cap: 3n,
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

    expect(escrowAccount.owner.toString()).toBe(tokenId.toString());
    expect(escrowAccount.subaccount.toString()).toBe(derivedSubaccount.toString());
  });

  it("get_escrow_balance", async () => {
    const account = generateRandomIdentity();
    tokenActor.setIdentity(account);
    const escrowAccount = await tokenActor.get_escrow_account();

    const depositAmount = 10_000_000n;
    await mintICPToAccount(depositAmount, escrowAccount.owner, escrowAccount.subaccount);

    const escrowBalance = await tokenActor.get_escrow_balance();
    expect(escrowBalance).toBe(depositAmount);
  })

  describe("refund", () => {
    it("fails for anonymous accounts", async () => {
      tokenActor.setPrincipal(Principal.anonymous());

      const res = await tokenActor.refund({ subaccount: [] });
      expectResultIsErr(res);
      expect(res.Err).toBe("Anonymous users not allowed");
    });

    it("success - returns escrow amount back to account", async () => {
      const account = generateRandomIdentity();
      tokenActor.setIdentity(account);
      const derivedSubaccount = (await tokenActor.get_escrow_account()).subaccount;
      const REFUND_AMOUNT = 90_000n;

      await mintICPToAccount(REFUND_AMOUNT + TRANSFER_FEE, tokenId, derivedSubaccount);

      const escrowBalanceBeforeRefund = await icpAccountBalance(tokenId, derivedSubaccount);
      expect(escrowBalanceBeforeRefund).toBe(REFUND_AMOUNT + TRANSFER_FEE);

      const res = await tokenActor.refund({ subaccount: [] });
      expectResultIsOk(res);

      const escrowBalanceAfterRefund = await icpAccountBalance(tokenId, derivedSubaccount);
      expect(escrowBalanceAfterRefund).toBe(0n);

      const accountBalanceAfterRefund = await icpAccountBalance(account.getPrincipal());
      expect(accountBalanceAfterRefund).toBe(REFUND_AMOUNT);
    });
  });

  describe("mint", () => {
    it("fails for anonymous accounts", async () => {
      tokenActor.setPrincipal(Principal.anonymous());

      const res = await tokenActor.mint({ subaccount: [], quantity: 1n });
      expectResultIsErr(res);
      expect(res.Err).toBe("Anonymous users not allowed");
    });

    it("fails for invalid escrow balance", async () => {
      const account = generateRandomIdentity();
      tokenActor.setIdentity(account);
      const escrowSubaccount = (await tokenActor.get_escrow_account()).subaccount;

      // should be at least TOKEN_PRICE + TRANSFER_FEE
      await mintICPToAccount(TOKEN_PRICE, tokenId, escrowSubaccount);

      const res = await tokenActor.mint({ subaccount: [], quantity: 1n });
      expectResultIsErr(res);
      expect(res.Err).toBe("Invalid balance in escrow.");
    });

    it("success", async () => {
      tokenActor.setIdentity(accountA);
      const subaccount = (await tokenActor.get_escrow_account()).subaccount;

      await mintICPToAccount(TOKEN_PRICE * 2n + TRANSFER_FEE, tokenId, subaccount);

      const res = await tokenActor.mint({ subaccount: [], quantity: 2n });
      expectResultIsOk(res);
      expect(res.Ok).toHaveLength(2);

      mintedTokenId = res.Ok[0];

      const [balance] = await tokenActor.icrc7_balance_of([
        {
          owner: accountA.getPrincipal(),
          subaccount: [],
        },
      ]);
      expect(balance).toBe(2n);

      const escrowBalance = await icpAccountBalance(tokenId, subaccount);
      expect(escrowBalance).toBe(0n);

      const treasuryBalance = await icpAccountBalance(treasuryAccount.getPrincipal());
      expect(treasuryBalance).toBe(TOKEN_PRICE * 2n);
    });

    it("fails on exceeding max supply", async () => {
      const account = generateRandomIdentity();
      tokenActor.setIdentity(account);
      const escrowSubaccount = (await tokenActor.get_escrow_account()).subaccount;

      await mintICPToAccount(
        TOKEN_PRICE * 2n + TRANSFER_FEE,
        tokenId,
        escrowSubaccount,
      );

      const res = await tokenActor.mint({ subaccount: [], quantity: 2n });
      expectResultIsErr(res);
      expect(res.Err).toBe("Supply cap reached.");
    });
  });

  describe("icrc7_transfer", () => {
    it("Unauthorized user fails", async () => {
      tokenActor.setIdentity(accountB);
      const transferRes = await tokenActor.icrc7_transfer([
        {
          to: {
            owner: accountC.getPrincipal(),
            subaccount: [],
          },
          from_subaccount: [],
          token_id: mintedTokenId,
          memo: [],
          created_at_time: [],
        },
      ]);

      expect(transferRes).toHaveLength(1);
      expect(transferRes[0]).toHaveLength(1);
      expect((transferRes[0][0] as any).Err.Unauthorized).toBe(null);
    });

    it("Non-existent token id fails", async () => {
      tokenActor.setIdentity(accountB);
      const transferRes = await tokenActor.icrc7_transfer([
        {
          to: {
            owner: accountC.getPrincipal(),
            subaccount: [],
          },
          from_subaccount: [],
          token_id: 1021n,
          memo: [],
          created_at_time: [],
        },
      ]);

      expect(transferRes).toHaveLength(1);
      expect(transferRes[0]).toHaveLength(1);
      expect((transferRes[0][0] as any).Err.NonExistingTokenId).toBe(null);
    });

    it("Invalid recipient fails", async () => {
      tokenActor.setIdentity(accountA);
      const transferRes = await tokenActor.icrc7_transfer([
        {
          to: {
            owner: accountA.getPrincipal(),
            subaccount: [],
          },
          from_subaccount: [],
          token_id: mintedTokenId,
          memo: [],
          created_at_time: [],
        },
      ]);

      expect(transferRes).toHaveLength(1);
      expect(transferRes[0]).toHaveLength(1);
      expect((transferRes[0][0] as any).Err.InvalidRecipient).toBe(null);
    });

    it("success", async () => {
      tokenActor.setIdentity(accountA);
      const transferRes = await tokenActor.icrc7_transfer([
        {
          to: {
            owner: accountB.getPrincipal(),
            subaccount: [],
          },
          from_subaccount: [],
          token_id: mintedTokenId,
          memo: [],
          created_at_time: [],
        },
      ]);

      expectResultIsOk(transferRes[0][0]!);
    });
  });
});
