import { Null, Opt, Principal, Record, Some, Variant, Vec, blob, bool, nat, text } from "azle";
import { MetadataRaw } from "../../token/types";

const { collection_owner: _1, asset_canister: _2, ...CollectionRequestMetadataRaw } = MetadataRaw;

export const CollectionRequestMetadata = Record(CollectionRequestMetadataRaw);
export type CollectionRequestMetadata = typeof CollectionRequestMetadata.tsType;

const RequestApprovalStatus = Variant({
  Pending: Null,
  Approved: Null,
  Rejected: Null,
});

const RequestConfigRaw = {
  collection_owner: Principal,
  approval_status: RequestApprovalStatus,
  token_canister: Opt(Principal),
  asset_canister: Opt(Principal),
};

export const RequestConfig = Record(RequestConfigRaw);
export type RequestConfig = typeof RequestConfig.tsType;

export const RequestInfo = Record({
  metadata: Opt(CollectionRequestMetadata),
  ...RequestConfigRaw,
});
export type RequestInfo = typeof RequestInfo.tsType;

export const AssetCanisterArgs = Variant({
  Init: Record({}),
  Upgrade: Null,
});

export const WasmChunked = Record({
  chunkHashes: Vec(blob),
  moduleHash: blob,
});
export type WasmChunked = typeof WasmChunked.tsType;

export const ListCollectionResult = Record({
  id: nat,
  token_canister: Principal,
  asset_canister: Principal,
});
export type ListCollectionResult = typeof ListCollectionResult.tsType;

export const CanisterArgs = Variant({
  Init: Null,
  Upgrade: Null,
});
export type CanisterArgs = typeof CanisterArgs.tsType;

export const ApproveSuccessResponse = Record({
  id: nat,
  asset_canister: Principal,
  token_canister: Principal,
});
export type ApproveSuccessResponse = typeof ApproveSuccessResponse.tsType;