import { AccountIdentifier } from "@dfinity/ledger-icp";
import { Principal } from "@dfinity/principal";

console.log(AccountIdentifier.fromPrincipal({
  principal: Principal.fromText("5iea5-w4la7-jen6a-7ci65-xa3lt-cta3s-uoc3h-yffeb-fgz6c-fedt3-pae"),
}).toHex())