import { None, Result, Vec, bool, ic, text } from "azle";
import { TempAssetCanisterStore } from "./store";
import { ApproveFilesArg, AssetStoreArg } from "./types";
import { validateAssetUploader, validateController, validateProvisionCanister } from "./validate";
import { getAssetCanister } from "../common/utils";
import { isErr } from "../common/utils";

export async function store(asset: AssetStoreArg): Promise<Result<bool, text>> {
  const validationResult = validateAssetUploader(ic.caller());
  if (isErr(validationResult)) return validationResult;

  const tempAssetCanister = getAssetCanister(TempAssetCanisterStore.getPrincipal());
  await ic.call(tempAssetCanister.store, {
    args: [
      {
        key: asset.key,
        content_type: asset.content_type,
        content_encoding: asset.content_encoding,
        content: asset.content,
        sha256: asset.sha256,
      },
    ],
  });

  return Result.Ok(true);
}

export async function prune(files: Vec<text>): Promise<Result<bool, text>> {
  const validationResult = validateController(ic.caller());
  if (isErr(validationResult)) return validationResult;

  const tempAssetCanister = getAssetCanister(TempAssetCanisterStore.getPrincipal());
  const promises = files.map(async (file) => {
    await ic.call(tempAssetCanister.delete_asset, {
      args: [
        {
          key: file,
        },
      ],
    });
  });

  await Promise.all(promises);
  return Result.Ok(true);
}

export async function reject_files(files: Vec<text>): Promise<Result<bool, text>> {
  const validationResult = await validateProvisionCanister(ic.caller());
  if (isErr(validationResult)) return validationResult;

  const tempAssetCanister = getAssetCanister(TempAssetCanisterStore.getPrincipal());

  const promises = files.map(async (file) => {
    await ic.call(tempAssetCanister.delete_asset, {
      args: [
        {
          key: file,
        },
      ],
    });
  });

  await Promise.all(promises);
  return Result.Ok(true);
}

export async function approve_files(arg: ApproveFilesArg): Promise<Result<bool, text>> {
  const validationResult = await validateProvisionCanister(ic.caller());
  if (isErr(validationResult)) return validationResult;

  const assetCanister = getAssetCanister(arg.asset_canister);
  const tempAssetCanister = getAssetCanister(TempAssetCanisterStore.getPrincipal());

  const promises = arg.files.map(async (file) => {
    const res = await ic.call(tempAssetCanister.get, {
      args: [
        {
          key: file,
          accept_encodings: ["identity", "gzip", "br", "deflate", "compress", "zstd"],
        },
      ],
    });

    await ic.call(assetCanister.store, {
      args: [
        {
          ...res,
          key: file,
        },
      ],
    });

    await ic.call(tempAssetCanister.delete_asset, {
      args: [
        {
          key: file,
        },
      ],
    });
  });

  await Promise.all(promises);
  return Result.Ok(true);
}
