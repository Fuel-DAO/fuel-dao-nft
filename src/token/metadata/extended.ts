import { Principal, ic } from "azle";
import { MetadataStore, TxnIndexStore } from "../store";
import { TxnResult, MetadataUpdateArg, MetadataQueryResult } from "../types";
import AssetCanister from "../../asset";
import { validateCollectionOwner } from "../validate";

export async function change_ownership(new_owner: Principal): Promise<TxnResult> {
  const validationResult = validateCollectionOwner(ic.caller());
  if ( validationResult.Err ) return validationResult;

  const assetCanister = AssetCanister(MetadataStore.metadata.asset_canister);

  await ic.call(assetCanister.grant_permission, {
    args: [
      {
        to_principal: new_owner,
        permission: { Commit: null },
      },
    ],
  });

  await ic.call(assetCanister.revoke_permission, {
    args: [
      {
        of_principal: MetadataStore.metadata.collection_owner,
        permission: { Commit: null },
      },
    ],
  });

  MetadataStore.changeOwnership(new_owner);
  return { Ok: TxnIndexStore.index };
}

export function update_metadata(args: MetadataUpdateArg): TxnResult {
  const validationResult = validateCollectionOwner(ic.caller());
  if ( validationResult.Err ) return validationResult;

  MetadataStore.update(args);
  return { Ok: TxnIndexStore.index };
}

export function get_metadata(): MetadataQueryResult {
  return {
    ...MetadataStore.metadata,
    total_supply: MetadataStore.config.total_supply,
  };
}
