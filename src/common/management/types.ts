import { Null, Opt, Principal, Record, Variant, Vec, blob, nat64 } from "azle";

export const CanisterId = Principal;
export type CanisterId = Principal;

export const ChunkHash = Record({
  hash: blob,
});
export type ChunkHash = typeof ChunkHash.tsType;

export const UploadChunkArgs = Record({
  canister_id: CanisterId,
  chunk: blob,
});
export type UploadChunkArgs = typeof UploadChunkArgs.tsType;

export const UploadChunkResult = ChunkHash;
export type UploadChunkResult = typeof UploadChunkResult.tsType;

export const ClearChunkStoreArgs = Record({
  canister_id: CanisterId,
});
export type ClearChunkStoreArgs = typeof ClearChunkStoreArgs.tsType;

export const StoredChunksArgs = Record({
  canister_id: CanisterId,
});
export type StoredChunksArgs = typeof StoredChunksArgs.tsType;

export const StoredChunksResult = Vec(ChunkHash);
export type StoredChunksResult = typeof StoredChunksResult.tsType;

export const InstallCodeMode = Variant({
  install: Null,
  reinstall: Null,
  upgrade: Null,
});
export type InstallCodeMode = typeof InstallCodeMode.tsType;

export const InstallChunkedCodeArgs = Record({
  mode: InstallCodeMode,
  target_canister: CanisterId,
  store_canister: Opt(CanisterId),
  chunk_hashes_list: Vec(blob),
  wasm_module_hash: blob,
  arg: blob,
  sender_canister_version: Opt(nat64),
});
export type InstallChunkedCodeArgs = typeof InstallChunkedCodeArgs.tsType;
