import { Principal, bool, text } from "azle";
import { Store } from "../../common/types";

export class AdminStore implements Store {
  private _admins: Map<text, bool>;

  constructor() {
    this._admins = new Map();
  }

  get admins() {
    return this._admins;
  }

  addAdmin(principal: Principal) {
    this._admins.set(principal.toString(), true);
  }

  removeAdmin(principal: Principal) {
    this._admins.delete(principal.toString());
  }

  serialize(): string | undefined {
    const adminsLinear: string[] = [];
    this._admins.forEach((value, key) => {
      adminsLinear.push(key);
    });

    return JSON.stringify(adminsLinear);
  }

  deserialize(serialized: string): void {
    const adminsLinear: string[] = JSON.parse(serialized);
    adminsLinear.forEach((admin) => {
      this._admins.set(admin, true);
    });
  }
}
