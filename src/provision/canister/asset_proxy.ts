import { Principal, Result, bool, ic, text } from "azle";
import { AssetProxyCanisterStore } from "../store";
import { validateController } from "../validate";
import { getAssetProxyCanister, isErr } from "../../common/utils";

export function set_asset_proxy_canister(principal: Principal): Result<bool, text> {
  const validationResult = validateController(ic.caller());
  if (isErr(validationResult)) return validationResult;

  AssetProxyCanisterStore.updateId(principal);
  return Result.Ok(true);
}

export function get_asset_proxy_canister(): Principal {
  return AssetProxyCanisterStore.id;
}

export async function approve_files_from_proxy(
  canister: Principal,
  files: text[],
): Promise<Result<bool, text>> {
  await ic.call(getAssetProxyCanister(AssetProxyCanisterStore.id).approve_files, {
    args: [
      {
        files,
        asset_canister: canister,
      },
    ],
  });

  return Result.Ok(true);
}
