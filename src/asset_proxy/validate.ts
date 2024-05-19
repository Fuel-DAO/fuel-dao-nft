import { Principal, Result, bool, ic, text } from "azle";
import { ProvisionCanisterStore } from "./store";

export function validateController(id: Principal): Result<bool, text> {
  if (!ic.isController(id)) return Result.Err("Only controllers are allowed");
  return Result.Ok(true);
}

export function validateProvisionCanister(id: Principal): Result<bool, text> {
  if (ProvisionCanisterStore.getPrincipal().toString() !== id.toString())
    return Result.Err("Only Provision Canister can call.");
  return Result.Ok(true);
}

export function validateAssetUploader(id: Principal): Result<bool, text> {
  if (id.isAnonymous()) return Result.Err("Anonymous users not allowed");
  return Result.Ok(true);
}
