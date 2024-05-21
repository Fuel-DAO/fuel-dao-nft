import { Principal, Result, bool, ic, text } from "azle";
import { managementCanister } from "azle/canisters/management";

export async function delete_canister(canisterId: Principal): Promise<Result<bool, text>> {
  try {
    await ic.call(managementCanister.stop_canister, {
      args: [{ canister_id: canisterId }]
    });

    await ic.call(managementCanister.delete_canister, {
      args: [{ canister_id: canisterId }]
    });

    return Result.Ok(true);
  } catch ( e ) {
    return Result.Err((e as Error).message);
  }
}