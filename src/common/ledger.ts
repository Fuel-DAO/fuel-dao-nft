import { Principal } from "azle";
import { Ledger } from "azle/canisters/ledger";

export const TRANSFER_FEE = 10_000n;

export function getTokenLedger(principal: Principal) {
  return Ledger(principal);
}
