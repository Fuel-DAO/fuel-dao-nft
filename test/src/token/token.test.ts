import { generateRandomIdentity } from "@hadronous/pic";
import { tokenActor, icpLedgerActor, initTestSuite, icpLedgerIndexActor } from "../utils/pocket-ic";
import { Principal } from "@dfinity/principal";
import { expectResultIsErr, expectResultIsOk } from "../utils/common";
import { Result, nat } from "azle";
import { SubAccount } from "../../dfx_generated/icp_ledger/icp_ledger.did";
import { deriveSubaccount } from "../../../src/common/token";
import { AccountIdentifier } from "@dfinity/ledger-icp";

const TOKEN_PRICE = 100000n;
const TRANSFER_FEE = 10_000n;

function sleep(time: number) {
  return new Promise((resolve, _) => {
    setTimeout(resolve, time);
  });  
}

describe("Token", () => {
  let tokenActor: tokenActor, icpLedgerActor: icpLedgerActor, icpLedgerIndexActor: icpLedgerIndexActor, tokenId: Principal;
  const suite = initTestSuite();
  const accountA = generateRandomIdentity();
  const accountB = generateRandomIdentity();
  const accountC = generateRandomIdentity();
  const collectionOwner = generateRandomIdentity();
  const minterAccount = generateRandomIdentity();
  const intermediaryMinter = generateRandomIdentity();
  const treasuryAccount = generateRandomIdentity();
  let mintedTokenId: bigint;

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
  });

  afterAll(suite.teardown);

  it("get_escrow_account", async () => {
    const account = generateRandomIdentity();
    tokenActor.setIdentity(account);

    const escrowAccount = await tokenActor.get_escrow_account();
    const derivedSubaccount = deriveSubaccount(account.getPrincipal());

    expect(escrowAccount.account.owner.toString()).toBe(tokenId.toString());
    expect(escrowAccount.account.subaccount.toString()).toBe(derivedSubaccount.toString());
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
      tokenActor.setIdentity(accountA);
      const subaccount = (await tokenActor.get_escrow_account()).account.subaccount;

      await mintICPToAccount(TOKEN_PRICE * 3n + TRANSFER_FEE, tokenId, subaccount);

      const res = await tokenActor.book_tokens({ quantity: 3n });
      expectResultIsOk(res);

      const totalBookedCount = await tokenActor.get_total_booked_tokens();
      expect(totalBookedCount).toBe(3n);

      const userBookedCount = await tokenActor.get_booked_tokens([accountA.getPrincipal()]);
      expect(userBookedCount).toBe(3n);

      const escrowBalance = await icpAccountBalance(tokenId, subaccount);
      expect(escrowBalance).toBe(TOKEN_PRICE * 3n + TRANSFER_FEE);
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

  // describe("accept_sale", () => {
  //   it("fails on non-owner", async () => {
  //     tokenActor.setPrincipal(Principal.anonymous());

  //     const acceptSaleResult = await tokenActor.accept_sale();
  //     expectResultIsErr(acceptSaleResult);
  //     expect(acceptSaleResult.Err).toBe("Unauthorized.");
  //   });

  //   it("success", async () => {
  //     tokenActor.setIdentity(collectionOwner);

  //     const acceptSaleResult = await tokenActor.accept_sale();
  //     expectResultIsOk(acceptSaleResult);

  //     const treasuryBalance = await icpAccountBalance(treasuryAccount.getPrincipal());
  //     expect(treasuryBalance).toBe(3n * TOKEN_PRICE);

  //     const [accountNFTBalance] = await tokenActor.icrc7_balance_of([{ owner: accountA.getPrincipal(), subaccount: [] }])
  //     expect(accountNFTBalance).toBe(3n);
  //   });

  //   it("fail on non-live sale", async () => {
  //     tokenActor.setIdentity(collectionOwner);

  //     const acceptSaleResult = await tokenActor.accept_sale();
  //     expectResultIsErr(acceptSaleResult);
  //     expect(acceptSaleResult.Err).toBe("Sale not live.");
  //   })
  // })

  describe("reject_sale", () => {
    it("fails on non-owner", async () => {
      tokenActor.setPrincipal(Principal.anonymous());

      const acceptSaleResult = await tokenActor.reject_sale();
      expectResultIsErr(acceptSaleResult);
      expect(acceptSaleResult.Err).toBe("Unauthorized.");
    });

    it("success", async () => {
      tokenActor.setIdentity(collectionOwner);
      await sleep(500);
      console.log(await icpLedgerIndexActor.status());

      const rejectSaleResult = await tokenActor.reject_sale();
      console.log(rejectSaleResult);
      expectResultIsOk(rejectSaleResult);

      const treasuryBalance = await icpAccountBalance(treasuryAccount.getPrincipal());
      expect(treasuryBalance).toBe(0n);

      const intermediaryBalance = await icpAccountBalance(intermediaryMinter.getPrincipal());
      expect(intermediaryBalance).toBe(3n * TOKEN_PRICE - TRANSFER_FEE);

      const [accountNFTBalance] = await tokenActor.icrc7_balance_of([{ owner: accountA.getPrincipal(), subaccount: [] }])
      expect(accountNFTBalance).toBe(0n);
    });

    it("fail on non-live sale", async () => {
      tokenActor.setIdentity(collectionOwner);

      const acceptSaleResult = await tokenActor.accept_sale();
      expectResultIsErr(acceptSaleResult);
      expect(acceptSaleResult.Err).toBe("Sale not live.");
    })
  })

  // describe("icrc7_transfer", () => {
  //   it("Unauthorized user fails", async () => {
  //     tokenActor.setIdentity(accountB);
  //     const transferRes = await tokenActor.icrc7_transfer([
  //       {
  //         to: {
  //           owner: accountC.getPrincipal(),
  //           subaccount: [],
  //         },
  //         from_subaccount: [],
  //         token_id: mintedTokenId,
  //         memo: [],
  //         created_at_time: [],
  //       },
  //     ]);

  //     expect(transferRes).toHaveLength(1);
  //     expect(transferRes[0]).toHaveLength(1);
  //     expect((transferRes[0][0] as any).Err.Unauthorized).toBe(null);
  //   });

  //   it("Non-existent token id fails", async () => {
  //     tokenActor.setIdentity(accountB);
  //     const transferRes = await tokenActor.icrc7_transfer([
  //       {
  //         to: {
  //           owner: accountC.getPrincipal(),
  //           subaccount: [],
  //         },
  //         from_subaccount: [],
  //         token_id: 1021n,
  //         memo: [],
  //         created_at_time: [],
  //       },
  //     ]);

  //     expect(transferRes).toHaveLength(1);
  //     expect(transferRes[0]).toHaveLength(1);
  //     expect((transferRes[0][0] as any).Err.NonExistingTokenId).toBe(null);
  //   });

  //   it("Invalid recipient fails", async () => {
  //     tokenActor.setIdentity(accountA);
  //     const transferRes = await tokenActor.icrc7_transfer([
  //       {
  //         to: {
  //           owner: accountA.getPrincipal(),
  //           subaccount: [],
  //         },
  //         from_subaccount: [],
  //         token_id: mintedTokenId,
  //         memo: [],
  //         created_at_time: [],
  //       },
  //     ]);

  //     expect(transferRes).toHaveLength(1);
  //     expect(transferRes[0]).toHaveLength(1);
  //     expect((transferRes[0][0] as any).Err.InvalidRecipient).toBe(null);
  //   });

  //   it("success", async () => {
  //     tokenActor.setIdentity(accountA);
  //     const transferRes = await tokenActor.icrc7_transfer([
  //       {
  //         to: {
  //           owner: accountB.getPrincipal(),
  //           subaccount: [],
  //         },
  //         from_subaccount: [],
  //         token_id: mintedTokenId,
  //         memo: [],
  //         created_at_time: [],
  //       },
  //     ]);

  //     expectResultIsOk(transferRes[0][0]!);
  //   });
  // });
});
