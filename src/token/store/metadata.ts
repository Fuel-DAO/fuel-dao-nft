import { Principal, jsonReplacer, jsonReviver } from "azle";
import {
  ConfigStoreType,
  InitArg,
  MetadataStoreType,
  MetadataUpdateArg,
} from "../types";
import { Store } from "../../common/types";

export class MetadataStore implements Store {
  private _metadata: MetadataStoreType;
  private _config: ConfigStoreType;

  constructor() {
    this._metadata = {} as MetadataStoreType;
    this._config = {
      total_supply: 0n,
    };
  }

  get metadata(): Readonly<MetadataStoreType> {
    return this._metadata;
  }

  get config(): Readonly<ConfigStoreType> {
    return this._config;
  }

  private _updateMetadataAttribute<K extends keyof MetadataStoreType>(
    key: K,
    value: MetadataStoreType[K],
  ) {
    this._metadata[key] = value;
  }

  init(args: InitArg) {
    this._metadata = args;
  }

  update(args: MetadataUpdateArg) {
    const keys = Object.keys(args) as (keyof MetadataUpdateArg)[];
    keys.forEach((key) => {
      const val = args[key].Some;
      if (val) this._updateMetadataAttribute(key, val);
    });
  }

  changeOwnership(owner: Principal) {
    this._metadata.collection_owner = owner;
  }

  incrementSupply() {
    this._config.total_supply++;
  }

  decrementSupply() {
    this._config.total_supply--;
  }

  serialize(): string | undefined {
    const toSerialize = {
      metadata: this._metadata,
      config: this._config,
    };

    return JSON.stringify(toSerialize, jsonReplacer);
  }

  deserialize(serialized: string): void {
    const { metadata, config } = JSON.parse(serialized, jsonReviver);

    this._metadata = metadata;
    this._config = config;
  }
}
