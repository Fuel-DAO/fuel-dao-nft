import * as token from "../../dfx_generated/token/token.did.js";
import * as provision from "../../dfx_generated/provision/provision.did.js";
import * as asset from "../../dfx_generated/asset/asset.did.js";
import * as assetProxy from "../../dfx_generated/asset_proxy/asset_proxy.did.js";
import * as icpLedger from "../../dfx_generated/icp_ledger/icp_ledger.did.js";
import managementCanisterIdl from "@dfinity/agent/lib/cjs/canisters/management_idl.js";
import { ActorMethod, ManagementCanisterRecord } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { IDL } from "@dfinity/candid";

type ManagementCanisterRecordPatched = Omit<ManagementCanisterRecord, "upload_chunk"> & {
  upload_chunk: ActorMethod<
    [
      {
        chunk: Uint8Array | number[];
        canister_id: Principal;
      },
    ],
    undefined
  >;
};

const managementCanisterIdlPatched: IDL.InterfaceFactory = ({ IDL }) =>
  IDL.Service({
    ...(managementCanisterIdl({ IDL }) as IDL.ServiceClass)._fields.reduce((acc, curr) => {
      acc[curr[0]] = curr[1];
      return acc;
    }, {} as any),
    upload_chunk: IDL.Func(
      [
        IDL.Record({
          chunk: IDL.Vec(IDL.Nat8),
          canister_id: IDL.Principal,
        }),
      ],
      [],
      [],
    ),
  });

export const tokenIdl = token.idlFactory;
export const provisionIdl = provision.idlFactory;
export const assetIdl = asset.idlFactory;
export const assetProxyIdl = assetProxy.idlFactory;
export const managementIdl = managementCanisterIdlPatched;
export const icpLedgerIdl = icpLedger.idlFactory;

export type tokenService = token._SERVICE;
export type provisionService = provision._SERVICE;
export type assetService = asset._SERVICE;
export type assetProxyService = assetProxy._SERVICE;
export type managementService = ManagementCanisterRecordPatched;
export type icpLedgerService = icpLedger._SERVICE;

export const tokenInit = token.init;
export const provisionInit = provision.init;
export const assetInit = asset.init;
export const assetProxyInit = assetProxy.init;
export const icpLedgerInit = icpLedger.init;
