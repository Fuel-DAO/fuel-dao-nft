import { Record, Principal, Opt, blob, Variant, text, nat, int, Vec, Tuple } from "azle";

export const Subaccount = blob;
export type Subaccount = blob;

export const Account = Record({
  owner: Principal,
  subaccount: Opt(Subaccount),
});
export type Account = typeof Account.tsType;

const PrimitiveValues = {
  Blob: blob,
  Text: text,
  Nat: nat,
  Int: int,
};

export const Value = Variant({
  ...PrimitiveValues,
  Map: Vec(Tuple(text, Variant(PrimitiveValues))),
  Array: Vec(Variant(PrimitiveValues)),
});
export type Value = typeof Value.tsType;
