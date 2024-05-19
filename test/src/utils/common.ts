import { None, Result, Some, blob } from "azle";
import { readFile } from "fs/promises";
import path from "path";

export type Ok<T> = ReturnType<typeof Result.Ok<T>>;
type Err<T> = ReturnType<typeof Result.Err<T>>;
type Some<T> = [T];
type None = [];

export function isOkResult<T, U>(res: Result<T, U>): res is Ok<T> {
  return (res as Ok<T>).Ok !== undefined;
}

export function isErrResult<T, U>(res: Result<T, U>): res is Err<U> {
  return (res as Err<U>).Err !== undefined;
}

export function isSome<T>(opt: Some<T> | None): opt is Some<T> {
  return (opt as Some<T>).length > 0;
}

export function isNone<T>(opt: Some<T> | None): opt is None {
  return (opt as None).length == 0;
}

export async function loadTokenCanisterWasm(): Promise<blob> {
  const wasm = path.resolve(".azle", "token", "token.wasm.gz");
  const wasmBlob = await readFile(wasm);
  return wasmBlob;
}

export async function loadAssetCanisterWasm(): Promise<blob> {
  const wasm = path.resolve("test", "asset-canister", "assetstorage.wasm.gz");
  const wasmBlob = await readFile(wasm);
  return wasmBlob;
}

export function expectResultIsOk<O, E>(result: Result<O, E>): asserts result is Ok<O> {
  expect(isOkResult(result)).toBe(true);
}

export function expectResultIsErr<O, E>(result: Result<O, E>): asserts result is Err<E> {
  expect(isErrResult(result)).toBe(true);
}
