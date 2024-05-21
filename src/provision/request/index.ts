import { None, Opt, Principal, Result, Some, Vec, bool, ic, nat, text } from "azle";
import { ApproveSuccessResponse, CollectionRequestMetadata, RequestInfo } from "../types";
import { AssetProxyCanisterStore, RequestStore } from "../store";
import { validateAdmin, validateCollectionRequester } from "../validate";
import { isErr, isOk, iterableToArray } from "../../common/utils";
import {
  deploy_asset,
  deploy_token,
  grant_asset_admin_perms,
  grant_asset_edit_perms,
  revoke_asset_edit_perms,
} from "../canister";
import { approve_files_from_proxy } from "../canister/asset_proxy";

export function add_collection_request(metadata: CollectionRequestMetadata): Result<nat, text> {
  const caller = ic.caller();
  const validationResult = validateCollectionRequester(caller);
  if (validationResult.Err) return validationResult;

  const id = RequestStore.addRequest(
    {
      ...metadata,
    },
    caller,
  );

  return Result.Ok(id);
}

// TODO: add pagination
export function get_pending_requests(): Vec<nat> {
  const ids = iterableToArray(RequestStore.metadata.keys());
  return ids;
}

export function get_request_info(id: nat): Opt<RequestInfo> {
  const requestMetadata = RequestStore.metadata.get(id);
  const requestConfig = RequestStore.config.get(id);
  if (!requestConfig) return None;

  const requestInfo: RequestInfo = {
    metadata: requestMetadata ? Some(requestMetadata) : None,
    ...requestConfig,
  };

  return Some(requestInfo);
}

export async function approve_request(id: nat): Promise<Result<ApproveSuccessResponse, text>> {
  const validationResult = validateAdmin(ic.caller());
  if (validationResult.Err) return validationResult;

  const requestConfig = RequestStore.config.get(id);
  const requestMetadata = RequestStore.metadata.get(id);
  if (!requestConfig || !requestMetadata) return Result.Err("No request exists with the given id.");
  if (requestConfig.approval_status.Pending === undefined)
    return Result.Err("Request already processed.");

  const deployAssetResult = await deploy_asset();
  if (isErr(deployAssetResult)) return deployAssetResult;

  const grantProxyPermsResult = await grant_asset_edit_perms(
    deployAssetResult.Ok,
    AssetProxyCanisterStore.id,
  );
  if (isErr(grantProxyPermsResult)) return grantProxyPermsResult;
  
  const approvedFiles = [
    ...requestMetadata.documents.map((doc) => doc[1]),
    ...requestMetadata.images,
    ...(requestMetadata.logo !== '' ? [requestMetadata.logo] : []),
  ];

  const approveAssetsResult = await approve_files_from_proxy(
    deployAssetResult.Ok,
    approvedFiles,
  );
  if (isErr(approveAssetsResult)) return approveAssetsResult;

  const revokeProxyPermsResult = await revoke_asset_edit_perms(
    deployAssetResult.Ok,
    AssetProxyCanisterStore.id,
  );
  if (isErr(revokeProxyPermsResult)) return revokeProxyPermsResult;

  const deployTokenResult = await deploy_token({
    ...requestMetadata,
    collection_owner: requestConfig.collection_owner,
    asset_canister: deployAssetResult.Ok,

    ...(
      requestMetadata.logo !== "" &&
      { logo: `https://${deployAssetResult.Ok.toString()}.icp0.io${requestMetadata.logo}` }
    )
  });
  if (isErr(deployTokenResult)) return deployTokenResult;

  const grantAssetAdminAccessResult = await grant_asset_admin_perms(
    deployAssetResult.Ok,
    deployTokenResult.Ok,
  );
  if (isErr(grantAssetAdminAccessResult)) return grantAssetAdminAccessResult;

  // TODO: move to minter canister
  const grantAssetEditAccessResult = await grant_asset_edit_perms(
    deployAssetResult.Ok,
    requestConfig.collection_owner,
  );
  if (isErr(grantAssetEditAccessResult)) return grantAssetEditAccessResult;

  RequestStore.approveRequest(id);
  RequestStore.setTokenCanister(id, deployTokenResult.Ok);
  RequestStore.setAssetCanister(id, deployAssetResult.Ok);
  
  return Result.Ok({
    id,
    asset_canister: deployAssetResult.Ok,
    token_canister: deployTokenResult.Ok
  });
}

export function reject_request(id: nat): Result<bool, text> {
  const validationResult = validateAdmin(ic.caller());
  if (validationResult.Err) return validationResult;

  const requestConfig = RequestStore.config.get(id);
  if (!requestConfig) return Result.Err("No request exists with the given id.");
  if (requestConfig.approval_status.Pending === undefined)
    return Result.Err("Request already processed.");

  RequestStore.rejectRequest(id);
  return Result.Ok(true);
}
