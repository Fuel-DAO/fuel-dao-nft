import { Canister, Void, init, query } from "azle";
import { GetAccountIdentifierTransactionsResult, GetAccountTransactionsArgs, InitArg } from "./types";

export default Canister({
  init: init([InitArg]),
  get_account_transactions: query([GetAccountTransactionsArgs], GetAccountIdentifierTransactionsResult)
});