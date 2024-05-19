import { ICRC61Standards } from "./types";

export function icrc61_supported_standards(): ICRC61Standards {
  return [
    { name: "ICRC-7", url: "https://github.com/dfinity/ICRC/ICRCs/ICRC-7" },
    { name: "ICRC-61", url: "https://github.com/dfinity/ICRC/ICRCs/ICRC-61" },
  ];
}
