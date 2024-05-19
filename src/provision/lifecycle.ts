import { StableBTreeMap, ic, text } from "azle";
import { AdminStore, StorePersistIndex } from "./store";

const stableStorage = StableBTreeMap<text, text>(0);

export function init_impl() {
  const controller = ic.caller();
  AdminStore.addAdmin(controller);
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
