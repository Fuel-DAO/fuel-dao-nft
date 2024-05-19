import { None, Some, text } from "azle";

export type Some<T> = ReturnType<typeof Some<T>>;
export type None = typeof None;

export interface Store {
  serialize(): text | undefined;
  deserialize(serialized: text): void;
}
