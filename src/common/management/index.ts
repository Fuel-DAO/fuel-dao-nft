import { Canister, Principal, Void, update } from "azle";
import {
  ClearChunkStoreArgs,
  InstallChunkedCodeArgs,
  StoredChunksArgs,
  StoredChunksResult,
  UploadChunkArgs,
  UploadChunkResult,
} from "./types";

export const managementCanisterExtended = Canister({
  upload_chunk: update([UploadChunkArgs], UploadChunkResult),
  clear_chunk_store: update([ClearChunkStoreArgs], Void),
  stored_chunks: update([StoredChunksArgs], StoredChunksResult),
  install_chunked_code: update([InstallChunkedCodeArgs], Void),
})(Principal.fromText("aaaaa-aa"));
