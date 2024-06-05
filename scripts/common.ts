import { HttpAgent, Identity } from "@dfinity/agent";
import { exec as execCommand } from "child_process";
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';
import { readFileSync } from "fs";

export async function getAgent(): Promise<HttpAgent> {
  const host = process.env.DFX_NETWORK === 'ic' ? 'https://icp-api.io' : 'http://127.0.0.1:4943';
  const identityPemFilePath = process.env.IDENTITY_PEM_FILE!;
  const identity = Secp256k1KeyIdentity.fromPem(
    readFileSync(identityPemFilePath, {encoding: 'utf8'})
  )
  
  const agent = new HttpAgent({ host, identity: identity as unknown as Identity });
  if ( process.env.DFX_NETWORK !== 'ic' ) {
    await agent.fetchRootKey().catch((err) => {
      console.warn(
        "Unable to fetch root key. Check to ensure that your local replica is running"
      );
      console.error(err);
    });
  }

  return agent;
}

export function exec(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execCommand(cmd, {
      encoding: 'utf8',
    }, (err, stdout, stderr) => {
      if ( err ) reject(stderr);
      resolve(stdout.trim());
    });
  });
}

export async function deployCanister(canisterName: string) {
  console.log(`Deploying ${canisterName}...`);
  const networkFlag = process.env.DFX_NETWORK === 'ic' ? '--ic' : '';
  await exec(`dfx deploy ${canisterName} ${networkFlag}`);
  const id = await exec(`dfx canister id ${canisterName} ${networkFlag}`);
  const canisterInfo = await exec(`dfx canister info ${canisterName} ${networkFlag}`);
  const moduleHash = canisterInfo.split('\n')[1].split(':')[1].trim();
  console.log(`Deployed ${canisterName} canister: ${id}; Module Hash: ${moduleHash}`);

  return id;
}

export async function buildCanister(canisterName: string) {
  console.log(`Building ${canisterName}...`);
  await exec(`dfx build --check ${canisterName}`);
  const moduleHash = await exec(`sha256sum ./.dfx/local/canisters/${canisterName}/${canisterName}.wasm.gz | awk '{ print $1 }'`);
  console.log(`Build success for ${canisterName} canister; Module Hash: 0x${moduleHash.trim()}`);
}

export async function getCanisterId(canisterName: string) {
  const networkFlag = process.env.DFX_NETWORK === 'ic' ? '--ic' : '';
  const id = await exec(`dfx canister id ${canisterName} ${networkFlag}`);
  return id;
}