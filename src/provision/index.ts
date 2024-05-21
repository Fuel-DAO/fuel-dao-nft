import {
  blob,
  bool,
  Canister,
  init,
  nat,
  Opt,
  postUpgrade,
  preUpgrade,
  Principal,
  query,
  Result,
  text,
  update,
  Vec,
} from "azle";
import {
  ListCollectionResult,
  RequestInfo,
  WasmChunked,
  CanisterArgs,
  CollectionRequestMetadata,
  ApproveSuccessResponse,
} from "./types";
import {
  add_collection_request,
  approve_request,
  get_pending_requests,
  get_request_info,
  reject_request,
} from "./request";
import { add_admin, is_admin, remove_admin } from "./admin";
import { init_impl, post_upgrade_impl, pre_upgrade_impl } from "./lifecycle";
import {
  get_asset_canister_wasm,
  get_token_canister_wasm,
  set_asset_canister_wasm,
  set_token_canister_wasm,
  upgrade_token_canister,
  upgrade_token_canisters,
} from "./canister";
import { get_asset_proxy_canister, set_asset_proxy_canister } from "./canister/asset_proxy";
import { delete_collection, list_collections } from "./collection";

export default Canister({
  init: init([Opt(CanisterArgs)], init_impl),

  set_token_canister_wasm: update([WasmChunked], Result(bool, text), set_token_canister_wasm),
  get_token_canister_wasm: query([], WasmChunked, get_token_canister_wasm),

  set_asset_canister_wasm: update([WasmChunked], Result(bool, text), set_asset_canister_wasm),
  get_asset_canister_wasm: query([], WasmChunked, get_asset_canister_wasm),

  set_asset_proxy_canister: update([Principal], Result(bool, text), set_asset_proxy_canister),
  get_asset_proxy_canister: query([], Principal, get_asset_proxy_canister),

  is_admin: query([Opt(Principal)], bool, is_admin),
  add_admin: update([Principal], Result(bool, text), add_admin),
  remove_admin: update([Principal], Result(bool, text), remove_admin),

  add_collection_request: update([CollectionRequestMetadata], Result(nat, text), add_collection_request),
  get_pending_requests: query([], Vec(nat), get_pending_requests),
  get_request_info: query([nat], Opt(RequestInfo), get_request_info),

  approve_request: update([nat], Result(ApproveSuccessResponse, text), approve_request),
  reject_request: update([nat], Result(bool, text), reject_request),

  list_collections: query([], Vec(ListCollectionResult), list_collections),
  delete_collection: update([nat], Result(bool, text), delete_collection),

  preUpgrade: preUpgrade(pre_upgrade_impl),
  postUpgrade: postUpgrade([Opt(CanisterArgs)], post_upgrade_impl),

  upgrade_token_canister: update([Principal], Result(bool, text), upgrade_token_canister),
  upgrade_token_canisters: update([], Result(bool, text), upgrade_token_canisters),
});
