import { Principal, Result, bool, ic, nat64, text } from "azle";
import { AdminStore, RequestStore } from "./store";

export function validateController(id: Principal): Result<bool, text> {
  if (!ic.isController(id)) return Result.Err("Only controllers are allowed");
  return Result.Ok(true);
}

export function validateCollectionRequester(id: Principal): Result<bool, text> {
  if (id.isAnonymous()) return Result.Err("Anonymous users not allowed");
  return Result.Ok(true);
}

export function validateCollectionOwner(id: Principal, collectionId: nat64): Result<bool, text> {
  const collection = RequestStore.config.get(collectionId);

  if (!collection) return Result.Err("Collection does not exist");
  if (collection.collection_owner.toString() !== id.toString())
    return Result.Err("User is not the collection owner");
  return Result.Ok(true);
}

export function validateAdmin(id: Principal): Result<bool, text> {
  if (!AdminStore.admins.get(id.toString()))
    return Result.Err("The user does not have admin access.");
  return Result.Ok(true);
}
