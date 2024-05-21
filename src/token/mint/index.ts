import { None, Opt, Principal, Result, Some, Vec, blob, bool, ic, nat, nat32, nat64, text } from "azle";
import { deriveSubaccount } from "../../common/token";
import { validateCollectionOwner } from "../validate";
import { getTokenLedger, TRANSFER_FEE } from "../../common/ledger";
import { EscrowStore, MetadataStore, TokenStore } from "../store";
import { refund_from_escrow } from "../escrow";

export async function accept_sale(): Promise<Result<bool, text>> {
  const validationResult = validateCollectionOwner(ic.caller());
  if ( validationResult.Err ) return validationResult;

  if ( EscrowStore.saleStatus.Live === undefined ) return Result.Err("Sale not live.");
  EscrowStore.acceptSale();

  const treasury = MetadataStore.metadata.treasury;
  const ledger = getTokenLedger(MetadataStore.metadata.token);
  const bookedTokens = EscrowStore.bookedTokens;

  for ( const [investor, quantity] of bookedTokens ) {
    const escrowSubaccount = deriveSubaccount(Principal.fromText(investor));
    const userInvestedAmount = quantity * MetadataStore.metadata.price;

    const transferResult = await ic.call(ledger.icrc1_transfer, {
      args: [{
        to: {
          owner: treasury,
          subaccount: None,
        },
        from_subaccount: Some(escrowSubaccount),
        fee: Some(TRANSFER_FEE),
        memo: None,
        created_at_time: None,
        amount: userInvestedAmount,
      }]
    });

    if ( transferResult.Err )
      return Result.Err(JSON.stringify(transferResult.Err));

    Array(quantity).fill(0n)
      .forEach(() => TokenStore.mint(investor));
  }

  return Result.Ok(true);
}

export async function reject_sale(): Promise<Result<bool, text>> {
  const validationResult = validateCollectionOwner(ic.caller());
  if ( validationResult.Err ) return validationResult;

  if ( EscrowStore.saleStatus.Live === undefined ) return Result.Err("Sale not live.");
  EscrowStore.rejectSale();

  const bookedTokens = EscrowStore.bookedTokens;
  
  for ( const [investor, _] of bookedTokens ) {
    const refundResult = await refund_from_escrow(Principal.fromText(investor));
    if ( refundResult.Err ) return refundResult;
  }

  return Result.Ok(true);
}

export async function reject_sale_individual(investor: Principal): Promise<Result<bool, text>> {
  const validationResult = validateCollectionOwner(ic.caller());
  if ( validationResult.Err ) return validationResult;
  if ( EscrowStore.saleStatus.Rejected === undefined ) return Result.Err("Sale not rejected.");

  const refundResult = await refund_from_escrow(investor);
  if ( refundResult.Err ) return refundResult;

  return Result.Ok(true);
}
