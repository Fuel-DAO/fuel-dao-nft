import { Principal } from "azle";
import { Subaccount } from "../token/types";

export function deriveSubaccount(principal: Principal): Subaccount {
  const principalInBytes = principal.toUint8Array();
  const subaccount = new Uint8Array(32);
  const startIndex = subaccount.length - principalInBytes.length;

  principalInBytes.forEach((val, ind) => (subaccount[startIndex + ind] = val));
  return subaccount;
}
