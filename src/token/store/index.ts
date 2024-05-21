import { MetadataStore as MetadataStoreClass } from "./metadata";
import { TokenStore as TokenStoreClass } from "./token";
import { TxnIndexStore as TxnIndexStoreClass } from "./txn";
import { EscrowStore as EscrowStoreClass } from "./escrow";

export const MetadataStore = new MetadataStoreClass();
export const TxnIndexStore = new TxnIndexStoreClass();
export const TokenStore = new TokenStoreClass();
export const EscrowStore = new EscrowStoreClass();

export const StorePersistIndex = {
  metadata: MetadataStore,
  txn_index: TxnIndexStore,
  token: TokenStore,
  escrow: EscrowStore,
};
