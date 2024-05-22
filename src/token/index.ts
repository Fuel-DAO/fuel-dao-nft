import {
  bool,
  Canister,
  init,
  nat,
  nat32,
  Opt,
  postUpgrade,
  preUpgrade,
  Principal,
  query,
  Result,
  text,
  Vec,
} from "azle";
import { update } from "./utils";
import {
  icrc7_symbol,
  icrc7_name,
  icrc7_description,
  icrc7_logo,
  icrc7_total_supply,
  icrc7_supply_cap,
  icrc7_max_query_batch_size,
  icrc7_max_update_batch_size,
  icrc7_max_default_take_value,
  icrc7_max_take_value,
  icrc7_max_memo_size,
  icrc7_atomic_batch_transfers,
  icrc7_tx_window,
  icrc7_permitted_drift,
  icrc7_collection_metadata,
  update_metadata,
  change_ownership,
  get_metadata,
} from "./metadata";
import {
  Account,
  MintArg,
  TransferResult,
  TransferArg,
  ICRC61Standards,
  TxnResult,
  MetadataUpdateArg,
  RefundArg,
  CanisterArgs,
  MetadataQueryResult,
  ICRC7MetadataQueryResult,
  EscrowAccount,
  GetEscrowAccountResult,
  BookTokensArg,
  SaleStatus,
} from "./types";
import { init_impl, post_upgrade_impl, pre_upgrade_impl } from "./lifecycle";
import { icrc61_supported_standards } from "./icrc61";
import {
  icrc7_balance_of,
  icrc7_owner_of,
  icrc7_token_metadata,
  icrc7_tokens,
  icrc7_tokens_of,
  icrc7_transfer,
} from "./token";
import { book_tokens, get_booked_tokens, get_escrow_account, get_sale_status, get_total_booked_tokens } from "./escrow";
import { accept_sale, reject_sale, reject_sale_individual } from "./mint";

export default Canister({
  init: init([CanisterArgs], init_impl),

  icrc7_symbol: query([], text, icrc7_symbol),
  icrc7_name: query([], text, icrc7_name),
  icrc7_description: query([], Opt(text), icrc7_description),
  icrc7_logo: query([], Opt(text), icrc7_logo),
  icrc7_total_supply: query([], nat, icrc7_total_supply),
  icrc7_supply_cap: query([], Opt(nat), icrc7_supply_cap),

  icrc7_max_query_batch_size: query([], Opt(nat), icrc7_max_query_batch_size),
  icrc7_max_update_batch_size: query([], Opt(nat), icrc7_max_update_batch_size),
  icrc7_max_default_take_value: query([], Opt(nat), icrc7_max_default_take_value),
  icrc7_max_take_value: query([], Opt(nat), icrc7_max_take_value),
  icrc7_max_memo_size: query([], Opt(nat), icrc7_max_memo_size),
  icrc7_atomic_batch_transfers: query([], Opt(bool), icrc7_atomic_batch_transfers),
  icrc7_tx_window: query([], Opt(nat), icrc7_tx_window),
  icrc7_permitted_drift: query([], Opt(nat), icrc7_permitted_drift),

  icrc7_collection_metadata: query([], ICRC7MetadataQueryResult, icrc7_collection_metadata),
  icrc7_token_metadata: query([Vec(nat)], Vec(Opt(ICRC7MetadataQueryResult)), icrc7_token_metadata),

  icrc7_owner_of: query([Vec(nat)], Vec(Opt(Account)), icrc7_owner_of),
  icrc7_balance_of: query([Vec(Account)], Vec(nat), icrc7_balance_of),
  icrc7_tokens: query([Opt(nat), Opt(nat)], Vec(nat), icrc7_tokens),
  icrc7_tokens_of: query([Account, Opt(nat), Opt(nat)], Vec(nat), icrc7_tokens_of),
  icrc7_transfer: update([Vec(TransferArg)], Vec(Opt(TransferResult)), icrc7_transfer),

  get_escrow_account: query([], GetEscrowAccountResult, get_escrow_account),
  get_booked_tokens: query([Opt(Principal)], nat, get_booked_tokens),
  get_total_booked_tokens: query([], nat, get_total_booked_tokens),
  get_sale_status: query([], SaleStatus, get_sale_status),

  book_tokens: update([BookTokensArg], Result(bool, text), book_tokens),

  accept_sale: update([], Result(bool, text), accept_sale),
  reject_sale: update([], Result(bool, text), reject_sale),
  reject_sale_individual: update([Principal], Result(bool, text), reject_sale_individual),

  icrc61_supported_standards: query([], ICRC61Standards, icrc61_supported_standards),

  change_ownership: update([Principal], TxnResult, change_ownership),
  update_metadata: update([MetadataUpdateArg], TxnResult, update_metadata),
  get_metadata: query([], MetadataQueryResult, get_metadata),

  preUpgrade: preUpgrade(pre_upgrade_impl),
  postUpgrade: postUpgrade([CanisterArgs], post_upgrade_impl),
});
