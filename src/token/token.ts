import { Opt, Principal, Vec, ic, nat } from "azle";
import { Account, MetadataResult, MintArg, TransferArg, TransferResult } from "./types";
import { TokenStore, TxnIndexStore } from "./store";
import { bigIntToNumber, isSubaccountsEq, toAccountId, toOpt } from "./utils";
import { iterableToArray } from "../common/utils";

export function icrc7_token_metadata(tokenIds: Vec<nat>): Vec<Opt<MetadataResult>> {
  return tokenIds
    .map((id) => bigIntToNumber(id))
    .map((id) => toOpt(TokenStore.tokens.get(id) ? [] : undefined));
}

export function icrc7_owner_of(tokenIds: Vec<nat>): Vec<Opt<Account>> {
  return tokenIds
    .map((id) => bigIntToNumber(id))
    .map((id) => TokenStore.tokens.get(id))
    .map((token) =>
      toOpt(
        token
          ? {
              owner: Principal.fromText(token.owner.principal),
              subaccount: toOpt(token.owner.subaccount),
            }
          : undefined,
      ),
    );
}

export function icrc7_balance_of(accounts: Vec<Account>): Vec<nat> {
  return accounts
    .map((account) => toAccountId(account.owner.toString(), account.subaccount.Some))
    .map((accountId) => TokenStore.ownerToTokenIndex.get(accountId)?.size ?? 0)
    .map((balance) => BigInt(balance));
}

export function icrc7_tokens(prev: Opt<nat>, take: Opt<nat>): Vec<nat> {
  const tokens: number[] = iterableToArray(TokenStore.tokens.keys());
  const prevId = bigIntToNumber(prev.Some ?? 0n);
  const prevIndex = prevId ? tokens.findIndex((id) => prevId === id) : -1;

  return tokens
    .slice(prevIndex + 1, prevIndex + 1 + bigIntToNumber(take.Some ?? 5n))
    .map((id) => BigInt(id));
}

export function icrc7_tokens_of(account: Account, prev: Opt<nat>, take: Opt<nat>): Vec<nat> {
  const accountId = toAccountId(account.owner.toString(), account.subaccount.Some);
  const accountTokensIndex = TokenStore.ownerToTokenIndex.get(accountId);
  const tokens: number[] = accountTokensIndex ? iterableToArray(accountTokensIndex.keys()) : [];

  const prevId = bigIntToNumber(prev.Some ?? 0n);
  const prevIndex = prevId ? tokens.findIndex((id) => prevId === id) : -1;

  return tokens
    .slice(prevIndex + 1, prevIndex + 1 + bigIntToNumber(take.Some ?? 5n))
    .map((id) => BigInt(id));
}

export function icrc7_transfer(args: Vec<TransferArg>): Vec<Opt<TransferResult>> {
  const holderPrincipal = ic.caller().toString();

  return args.map((arg) => {
    const tokenId = parseInt(arg.token_id.toString());
    const token = TokenStore.tokens.get(tokenId);
    if (!token) return toOpt({ Err: { NonExistingTokenId: null } });

    const holderSubaccount = arg.from_subaccount.Some;
    const receiverPrincipal = arg.to.owner.toString();
    const receiverSubaccount = arg.to.subaccount.Some;

    if (
      token.owner.principal !== holderPrincipal ||
      !isSubaccountsEq(token.owner.subaccount, holderSubaccount)
    )
      return toOpt({ Err: { Unauthorized: null } });

    if (
      holderPrincipal === receiverPrincipal &&
      isSubaccountsEq(holderSubaccount, receiverSubaccount)
    )
      return toOpt({ Err: { InvalidRecipient: null } });

    TokenStore.transfer(tokenId, receiverPrincipal, receiverSubaccount);
    return toOpt({ Ok: TxnIndexStore.index });
  });
}
