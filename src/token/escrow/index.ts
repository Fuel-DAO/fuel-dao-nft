import { None, Opt, Principal, Result, Some, bool, ic, nat, text } from "azle";
import { TRANSFER_FEE, getTokenLedger, getTokenLedgerIndex } from "../../common/ledger";
import { EscrowStore, MetadataStore } from "../store";
import { validateInvestor } from "../validate";
import { deriveSubaccount } from "../../common/token";
import { Account, BookTokensArg, GetEscrowAccountResult, SaleStatus } from "../types";
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
  const totalInvestedCount = EscrowStore.bookedTokens.get(principal.toText()) ?? 0n;
  const escrowBalance = await ic.call(icpLedger.icrc1_balance_of, {
    args: [{
      owner: ic.id(),
      subaccount: Some(subaccount),
    }],
  });

  if ( escrowBalance < (totalInvestedCount + quantity) * MetadataStore.metadata.price + TRANSFER_FEE )
    return Result.Err("Invalid balance in escrow.");

  // > or >=
  if ( EscrowStore.totalBookedTokens + quantity > MetadataStore.metadata.supply_cap )
    return Result.Err("Supply cap reached.");

  EscrowStore.bookTokens(principal, quantity);

  return Result.Ok(true);
}

export async function refund_excess_from_escrow(refundAccount: Account): Promise<Result<bool, text>> {
  const principal = ic.caller();
  const icpLedger = getTokenLedger(MetadataStore.metadata.token);

  const validationResult = validateInvestor(principal);
  if (validationResult.Err) return validationResult;

  const escrowSubaccount = deriveSubaccount(principal);
  const totalInvestedCount = EscrowStore.bookedTokens.get(principal.toText()) ?? 0n;
  const totalInvestedAmount = get_investment_amount(totalInvestedCount);
  const escrowBalance = await ic.call(icpLedger.icrc1_balance_of, {
    args: [
      {
        owner: ic.id(),
        subaccount: Some(escrowSubaccount),
      },
    ],
  });

  const refundAmount = escrowBalance - totalInvestedAmount - TRANSFER_FEE;
  if ( refundAmount <= 0 ) return Result.Err("No excess in escrow");

  const refundResult = await ic.call(icpLedger.icrc1_transfer, {
    args: [{
      from_subaccount: Some(escrowSubaccount),
      to: refundAccount,
      amount: refundAmount,
      fee: Some(TRANSFER_FEE),
      memo: None,
      created_at_time: None,
    }]
  });

  if ( refundResult.Err ) return Result.Err(JSON.stringify(refundResult.Err));
  return Result.Ok(true);
}

export async function refund_rejected_from_escrow(refundAccount: Account): Promise<Result<bool, text>> {
  const principal = ic.caller();
  const icpLedger = getTokenLedger(MetadataStore.metadata.token);

  const validationResult = validateInvestor(principal);
  if ( validationResult.Err ) return validationResult;
  if ( EscrowStore.saleStatus.Rejected === undefined ) return Result.Err("Sale not rejected yet");

  const escrowSubaccount = deriveSubaccount(principal);
  const escrowBalance = await ic.call(icpLedger.icrc1_balance_of, {
    args: [
      {
        owner: ic.id(),
        subaccount: Some(escrowSubaccount),
      },
    ],
  });

  const refundAmount = escrowBalance - TRANSFER_FEE;
  if ( refundAmount <= 0 ) return Result.Err("No money for refund in escrow");

  const refundResult = await ic.call(icpLedger.icrc1_transfer, {
    args: [{
      from_subaccount: Some(escrowSubaccount),
      to: refundAccount,
      amount: refundAmount,
      fee: Some(TRANSFER_FEE),
      memo: None,
      created_at_time: None,
    }]
  });

  if ( refundResult.Err ) return Result.Err(JSON.stringify(refundResult.Err));
  return Result.Ok(true);
}