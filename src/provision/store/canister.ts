import { Principal } from "azle";
import { Store } from "../../common/types";

export class CanisterStore implements Store {
  private _id: Principal;

  constructor() {
    this._id = Principal.anonymous();
  }

  get id() {
    return this._id;
  }

  updateId(id: Principal) {
    this._id = id;
  }

  serialize(): string | undefined {
    return this._id.toText();
  }

  deserialize(serialized: string): void {
    this._id = Principal.fromText(serialized);
  }
}
