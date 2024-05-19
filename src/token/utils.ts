import { Opt, update as azleUpdate, AzleOpt, CandidType, Principal } from "azle";
import { Subaccount } from "./types";
import { TxnIndexStore } from "./store";

export function toOpt<T>(a?: T): Opt<T> {
  return a ? { Some: a } : { None: null };
}

export function toAccountId(principal: string, subaccount?: Subaccount): string {
  let subaccountId = subaccount?.toString() ?? Array(32).fill("0").join();
  return `${principal}#${subaccountId}`;
}

export function bigIntToNumber(a: BigInt): number {
  return parseInt(a.toString());
}

export function isSubaccountsEq(a?: Subaccount, b?: Subaccount): boolean {
  const defaultSubaccount = Array(32).fill(0).toString();
  return (a?.toString() ?? defaultSubaccount) === (b?.toString() ?? defaultSubaccount);
}

export const update: typeof azleUpdate = (params, result, fn) => {
  return azleUpdate(
    params,
    result,
    fn
      ? (...args) => {
          TxnIndexStore.increment();
          return fn.apply(null, args);
        }
      : undefined,
  );
};

export function makePopulatedOptState<Schema extends Record<string, any>>(schema: Schema) {
  return Object.entries(schema).reduce((acc, [key, _]) => {
    acc[key] = { None: null };
    return acc;
  }, {});
}

type toOptionalSchema<T> = {
  [Prop in keyof T]: AzleOpt<T[Prop]>;
};

export function toOptionalSchema<T extends { [name: string]: CandidType }>(
  schema: T,
): toOptionalSchema<T> {
  return Object.entries(schema).reduce((acc, [key, value]) => {
    acc[key] = Opt(value);
    return acc;
  }, {} as any);
}
