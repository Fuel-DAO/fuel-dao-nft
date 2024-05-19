import { Opt, Principal, Result, bool, ic, text } from "azle";
import { AdminStore } from "../store";
import { validateController } from "../validate";

export function is_admin(principal: Opt<Principal>): bool {
  const user = (principal.Some ?? ic.caller()).toString();
  return !!AdminStore.admins.get(user);
}

export function add_admin(principal: Principal): Result<bool, text> {
  const validationResult = validateController(ic.caller());
  if (validationResult.Err) return validationResult;

  AdminStore.addAdmin(principal);
  return Result.Ok(true);
}

export function remove_admin(principal: Principal): Result<bool, text> {
  const validationResult = validateController(ic.caller());
  if (validationResult.Err) return validationResult;

  AdminStore.removeAdmin(principal);
  return Result.Ok(true);
}
