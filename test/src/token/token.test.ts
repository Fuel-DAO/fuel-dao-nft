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

    tokenActor.setIdentity(accountA);
    const escrowSubaccountA = (await tokenActor.get_escrow_account()).account.subaccount;
    await mintICPToAccount(TOKEN_PRICE * 1n + TRANSFER_FEE, tokenId, escrowSubaccountA);
    await tokenActor.book_tokens({ quantity: 1n });

    tokenActor.setIdentity(collectionOwner);
    await tokenActor.accept_sale();
    
    const userTokens = await tokenActor.icrc7_tokens_of({ owner: accountA.getPrincipal(), subaccount: [] }, [], []);
    mintedTokenId = userTokens[0];
  });

  afterAll(suite.teardown);

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
