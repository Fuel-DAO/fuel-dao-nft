import { Principal, Result, bool, ic, text } from "azle";
import { ProvisionCanisterStore, TempAssetCanisterStore } from "./store";
import { validateController } from "./validate";
import { isErr } from "../common/utils";

export function set_provision_canister(principal: Principal): Result<bool, text> {
  const validationResult = validateController(ic.caller());
  if (isErr(validationResult)) return validationResult;

  ProvisionCanisterStore.setPrincipal(principal);
  return Result.Ok(true);
}

export function get_provision_canister(): Principal {
  return ProvisionCanisterStore.getPrincipal();
}

export function set_temp_asset_canister(principal: Principal): Result<bool, text> {
  const validationResult = validateController(ic.caller());
  if (isErr(validationResult)) return validationResult;

  TempAssetCanisterStore.setPrincipal(principal);
  return Result.Ok(true);
}

export function get_temp_asset_canister(): Principal {
  return TempAssetCanisterStore.getPrincipal();
}
