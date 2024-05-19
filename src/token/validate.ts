import { Principal, Result, bool, text } from "azle";
import { MetadataStore } from "./store";

export function validateInvestor(id: Principal): Result<bool, text> {
  if (id.isAnonymous()) return Result.Err("Anonymous users not allowed");
  return Result.Ok(true);
}

export function validateCollectionOwner(id: Principal): Result<bool, text> { 
  if ( MetadataStore.metadata.collection_owner.toString() !== id.toString() ) return Result.Err("Unauthorized.");
  return Result.Ok(true);
}