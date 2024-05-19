import { nat } from "azle";
import { Store } from "../../common/types";

export class TxnIndexStore implements Store {
  private _index: nat = 0n;

  get index() {
    return this._index;
  }

  increment() {
    this._index++;
  }

  serialize(): string | undefined {
    return this._index.toString();
  }

  deserialize(serialized: string): void {
    this._index = BigInt(serialized);
  }
}
