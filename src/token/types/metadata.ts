import {
  Record,
  Principal,
  Variant,
  text,
  nat,
  Vec,
  Tuple,
  nat32,
  Null,
  nat16,
  float64,
} from "azle";
import { Value } from "./common";
import { toOptionalSchema } from "../utils";

export const ICRC7MetadataQueryResult = Vec(Tuple(text, Value));
export type ICRC7MetadataQueryResult = typeof ICRC7MetadataQueryResult.tsType;

export const BaseMetadataRaw = {
  symbol: text,
  name: text,
  description: text,
  logo: text,
  supply_cap: nat,
  price: nat,
  treasury: Principal,
  asset_canister: Principal,
  token: Principal,
};

export const ExtendedMetadataRaw = {
  purchase_price: nat,
  brochure_url: text,
  battery: text,
  range_per_charge: float64,
  charging_speed: text,
  seating: text,
  cargo: float64,
  key_features: Vec(text),
  acceleration: text,
  drive_type: text,
  weight: float64,
  wheels: float64,
  displays: text,
  ground_clearance: float64,
  overall_width: float64,
  overall_height: float64,
  overall_length: float64,
  track_front: float64,
  track_rear: float64,
  images: Vec(text),
  documents: Vec(Tuple(text, text)),
};

export const ConfigRaw = {
  total_supply: nat,
};

export const MetadataRaw = {
  ...BaseMetadataRaw,
  ...ExtendedMetadataRaw,

  collection_owner: Principal,
};

export const MetadataUpdateArgRaw = toOptionalSchema({
  ...BaseMetadataRaw,
  ...ExtendedMetadataRaw,
});

export const MetadataQueryResultRaw = {
  ...MetadataRaw,

  total_supply: nat,
};

export const MetadataStoreType = Record(MetadataRaw);
export type MetadataStoreType = typeof MetadataStoreType.tsType;

export const ConfigStoreType = Record(ConfigRaw);
export type ConfigStoreType = typeof ConfigStoreType.tsType;

export const InitArg = Record(MetadataRaw);
export type InitArg = typeof InitArg.tsType;

export const CanisterArgs = Variant({
  Init: InitArg,
  Upgrade: Null,
});
export type CanisterArgs = typeof CanisterArgs.tsType;

export const MetadataUpdateArg = Record(MetadataUpdateArgRaw);
export type MetadataUpdateArg = typeof MetadataUpdateArg.tsType;

export const MetadataQueryResult = Record(MetadataQueryResultRaw);
export type MetadataQueryResult = typeof MetadataQueryResult.tsType;

export const TxnResult = Variant({
  Ok: nat,
  Err: text,
});
export type TxnResult = typeof TxnResult.tsType;
