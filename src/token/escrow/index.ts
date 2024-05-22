import { None, Opt, Principal, Result, Some, bool, ic, nat, text } from "azle";
import { TRANSFER_FEE, getTokenLedger, getTokenLedgerIndex } from "../../common/ledger";
import { EscrowStore, MetadataStore } from "../store";
import { validateInvestor } from "../validate";
import { deriveSubaccount } from "../../common/token";
import { Account, BookTokensArg, GetEscrowAccountResult, RefundResult, SaleStatus } from "../types";
import { AccountIdentifier, SubAccount } from "@dfinity/ledger-icp";

export function get_escrow_account(): GetEscrowAccountResult {
  const principal = ic.id();
  const subaccount = deriveSubaccount(ic.caller());

  const accountIdentifier = AccountIdentifier.fromPrincipal({
    principal,
    subAccount: SubAccount.fromBytes(subaccount) as SubAccount
  });

  return {
    account: {
      owner: principal,
      subaccount: subaccount, 
    },
    accountId: accountIdentifier.toHex()
  };
}

export function get_booked_tokens(principal: Opt<Principal>): nat {
  const user = principal.Some ?? ic.caller();
  return EscrowStore.bookedTokens.get(user.toText()) ?? 0n;
}

export function get_total_booked_tokens(): nat {
  return EscrowStore.totalBookedTokens;
}

export function get_sale_status(): SaleStatus {
  return EscrowStore.saleStatus;
}

export function get_investment_amount(amount: nat): nat {
  return MetadataStore.metadata.price * amount + TRANSFER_FEE;
}

export async function book_tokens({ quantity }: BookTokensArg): Promise<Result<bool, text>> {
  const principal = ic.caller();
  const icpLedger = getTokenLedger(MetadataStore.metadata.token);

  if ( quantity <= 0 ) return Result.Err("Quantity should be at least 1.");
  if ( EscrowStore.saleStatus.Live === undefined ) return Result.Err("Sale not live.");

  const validationResult = validateInvestor(principal);
  if (validationResult.Err) return validationResult;

  const subaccount = deriveSubaccount(principal);
  const escrowBalance = await ic.call(icpLedger.icrc1_balance_of, {
    args: [{
      owner: ic.id(),
      subaccount: Some(subaccount),
    }],
  });

  const totalInvestedCount = EscrowStore.bookedTokens.get(principal.toText()) ?? 0n;
  if ( escrowBalance < (totalInvestedCount + quantity) * MetadataStore.metadata.price + TRANSFER_FEE )
    return Result.Err("Invalid balance in escrow.");

  if ( EscrowStore.totalBookedTokens + quantity > MetadataStore.metadata.supply_cap )
    return Result.Err("Supply cap reached.");

  EscrowStore.bookTokens(principal, quantity);

  return Result.Ok(true);
}

export async function refund_from_escrow(user: Principal): Promise<Result<RefundResult, text>> {
  const icpLedgerIndex = getTokenLedgerIndex(MetadataStore.metadata.index);
  const icpLedger = getTokenLedger(MetadataStore.metadata.token);
  const escrowSubaccount = deriveSubaccount(user);
  const escrowAccountId = AccountIdentifier.fromPrincipal({
    principal: ic.id(),
    subAccount: SubAccount.fromBytes(escrowSubaccount) as SubAccount
  });

  const indexQueryResult = await ic.call(
    icpLedgerIndex.get_account_transactions,
    {
      args: [{
        account: {
          owner: ic.id(),
          subaccount: Some(escrowSubaccount)
        },
        start: None,
        max_results: 5n,
      }]
    }
  );

  if ( indexQueryResult.Err ) return Result.Err(indexQueryResult.Err.message);

  const escrowBalance = indexQueryResult.Ok.balance;
  const transactions = indexQueryResult.Ok.transactions.map(txn => txn.transaction.operation.Transfer);
  const refundAccountId = transactions.find(txn => txn && txn.to === escrowAccountId.toHex())?.from;
  if ( !refundAccountId ) return Result.Err("Txn not found in ledger");

  const refundAmount = escrowBalance - TRANSFER_FEE;
  if ( refundAmount <= 0n ) return Result.Ok({ to: refundAccountId, amount: 0n });

  const transferResult = await ic.call(icpLedger.transfer, {
    args: [{
      memo: 0n,
      amount: {
        e8s: refundAmount,
      },
      fee: {
        e8s: TRANSFER_FEE,
      },
      from_subaccount: Some(escrowSubaccount),
      to: AccountIdentifier.fromHex(refundAccountId).toUint8Array(),
      created_at_time: None,
    }]
  });

  if ( transferResult.Err ) return Result.Err(JSON.stringify(transferResult.Err));
  return Result.Ok({ to: refundAccountId, amount: refundAmount });
}
