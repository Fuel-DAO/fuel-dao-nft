import { None, Opt, Principal, Result, Some, Vec, blob, bool, ic, nat, nat32, nat64, text } from "azle";
import { deriveSubaccount } from "../../common/token";
import { validateCollectionOwner } from "../validate";
import { getTokenLedger, TRANSFER_FEE } from "../../common/ledger";
import { EscrowStore, MetadataStore, TokenStore } from "../store";

export async function accept_sale(): Promise<Result<bool, text>> {
  const validationResult = validateCollectionOwner(ic.caller());
  if ( validationResult.Err ) return validationResult;

  if ( EscrowStore.saleStatus.Live === undefined ) return Result.Err("Sale not live.");
  EscrowStore.acceptSale();

  const treasury = MetadataStore.metadata.treasury;
  const ledger = getTokenLedger(MetadataStore.metadata.token);
  const bookedTokens = EscrowStore.bookedTokens;

  for ( const [owner, quantity] of bookedTokens ) {
    const escrowAccount = deriveSubaccount(Principal.fromText(owner));
    const userInvestedAmount = quantity * MetadataStore.metadata.price;

    const transferRes = await ic.call(ledger.icrc1_transfer, {
      args: [{
        to: {
          owner: treasury,
          subaccount: None,
        },
        from_subaccount: Some(escrowAccount),
        fee: Some(TRANSFER_FEE),
        memo: None,
        created_at_time: None,
        amount: userInvestedAmount,
      }]
    });

    if ( transferRes.Err )
      return Result.Err(JSON.stringify(transferRes.Err));

    Array(quantity).fill(0n)
      .forEach(() => TokenStore.mint(owner));
  }

  return Result.Ok(true);
}

export async function reject_sale(): Promise<Result<bool, text>> {
  const validationResult = validateCollectionOwner(ic.caller());
  if ( validationResult.Err ) return validationResult;

  if ( EscrowStore.saleStatus.Live === undefined ) return Result.Err("Sale not live.");
  EscrowStore.rejectSale();

  return Result.Ok(true);
}