import { jsonReplacer, jsonReviver } from "azle";
import { Store } from "../../common/types";
import { WasmChunked } from "../types";

export class WasmChunkedStore implements Store {
  private _wasm: WasmChunked;

  constructor() {
    this._wasm = {
      chunkHashes: [],
      moduleHash: new Uint8Array(),
    };
  }

  get wasm(): WasmChunked {
    return this._wasm;
  }

  async store(wasm: WasmChunked) {
    this._wasm = wasm;
  }

  async clear() {
    this._wasm = {
      chunkHashes: [],
      moduleHash: new Uint8Array(),
    };
  }

  serialize(): string | undefined {
    return JSON.stringify(this._wasm, jsonReplacer);
  }

  deserialize(serialized: string): void {
    this._wasm = JSON.parse(serialized, jsonReviver);
  }
}
