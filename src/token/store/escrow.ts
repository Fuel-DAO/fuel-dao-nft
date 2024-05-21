import { Principal, jsonReplacer, jsonReviver, nat, text } from "azle";
import { Store } from "../../common/types";
import { SaleStatus } from "../types";

export class EscrowStore implements Store {
  private _saleStatus: SaleStatus = { Live: null };
  private _bookedTokens: Map<text, nat> = new Map();
  private _totalBookedTokens: nat = 0n;

  get saleStatus(): SaleStatus {
    return this._saleStatus;
  }

  get bookedTokens(): ReadonlyMap<text, nat> {
    return this._bookedTokens;
  }

  get totalBookedTokens(): nat {
    return this._totalBookedTokens;
  }
  
  bookTokens(owner: Principal, quantity: nat) {
    const amount = this._bookedTokens.get(owner.toText()) ?? 0n;
    this._bookedTokens.set(owner.toText(), amount + quantity);
    this._totalBookedTokens += quantity;
  }

  acceptSale() {
    this._saleStatus = { Accepted: null };
  }

  rejectSale() {
    this._saleStatus = { Rejected: null };
  }

  serialize(): string | undefined {
    const toSerialize = {
      saleStatus: this._saleStatus,
      bookedTokens: [] as [text, nat][],
      totalBookedTokens: this._totalBookedTokens,
    };

    this._bookedTokens.forEach((amount, owner) => {
      toSerialize.bookedTokens.push([owner, amount]);
    })

    return JSON.stringify(toSerialize, jsonReplacer);
  }

  deserialize(serialized: string): void {
    const {
      saleStatus,
      totalBookedTokens,
      bookedTokens,
    } = JSON.parse(serialized, jsonReviver);

    this._saleStatus = saleStatus as SaleStatus;
    this._totalBookedTokens = totalBookedTokens;

    bookedTokens.forEach(([owner, amount]: [text, nat]) => {
      this._bookedTokens.set(owner, amount);
    })
  }
}