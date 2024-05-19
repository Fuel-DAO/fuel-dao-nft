import { Principal, Vec, blob, nat32, text } from "azle";
import { exec } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { managementService } from "./canister.js";

export const PROVISION_CANISTER_WASM = path.resolve(
  ".dfx",
  "local",
  "canisters",
  "provision",
  "provision.wasm.gz",
);
export const ASSET_PROXY_CANISTER_WASM = path.resolve(
  ".dfx",
  "local",
  "canisters",
  "asset_proxy",
  "asset_proxy.wasm.gz",
);
export const TOKEN_CANISTER_WASM = path.resolve(
  ".dfx",
  "local",
  "canisters",
  "token",
  "token.wasm.gz",
);
export const ASSET_CANISTER_WASM = path.resolve(
  ".dfx",
  "local",
  "canisters",
  "asset",
  "asset.wasm.gz",
);

function inMB(num: nat32) {
  return num * 1024 * 1024;
}

function hexStringToBlob(str: text): blob {
  return new Uint8Array(
    new Array(str.length / 2)
      .fill("")
      .map((_, i) => str[2 * i] + str[2 * i + 1])
      .map((num) => parseInt(num, 16)),
  );
}

export async function getModuleHash(path: string): Promise<blob> {
  return new Promise((resolve, reject) => {
    exec(
      `sha256sum ${path}`,
      {
        encoding: "utf8",
      },
      (err, output) => {
        if (err) reject(err);
        resolve(hexStringToBlob(output.split(" ")[0].trim()));
      },
    );
  });
}

export async function getChunkHash(chunk: blob): Promise<blob> {
  const hash = createHash("sha256");
  hash.update(chunk);
  return hexStringToBlob(hash.digest("hex"));
}

export async function chunkifyModule(path: text): Promise<Vec<blob>> {
  const module = await readFile(path);
  const size = module.byteLength;
  const numChunks = Math.ceil(size / inMB(1));
  const chunks = new Array<blob>(numChunks)
    .fill(new Uint8Array())
    .map((_, i) => new Uint8Array(module.buffer, inMB(i), Math.min(size - inMB(i), inMB(1))));

  return chunks;
}

export async function loadWasmChunksToCanister(
  management: managementService,
  path: text,
  canister: Principal,
) {
  const chunks = await chunkifyModule(path);
  const chunkHashes: blob[] = [];

  for (const chunk of chunks) {
    await management.upload_chunk({
      chunk,
      canister_id: canister,
    });

    chunkHashes.push(await getChunkHash(chunk));
  }

  return chunkHashes;
}
