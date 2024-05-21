import { Opt, Principal, Record, Variant, Vec, blob, nat, nat64, nat8, text } from "azle";

export const Account = Record({
  owner: Principal,
  subaccount: Opt(blob)
});
export type Account = typeof Account.tsType;

export const TimeStamp = Record({
  timestamp_nanos: nat
});
export type TimeStamp = typeof TimeStamp.tsType;

export const Tokens = Record({
  e8s: nat
});
export type Tokens = typeof TimeStamp.tsType;

export const Operation = Variant({
  Approve: Record({
    fee: Tokens,
    from: text,
    allowance: Tokens,
    expires_at: Opt(TimeStamp),
    spender: text,
    expected_allowance: Opt(Tokens),
  }),
  Burn: Record({ from: text, amount: Tokens, spender: Opt(text) }),
  Mint: Record({ to: text, amount: Tokens }),
  Transfer: Record({ to: text, fee: Tokens, from: text, amount: Tokens, spender: Opt(text) }),
});
export type Operation = typeof Operation.tsType;

export const Transaction = Record({
  memo: nat,
  icrc1_memo: Opt(Vec(nat8)),
  operation: Operation,
  created_at_time: Opt(TimeStamp),
  timestamp: Opt(TimeStamp),
});
export type Transaction = typeof Transaction.tsType;

export const TransactionWithId = Record({ id: nat64, transaction: Transaction });
export type TransactionWithId = typeof TransactionWithId.tsType;

export const GetAccountTransactionsArgs = Record({
  account: Account,
  start: Opt(nat),
  max_results: nat,
});
export type GetAccountTransactionsArgs = typeof GetAccountTransactionsArgs.tsType;

export const GetAccountIdentifierTransactionsError = Record({
  message: text,
});
export type GetAccountIdentifierTransactionsError = typeof GetAccountIdentifierTransactionsError.tsType;

export const GetAccountIdentifierTransactionsResponse = Record({
  balance: nat,
  transactions: Vec(TransactionWithId),
  oldest_tx_id: Opt(nat),
});
export type GetAccountIdentifierTransactionsResponse = typeof GetAccountIdentifierTransactionsResponse.tsType;

export const GetAccountIdentifierTransactionsResult = Variant({
  Ok: GetAccountIdentifierTransactionsResponse,
  Err: GetAccountIdentifierTransactionsError,
});
export type GetAccountIdentifierTransactionsResult = typeof GetAccountIdentifierTransactionsResult.tsType;

export const InitArg = Record({ ledger_id: Principal });
export type InitArg = typeof InitArg.tsType;