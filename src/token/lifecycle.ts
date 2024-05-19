import { StableBTreeMap, text } from "azle";
import { MetadataStore, StorePersistIndex } from "./store";
import { CanisterArgs, InitArg } from "./types";

const stableStorage = StableBTreeMap<text, text>(0);

export function init_impl(args: CanisterArgs) {
  if (!args.Init) throw "Init Args required";
  MetadataStore.init(args.Init);
}

export function pre_upgrade_impl() {
  Object.entries(StorePersistIndex).forEach(([key, store]) => {
    const serialized = store.serialize();
    if (!serialized) return;

    stableStorage.insert(key, serialized);
  });
}

export function post_upgrade_impl() {
  Object.entries(StorePersistIndex).forEach(([key, store]) => {
    const serialized = stableStorage.get(key).Some;
    if (!serialized) return;

    store.deserialize(serialized);
  });
}
