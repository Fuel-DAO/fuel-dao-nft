import { None, Principal, Result, Some, Vec, blob, bool, ic, text } from "azle";
import { managementCanister } from "azle/canisters/management";
import { RequestStore, TokenCanisterWasmStore } from "../store";
import { validateController } from "../validate";
import { encode } from "azle/src/lib/candid/serde";
import { CanisterArgs, InitArg } from "../../token/types";
import { managementCanisterExtended } from "../../common/management";
import { WasmChunked } from "../types";

export async function deploy_token(args: InitArg): Promise<Result<Principal, text>> {
  const { canister_id } = await ic.call(managementCanister.create_canister, {
    args: [
      {
        settings: {
          Some: {
            controllers: Some([ic.id()]),
            compute_allocation: None,
            memory_allocation: None,
            freezing_threshold: None,
            reserved_cycles_limit: None,
          },
        },
        sender_canister_version: None,
      },
    ],
    cycles: 200_000_000_000n,
  });

  await ic.call(managementCanisterExtended.install_chunked_code, {
    args: [
      {
        mode: {
          install: null,
        },
        target_canister: canister_id,
        store_canister: Some(ic.id()),
        chunk_hashes_list: TokenCanisterWasmStore.wasm.chunkHashes,
        wasm_module_hash: TokenCanisterWasmStore.wasm.moduleHash,
        arg: encode(CanisterArgs, { Init: args }),
        sender_canister_version: None,
      },
    ],
  });

  return Result.Ok(canister_id);
}

export function set_token_canister_wasm(wasm: WasmChunked): Result<bool, text> {
  const validationResult = validateController(ic.caller());
  if (!validationResult.Ok) return validationResult;

  TokenCanisterWasmStore.store(wasm);
  return Result.Ok(true);
}

export function get_token_canister_wasm(): WasmChunked {
  return TokenCanisterWasmStore.wasm;
}

export async function upgrade_token_canister(canisterId: Principal): Promise<Result<bool, text>> {
  const validationResult = validateController(ic.caller());
  if (validationResult.Err) return validationResult;

  try {
    await ic.call(managementCanisterExtended.install_chunked_code, {
      args: [
        {
          mode: {
            upgrade: null,
          },
          target_canister: canisterId,
          store_canister: Some(ic.id()),
          chunk_hashes_list: TokenCanisterWasmStore.wasm.chunkHashes,
          wasm_module_hash: TokenCanisterWasmStore.wasm.moduleHash,
          arg: encode(CanisterArgs, { Upgrade: null }),
          sender_canister_version: None,
        },
      ],
    });

    return Result.Ok(true);
  } catch (e) {
    if (e instanceof Error)
      return Result.Err(`${canisterId.toText()} upgrade failed: ${e.message}`);

    return Result.Err(`${canisterId.toText()} upgrade failed: ${e}`);
  }
}

export async function upgrade_token_canisters(): Promise<Result<bool, text>> {
  const validationResult = validateController(ic.caller());
  if (validationResult.Err) return validationResult;

  const tokenCanisters = Array.from(RequestStore.config.values())
    .map((v) => v.token_canister.Some)
    .reduce((acc, v) => {
      if (v) acc.push(v);
      return acc;
    }, [] as Principal[]);

  for (const id of tokenCanisters) {
    const res = await upgrade_token_canister(id);
    if (res.Err) return res;
  }

  return Result.Ok(true);
}
