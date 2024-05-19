import { Null, Opt, Principal, Record, Variant, Vec, blob, nat, text } from "azle";

export const AssetStoreArg = Record({
  key: text,
  content_type: text,
  content_encoding: text,
  content: blob,
  sha256: Opt(blob),
});
export type AssetStoreArg = typeof AssetStoreArg.tsType;

export const ApproveFilesArg = Record({
  files: Vec(text),
  asset_canister: Principal,
});
export type ApproveFilesArg = typeof ApproveFilesArg.tsType;

export const CanisterArgs = Variant({
  Init: Null,
  Upgrade: Null,
});
export type CanisterArgs = typeof CanisterArgs.tsType;
