import {
  Canister,
  Opt,
  Principal,
  Result,
  Vec,
  bool,
  postUpgrade,
  preUpgrade,
  query,
  text,
  update,
} from "azle";
import { ApproveFilesArg, AssetStoreArg, CanisterArgs } from "./types";
import {
  get_provision_canister,
  get_temp_asset_canister,
  set_provision_canister,
  set_temp_asset_canister,
} from "./canister";
import { approve_files, prune, reject_files, store } from "./asset";
import { post_upgrade_impl, pre_upgrade_impl } from "./lifecycle";

export default Canister({
  get_temp_asset_canister: query([], Principal, get_temp_asset_canister),
  set_temp_asset_canister: update([Principal], Result(bool, text), set_temp_asset_canister),

  get_provision_canister: query([], Principal, get_provision_canister),
  set_provision_canister: update([Principal], Result(bool, text), set_provision_canister),

  store: update([AssetStoreArg], Result(bool, text), store),
  prune: update([Vec(text)], Result(bool, text), prune),

  reject_files: update([Vec(text)], Result(bool, text), reject_files),
  approve_files: update([ApproveFilesArg], Result(bool, text), approve_files),

  preUpgrade: preUpgrade(pre_upgrade_impl),
  postUpgrade: postUpgrade([Opt(CanisterArgs)], post_upgrade_impl),
});
