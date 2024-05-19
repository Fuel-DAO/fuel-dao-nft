import { None, Opt, Some, bool, nat, text } from "azle";
import { MetadataStore } from "../store";
import { toOpt } from "../utils";
import { ICRC7MetadataQueryResult } from "../types";

export function icrc7_symbol(): text {
  return MetadataStore.metadata.symbol;
}

export function icrc7_name(): text {
  return MetadataStore.metadata.name;
}

export function icrc7_description(): Opt<text> {
  return toOpt(MetadataStore.metadata.description);
}

export function icrc7_logo(): Opt<text> {
  return toOpt(MetadataStore.metadata.logo);
}

export function icrc7_total_supply(): nat {
  return MetadataStore.config.total_supply;
}

export function icrc7_supply_cap(): Opt<nat> {
  return Some(MetadataStore.metadata.supply_cap);
}

export function icrc7_max_query_batch_size(): Opt<nat> {
  return None;
}

export function icrc7_max_update_batch_size(): Opt<nat> {
  return None;
}

export function icrc7_max_default_take_value(): Opt<nat> {
  return None;
}

export function icrc7_max_take_value(): Opt<nat> {
  return None;
}

export function icrc7_max_memo_size(): Opt<nat> {
  return None;
}

export function icrc7_atomic_batch_transfers(): Opt<bool> {
  return None;
}

export function icrc7_tx_window(): Opt<nat> {
  return None;
}

export function icrc7_permitted_drift(): Opt<nat> {
  return None;
}

export function icrc7_collection_metadata(): ICRC7MetadataQueryResult {
  const metadata: ICRC7MetadataQueryResult = [];

  metadata.push(["icrc7:name", { Text: MetadataStore.metadata.name }]);
  metadata.push(["icrc7:symbol", { Text: MetadataStore.metadata.symbol }]);
  metadata.push(["icrc7:total_supply", { Nat: MetadataStore.config.total_supply }]);
  metadata.push(["icrc7:supply_cap", { Nat: MetadataStore.metadata.supply_cap }]);
  metadata.push(["icrc7:description", { Text: MetadataStore.metadata.description }]);
  metadata.push(["icrc7:logo", { Text: MetadataStore.metadata.logo }]);

  return metadata;
}
