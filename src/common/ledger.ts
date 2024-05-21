import { Principal } from "azle";
import { Ledger } from "azle/canisters/ledger";
import LedgerIndex from "../icp_ledger_index/index";

export const TRANSFER_FEE = 10_000n;

export function getTokenLedger(principal: Principal) {
  return Ledger(principal);
}

export function getTokenLedgerIndex(principal: Principal) {
  return LedgerIndex(principal);
}