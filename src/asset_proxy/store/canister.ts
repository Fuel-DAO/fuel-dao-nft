import { Principal, text } from "azle";
import { Store } from "../../common/types";

export class CanisterStore implements Store {
  private _principal: Principal;

  constructor() {
    this._principal = Principal.anonymous();
  }

  setPrincipal(principal: Principal) {
    this._principal = principal;
  }

  getPrincipal(): Principal {
    return this._principal;
  }

  serialize(): text | undefined {
    return this._principal.toString();
  }

  deserialize(serialized: string): void {
    this._principal = Principal.fromText(serialized);
  }
}
