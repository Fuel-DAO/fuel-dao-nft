import { MetadataStore } from "./index";
import {
  OwnerToTokenIndexType,
  OwnerToTokensIndexReadonlyType,
  Subaccount,
  TokenStoreReadonlyType,
  TokenStoreType,
} from "../types";
import { toAccountId } from "../utils";
import { Store } from "../../common/types";
import { jsonReplacer, jsonReviver, nat32 } from "azle";
import { TokenType } from "../types";

export class TokenStore implements Store {
  private _counter = 1;
  private _tokens: TokenStoreType = new Map();
  private _ownerToTokenIndex: OwnerToTokenIndexType = new Map();

  get tokens(): TokenStoreReadonlyType {
    return this._tokens;
  }

  get ownerToTokenIndex(): OwnerToTokensIndexReadonlyType {
    return this._ownerToTokenIndex;
  }

  mint(principal: string, subaccount?: Subaccount): number {
    const accountId = toAccountId(principal, subaccount);
    const tokenId = this._counter;
    this._counter++;

    let userTokenIndex = this._ownerToTokenIndex.get(accountId);
    if (!userTokenIndex) {
      userTokenIndex = new Map();
      this._ownerToTokenIndex.set(accountId, userTokenIndex);
    }

    this._tokens.set(tokenId, {
      owner: {
        principal,
        subaccount: subaccount,
      },
    });
    userTokenIndex.set(tokenId, true);
    MetadataStore.incrementSupply();

    return tokenId;
  }

  burn(tokenId: number) {
    const token = this._tokens.get(tokenId);
    if (!token) return;

    const owner = token.owner;
    const accountId = toAccountId(owner.principal, owner.subaccount);

    this._ownerToTokenIndex.get(accountId)?.delete(tokenId);
    this._tokens.delete(tokenId);
    MetadataStore.decrementSupply();
  }

  transfer(tokenId: number, principal: string, subaccount?: Subaccount) {
    const token = this._tokens.get(tokenId);
    if (!token) return;

    const holderAccountId = toAccountId(token.owner.principal, token.owner.subaccount);
    const receiverAccountId = toAccountId(principal, subaccount);

    let receiverTokenIndex = this._ownerToTokenIndex.get(receiverAccountId);
    if (!receiverTokenIndex) {
      receiverTokenIndex = new Map();
      this._ownerToTokenIndex.set(receiverAccountId, receiverTokenIndex);
    }

    token.owner.principal = principal;
    token.owner.subaccount = subaccount;

    this._ownerToTokenIndex.get(holderAccountId)!.delete(tokenId);
    receiverTokenIndex.set(tokenId, true);
  }

  serialize(): string | undefined {
    const toSerialize = {
      counter: this._counter,
      tokens: [] as any[],
    };

    this._tokens.forEach((value, key) => {
      toSerialize.tokens.push([key, value]);
    });

    return JSON.stringify(toSerialize, jsonReplacer);
  }

  deserialize(serialized: string): void {
    const { counter, tokens } = JSON.parse(serialized, jsonReviver);
    this._counter = counter;

    tokens.forEach(([key, value]: [nat32, TokenType]) => {
      this._tokens.set(key, value);

      const accountId = toAccountId(value.owner.principal, value.owner.subaccount);
      let userTokenIndex = this._ownerToTokenIndex.get(accountId);

      if (!userTokenIndex) {
        userTokenIndex = new Map();
        this._ownerToTokenIndex.set(accountId, userTokenIndex);
      }

      userTokenIndex.set(key, true);
    });
  }
}
