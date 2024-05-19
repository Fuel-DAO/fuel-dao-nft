import { readFile } from "fs/promises";
import { AssetManager } from "@dfinity/assets";
import { getAgent, getCanisterId } from "./common";

async function main() {
  const assetProxyManager = new AssetManager({
    canisterId: await getCanisterId('asset_proxy'),
    agent: await getAgent(),
  });
 
  const assetManager = new AssetManager({
    canisterId: await getCanisterId('asset'),
    agent: await getAgent(),
  });
 
  console.log(
    await assetProxyManager.store('./test.jpg', {
      contentEncoding: 'identity'
    })
  );
  console.log(await assetManager.get('/test.jpg', ['identity']))
}

main();