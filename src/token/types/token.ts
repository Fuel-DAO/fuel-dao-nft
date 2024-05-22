import { Record, Opt, blob, Variant, text, nat, bool, nat64, Null, nat32, Principal } from "azle";
import { Account, Subaccount } from "./common";

export type TokenType = {
  owner: {
    principal: text;
    subaccount?: Subaccount;
  };
};

export type TokenStoreType = Map<nat32, TokenType>;
export type OwnerToTokenIndexType = Map<text, Map<nat32, bool>>;
export type TokenStoreReadonlyType = ReadonlyMap<nat32, TokenType>;
export type OwnerToTokensIndexReadonlyType = ReadonlyMap<text, ReadonlyMap<nat32, bool>>;

export const MintArg = Record({
  subaccount: Opt(Subaccount),
  quantity: nat,
});
export type MintArg = typeof MintArg.tsType;

export const RefundArg = Record({
  subaccount: Opt(Subaccount),
});
export type RefundArg = typeof RefundArg.tsType;

export const TransferArg = Record({
  from_subaccount: Opt(Subaccount),
  to: Account,
  token_id: nat,
  memo: Opt(blob),
  created_at_time: Opt(nat64),
});

export const TransferError = Variant({
  NonExistingTokenId: Null,
  InvalidRecipient: Null,
  Unauthorized: Null,
  TooOld: Null,
  CreatedInFuture: Record({ ledger_time: nat64 }),
  Duplicate: Record({ duplicate_of: nat }),
  GenericError: Record({ error_code: nat, message: text }),
  GenericBatchError: Record({ error_code: nat, message: text }),
});

export const TransferResult = Variant({
  Ok: nat,
  Err: TransferError,
});

export type TransferArg = typeof TransferArg.tsType;
export type TransferError = typeof TransferError.tsType;
export type TransferResult = typeof TransferResult.tsType;

export const EscrowAccount = Record({
  owner: Principal,
  subaccount: Subaccount,
});
export type EscrowAccount = typeof EscrowAccount.tsType;

export const GetEscrowAccountResult = Record({
  account: EscrowAccount,
  accountId: text,
})
export type GetEscrowAccountResult = typeof GetEscrowAccountResult.tsType;

export const BookTokensArg = Record({
  quantity: nat
});
export type BookTokensArg = typeof BookTokensArg.tsType;

export const SaleStatus = Variant({
  Live: Null,
  Accepted: Null,
  Rejected: Null,
});
export type SaleStatus = typeof SaleStatus.tsType;