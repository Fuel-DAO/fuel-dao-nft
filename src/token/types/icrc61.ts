import { Record, text, Vec } from "azle";

export const ICRC61Standards = Vec(
  Record({
    name: text,
    url: text,
  }),
);
export type ICRC61Standards = typeof ICRC61Standards.tsType;
